from __future__ import annotations

from collections.abc import Iterable

from beneviadsystem.domain.exception import IllegalStateError
from beneviadsystem.domain.model.source_file import SourceFile

from .code_store import CodeStore
from .source_store import SourceStore


class TemplateCodeStore(CodeStore):
    """The template tree as stored in the database, held in memory and read-only: put an :class:`OverlayCodeStore` on top of it so an
    agent can write. Same path rules as the disk store."""

    def __init__(self, files: Iterable[SourceFile]):
        self._files = {file.path: file.content for file in files}

    def read(self, path: str) -> str | None:
        return self._files.get(SourceStore.validate_path(path, False))

    def write(self, path: str, content: str) -> None:
        raise IllegalStateError("template trong DB chỉ đọc: " + path)

    def exists(self, path: str) -> bool:
        return SourceStore.validate_path(path, False) in self._files

    def list_files(self, folder: str) -> list[str]:
        prefix = "" if not folder or not folder.strip() else (folder if folder.endswith("/") else folder + "/")
        return sorted(path for path in self._files if path.startswith(prefix))

    def append_note(self, path: str, text: str) -> None:
        raise IllegalStateError("template trong DB chỉ đọc: " + path)

    def check_path(self, path: str, for_write: bool) -> None:
        SourceStore.validate_path(path, for_write)
