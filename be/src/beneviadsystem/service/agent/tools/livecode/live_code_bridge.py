from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from .live_code_protocol import Result


class LiveCodeBridge(ABC):
    """Executes one tool operation against the frontend that owns the generated source."""

    @abstractmethod
    def call(self, run_id: str, op: str, args: dict[str, Any], timeout_seconds: float) -> Result:
        """Blocks until the frontend answers or the timeout elapses. Never raises for transport problems: they come back as a failed
        :class:`Result` so the model can see them."""
