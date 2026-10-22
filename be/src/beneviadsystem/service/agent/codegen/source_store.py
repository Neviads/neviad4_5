from __future__ import annotations

import os
import re
from pathlib import Path

from beneviadsystem.domain.exception import IllegalStateError

from .code_store import CodeStore

_SAFE_PATH = re.compile(r"^[A-Za-z0-9_./-]+$")
_WRITABLE = (".ts", ".tsx")
_READABLE = (".ts", ".tsx", ".md", ".json")
#: Folder of the run notes (see :meth:`SourceStore.append_note`).
NOTES_DIR = "_notes/"


class SourceStore(CodeStore):
    """The source tree of ``fe/neviadlike_structure`` on disk. Every path is relative to that root, plain ASCII, and cannot leave it.
    Writing is limited to TypeScript files; reading also allows the README and JSON contracts."""

    NOTES_DIR = NOTES_DIR

    def __init__(self, root: str | os.PathLike[str]):
        self._root = Path(root).resolve()

    @property
    def root(self) -> Path:
        return self._root

    @staticmethod
    def validate_path(relative: str | None, for_write: bool) -> str:
        """The path with forward slashes, or ``ValueError`` when it is unsafe or has an extension that may not be read or written. The
        same rules apply wherever the tree lives, so the browser store uses this too."""
        if relative is None or not relative.strip():
            raise ValueError("path is required")
        path = relative.replace("\\", "/")
        if not _SAFE_PATH.match(path) or path.startswith("/") or ".." in path or "//" in path:
            raise ValueError("đường dẫn không hợp lệ: " + relative)
        if not path.endswith(_WRITABLE if for_write else _READABLE):
            raise ValueError(f"đuôi file không được phép {'ghi' if for_write else 'đọc'}: {relative}")
        return path

    @staticmethod
    def validate_note_path(relative: str | None) -> str:
        """The note path with forward slashes: only ``_notes/<name>.md``, nothing deeper."""
        path = (relative or "").replace("\\", "/")
        if not path.startswith(NOTES_DIR) or not path.endswith(".md") or "/" in path[len(NOTES_DIR):]:
            raise ValueError(f"ghi chú chỉ được nằm ở {NOTES_DIR}<tên>.md: {relative}")
        return SourceStore.validate_path(path, False)

    def check_path(self, path: str, for_write: bool) -> None:
        self.validate_path(path, for_write)

    def resolve(self, relative: str, for_write: bool) -> Path:
        """The absolute path of a relative one, or ``ValueError`` when it is unsafe."""
        path = self.validate_path(relative, for_write)
        resolved = (self._root / path).resolve()
        if not resolved.is_relative_to(self._root):
            raise ValueError("đường dẫn ra ngoài thư mục gốc: " + relative)
        return resolved

    def exists(self, path: str) -> bool:
        return self.resolve(path, False).is_file()

    def read(self, path: str) -> str | None:
        file = self.resolve(path, False)
        try:
            return file.read_text(encoding="utf-8").replace("\r\n", "\n") if file.is_file() else None
        except OSError as failure:
            raise IllegalStateError(f"Không đọc được {path}: {failure}") from failure

    def write(self, path: str, content: str) -> None:
        file = self.resolve(path, True)
        try:
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text(content if content.endswith("\n") else content + "\n", encoding="utf-8", newline="\n")
        except OSError as failure:
            raise IllegalStateError(f"Không ghi được {path}: {failure}") from failure

    def append_note(self, path: str, text: str) -> None:
        """Appends to a run note, ``_notes/<name>.md``: the only place besides TypeScript files that an agent may write, and it can only add
        to the end, so a later layer can never erase what an earlier one noted."""
        clean = self.validate_note_path(path)
        if text is None or not text.strip():
            raise ValueError("nội dung ghi chú trống")
        file = self.resolve(clean, False)
        try:
            file.parent.mkdir(parents=True, exist_ok=True)
            with file.open("a", encoding="utf-8", newline="\n") as out:
                out.write(text if text.endswith("\n") else text + "\n")
        except OSError as failure:
            raise IllegalStateError(f"Không ghi được {path}: {failure}") from failure

    def list_files(self, folder: str) -> list[str]:
        start = self._root if not folder or not folder.strip() else (self._root / folder).resolve()
        if not start.is_relative_to(self._root) or not start.is_dir():
            return []
        return sorted(p.relative_to(self._root).as_posix() for p in start.rglob("*") if p.is_file())
