from __future__ import annotations

from typing import Any

from .live_code_protocol import Result
from .stomp_live_code_bridge import StompLiveCodeBridge

#: The application destination the frontend sends results to (``/app`` + this).
RESULT_DESTINATION = "/agents/livecode/result"


class LiveCodeMessageHandler:
    """Receives tool results from the frontend editor. Must stay non-blocking: it only completes a future."""

    def __init__(self, bridge: StompLiveCodeBridge):
        self._bridge = bridge

    def result(self, payload: Result | dict[str, Any] | None) -> bool:
        if isinstance(payload, dict):
            payload = Result.from_wire(payload)
        return self._bridge.complete(payload)
