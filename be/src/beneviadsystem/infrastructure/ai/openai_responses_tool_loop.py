from __future__ import annotations

import json
import logging
from collections.abc import Sequence
from typing import Any

import httpx

from beneviadsystem.domain.exception import IllegalStateError

from .ai_generation_result import AiGenerationResult
from .ai_provider_unavailable_error import AiProviderUnavailableError
from .errors import describe
from .strict_tool_schemas import StrictToolSchemas
from .structured_output_spec import StructuredOutputSpec
from .tool_callback import ToolCallback
from .tool_image_source import Image, ToolImageSource
from .tool_stream_listener import ToolStreamListener

log = logging.getLogger(__name__)
#: Scene screenshots hold small text (labels), so they are sent at full detail.
IMAGE_DETAIL = "high"


class OpenAiResponsesToolLoop:
    """Bounded tool-call loop over OpenAI's ``/v1/responses`` endpoint. Chat Completions rejects function tools whenever reasoning is on,
    so agents that need reasoning plus tools go through here. With no tools it is a single reasoning call that returns the text."""

    def __init__(self, base_url: str, api_key: str, reasoning_effort: str, tool_reasoning_effort: str | None, max_output_tokens: int,
                 request_timeout_seconds: float, transport: httpx.BaseTransport | None = None):
        """``reasoning_effort`` serves calls without tools (analysis); ``tool_reasoning_effort`` serves tool-using calls (coding)."""
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._reasoning_effort = reasoning_effort
        self._tool_reasoning_effort = tool_reasoning_effort or reasoning_effort
        self._max_output_tokens = max_output_tokens
        self._http = httpx.Client(timeout=httpx.Timeout(request_timeout_seconds, connect=15.0), transport=transport)

    def generate(self, model: str, system: str | None, prompt: str, callbacks: Sequence[ToolCallback] | None, spec: StructuredOutputSpec | None,
                 max_tool_calls: int, listener: ToolStreamListener | None = None, effort_override: str | None = None,
                 images: Sequence[Image] | None = None) -> AiGenerationResult:
        """``system`` (optional) is sent as ``instructions`` on EVERY request of the loop, because instructions are not inherited through
        ``previous_response_id``. With a ``listener`` the response is streamed so tool arguments can be shown while they are generated.
        ``effort_override`` (None = the loop's own setting) replaces the reasoning effort of a call that has tools. ``images`` go with the
        user message, each preceded by a line with its label."""
        if max_tool_calls < 1:
            raise ValueError("maxToolCalls must be positive")
        callbacks = list(callbacks or [])
        by_name = {c.definition.name: c for c in callbacks}
        tools = self._tools(callbacks)
        first: dict[str, Any] = {"role": "user"}
        if not images:
            first["content"] = prompt
        else:
            parts: list[dict[str, Any]] = [{"type": "input_text", "text": prompt}]
            for image in images:
                parts.append({"type": "input_text", "text": "Ảnh: " + image.label})
                parts.append({"type": "input_image", "image_url": image.data_url, "detail": IMAGE_DETAIL})
            first["content"] = parts
        conversation: list[dict[str, Any]] = [first]
        previous_id: str | None = None
        calls = 0
        while True:
            body = self._request_body(model, system, conversation, tools, spec, previous_id, effort_override)
            try:
                response = self._post(body) if listener is None else self._post_streaming({**body, "stream": True}, listener)
            except Exception:
                if listener is not None:
                    listener.on_stream_aborted()
                raise
            status = response.get("status")
            if status == "failed":
                if listener is not None:
                    listener.on_stream_aborted()
                raise AiProviderUnavailableError("openai response failed: " + str((response.get("error") or {}).get("message", "")))
            if status == "incomplete":
                if listener is not None:
                    listener.on_stream_aborted()
                reason = (response.get("incomplete_details") or {}).get("reason") or "unknown"
                raise IllegalStateError(f"openai returned incomplete output ({reason})")
            previous_id = response.get("id")
            usage = response.get("usage")
            if isinstance(usage, dict):
                log.info("Responses call usage: model=%s, inputTokens=%s, outputTokens=%s, reasoningTokens=%s", model, usage.get("input_tokens", -1),
                         usage.get("output_tokens", -1), (usage.get("output_tokens_details") or {}).get("reasoning_tokens", -1))
            outputs: list[dict[str, Any]] = []
            text: list[str] = []
            for item in response.get("output") or []:
                kind = item.get("type")
                if kind == "function_call":
                    calls += 1
                    if calls > max_tool_calls:
                        raise AiProviderUnavailableError(f"AI tool-call limit exceeded ({max_tool_calls}).")
                    outputs.append({"type": "function_call_output", "call_id": item.get("call_id", ""),
                                    "output": self._tool_output(by_name, item.get("name", ""), item.get("arguments") or "{}")})
                elif kind == "message":
                    for part in item.get("content") or []:
                        if part.get("type") == "refusal":
                            raise IllegalStateError("openai refused structured output: " + str(part.get("refusal", "")))
                        if part.get("type") == "output_text":
                            text.append(part.get("text", ""))
            if not outputs:
                answer = "".join(text)
                if not answer.strip():
                    raise IllegalStateError("openai returned an empty structured output")
                return AiGenerationResult(answer, "openai", model)
            conversation = outputs

    def _tool_output(self, by_name: dict[str, ToolCallback], name: str, arguments: str) -> Any:
        """Plain text normally; when the tool attached pictures it is a list of parts: the text, then each picture after a line saying what it shows."""
        text = self._execute(by_name, name, arguments)
        callback = by_name.get(name)
        images = callback.take_images() if isinstance(callback, ToolImageSource) else []
        if not images:
            return text
        parts: list[dict[str, Any]] = [{"type": "input_text", "text": text}]
        for image in images:
            parts.append({"type": "input_text", "text": "Ảnh chụp: " + image.label})
            parts.append({"type": "input_image", "image_url": image.data_url, "detail": IMAGE_DETAIL})
        log.info("Tool %s returned %d picture(s) to the model", name, len(images))
        return parts

    @staticmethod
    def _execute(by_name: dict[str, ToolCallback], name: str, arguments: str) -> str:
        callback = by_name.get(name)
        if callback is None:
            return json.dumps({"success": False, "message": f"Unknown tool {name}"}, ensure_ascii=False)
        try:
            return callback.call(arguments)
        except Exception as failure:  # the model sees a failed tool, the loop goes on
            return json.dumps({"success": False, "message": f"Tool failed: {failure}"}, ensure_ascii=False)

    @staticmethod
    def _tools(callbacks: list[ToolCallback]) -> list[dict[str, Any]]:
        tools = []
        for callback in callbacks:
            definition = callback.definition
            try:
                schema = json.loads(definition.input_schema)
            except ValueError as invalid:
                raise IllegalStateError("Invalid tool schema for " + definition.name) from invalid
            StrictToolSchemas.strictify(schema)
            tools.append({"type": "function", "name": definition.name, "description": definition.description, "strict": True, "parameters": schema})
        return tools

    def _request_body(self, model: str, instructions: str | None, conversation: list[dict[str, Any]], tools: list[dict[str, Any]],
                      spec: StructuredOutputSpec | None, previous_id: str | None, effort_override: str | None) -> dict[str, Any]:
        body: dict[str, Any] = {"model": model}
        if instructions and instructions.strip():
            body["instructions"] = instructions
        body["input"] = conversation
        if tools:
            body["tools"] = tools
            body["parallel_tool_calls"] = False
        body["max_output_tokens"] = self._max_output_tokens
        effort = self._reasoning_effort if not tools else (effort_override or self._tool_reasoning_effort)
        body["reasoning"] = {"effort": effort}
        if previous_id is not None:
            body["previous_response_id"] = previous_id
        if spec is not None:
            body["text"] = {"format": {"type": "json_schema", "name": spec.name, "strict": spec.strict, "schema": spec.schema}}
        return body

    def _headers(self, streaming: bool) -> dict[str, str]:
        headers = {"Authorization": f"Bearer {self._api_key}", "Content-Type": "application/json"}
        if streaming:
            headers["Accept"] = "text/event-stream"
        return headers

    def _post(self, body: dict[str, Any]) -> dict[str, Any]:
        try:
            response = self._http.post(self._base_url + "/v1/responses", headers=self._headers(False), content=json.dumps(body, ensure_ascii=False).encode())
        except httpx.HTTPError as failure:
            raise AiProviderUnavailableError("openai responses call failed: " + describe(failure)) from failure
        if response.status_code // 100 != 2:
            raise AiProviderUnavailableError(f"openai responses error {response.status_code}: {_error_message(response.text)}")
        return response.json()

    def _post_streaming(self, body: dict[str, Any], listener: ToolStreamListener) -> dict[str, Any]:
        """Streams the response as server-sent events, forwards function-call argument fragments to the listener and returns the final
        response object (the one carried by the terminal event), shaped like a non-streamed reply."""
        try:
            with self._http.stream("POST", self._base_url + "/v1/responses", headers=self._headers(True),
                                   content=json.dumps(body, ensure_ascii=False).encode()) as response:
                if response.status_code // 100 != 2:
                    raise AiProviderUnavailableError(f"openai responses error {response.status_code}: {_error_message(response.read().decode())}")
                tool_names: dict[str, str] = {}
                final: dict[str, Any] | None = None
                for line in response.iter_lines():
                    if not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if not data or data == "[DONE]":
                        continue
                    event = json.loads(data)
                    kind = event.get("type")
                    if kind == "response.output_item.added":
                        item = event.get("item") or {}
                        if item.get("type") == "function_call":
                            tool_names[item.get("id", "")] = item.get("name", "")
                            listener.on_tool_call_started(item.get("name", ""))
                    elif kind == "response.function_call_arguments.delta":
                        name = tool_names.get(event.get("item_id", ""))
                        if name is not None:
                            listener.on_tool_arguments_delta(name, event.get("delta", ""))
                    elif kind == "response.output_item.done":
                        item = event.get("item") or {}
                        if item.get("type") == "function_call":
                            listener.on_tool_call_finished(tool_names.get(item.get("id", "")) or item.get("name", ""))
                    elif kind in ("response.completed", "response.incomplete", "response.failed"):
                        final = event.get("response")
                    elif kind == "error":
                        raise AiProviderUnavailableError("openai stream error: " + str(event.get("message", data)))
        except httpx.HTTPError as failure:
            raise AiProviderUnavailableError("openai responses stream failed: " + describe(failure)) from failure
        if not isinstance(final, dict):
            raise AiProviderUnavailableError("openai stream ended without a final response")
        return final


def _error_message(text: str) -> str:
    try:
        message = json.loads(text).get("error", {}).get("message")
        return message if message else text
    except (ValueError, AttributeError):
        return text
