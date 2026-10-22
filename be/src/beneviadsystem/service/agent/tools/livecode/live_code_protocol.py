"""Wire contract between the backend code agents and the frontend's copy of ``neviadlike_structure`` (see ``fe/lib/code-fs``). The frontend
owns the files; every operation is one request/response pair correlated by ``callId`` and scoped to a ``runId``. The backend validates every
path before it sends one."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


class LiveCodeProtocol:
    OP_FS_READ = "fsRead"
    OP_FS_WRITE = "fsWrite"
    OP_FS_LIST = "fsList"
    OP_FS_APPEND = "fsAppend"
    OP_FS_SEARCH = "fsSearch"

    ERROR_TIMEOUT = "TIMEOUT"
    ERROR_BRIDGE = "BRIDGE_ERROR"
    ERROR_INTERRUPTED = "INTERRUPTED"


@dataclass(frozen=True)
class Call:
    """Backend -> frontend request."""

    call_id: str
    run_id: str
    op: str
    args: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class Result:
    """Frontend -> backend response. ``data`` carries what the operation returns, such as ``content`` or ``files``."""

    call_id: str | None
    run_id: str | None
    ok: bool
    data: dict[str, Any] | None = None
    message: str | None = None

    @classmethod
    def failure(cls, call_id: str | None, run_id: str | None, code: str, message: str) -> Result:
        return cls(call_id, run_id, False, {}, f"{code}: {message}")

    @classmethod
    def from_wire(cls, payload: dict[str, Any]) -> Result:
        data = payload.get("data")
        return cls(payload.get("callId"), payload.get("runId"), bool(payload.get("ok")), data if isinstance(data, dict) else {}, payload.get("message"))

    def get(self, key: str) -> Any:
        return None if self.data is None else self.data.get(key)
