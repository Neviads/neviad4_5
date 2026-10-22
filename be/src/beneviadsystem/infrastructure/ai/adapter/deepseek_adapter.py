from __future__ import annotations

from collections.abc import Sequence

from ..ai_client import AiClient
from ..ai_generation_result import AiGenerationResult
from ..ai_request import AiRequest
from ..chat_completions import ChatCompletionsModel
from ..chat_completions_tool_calling import MAX_TOOL_CALLS, ChatCompletionsToolCalling, checked_text
from ..structured_output_schema_registry import StructuredOutputSchemaRegistry
from ..structured_output_spec import StructuredOutputSpec
from ..tool_callback import ToolCallback
from ..tool_stream_listener import ToolStreamListener

PROVIDER = "deepseek"


def _json_only(prompt: str) -> str:
    return prompt + "\nReturn exactly one JSON object matching the required contract. Do not use markdown fences or add prose."


class DeepSeekAdapter(AiClient):
    """DeepSeek's OpenAI-compatible Chat Completions API. It takes no JSON schema, so the prompt asks for one bare JSON object."""

    def __init__(self, chat_model: ChatCompletionsModel, model: str = "unknown"):
        self._chat = chat_model
        self._model = model

    def generate(self, prompt: str) -> str:
        return self.generate_detailed(prompt, True).text

    def generate_json(self, prompt: str) -> str:
        return self.generate_detailed(prompt, True).text

    def generate_detailed(self, prompt: str, json_mode: bool = True) -> AiGenerationResult:
        return self.generate_structured(prompt, StructuredOutputSchemaRegistry.GENERIC) if json_mode else self._text(prompt)

    def generate_structured(self, prompt: str, spec: StructuredOutputSpec) -> AiGenerationResult:
        return self._text(_json_only(prompt))

    def generate_with_tools(self, prompt: str, tools: Sequence[ToolCallback], spec: StructuredOutputSpec | None = None,
                            max_tool_calls: int = 0, listener: ToolStreamListener | None = None) -> AiGenerationResult:
        if spec is not None and not tools:
            return self.generate_structured(prompt, spec)
        return ChatCompletionsToolCalling.generate(self._chat, PROVIDER, self._model, None, _json_only(prompt), tools, None,
                                                   max_tool_calls if max_tool_calls > 0 else MAX_TOOL_CALLS)

    def generate_request(self, request: AiRequest) -> AiGenerationResult:
        """A request with a system prompt reaches the model as a real system message."""
        # The DeepSeek chat API takes text only: refuse a picture so the fallback client moves on to a provider that can show it.
        if request.has_images():
            raise NotImplementedError("DeepSeek không nhận ảnh trong yêu cầu.")
        if not request.has_system():
            return super().generate_request(request)
        user = _json_only(request.user)
        if request.has_tools():
            return ChatCompletionsToolCalling.generate(self._chat, PROVIDER, self._model, request.system, user, list(request.tools), None,
                                                       request.max_tool_calls or MAX_TOOL_CALLS)
        messages = [{"role": "system", "content": request.system}, {"role": "user", "content": user}]
        return checked_text(PROVIDER, self._model, self._chat.call(messages))

    def generate_tool_only(self, prompt: str, tools: Sequence[ToolCallback]) -> AiGenerationResult:
        return ChatCompletionsToolCalling.generate_tool_only(self._chat, PROVIDER, self._model, prompt, tools)

    def _text(self, prompt: str) -> AiGenerationResult:
        return checked_text(PROVIDER, self._model, self._chat.call([{"role": "user", "content": prompt}]))
