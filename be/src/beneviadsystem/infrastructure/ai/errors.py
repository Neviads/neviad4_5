"""How a failure is put in words for a log line or a message the model or the teacher reads."""
from __future__ import annotations


def describe(failure: BaseException | None, limit: int = 400) -> str:
    """The exception and its causes by class and message, so a dropped connection is not reported as an empty string."""
    parts: list[str] = []
    seen: set[int] = set()
    current = failure
    while current is not None and id(current) not in seen and sum(len(p) for p in parts) < limit:
        seen.add(id(current))
        message = str(current).strip()
        parts.append(type(current).__name__ + (f": {message}" if message else ""))
        current = current.__cause__ or (None if current.__suppress_context__ else current.__context__)
    return " <- ".join(parts)


def root_summary(failure: BaseException) -> str:
    """The deepest cause by class and message."""
    root = failure
    while root.__cause__ is not None:
        root = root.__cause__
    message = str(root).strip()
    return type(root).__name__ + (f": {message}" if message else "")
