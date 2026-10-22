from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Sequence

from .ai_generation_result import AiGenerationResult
from .ai_provider_unavailable_error import AiProviderUnavailableError
from .ai_request import AiRequest
from .structured_output_spec import StructuredOutputSpec
from .tool_callback import ToolCallback
from .tool_stream_listener import ToolStreamListener


class AiClient(ABC):
    """Provider-neutral boundary. Structured JSON is the safe default; callers needing prose ask for ``generate_detailed(prompt, False)``.
    Only :meth:`generate` is required: every other method falls back on a simpler one, so fakes and small providers stay usable."""

    @abstractmethod
    def generate(self, prompt: str) -> str:
        """Generate a constrained JSON object by default."""

    def generate_json(self, prompt: str) -> str:
        """Generate a JSON object when the provider supports constrained output."""
        return self.generate(prompt)

    def generate_detailed(self, prompt: str, json_mode: bool = True) -> AiGenerationResult:
        """Generate a response with provider metadata when the adapter can supply it."""
        return AiGenerationResult(self.generate_json(prompt) if json_mode else self.generate(prompt), "unknown", "unknown")

    def generate_structured(self, prompt: str, spec: StructuredOutputSpec) -> AiGenerationResult:
        """Generate a response constrained by the supplied strict schema."""
        return self.generate_detailed(prompt, True)

    def generate_structured_text(self, prompt: str, spec: StructuredOutputSpec) -> str:
        """The text of :meth:`generate_structured`."""
        return self.generate_structured(prompt, spec).text

    def generate_with_tools(self, prompt: str, tools: Sequence[ToolCallback], spec: StructuredOutputSpec | None = None,
                            max_tool_calls: int = 0, listener: ToolStreamListener | None = None) -> AiGenerationResult:
        """Generate while request-scoped tools may be called, with an optional strict final schema, a tool-call budget (0 = the provider's
        default) and a listener that streaming providers tell about tool arguments as they are written. Production adapters run the
        tools in a bounded model/tool conversation; this default keeps local and test providers usable."""
        return self.generate_detailed(prompt, True)

    def generate_reasoned(self, prompt: str, spec: StructuredOutputSpec) -> AiGenerationResult:
        """One structured call with the provider's deepest reasoning (no tools); falls back to the ordinary structured call."""
        return self.generate_structured(prompt, spec)

    def generate_request(self, request: AiRequest) -> AiGenerationResult:
        """One call described by an :class:`AiRequest`. Providers with a real system role override this; this default folds the system
        text in front of the user text and routes to the matching method above."""
        # These methods carry text only: refuse pictures rather than drop them, so the model never answers about a picture it did not see.
        if request.has_images():
            raise NotImplementedError("Provider này không gửi được ảnh cho model.")
        prompt = request.flattened_prompt()
        if request.has_tools():
            return self.generate_with_tools(prompt, list(request.tools), request.schema, request.max_tool_calls, request.listener)
        if request.schema is None:
            return self.generate_detailed(prompt, True)
        return self.generate_reasoned(prompt, request.schema) if request.reasoned else self.generate_structured(prompt, request.schema)

    def generate_tool_only(self, prompt: str, tools: Sequence[ToolCallback]) -> AiGenerationResult:
        """A tool-only request: the provider must make the requested function call and return the tool's result."""
        raise AiProviderUnavailableError("Provider does not support strict tool-only calls.")
