from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Sequence
from dataclasses import dataclass, field
from typing import Any

from beneviadsystem.infrastructure.ai.tool_image_source import Image


@dataclass(frozen=True)
class Validation:
    """``js`` is the compiled code, only set when there are no problems; ``meta`` is what the code itself declares (``name``, and ``inputs``,
    ``outputs``, ``ports``, ``size``, ``moving``, ``points`` when it has any), or None. ``images`` are pictures of the figure as built (at
    rest, and with every moving part at its maximum) so the drawer can SEE what it drew; they never decide the result."""

    problems: list[str]
    report: list[str]
    js: str | None = None
    meta: dict[str, Any] | None = None
    images: Sequence[Image] = field(default_factory=tuple)


class DrawObjectValidator(ABC):
    """The check of one draw-object answer: it compiles, runs and draws something, and shows the figure it drew. A crash of the checker is
    a problem, never a pass."""

    @abstractmethod
    def validate(self, answer: dict[str, Any]) -> Validation: ...
