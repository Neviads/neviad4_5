from __future__ import annotations

import json
import logging
import time
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from typing import Any

import httpx

from beneviadsystem.domain.exception import IllegalStateError

from .ai_provider_unavailable_error import AiProviderUnavailableError
from .errors import describe
from .structured_output_spec import StructuredOutputSpec
from .tool_callback import ToolCallback

log = logging.getLogger(__name__)
#: Status codes worth one more try: the provider is busy or briefly down.
_TRANSIENT = {408, 409, 429, 500, 502, 503, 504}


@dataclass
class ChatResponse:
    """The first choice of a Chat Completions answer."""

    message: dict[str, Any]
    finish_reason: str | None = None
    raw: dict[str, Any] = field(default_factory=dict)

    @property
    def text(self) -> str | None:
        return self.message.get("content")

    @property
    def tool_calls(self) -> list[dict[str, Any]]:
        return self.message.get("tool_calls") or []

    @property
    def refusal(self) -> str | None:
        return self.message.get("refusal")


def response_format(spec: StructuredOutputSpec) -> dict[str, Any]:
    return {"type": "json_schema", "json_schema": {"name": spec.name, "schema": spec.schema, "strict": spec.strict}}


class ChatCompletionsModel:
    """An OpenAI-compatible ``/v1/chat/completions`` endpoint (OpenAI itself, DeepSeek). ``default_options`` go into every request (model
    limits, reasoning effort); ``request_rewriter`` may change the final payload, the way the providers need it (strict tool schemas,
    DeepSeek's thinking switch). Transient failures (429, 5xx, a dropped connection) are retried after each of ``retry_delays`` seconds."""

    def __init__(self, base_url: str, api_key: str, model: str, *, default_options: dict[str, Any] | None = None,
                 request_rewriter: Callable[[dict[str, Any]], None] | None = None, timeout_seconds: float = 900.0,
                 transport: httpx.BaseTransport | None = None, retry_delays: Sequence[float] = (1.0, 2.0)):
        self._url = base_url.rstrip("/") + "/v1/chat/completions"
        self._api_key = api_key
        self.model = model
        self._defaults = dict(default_options or {})
        self._rewrite = request_rewriter
        self._retry_delays = tuple(retry_delays)
        self._http = httpx.Client(timeout=httpx.Timeout(timeout_seconds, connect=15.0), transport=transport)

    def call(self, messages: list[dict[str, Any]], *, response_format: dict[str, Any] | None = None, tools: Sequence[ToolCallback] | None = None,
             tool_choice: Any = None, parallel_tool_calls: bool | None = None) -> ChatResponse:
        payload: dict[str, Any] = {"model": self.model, "messages": messages, **self._defaults}
        if response_format is not None:
            payload["response_format"] = response_format
        if tools:
            payload["tools"] = [{"type": "function", "function": {"name": t.definition.name, "description": t.definition.description,
                                                                  "parameters": json.loads(t.definition.input_schema)}} for t in tools]
        if tool_choice is not None:
            payload["tool_choice"] = tool_choice
        if parallel_tool_calls is not None:
            payload["parallel_tool_calls"] = parallel_tool_calls
        if self._rewrite is not None:
            self._rewrite(payload)
        body = self._post(payload)
        choices = body.get("choices") or []
        if not choices or not isinstance(choices[0].get("message"), dict):
            raise IllegalStateError("the provider returned an empty chat response")
        return ChatResponse(choices[0]["message"], choices[0].get("finish_reason"), body)

    def _post(self, payload: dict[str, Any]) -> dict[str, Any]:
        content = json.dumps(payload, ensure_ascii=False).encode()
        headers = {"Authorization": f"Bearer {self._api_key}", "Content-Type": "application/json"}
        attempt = 0
        while True:
            try:
                response = self._http.post(self._url, headers=headers, content=content)
            except httpx.TransportError as failure:
                if attempt < len(self._retry_delays):
                    log.warning("Chat completions call failed, retrying: %s", describe(failure))
                    time.sleep(self._retry_delays[attempt])
                    attempt += 1
                    continue
                raise AiProviderUnavailableError("chat completions call failed: " + describe(failure)) from failure
            if response.status_code in _TRANSIENT and attempt < len(self._retry_delays):
                log.warning("Chat completions answered %s, retrying", response.status_code)
                time.sleep(self._retry_delays[attempt])
                attempt += 1
                continue
            if response.status_code // 100 != 2:
                raise AiProviderUnavailableError(f"chat completions error {response.status_code}: {_error_message(response.text)}")
            return response.json()


def _error_message(text: str) -> str:
    try:
        message = json.loads(text).get("error", {}).get("message")
        return message if message else text
    except (ValueError, AttributeError):
        return text
