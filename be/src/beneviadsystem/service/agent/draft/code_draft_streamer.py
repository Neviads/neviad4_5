from __future__ import annotations

import time
from collections.abc import Callable, Mapping, Set

from beneviadsystem.infrastructure.ai.json_string_field_stream import JsonStringFieldStream
from beneviadsystem.infrastructure.ai.tool_stream_listener import ToolStreamListener
from beneviadsystem.presentation.dto.simulation.run_draft import RunDraft

WRITE_FILE = frozenset({"write_file"})
#: What a code agent writes: a whole file, or the replacement of one piece of a file.
CODE_AGENT_TOOLS = {"write_file": "content", "edit_file": "replacement"}
FLUSH_SECONDS = 0.15


class CodeDraftStreamer(ToolStreamListener):
    """Shows code while the model is still writing it: pulls one string argument out of the streamed arguments of a tool (``content`` of
    ``write_file``: the whole file; ``replacement`` of ``edit_file``: only the new piece) and publishes it in small batches as
    :class:`RunDraft` events that carry the tool and the file path. Display only; the real file still goes through the tools and the checks.

    ``tools`` is a set of tool names whose ``content`` streams, or a mapping of tool name to the argument that holds the code.
    ``announce_end`` also publishes END when a call is fully received (for runs whose files do not arrive as a store event). ``title`` is put
    on every event, so agents drawing at once on one run can be told apart. ``fixed_path`` is the one file the agent may write, on every event
    from the start whatever order the model writes its arguments in."""

    def __init__(self, run_id: str, out: Callable[[RunDraft], None], tools: Set[str] | Mapping[str, str] = WRITE_FILE, announce_end: bool = False,
                 title: str | None = "", fixed_path: str | None = ""):
        self._run_id = run_id
        self._out = out
        self._fields = dict(tools) if isinstance(tools, Mapping) else {tool: "content" for tool in tools}
        self._announce_end = announce_end
        self._title = title or ""
        self._fixed_path = fixed_path or ""
        self._pending: list[str] = []
        self._content: JsonStringFieldStream | None = None
        self._path_field: JsonStringFieldStream | None = None
        self._tool = ""
        self._path = ""
        self._seq = 0
        self._last_flush = 0.0

    def on_tool_call_started(self, tool_name):
        if tool_name not in self._fields:
            return
        self._tool = tool_name
        self._content = JsonStringFieldStream(self._fields[tool_name])
        self._path_field = JsonStringFieldStream("path")
        self._path = ""
        self._pending = []
        self._last_flush = time.monotonic()
        self._send(RunDraft.START, "")

    def on_tool_arguments_delta(self, tool_name, json_fragment):
        if self._content is None or self._tool != tool_name:
            return
        if not self._path_field.finished():
            self._path += self._path_field.feed(json_fragment)
        self._pending.append(self._content.feed(json_fragment))
        if time.monotonic() - self._last_flush >= FLUSH_SECONDS:
            self._flush()

    def on_tool_call_finished(self, tool_name):
        if self._content is None or self._tool != tool_name:
            return
        self._flush()
        self._content = None
        if self._announce_end:
            self._send(RunDraft.END, "")

    def on_stream_aborted(self):
        if self._content is None:
            return
        self._content = None
        self._pending = []
        self._send(RunDraft.ABORT, "")

    def _shown_path(self) -> str:
        """The fixed file, else the path the model has written in full (never a half-written one, which would name a file that does not exist)."""
        if self._fixed_path:
            return self._fixed_path
        return self._path if self._path_field is not None and self._path_field.finished() else ""

    def _flush(self) -> None:
        self._last_flush = time.monotonic()
        text = "".join(self._pending)
        if not text:
            return
        self._pending = []
        self._send(RunDraft.DELTA, text)

    def _send(self, kind: str, text: str) -> None:
        self._out(RunDraft(self._run_id, kind, text, self._seq, self._shown_path(), self._tool, self._title))
        self._seq += 1
