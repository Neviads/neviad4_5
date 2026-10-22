from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class Part:
    """``js`` is the compiled code of one part, ``name`` its drawing function."""

    id: str
    name: str | None
    js: str | None


class AssemblyValidator(ABC):
    """The deterministic check of an assembled machine: the parts attach by their ports and move when the machine input changes."""

    @abstractmethod
    def validate(self, plan: dict[str, Any], parts: list[Part]) -> list[str]:
        """Empty means the assembly passed; a crash of the checker is a problem, never a pass."""
