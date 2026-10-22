from __future__ import annotations

import threading

from .code_store import CodeStore
from .source_store import SourceStore


class OverlayCodeStore(CodeStore):
    """A copy of the tree that lives only for one run: it reads a base tree (the template from the database, or a :class:`SourceStore`)
    and keeps every write and note in memory on top of it, so an agent can run without the browser and without leaving files behind."""

    def __init__(self, base: CodeStore):
        self._base = base
        self._written: dict[str, str] = {}
        self._lock = threading.Lock()

    def read(self, path: str) -> str | None:
        clean = SourceStore.validate_path(path, False)
        with self._lock:
            own = self._written.get(clean)
        return own if own is not None else self._base.read(clean)

    def write(self, path: str, content: str) -> None:
        clean = SourceStore.validate_path(path, True)
        with self._lock:
            self._written[clean] = content if content.endswith("\n") else content + "\n"

    def exists(self, path: str) -> bool:
        clean = SourceStore.validate_path(path, False)
        with self._lock:
            if clean in self._written:
                return True
        return self._base.exists(clean)

    def list_files(self, folder: str) -> list[str]:
        prefix = "" if not folder or not folder.strip() else (folder if folder.endswith("/") else folder + "/")
        files = set(self._base.list_files(folder))
        with self._lock:
            files.update(path for path in self._written if path.startswith(prefix))
        return sorted(files)

    def append_note(self, path: str, text: str) -> None:
        clean = SourceStore.validate_note_path(path)
        if text is None or not text.strip():
            raise ValueError("nội dung ghi chú trống")
        line = text if text.endswith("\n") else text + "\n"
        with self._lock:
            current = self._written.get(clean)
            self._written[clean] = (current if current is not None else (self._base.read(clean) or "")) + line

    def check_path(self, path: str, for_write: bool) -> None:
        SourceStore.validate_path(path, for_write)
