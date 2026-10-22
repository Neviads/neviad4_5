from __future__ import annotations

import time

from . import agent_activity_publisher
from .agent_activity import AgentActivity
from .agent_activity_publisher import AgentActivityPublisher
from .code_session import Listener


class AgentSteps(Listener):
    """The steps of ONE agent run as the frontend shows them: the listener of the built-in tools, plus the steps the runner and the agent
    add themselves (a model call, a check). Display only: a problem in the publisher never stops an agent."""

    def __init__(self, publisher: AgentActivityPublisher | None, run_id: str, agent: str, title: str):
        self._publisher = publisher or agent_activity_publisher.NONE
        self._run_id = run_id
        self._agent = agent
        self._title = title

    def whole(self, phase: str, success: bool, message: str) -> None:
        """A step of the run as a whole (``tool`` is ``"agent"``)."""
        self.tool(AgentActivity.WHOLE_RUN, phase, success, message)

    def tool(self, tool: str, phase: str, success: bool, message: str | None) -> None:
        try:
            self._publisher(AgentActivity(self._run_id, self._agent, self._title, tool, phase, success, message or "", int(time.time() * 1000)))
        except Exception:  # a display problem never stops an agent
            pass

    def started(self, tool: str) -> None:
        self.tool(tool, AgentActivity.STARTED, True, "")

    def finished(self, tool: str, success: bool, message: str) -> None:
        self.tool(tool, AgentActivity.FINISHED, success, message)

    def progress(self, tool: str, message: str) -> None:
        self.tool(tool, AgentActivity.PROGRESS, True, message)
