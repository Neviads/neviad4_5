from __future__ import annotations

import logging
import threading
from collections.abc import Callable, Sequence
from typing import TypeVar

from .ai_client import AiClient
from .ai_generation_result import AiGenerationResult
from .ai_provider_unavailable_error import AiProviderUnavailableError
from .ai_request import AiRequest
from .errors import root_summary
from .structured_output_spec import StructuredOutputSpec
from .tool_callback import ToolCallback
from .tool_image_source import Image, ToolImageSource
from .tool_stream_listener import ToolStreamListener

log = logging.getLogger(__name__)
T = TypeVar("T")
_NONE_CONFIGURED = "Không có AI provider nào được cấu hình."


class FallbackAiClient(AiClient):
    """Tries the configured providers in order (OpenAI first, then DeepSeek). A tool-calling request is never replayed on the next
    provider once a tool has run, because the tools may already have changed the agent's workspace."""

    def __init__(self, providers: Sequence[AiClient | None]):
        self.providers: list[AiClient] = [p for p in providers if p is not None]

    def generate(self, prompt: str) -> str:
        return self.generate_detailed(prompt, True).text

    def generate_json(self, prompt: str) -> str:
        return self.generate_detailed(prompt, True).text

    def generate_detailed(self, prompt: str, json_mode: bool = True) -> AiGenerationResult:
        return self._first(lambda p, _: p.generate_detailed(prompt, json_mode), None, "generateDetailed",
                           "Không thể kết nối tới dịch vụ AI. Vui lòng thử lại sau.")

    def generate_structured(self, prompt: str, spec: StructuredOutputSpec) -> AiGenerationResult:
        return self._first(lambda p, _: p.generate_structured(prompt, spec), None, f"structured schema={spec.name}",
                           f"Không provider nào hỗ trợ structured output schema '{spec.name}'.")

    def generate_reasoned(self, prompt: str, spec: StructuredOutputSpec) -> AiGenerationResult:
        return self._first(lambda p, _: p.generate_reasoned(prompt, spec), None, f"reasoned schema={spec.name}",
                           f"Không provider nào xử lý được yêu cầu suy luận '{spec.name}'.")

    def generate_with_tools(self, prompt: str, tools: Sequence[ToolCallback], spec: StructuredOutputSpec | None = None,
                            max_tool_calls: int = 0, listener: ToolStreamListener | None = None) -> AiGenerationResult:
        message = ("Không thể gọi AI provider có hỗ trợ tool calling." if spec is None
                   else f"Không provider nào hỗ trợ tool calling với schema '{spec.name}'.")
        return self._first(lambda p, tracked: p.generate_with_tools(prompt, tracked, spec, max_tool_calls, listener), tools, "tools", message)

    def generate_request(self, request: AiRequest) -> AiGenerationResult:
        return self._first(lambda p, tracked: p.generate_request(request.with_tools(tracked, request.max_tool_calls, request.listener)),
                           request.tools, f"request system={request.has_system()}", "Không thể gọi AI provider với yêu cầu này.")

    def generate_tool_only(self, prompt: str, tools: Sequence[ToolCallback]) -> AiGenerationResult:
        return self._first(lambda p, tracked: p.generate_tool_only(prompt, tracked), tools, "tool-only",
                           "Không provider nào hỗ trợ strict tool calling.")

    def _first(self, operation: Callable[[AiClient, list[ToolCallback]], T], tools: Sequence[ToolCallback] | None, label: str,
               failure_message: str) -> T:
        if not self.providers:
            raise AiProviderUnavailableError(_NONE_CONFIGURED)
        last_failure: Exception | None = None
        for provider in self.providers:
            executed = threading.Event()
            tracked = [_TrackingToolCallback(tool, executed) for tool in (tools or ())]
            try:
                return operation(provider, tracked)
            except Exception as failure:  # any provider failure moves on to the next provider
                log.warning("AI provider failed; operation=%s, provider=%s, toolExecuted=%s, error=%s", label, type(provider).__name__,
                            executed.is_set(), root_summary(failure), exc_info=failure)
                if executed.is_set():
                    raise
                last_failure = failure
        raise AiProviderUnavailableError(failure_message) from last_failure


class _TrackingToolCallback(ToolCallback, ToolImageSource):
    """Remembers that the wrapped tool ran; passes the tool's pictures through so tracking does not hide them from the provider."""

    def __init__(self, delegate: ToolCallback, executed: threading.Event):
        self._delegate = delegate
        self._executed = executed

    @property
    def definition(self):
        return self._delegate.definition

    def call(self, tool_input: str) -> str:
        self._executed.set()
        return self._delegate.call(tool_input)

    def take_images(self) -> list[Image]:
        return self._delegate.take_images() if isinstance(self._delegate, ToolImageSource) else []
