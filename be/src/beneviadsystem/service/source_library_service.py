from __future__ import annotations

import re

from beneviadsystem.domain.model.source_file import SourceFile
from beneviadsystem.infrastructure.persistence.source_file_repository import SourceFileRepository
from beneviadsystem.service.agent.codegen.source_store import SourceStore
from beneviadsystem.service.agent.codegen.template_code_store import TemplateCodeStore

#: The collection the code agents work on: the tree of fe/neviadlike_structure, loaded by ``npm --prefix fe run push:template``.
TEMPLATE = "template"
_COLLECTION = re.compile(r"^[a-z0-9-]{1,40}$")


class SourceLibraryService:
    """Source code kept in the database, grouped in collections. Read-only here: ``fe/scripts/push-source.mjs`` loads the table. Paths follow
    the rules of the agent's file tree; a bad collection or path is a ``ValueError``."""

    TEMPLATE = TEMPLATE

    def __init__(self, repository: SourceFileRepository):
        self._repository = repository

    def files(self, collection: str) -> list[SourceFile]:
        return self._repository.find_all(_check_collection(collection))

    def template_store(self) -> TemplateCodeStore:
        """The template as it is in the database now, read-only; ``RuntimeError`` when it has not been loaded."""
        files = self.files(TEMPLATE)
        if not files:
            raise RuntimeError("Template chưa có trong DB: chạy npm --prefix fe run push:template.")
        return TemplateCodeStore(files)

    def file(self, collection: str, path: str) -> SourceFile | None:
        collection = _check_collection(collection)
        return self._repository.find(collection, SourceStore.validate_path(path, False))


def _check_collection(collection: str | None) -> str:
    if collection is None or not _COLLECTION.match(collection):
        raise ValueError(f"collection không hợp lệ: {collection}")
    return collection
