from __future__ import annotations

import dataclasses
from collections.abc import Sequence
from dataclasses import dataclass, field

from .structured_output_spec import StructuredOutputSpec
from .tool_callback import ToolCallback
from .tool_image_source import Image
from .tool_stream_listener import ToolStreamListener


@dataclass(frozen=True)
class AiRequest:
    """One model call described as data, so a caller can give the model a SYSTEM prompt of its own without the shared client holding
    per-agent state. ``system``, ``schema``, ``tools``, ``max_tool_calls`` (0 = provider default) and ``listener`` are optional.
    ``reasoned`` asks for the provider's deepest reasoning on a call without tools; ``reasoning_effort`` (None = the provider's own setting)
    sets the reasoning of a call WITH tools. ``images`` go with the user message; a provider that cannot show pictures must refuse them."""

    system: str | None
    user: str
    tools: Sequence[ToolCallback] = field(default_factory=tuple)
    schema: StructuredOutputSpec | None = None
    max_tool_calls: int = 0
    listener: ToolStreamListener | None = None
    reasoned: bool = False
    reasoning_effort: str | None = None
    images: Sequence[Image] = field(default_factory=tuple)

    def __post_init__(self):
        if self.user is None or not self.user.strip():
            raise ValueError("user message is required")
        if self.max_tool_calls < 0:
            raise ValueError("maxToolCalls must not be negative")
        object.__setattr__(self, "tools", tuple(self.tools or ()))
        object.__setattr__(self, "images", tuple(self.images or ()))

    @classmethod
    def of(cls, system: str | None, user: str) -> AiRequest:
        """A call with a system prompt and one user message, no tools and no schema."""
        return cls(system, user)

    def with_schema(self, spec: StructuredOutputSpec | None) -> AiRequest:
        return dataclasses.replace(self, schema=spec)

    def with_tools(self, callbacks: Sequence[ToolCallback], budget: int, stream_listener: ToolStreamListener | None) -> AiRequest:
        return dataclasses.replace(self, tools=tuple(callbacks), max_tool_calls=budget, listener=stream_listener)

    def with_reasoning(self) -> AiRequest:
        return dataclasses.replace(self, reasoned=True)

    def with_reasoning_effort(self, effort: str | None) -> AiRequest:
        """``effort`` is low, medium, high...; blank means the provider's own setting."""
        return dataclasses.replace(self, reasoning_effort=effort.strip() if effort and effort.strip() else None)

    def with_images(self, pictures: Sequence[Image]) -> AiRequest:
        """Pictures sent with the user message, in order, each preceded by its label."""
        return dataclasses.replace(self, images=tuple(pictures))

    def has_system(self) -> bool:
        return bool(self.system and self.system.strip())

    def has_tools(self) -> bool:
        return bool(self.tools)

    def has_images(self) -> bool:
        return bool(self.images)

    def flattened_prompt(self) -> str:
        """System and user text as one string, for providers or fakes that have no system role."""
        return f"{self.system}\n\n{self.user}" if self.has_system() else self.user
