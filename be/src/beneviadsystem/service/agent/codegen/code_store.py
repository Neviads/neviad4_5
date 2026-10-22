from __future__ import annotations

from abc import ABC, abstractmethod

from beneviadsystem.service.text_format import java_lines


class SearchRules:
    """Which files a search or listing looks at; shared by the stores."""

    #: The last element of a search result that was cut.
    CUT_MARK = "…"
    READABLE = (".ts", ".tsx", ".md", ".json")

    @staticmethod
    def readable(path: str) -> bool:
        return path.endswith(SearchRules.READABLE)


class CodeStore(ABC):
    """Where the files of ``neviadlike_structure`` live while an agent works on them: in the browser (:class:`BridgedCodeStore`), the
    database template, or on disk. Paths are relative to the root of the tree; an implementation refuses unsafe ones with ``ValueError``
    and reports any other trouble with :class:`IllegalStateError`."""

    @abstractmethod
    def read(self, path: str) -> str | None:
        """The content, or None when the file does not exist."""

    @abstractmethod
    def write(self, path: str, content: str) -> None: ...

    @abstractmethod
    def exists(self, path: str) -> bool: ...

    @abstractmethod
    def list_files(self, folder: str) -> list[str]:
        """Relative paths of every file under a folder (``""`` is the whole tree), sorted."""

    @abstractmethod
    def append_note(self, path: str, text: str) -> None:
        """Appends to a run note (``_notes/<name>.md``); it can only add to the end."""

    @abstractmethod
    def check_path(self, path: str, for_write: bool) -> None:
        """Raises ``ValueError`` when the path is not allowed to be read or written."""

    def search(self, query: str, folder: str, max_matches: int, max_line_chars: int) -> list[str]:
        """Case-insensitive search over the readable files, as ``path:line: text`` lines, at most ``max_matches`` of them plus
        :data:`SearchRules.CUT_MARK` when there were more. Override it when one call is cheaper than a read per file."""
        needle = query.lower()
        matches: list[str] = []
        for file in self.list_files(folder):
            if not SearchRules.readable(file):
                continue
            for number, line in enumerate(java_lines(self.read(file) or ""), start=1):
                if needle not in line.lower():
                    continue
                if len(matches) >= max_matches:
                    matches.append(SearchRules.CUT_MARK)
                    return matches
                shown = line.strip()
                matches.append(f"{file}:{number}: " + (shown[:max_line_chars] + "…" if len(shown) > max_line_chars else shown))
        return matches
