from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field

from beneviadsystem.infrastructure.ai.tool_callback import ToolCallback
from beneviadsystem.infrastructure.ai.tool_stream_listener import ToolStreamListener

from .code_session import FinishGate, Limits, Listener, WriteGate

DEFAULT_CONTINUATION_HINT = ("Hãy đọc lại các file đã ghi để biết chúng đang ra sao, sửa chỗ còn thiếu hoặc sai bằng `edit_file`, ghi chú nếu chưa, "
                             "rồi `finish`.")


@dataclass(frozen=True)
class AgentSpec:
    """Everything an outside caller supplies for one run of :class:`AgentRunner`: what the agent is told, which files it may write and must
    read first, and optionally tools and a finish condition of its own. The runner knows nothing about experiments, layers or objects.

    ``system`` is the system prompt; ``task`` the first user message; ``label`` the name in the ledger, notes and log; ``notes_path``
    ``_notes/<name>.md`` shared by every round; ``writable`` the only files the agent may write; ``must_read`` files to read before the first
    write; ``limits`` the budgets of the built-in tools; ``continuation_hint`` the last sentence handed to a later round; ``extra_tools``
    tools added to the built-in ones and ``extra_tool_calls`` how many calls of them the model may make; ``finish_gate``/``write_gate``
    extra reasons to refuse; ``listener`` told of every built-in tool call; ``require_note`` whether finish needs a note;
    ``reasoning_effort`` of every model turn (None = the provider's own); ``extra_stream`` also told of the streamed tool arguments."""

    system: str
    task: str
    label: str
    notes_path: str
    writable: frozenset[str]
    must_read: frozenset[str]
    limits: Limits | None = None
    continuation_hint: str | None = None
    extra_tools: Sequence[ToolCallback] = field(default_factory=tuple)
    extra_tool_calls: int = 0
    finish_gate: FinishGate | None = None
    listener: Listener | None = None
    require_note: bool = True
    reasoning_effort: str | None = None
    extra_stream: ToolStreamListener | None = None
    write_gate: WriteGate | None = None

    def __post_init__(self):
        object.__setattr__(self, "limits", self.limits or Limits.defaults())
        if not self.continuation_hint or not self.continuation_hint.strip():
            object.__setattr__(self, "continuation_hint", DEFAULT_CONTINUATION_HINT)
        object.__setattr__(self, "extra_tools", tuple(self.extra_tools or ()))
        object.__setattr__(self, "extra_tool_calls", max(0, self.extra_tool_calls))
        object.__setattr__(self, "writable", frozenset(self.writable))
        object.__setattr__(self, "must_read", frozenset(self.must_read))

    @classmethod
    def of(cls, system: str, task: str, label: str, notes_path: str, writable, must_read) -> AgentSpec:
        """A spec with the default limits and no extra tools, finish condition or continuation wording."""
        return cls(system, task, label, notes_path, writable, must_read)
