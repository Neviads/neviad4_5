from __future__ import annotations

import logging
from collections.abc import Callable

from beneviadsystem.infrastructure.messaging.messaging_template import MessagingTemplate
from beneviadsystem.presentation.dto.simulation.run_draft import RunDraft

from .code_draft_streamer import CODE_AGENT_TOOLS, CodeDraftStreamer

log = logging.getLogger(__name__)


class CodeDraftPublisher:
    """Sends :class:`RunDraft` events to ``/topic/agents/simulation/{runId}/draft``, the topic the frontend's ``useLiveCode`` listens to. A
    failed send is dropped: a preview never stops an agent."""

    def __init__(self, messaging: MessagingTemplate):
        self._messaging = messaging

    @staticmethod
    def topic(run_id: str) -> str:
        return f"/topic/agents/simulation/{run_id}/draft"

    def publish(self, draft: RunDraft) -> None:
        try:
            self._messaging.convert_and_send(self.topic(draft.run_id), draft)
        except Exception as failure:
            log.debug("Could not publish code draft: runId=%s, error=%s", draft.run_id, failure)

    def streamer(self, run_id: str, title: str | None = None, path: str | None = None) -> CodeDraftStreamer:
        """A streamer whose events go to the run's draft topic, ending each file with END (code agents write into the browser copy, which
        has no store event). ``title`` names the object an agent draws; ``path`` is the one file it may write."""
        return CodeDraftStreamer(run_id, self.publish, CODE_AGENT_TOOLS, True, title or "", path or "")

    def sink(self) -> Callable[[RunDraft], None]:
        return self.publish
