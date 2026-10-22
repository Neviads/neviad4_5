from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from beneviadsystem.domain.exception import IllegalStateError

from .ai_generation_result import AiGenerationResult
from .ai_provider_unavailable_error import AiProviderUnavailableError
from .chat_completions import ChatCompletionsModel, ChatResponse, response_format
from .structured_output_spec import StructuredOutputSpec
from .tool_callback import ToolCallback

MAX_TOOL_CALLS = 4


def checked_text(provider: str, model_name: str, response: ChatResponse) -> AiGenerationResult:
    """The answer's text, or an error when the provider refused, was cut, or said nothing."""
    if response.refusal and str(response.refusal).strip():
        raise IllegalStateError(f"{provider} refused structured output: {response.refusal}")
    if response.finish_reason and response.finish_reason.lower() in ("length", "content_filter"):
        raise IllegalStateError(f"{provider} returned incomplete structured output ({response.finish_reason})")
    if not response.text or not response.text.strip():
        raise IllegalStateError(f"{provider} returned an empty structured output")
    return AiGenerationResult(response.text, provider, model_name)


class ChatCompletionsToolCalling:
    """Provider-neutral bounded tool-call loop over Chat Completions. A tool that raises stops the loop (the tools of the agents report
    their own failures as results)."""

    @staticmethod
    def generate(model: ChatCompletionsModel, provider: str, model_name: str, system: str | None, prompt: str, callbacks: Sequence[ToolCallback],
                 spec: StructuredOutputSpec | None = None, max_tool_calls: int = MAX_TOOL_CALLS) -> AiGenerationResult:
        if max_tool_calls < 1:
            raise ValueError("maxToolCalls must be positive")
        if not callbacks:
            raise ValueError("At least one tool is required")
        by_name = {c.definition.name: c for c in callbacks}
        history: list[dict[str, Any]] = []
        if system and system.strip():
            history.append({"role": "system", "content": system})
        history.append({"role": "user", "content": prompt})
        calls = 0
        while True:
            response = model.call(history, response_format=response_format(spec) if spec is not None else None, tools=callbacks)
            if not response.tool_calls:
                return checked_text(provider, model_name, response)
            calls += len(response.tool_calls)
            if calls > max_tool_calls:
                raise AiProviderUnavailableError(f"AI tool-call limit exceeded ({max_tool_calls}).")
            history.append({"role": "assistant", "content": response.text, "tool_calls": response.tool_calls})
            for call in response.tool_calls:
                function = call.get("function") or {}
                name = function.get("name", "")
                callback = by_name.get(name)
                if callback is None:
                    raise IllegalStateError(f"{provider} called an unknown tool {name}")
                history.append({"role": "tool", "tool_call_id": call.get("id", ""), "name": name,
                                "content": callback.call(function.get("arguments") or "{}")})

    @staticmethod
    def generate_tool_only(model: ChatCompletionsModel, provider: str, model_name: str, prompt: str,
                           callbacks: Sequence[ToolCallback]) -> AiGenerationResult:
        """Force exactly one function call and return that function's result."""
        if not callbacks or len(callbacks) != 1:
            raise ValueError("Tool-only repair requires exactly one tool")
        tool = callbacks[0]
        response = model.call([{"role": "user", "content": prompt}], tools=[tool], parallel_tool_calls=False,
                              tool_choice={"type": "function", "function": {"name": tool.definition.name}})
        if not response.tool_calls:
            raise IllegalStateError(f"{provider} did not execute the required strict repair tool")
        if len(response.tool_calls) != 1:
            raise IllegalStateError(f"{provider} returned more than one repair tool call")
        output = tool.call((response.tool_calls[0].get("function") or {}).get("arguments") or "{}")
        if not output or not output.strip():
            raise IllegalStateError(f"{provider} returned an empty repair result")
        return AiGenerationResult(output, provider, model_name)
