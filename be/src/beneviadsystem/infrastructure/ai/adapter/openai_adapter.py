from __future__ import annotations

from collections.abc import Sequence

from ..ai_client import AiClient
from ..ai_generation_result import AiGenerationResult
from ..ai_request import AiRequest
from ..chat_completions import ChatCompletionsModel, response_format
from ..chat_completions_tool_calling import MAX_TOOL_CALLS, ChatCompletionsToolCalling, checked_text
from ..openai_responses_tool_loop import OpenAiResponsesToolLoop
from ..structured_output_schema_registry import StructuredOutputSchemaRegistry
from ..structured_output_spec import StructuredOutputSpec
from ..tool_callback import ToolCallback
from ..tool_stream_listener import ToolStreamListener

PROVIDER = "openai"


class OpenAiAdapter(AiClient):
    """OpenAI behind the provider-neutral client. ``reasoning_loop`` (optional) serves the agents that need reasoning together with tools,
    and pictures, through the Responses API; everything else goes through Chat Completions."""

    def __init__(self, chat_model: ChatCompletionsModel, model: str = "unknown", reasoning_loop: OpenAiResponsesToolLoop | None = None):
        self._chat = chat_model
        self._model = model
        self._loop = reasoning_loop

    def generate(self, prompt: str) -> str:
        return self.generate_detailed(prompt, True).text

    def generate_json(self, prompt: str) -> str:
        return self.generate_detailed(prompt, True).text

    def generate_detailed(self, prompt: str, json_mode: bool = True) -> AiGenerationResult:
        if json_mode:
            return self.generate_structured(prompt, StructuredOutputSchemaRegistry.GENERIC)
        return checked_text(PROVIDER, self._model, self._chat.call([{"role": "user", "content": prompt}]))

    def generate_structured(self, prompt: str, spec: StructuredOutputSpec) -> AiGenerationResult:
        return checked_text(PROVIDER, self._model, self._chat.call([{"role": "user", "content": prompt}], response_format=response_format(spec)))

    def generate_with_tools(self, prompt: str, tools: Sequence[ToolCallback], spec: StructuredOutputSpec | None = None,
                            max_tool_calls: int = 0, listener: ToolStreamListener | None = None) -> AiGenerationResult:
        if spec is None and max_tool_calls <= 0:
            return ChatCompletionsToolCalling.generate(self._chat, PROVIDER, self._model, None, prompt, tools,
                                                       StructuredOutputSchemaRegistry.RUNTIME_MODULE_STATUS)
        if not tools:
            return self.generate_structured(prompt, spec or StructuredOutputSchemaRegistry.GENERIC)
        if max_tool_calls <= 0:
            return ChatCompletionsToolCalling.generate(self._chat, PROVIDER, self._model, None, prompt, tools, spec)
        if self._loop is not None:
            return self._loop.generate(self._model, None, prompt, tools, spec, max_tool_calls, listener)
        return ChatCompletionsToolCalling.generate(self._chat, PROVIDER, self._model, None, prompt, tools, spec, max_tool_calls)

    def generate_reasoned(self, prompt: str, spec: StructuredOutputSpec) -> AiGenerationResult:
        if self._loop is None:
            return self.generate_structured(prompt, spec)
        return self._loop.generate(self._model, None, prompt, [], spec, 1)

    def generate_request(self, request: AiRequest) -> AiGenerationResult:
        """A request with a system prompt reaches the model as a real system message (``instructions`` in the Responses API)."""
        if not request.has_system():
            return super().generate_request(request)
        spec = request.schema or StructuredOutputSchemaRegistry.GENERIC
        if request.has_images():
            # Pictures in the user message need the Responses API; without it, refuse rather than drop them.
            if self._loop is None:
                raise NotImplementedError("OpenAI provider chưa bật Responses API nên không gửi được ảnh.")
            budget = (request.max_tool_calls or MAX_TOOL_CALLS) if request.has_tools() else 1
            return self._loop.generate(self._model, request.system, request.user, list(request.tools), spec, budget, request.listener,
                                       request.reasoning_effort, images=list(request.images))
        if request.has_tools():
            budget = request.max_tool_calls or MAX_TOOL_CALLS
            if self._loop is not None:
                return self._loop.generate(self._model, request.system, request.user, list(request.tools), request.schema, budget,
                                           request.listener, request.reasoning_effort)
            return ChatCompletionsToolCalling.generate(self._chat, PROVIDER, self._model, request.system, request.user, list(request.tools),
                                                       request.schema, budget)
        if request.reasoned and self._loop is not None:
            return self._loop.generate(self._model, request.system, request.user, [], spec, 1)
        messages = [{"role": "system", "content": request.system}, {"role": "user", "content": request.user}]
        return checked_text(PROVIDER, self._model, self._chat.call(messages, response_format=response_format(spec)))

    def generate_tool_only(self, prompt: str, tools: Sequence[ToolCallback]) -> AiGenerationResult:
        return ChatCompletionsToolCalling.generate_tool_only(self._chat, PROVIDER, self._model, prompt, tools)
