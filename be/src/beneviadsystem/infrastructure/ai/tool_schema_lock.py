from __future__ import annotations

import threading
from collections.abc import Callable
from typing import TypeVar

T = TypeVar("T")

_LOCK = threading.Lock()


class ToolSchemaLock:
    """Agents that run at once each build their tools; building goes through this one lock so the tools of one agent are built
    together and the schema cache of :func:`tool_input_schema` is filled by one thread at a time."""

    @staticmethod
    def build(builder: Callable[[], T]) -> T:
        with _LOCK:
            return builder()
