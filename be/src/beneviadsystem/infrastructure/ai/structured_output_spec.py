from __future__ import annotations

import copy
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class StructuredOutputSpec:
    """Provider-neutral description of an OpenAI-compatible structured output. The schema is plain JSON data, so OpenAI and
    OpenAI-compatible providers such as DeepSeek can send it unchanged."""

    name: str
    schema: dict[str, Any] = field(compare=True)
    strict: bool = True

    def __post_init__(self):
        if not self.name or not self.name.strip():
            raise ValueError("Structured output name is required")
        if self.schema is None:
            raise ValueError("Structured output schema is required")
        object.__setattr__(self, "schema", copy.deepcopy(self.schema))

    @classmethod
    def of(cls, name: str, schema: dict[str, Any]) -> StructuredOutputSpec:
        """A strict spec."""
        return cls(name, schema, True)
