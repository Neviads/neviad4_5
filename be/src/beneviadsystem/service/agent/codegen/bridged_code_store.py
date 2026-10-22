from __future__ import annotations

from typing import Any

from beneviadsystem.domain.exception import IllegalStateError
from beneviadsystem.service.agent.tools.livecode.live_code_bridge import LiveCodeBridge
from beneviadsystem.service.agent.tools.livecode.live_code_protocol import LiveCodeProtocol, Result

from .code_store import CodeStore
from .source_store import SourceStore

DEFAULT_TIMEOUT_SECONDS = 15.0


class BridgedCodeStore(CodeStore):
    """The tree of ``neviadlike_structure`` as the browser holds it: every operation is one request to the frontend through the
    :class:`LiveCodeBridge`, answered from the copy in IndexedDB. Paths are validated here before anything is sent. A failure of the bridge
    or of the browser is an :class:`IllegalStateError`."""

    def __init__(self, bridge: LiveCodeBridge, run_id: str, timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS):
        self._bridge = bridge
        self._run_id = run_id
        self._timeout = timeout_seconds

    def read(self, path: str) -> str | None:
        content = self._call(LiveCodeProtocol.OP_FS_READ, {"path": SourceStore.validate_path(path, False)}).get("content")
        return content if isinstance(content, str) else None

    def write(self, path: str, content: str) -> None:
        self._call(LiveCodeProtocol.OP_FS_WRITE, {"path": SourceStore.validate_path(path, True), "content": content})

    def exists(self, path: str) -> bool:
        return self.read(path) is not None

    def list_files(self, folder: str) -> list[str]:
        files = self._call(LiveCodeProtocol.OP_FS_LIST, {"folder": (folder or "").replace("\\", "/")}).get("files")
        return [str(item) for item in files] if isinstance(files, list) else []

    def append_note(self, path: str, text: str) -> None:
        self._call(LiveCodeProtocol.OP_FS_APPEND, {"path": SourceStore.validate_note_path(path), "text": text})

    def check_path(self, path: str, for_write: bool) -> None:
        SourceStore.validate_path(path, for_write)

    def search(self, query: str, folder: str, max_matches: int, max_line_chars: int) -> list[str]:
        """One request to the browser instead of a read per file."""
        matches = self._call(LiveCodeProtocol.OP_FS_SEARCH, {"query": query, "folder": folder or "", "max": max_matches,
                                                             "maxLineChars": max_line_chars}).get("matches")
        return [str(item) for item in matches] if isinstance(matches, list) else []

    def _call(self, op: str, args: dict[str, Any]) -> Result:
        result = self._bridge.call(self._run_id, op, args, self._timeout)
        if not result.ok:
            raise IllegalStateError(result.message if result.message and result.message.strip() else f"Trình duyệt không trả lời {op}")
        return result
