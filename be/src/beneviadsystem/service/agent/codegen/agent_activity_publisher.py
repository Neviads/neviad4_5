"""Where the steps of an agent go: any callable taking an :class:`AgentActivity`. It must not raise; a display problem never stops an agent."""
from __future__ import annotations

from collections.abc import Callable

from .agent_activity import AgentActivity

AgentActivityPublisher = Callable[[AgentActivity], None]


def NONE(activity: AgentActivity) -> None:  # noqa: N802 - named like the constant it replaces
    """Publishes nothing."""
