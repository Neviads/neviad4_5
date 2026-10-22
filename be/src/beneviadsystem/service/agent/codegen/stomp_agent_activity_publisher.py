from __future__ import annotations

import logging

from beneviadsystem.infrastructure.messaging.messaging_template import MessagingTemplate

from .agent_activity import AgentActivity

log = logging.getLogger(__name__)


class StompAgentActivityPublisher:
    """Publishes every step to ``/topic/agents/activity/{runId}``."""

    def __init__(self, messaging: MessagingTemplate):
        self._messaging = messaging

    def __call__(self, activity: AgentActivity) -> None:
        self.publish(activity)

    def publish(self, activity: AgentActivity) -> None:
        try:
            self._messaging.convert_and_send(AgentActivity.TOPIC_PREFIX + activity.run_id, activity)
        except Exception as failure:  # display only
            log.debug("Không gửi được bước của agent: %s", failure)
