from __future__ import annotations

from dataclasses import dataclass
from typing import ClassVar


@dataclass(frozen=True)
class AgentActivity:
    """One step of an agent that the frontend may show while the agent works (display only; what counts is decided by the session).

    ``agent`` tells runs apart that share one ``run_id`` (the parts of an assembly); ``title`` is what that run makes; ``tool`` is the tool
    or ``"agent"`` for the run as a whole; ``phase`` is STARTED, FINISHED or PROGRESS (still generating, e.g. a file being written);
    ``success`` says whether a FINISHED step went well; ``message`` is a short account; ``at`` is epoch milliseconds."""

    STARTED: ClassVar[str] = "STARTED"
    FINISHED: ClassVar[str] = "FINISHED"
    PROGRESS: ClassVar[str] = "PROGRESS"
    WHOLE_RUN: ClassVar[str] = "agent"
    TOPIC_PREFIX: ClassVar[str] = "/topic/agents/activity/"

    run_id: str
    agent: str
    title: str
    tool: str
    phase: str
    success: bool
    message: str
    at: int
