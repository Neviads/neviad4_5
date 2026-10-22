from __future__ import annotations

import logging
import re
import time
from dataclasses import dataclass, field

from beneviadsystem.infrastructure.ai.ai_client import AiClient
from beneviadsystem.infrastructure.ai.ai_request import AiRequest
from beneviadsystem.infrastructure.ai.errors import describe
from beneviadsystem.infrastructure.ai.structured_output_schema_registry import StructuredOutputSchemaRegistry
from beneviadsystem.infrastructure.ai.tool_stream_listener import ToolStreamListener

from .agent_spec import AgentSpec
from .code_session import CodeSession, Listener
from .code_store import CodeStore

log = logging.getLogger(__name__)
MAX_ROUNDS = 3
TOOL_CALL_MARGIN = 10


@dataclass(frozen=True)
class Outcome:
    """``status`` is ``"finished"`` only when the session says so; ``files`` are the files the agent wrote; ``failures`` says, one line per
    round, why a round of model calls failed, so the caller can show it."""

    status: str
    rounds: int
    summary: str
    ledger: str
    notes_path: str
    files: list[str]
    failures: list[str] = field(default_factory=list)


def _tell(listener: Listener | None, event: str, *args) -> None:
    """Calls ``listener.<event>(*args)``; a display problem never stops an agent."""
    if listener is None:
        return
    try:
        getattr(listener, event)(*args)
    except Exception:
        pass


class _Progress(ToolStreamListener):
    """Turns the streamed tool arguments into a few progress lines: which file is being written and how many characters so far."""

    EVERY_SECONDS = 1.5
    PATH = re.compile(r'"path"\s*:\s*"([^"]+)"')

    def __init__(self, listener: Listener):
        self._listener = listener
        self._tool = ""
        self._head = ""
        self._chars = 0
        self._last_told = 0.0

    def on_tool_call_started(self, tool_name):
        self._tool = tool_name
        self._head = ""
        self._chars = 0
        self._last_told = time.monotonic()
        _tell(self._listener, "progress", tool_name, "model bắt đầu viết")

    def on_tool_arguments_delta(self, tool_name, json_fragment):
        self._chars += len(json_fragment)
        if len(self._head) < 300:
            self._head += json_fragment[:300 - len(self._head)]
        now = time.monotonic()
        if now - self._last_told < self.EVERY_SECONDS:
            return
        self._last_told = now
        summary = self._summary()
        _tell(self._listener, "progress", tool_name, summary)

    def on_tool_call_finished(self, tool_name):
        summary = self._summary() + " (đã nhận đủ)"
        _tell(self._listener, "progress", tool_name, summary)

    def on_stream_aborted(self):
        tool = self._tool or "model"
        _tell(self._listener, "progress", tool, "luồng bị ngắt, bỏ phần đang viết")

    def _summary(self) -> str:
        match = self.PATH.search(self._head)
        return (match.group(1) + " · " if match else "") + f"{self._chars} ký tự"


class AgentRunner:
    """Runs ONE tool-using agent on a :class:`CodeStore` as an :class:`AgentSpec` describes it. The agent is not told the code of anything:
    it reads what it needs itself. The work is done when the agent calls ``finish`` and the session (and the spec's finish gate) agrees,
    never because the model says so. A new round is a new conversation, so it is handed the ledger and the notes of the rounds before it."""

    Progress = _Progress

    def __init__(self, ai_client: AiClient):
        self._ai_client = ai_client

    def run(self, spec: AgentSpec, store: CodeStore) -> Outcome:
        session = CodeSession(store, spec.label, spec.notes_path, spec.writable, spec.must_read, spec.limits, spec.listener, spec.extra_tools,
                              spec.finish_gate, spec.require_note, spec.write_gate)
        limits = spec.limits
        max_tool_calls = limits.max_reads + limits.max_writes + limits.max_notes + TOOL_CALL_MARGIN + spec.extra_tool_calls
        rounds = 0
        failures: list[str] = []
        for round_index in range(MAX_ROUNDS):
            rounds = round_index + 1
            user = spec.task if round_index == 0 else self._continuation(spec, session, store)
            started = time.monotonic()
            turn = f"gọi model · lượt {rounds}"
            _tell(spec.listener, "started", turn)
            try:
                # With a listener the response is streamed, so the frontend can show the file being written instead of a silent wait.
                stream = ToolStreamListener.all(None if spec.listener is None else _Progress(spec.listener), spec.extra_stream)
                call = (AiRequest.of(spec.system, user).with_schema(StructuredOutputSchemaRegistry.CODE_AGENT_RESULT)
                        .with_tools(session.callbacks(), max_tool_calls, stream).with_reasoning_effort(spec.reasoning_effort))
                self._ai_client.generate_request(call)
                seconds = int(time.monotonic() - started)
                _tell(spec.listener, "finished", turn, True, f"{seconds} giây")
                state = session.state()
                log.info("CodeAgent %s round %d ended: finished=%s, reads=%d, writes=%d, elapsedMs=%d", spec.label, rounds, state.finished,
                         state.reads, state.writes, int((time.monotonic() - started) * 1000))
            except Exception as failure:
                # A provider hiccup in one round must not lose what the agent already wrote: the next round is handed the ledger.
                reason = f"Lượt {rounds} lỗi khi gọi model sau {int(time.monotonic() - started)} giây: {describe(failure)}"
                failures.append(reason)
                log.warning("CodeAgent %s round %d failed: %s", spec.label, rounds, reason)
                _tell(spec.listener, "finished", turn, False, reason)
            if session.state().finished:
                break
        state = session.state()
        return Outcome("finished" if state.finished else "unfinished", rounds, state.summary, session.ledger(), spec.notes_path,
                       session.written_files(), list(failures))

    @staticmethod
    def _continuation(spec: AgentSpec, session: CodeSession, store: CodeStore) -> str:
        """The task again, plus what the backend itself saw the previous rounds do."""
        out = [spec.task, "\n\n# Trạng thái hiện tại (do hệ thống đo, không phải do bạn tự nhận)\n",
               "Bạn đang ở một lượt làm việc mới và KHÔNG nhớ lượt trước; các file đã ghi vẫn còn nguyên trong bản sao. Bạn CHƯA gọi `finish`.\n\n",
               session.ledger(), "\n"]
        try:
            notes = store.read(spec.notes_path) or ""
        except Exception:  # the notes are a help, not a requirement of the round
            notes = ""
        if notes.strip():
            out.append(f"## Ghi chú hiện có trong {spec.notes_path}\n{notes}\n")
        out.append(spec.continuation_hint)
        return "".join(out)
