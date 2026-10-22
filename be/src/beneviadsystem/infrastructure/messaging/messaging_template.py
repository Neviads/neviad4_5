from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class MessagingTemplate(ABC):
    """Publishes a payload (model, dataclass or plain JSON data) to a destination such as ``/topic/agents/activity/<runId>``. Safe to call
    from any thread; an implementation raises when the message cannot be handed to the broker."""

    @abstractmethod
    def convert_and_send(self, destination: str, payload: Any) -> None: ...


class NoOpMessagingTemplate(MessagingTemplate):
    """Drops every message; for code paths that publish where nobody listens (tests, scripts)."""

    def convert_and_send(self, destination: str, payload: Any) -> None:
        return None
