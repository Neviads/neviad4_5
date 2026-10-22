from beneviadsystem.domain.model.base import CamelModel


class SourceFile(CamelModel):
    """One stored source file of a collection, its path relative to the collection's root (e.g. ``shared/view-transform.ts``)."""

    path: str
    content: str

    def __init__(self, path: str | None = None, content: str | None = None, **data):
        if path is not None:
            data["path"] = path
        if content is not None:
            data["content"] = content
        super().__init__(**data)
