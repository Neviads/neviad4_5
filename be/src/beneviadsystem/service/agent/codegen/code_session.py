from __future__ import annotations

import threading
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from enum import Enum, auto

from beneviadsystem.domain.exception import IllegalStateError
from beneviadsystem.domain.model.base import CamelModel, TextList
from beneviadsystem.infrastructure.ai.tool_callback import FunctionToolCallback, ToolCallback
from beneviadsystem.infrastructure.ai.tool_schema_lock import ToolSchemaLock
from beneviadsystem.service.text_format import java_lines

from .code_store import CodeStore, SearchRules

MAX_LISTED = 200
MAX_MATCHES = 40
MAX_MATCH_CHARS = 160
MAX_NOTE_CHARS = 4_000


@dataclass(frozen=True)
class Limits:
    """``max_reads`` counts read_file, list_files and search together; ``max_writes`` write_file and edit_file together."""

    max_reads: int
    max_writes: int
    max_notes: int
    max_file_chars: int
    max_patch_chars: int

    @classmethod
    def defaults(cls) -> Limits:
        return cls(60, 30, 20, 120_000, 20_000)


class Listener:
    """Receives progress of every tool call. Implementations must not raise."""

    def started(self, tool: str) -> None:
        pass

    def finished(self, tool: str, success: bool, message: str) -> None:
        pass

    def progress(self, tool: str, message: str) -> None:
        """The model is still generating the arguments of a call to ``tool``; ``message`` says how far it got."""


#: An extra reason to refuse ``finish`` (None means the agent may finish), asked after the built-in checks pass, with the session lock held.
FinishGate = Callable[["CodeSession"], "str | None"]
#: An extra reason to refuse a write of a path (None means it may go ahead), asked after the built-in checks pass, with the session lock held.
WriteGate = Callable[[str], "str | None"]


@dataclass(frozen=True)
class State:
    """Snapshot of what the agent has done."""

    reads: int
    writes: int
    notes: int
    finished: bool
    summary: str


class ReadInput(CamelModel):
    """For ``offset`` and ``limit``, 0 means "from the first line" and "to the end"."""

    path: str | None = None
    offset: int = 0
    limit: int = 0


class ListInput(CamelModel):
    """``folder`` empty means the whole tree."""

    folder: str | None = None


class SearchInput(CamelModel):
    query: str | None = None
    folder: str | None = None


class WriteInput(CamelModel):
    path: str | None = None
    content: str | None = None


class EditInput(CamelModel):
    path: str | None = None
    expected_text: str | None = None
    replacement: str | None = None


class NoteInput(CamelModel):
    text: str | None = None


class FinishInput(CamelModel):
    summary: str | None = None


class ToolResult(CamelModel):
    success: bool
    message: str
    content: str = ""
    items: TextList = []

    @classmethod
    def ok(cls, message: str) -> ToolResult:
        return cls(success=True, message=message)

    @classmethod
    def fail(cls, message: str) -> ToolResult:
        return cls(success=False, message=message)


class _Kind(Enum):
    READ = auto()
    WRITE = auto()
    NOTE = auto()
    OTHER = auto()


def _normalize(path: str | None) -> str:
    return "" if path is None else path.replace("\\", "/")


