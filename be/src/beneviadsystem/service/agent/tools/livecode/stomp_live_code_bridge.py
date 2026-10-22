from __future__ import annotations

import logging
import threading
import uuid
from concurrent.futures import Future
from concurrent.futures import TimeoutError as FutureTimeout
from dataclasses import dataclass
from typing import Any

from beneviadsystem.infrastructure.messaging.messaging_template import MessagingTemplate

from .live_code_bridge import LiveCodeBridge
from .live_code_protocol import Call, LiveCodeProtocol, Result

log = logging.getLogger(__name__)
TOPIC_PREFIX = "/topic/agents/livecode/"


@dataclass
class _Pending:
    run_id: str
    future: Future


class StompLiveCodeBridge(LiveCodeBridge):
    """STOMP request/response bridge: publishes a call to the run's topic and waits for the matching result."""

    TOPIC_PREFIX = TOPIC_PREFIX

    def __init__(self, messaging: MessagingTemplate):
        self._messaging = messaging
        self._pending: dict[str, _Pending] = {}
        self._lock = threading.Lock()

    def call(self, run_id: str, op: str, args: dict[str, Any], timeout_seconds: float) -> Result:
        call_id = str(uuid.uuid4())
        future: Future = Future()
        with self._lock:
            self._pending[call_id] = _Pending(run_id, future)
        try:
            self._messaging.convert_and_send(TOPIC_PREFIX + run_id, Call(call_id, run_id, op, dict(args or {})))
            return future.result(timeout=timeout_seconds)
        except FutureTimeout:
            return Result.failure(call_id, run_id, LiveCodeProtocol.ERROR_TIMEOUT,
                                  f"the editor did not answer '{op}' within {int(timeout_seconds)}s; it may be closed or disconnected")
        except Exception as failure:  # a transport problem is a failed result, never an exception
            log.warning("Live code call failed: runId=%s, op=%s, error=%r", run_id, op, failure)
            return Result.failure(call_id, run_id, LiveCodeProtocol.ERROR_BRIDGE, "could not reach the editor")
        finally:
            with self._lock:
                self._pending.pop(call_id, None)

    def complete(self, result: Result | None) -> bool:
        """Called by the message handler. A result is accepted only for a pending call of the same run, so one tab cannot answer another
        run's calls. Returns False when nothing matched."""
        if result is None or result.call_id is None:
            return False
        with self._lock:
            entry = self._pending.get(result.call_id)
        if entry is None or entry.run_id is None or entry.run_id != result.run_id:
            return False
        if entry.future.done():
            return False
        entry.future.set_result(result)
        return True

    def pending_count(self) -> int:
        with self._lock:
            return len(self._pending)
