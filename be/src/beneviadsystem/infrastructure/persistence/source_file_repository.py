from __future__ import annotations

from beneviadsystem.domain.model.source_file import SourceFile

from .database import Database

TEMPLATE = "template"


class SourceFileRepository:
    """Stored source files by collection, read-only (``fe/scripts/push-source.mjs`` writes them). The collection ``template`` lives in its own
    table ``template_file`` (V3); every other collection is in ``source_file`` (V2), whose old ``template`` rows are no longer read."""

    def __init__(self, database: Database | None):
        self._database = database

    def find_all(self, collection: str) -> list[SourceFile]:
        """Every file of the collection with its content, sorted by path."""
        if collection == TEMPLATE:
            rows = self._db().query("SELECT path, content FROM template_file ORDER BY path")
        else:
            rows = self._db().query("SELECT path, content FROM source_file WHERE collection = %s ORDER BY path", (collection,))
        return [SourceFile(path, content) for path, content in rows]

    def find(self, collection: str, path: str) -> SourceFile | None:
        if collection == TEMPLATE:
            rows = self._db().query("SELECT path, content FROM template_file WHERE path = %s", (path,))
        else:
            rows = self._db().query("SELECT path, content FROM source_file WHERE collection = %s AND path = %s", (collection, path))
        return SourceFile(rows[0][0], rows[0][1]) if rows else None

    def _db(self) -> Database:
        if self._database is None:
            raise RuntimeError("Chưa cấu hình cơ sở dữ liệu: đặt DB_URL, DB_USERNAME, DB_PASSWORD.")
        return self._database