class CodeSession:
    """The tools of ONE code agent that works without gates: it reads the source tree on its own initiative (read, list, search), writes
    only the files assigned to it, keeps notes for the layers after it in a file of the frontend, and says when it is done. Every call is
    budgeted (an exhausted budget returns TOOL_BUDGET_EXCEEDED to the model instead of raising), and the agent cannot write before it has
    read the files it must read. It cannot finish without at least one note of its own (unless ``require_note`` is off), and finishing adds
    the session's ledger to the notes file, so the next layer always has the system's account as well as the agent's."""

    def __init__(self, store: CodeStore, layer_name: str, notes_path: str, writable: set[str] | Sequence[str], must_read: set[str] | Sequence[str],
                 limits: Limits, listener: Listener | None = None, extra_tools: Sequence[ToolCallback] = (), finish_gate: FinishGate | None = None,
                 require_note: bool = True, write_gate: WriteGate | None = None):
        """``writable`` are the only files this agent may write; ``must_read`` must have been read before the first write; ``extra_tools``
        are added to the seven built-in ones and are not counted by ``limits``."""
        self._store = store
        self._layer_name = layer_name
        self._notes_path = notes_path
        self._writable = frozenset(writable)
        self._must_read = frozenset(must_read)
        self._limits = limits
        self._listener = listener or Listener()
        self._extra_tools = list(extra_tools or [])
        self._finish_gate = finish_gate
        self._write_gate = write_gate
        self._require_note = require_note
        self._lock = threading.RLock()
        self._read: dict[str, None] = {}
        self._written: dict[str, None] = {}
        self._calls = self._reads = self._writes = self._notes = 0
        self._finished = False
        self._summary = ""
        self._callbacks = ToolSchemaLock.build(self._build_tools)

    def callbacks(self) -> list[ToolCallback]:
        return list(self._callbacks)

    @property
    def limits(self) -> Limits:
        return self._limits

    def state(self) -> State:
        with self._lock:
            return State(self._reads, self._writes, self._notes, self._finished, self._summary)

    def written_files(self) -> list[str]:
        """The files this session has written, in the order they were first written."""
        with self._lock:
            return list(self._written)

    def ledger(self) -> str:
        """The agent's own account of what it did, short enough to put at the top of a later agent's task."""
        with self._lock:
            status = ("đã xong" + ("" if not self._summary.strip() else " — " + self._summary)) if self._finished else "chưa xong"
            return (f"## Sổ cái của lớp {self._layer_name}\n"
                    f"- Đã đọc: {', '.join(self._read) if self._read else '(chưa)'}\n"
                    f"- Đã ghi: {', '.join(self._written) if self._written else '(chưa)'}\n"
                    f"- Số ghi chú: {self._notes}\n"
                    f"- Trạng thái: {status}\n")

    def _build_tools(self) -> list[ToolCallback]:
        def tool(name: str, input_type, description: str, action):
            return FunctionToolCallback(name, action, description=description, input_type=input_type)

        tools = [
            tool("read_file", ReadInput,
                 "Read a source file of fe/neviadlike_structure (any layer, README.md, the run notes). Input: {path, offset, limit}: offset is the first "
                 "line (1-based) and limit the number of lines; use 0 and 0 for the whole file. Returns the lines, the total line count and whether it was cut.",
                 lambda i: ToolResult.fail("path is required") if i is None else self._run("read_file", _Kind.READ, lambda: self._read_file(i))),
            tool("list_files", ListInput,
                 'List the files under a folder of fe/neviadlike_structure. Input: {folder}: a relative folder such as "engines" or "shared", or "" for '
                 "the whole tree. Look here first to learn what exists before you read or write.",
                 lambda i: self._run("list_files", _Kind.READ, lambda: self._list_files("" if i is None else i.folder))),
            tool("search", SearchInput,
                 'Find a piece of text (case-insensitive) in the readable files. Input: {query, folder}: folder "" searches the whole tree. Returns lines '
                 'as "path:line: text"; use it to see how a component or function is used elsewhere.',
                 lambda i: ToolResult.fail("query is required") if i is None else self._run("search", _Kind.READ, lambda: self._search(i))),
            tool("write_file", WriteInput,
                 "Create or fully replace one of YOUR files. Input: {path, content: the complete file}. Only the paths assigned to you are accepted, and "
                 "only after you have read the files you were told to read first.",
                 lambda i: ToolResult.fail("path and content are required") if i is None
                 else self._run("write_file", _Kind.WRITE, lambda: self._write_file(i.path, i.content))),
            tool("edit_file", EditInput,
                 "Replace ONE exact piece of one of YOUR files. Input: {path, expectedText: text that appears exactly once, replacement}. Prefer this to "
                 "write_file for a small change.",
                 lambda i: ToolResult.fail("path, expectedText and replacement are required") if i is None
                 else self._run("edit_file", _Kind.WRITE, lambda: self._edit_file(i))),
            tool("append_note", NoteInput,
                 "Add a note for the layers that come after you, to the shared notes file of this run. Input: {text}. Note decisions the next layer "
                 "cannot read from your code: names you chose, which engine value feeds which input of which object, assumptions. It only adds to the "
                 "end; read the notes file with read_file. At least one note is required before finish.",
                 lambda i: ToolResult.fail("text is required") if i is None else self._run("append_note", _Kind.NOTE, lambda: self._append_note(i.text))),
            tool("finish", FinishInput,
                 "Say that your layer is done. Input: {summary}: one or two sentences on what you wrote. Refused while any file assigned to you still "
                 "does not exist, and until you have written at least one note with append_note. When it succeeds, the system adds its own ledger of "
                 "what you read and wrote to the notes file.",
                 lambda i: self._run("finish", _Kind.OTHER, lambda: self._finish("" if i is None else i.summary))),
        ]
        return tools + self._extra_tools

    def _run(self, tool: str, kind: _Kind, action: Callable[[], ToolResult]) -> ToolResult:
        """Counts the call against its budget, runs it, and reports the outcome to the listener."""
        try:
            self._listener.started(tool)
        except Exception:  # a listener must never break a run
            pass
        with self._lock:
            denied = self._budget(kind)
            if denied is not None:
                result = ToolResult.fail(denied)
            else:
                self._calls += 1
                try:
                    result = action()
                except (ValueError, IllegalStateError) as failure:
                    result = ToolResult.fail(str(failure))
        try:
            self._listener.finished(tool, result.success, result.message)
        except Exception:
            pass
        return result

    def _budget(self, kind: _Kind) -> str | None:
        limits = self._limits
        if kind is _Kind.READ and self._reads >= limits.max_reads:
            return f"TOOL_BUDGET_EXCEEDED: đã dùng hết {limits.max_reads} lần đọc, tìm và liệt kê"
        if kind is _Kind.WRITE and self._writes >= limits.max_writes:
            return f"TOOL_BUDGET_EXCEEDED: đã dùng hết {limits.max_writes} lần ghi"
        if kind is _Kind.NOTE and self._notes >= limits.max_notes:
            return f"TOOL_BUDGET_EXCEEDED: đã dùng hết {limits.max_notes} ghi chú"
        return None

    def _read_file(self, request: ReadInput) -> ToolResult:
        path = _normalize(request.path)
        self._reads += 1
        text = self._store.read(path)
        if text is None:
            return ToolResult.fail("FILE_NOT_FOUND: chưa có file " + path)
        self._read[path] = None
        lines = java_lines(text)
        total = len(lines)
        first = max(1, request.offset)
        if first > total > 0:
            return ToolResult.fail(f"OFFSET_OUT_OF_RANGE: file chỉ có {total} dòng")
        last = min(total, first + request.limit - 1) if request.limit > 0 else total
        content = "\n".join(lines[min(first - 1, total):min(last, total)])
        cut = False
        if len(content) > self._limits.max_file_chars:
            content = content[:self._limits.max_file_chars]
            cut = True
        cut = cut or last < total
        return ToolResult(success=True, message=f"Dòng {first} đến {last} trên tổng {total} dòng" + (" (còn nữa: đọc tiếp bằng offset)" if cut else ""),
                          content=content)

    def _list_files(self, folder: str | None) -> ToolResult:
        self._reads += 1
        files = [f for f in self._store.list_files(_normalize(folder)) if SearchRules.readable(f)]
        cut = len(files) > MAX_LISTED
        shown = files[:MAX_LISTED]
        return ToolResult(success=True, message=f"{len(shown)} file" + (f" (đã cắt ở {MAX_LISTED}, hãy chỉ rõ thư mục con)" if cut else ""), items=shown)

    def _search(self, request: SearchInput) -> ToolResult:
        query = (request.query or "").strip()
        if not query:
            return ToolResult.fail("query is required")
        self._reads += 1
        matches = list(self._store.search(query, _normalize(request.folder), MAX_MATCHES, MAX_MATCH_CHARS))
        # A store marks a cut result with a last element that is not a match.
        cut = bool(matches) and matches[-1] == SearchRules.CUT_MARK
        if cut:
            matches.pop()
        return ToolResult(success=True, message=f"{len(matches)} kết quả" + (f" (đã cắt ở {MAX_MATCHES}, hãy thu hẹp từ khoá hoặc thư mục)" if cut else ""),
                          items=matches)

    def _write_file(self, path: str | None, content: str | None) -> ToolResult:
        denied = self._deny_write(path)
        if denied is not None:
            return ToolResult.fail(denied)
        if content is None or not content.strip():
            return ToolResult.fail("content is required")
        if len(content) > self._limits.max_file_chars:
            return ToolResult.fail(f"FILE_TOO_LARGE: tối đa {self._limits.max_file_chars} ký tự")
        normalized = _normalize(path)
        self._store.write(normalized, content)
        self._writes += 1
        self._written[normalized] = None
        return ToolResult.ok(f"Đã ghi {normalized} ({len(content)} ký tự).")

    def _edit_file(self, request: EditInput) -> ToolResult:
        denied = self._deny_write(request.path)
        if denied is not None:
            return ToolResult.fail(denied)
        expected, replacement = request.expected_text, request.replacement
        if not expected or replacement is None:
            return ToolResult.fail("expectedText and replacement are required")
        if len(expected) + len(replacement) > self._limits.max_patch_chars:
            return ToolResult.fail(f"PATCH_TOO_LARGE: sửa tối đa {self._limits.max_patch_chars} ký tự, hãy dùng write_file cho thay đổi lớn")
        path = _normalize(request.path)
        current = self._store.read(path)
        if current is None:
            return ToolResult.fail("FILE_NOT_FOUND: chưa có file " + path)
        first = current.find(expected)
        if first < 0:
            return ToolResult.fail("EXPECTED_TEXT_NOT_FOUND: đoạn expectedText không có trong file (hãy read_file để lấy đúng nguyên văn)")
        if current.find(expected, first + 1) >= 0:
            return ToolResult.fail("EXPECTED_TEXT_NOT_UNIQUE: đoạn expectedText xuất hiện nhiều lần, hãy kèm thêm ngữ cảnh")
        updated = current[:first] + replacement + current[first + len(expected):]
        if len(updated) > self._limits.max_file_chars:
            return ToolResult.fail(f"FILE_TOO_LARGE: tối đa {self._limits.max_file_chars} ký tự")
        self._store.write(path, updated)
        self._writes += 1
        self._written[path] = None
        return ToolResult.ok(f"Đã sửa {path}.")

    def _append_note(self, text: str | None) -> ToolResult:
        if text is None or not text.strip():
            return ToolResult.fail("text is required")
        if len(text) > MAX_NOTE_CHARS:
            return ToolResult.fail(f"NOTE_TOO_LARGE: mỗi ghi chú tối đa {MAX_NOTE_CHARS} ký tự")
        self._store.append_note(self._notes_path, f"\n## Lớp {self._layer_name}\n{text.strip()}")
        self._notes += 1
        return ToolResult.ok(f"Đã thêm ghi chú vào {self._notes_path}.")

    def _finish(self, text: str | None) -> ToolResult:
        if self._finished:
            return ToolResult.ok(f"Lớp {self._layer_name} đã xong từ trước.")
        if not self._written:
            return ToolResult.fail("NOT_DONE: bạn chưa ghi file nào.")
        missing = [path for path in sorted(self._writable) if not self._store.exists(path)]
        if missing:
            return ToolResult.fail("NOT_DONE: còn thiếu file được giao: " + ", ".join(missing))
        if self._require_note and self._notes == 0:
            return ToolResult.fail("NOTE_REQUIRED: hãy gọi append_note ít nhất một lần để ghi các quyết định mà lớp sau không đọc được từ code "
                                   "(tên bạn đã đặt, giá trị nào nối với đầu vào nào của vật), rồi gọi lại finish.")
        if self._finish_gate is not None:
            refused = self._finish_gate(self)
            if refused is not None:
                return ToolResult.fail("NOT_DONE: " + refused)
        self._finished = True
        self._summary = (text or "").strip()
        # The ledger is the system's own account, so a later layer has it even if the agent's notes are thin. It does not use up the note budget.
        try:
            self._store.append_note(self._notes_path, "\n" + self.ledger())
        except (ValueError, IllegalStateError) as failure:
            self._finished = False
            self._summary = ""
            return ToolResult.fail("NOT_DONE: không ghi được sổ cái vào ghi chú: " + str(failure))
        return ToolResult.ok(f"Đã ghi nhận lớp {self._layer_name} xong; sổ cái đã được thêm vào {self._notes_path}.")

    def _deny_write(self, path: str | None) -> str | None:
        """None when the write is allowed, otherwise the reason. Called with the session lock held."""
        try:
            self._store.check_path(path, True)
        except ValueError as failure:
            return str(failure)
        normalized = _normalize(path)
        if normalized not in self._writable:
            return f"PATH_NOT_ALLOWED: lớp {self._layer_name} chỉ được ghi " + ", ".join(sorted(self._writable))
        unread = sorted(p for p in self._must_read if p not in self._read)
        if unread:
            return "MUST_READ_FIRST: hãy read_file các file sau trước khi ghi: " + ", ".join(unread)
        return None if self._write_gate is None else self._write_gate(normalized)
