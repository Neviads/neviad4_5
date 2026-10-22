import pytest

from beneviadsystem.presentation.dto.simulation.run_draft import RunDraft
from beneviadsystem.service.agent.draft.code_draft_streamer import CODE_AGENT_TOOLS, WRITE_FILE, CodeDraftStreamer


@pytest.fixture
def events():
    return []


def text(events):
    return "".join(e.text for e in events if e.type == RunDraft.DELTA)


def test_streams_the_content_of_a_write_file_call_with_its_path(events):
    streamer = CodeDraftStreamer("r1", events.append)
    streamer.on_tool_call_started("write_file")
    streamer.on_tool_arguments_delta("write_file", '{"path":"engines/a/a.ts","con')
    streamer.on_tool_arguments_delta("write_file", 'tent":"let x = 1;\\nlet y')
    streamer.on_tool_arguments_delta("write_file", ' = 2;"}')
    streamer.on_tool_call_finished("write_file")

    assert events[0].type == RunDraft.START
    assert text(events) == "let x = 1;\nlet y = 2;"
    assert events[-1].path == "engines/a/a.ts"
    assert [e.seq for e in events] == sorted(e.seq for e in events)


def test_ignores_other_tools(events):
    streamer = CodeDraftStreamer("r1", events.append)
    streamer.on_tool_call_started("read_file")
    streamer.on_tool_arguments_delta("read_file", '{"path":"a.ts"}')
    streamer.on_tool_call_finished("read_file")

    assert events == []


def test_streams_the_tools_it_was_given(events):
    streamer = CodeDraftStreamer("r1", events.append, {"create_file"})
    streamer.on_tool_call_started("create_file")
    streamer.on_tool_arguments_delta("create_file", '{"path":"b.ts","content":"ok"}')
    streamer.on_tool_call_finished("create_file")

    assert text(events) == "ok"


def test_streams_only_the_replacement_of_an_edit_file_call(events):
    streamer = CodeDraftStreamer("r1", events.append, CODE_AGENT_TOOLS, True)
    streamer.on_tool_call_started("edit_file")
    streamer.on_tool_arguments_delta("edit_file", '{"path":"engines/a/a.ts","expectedText":"old code","repla')
    streamer.on_tool_arguments_delta("edit_file", 'cement":"new code"}')
    streamer.on_tool_call_finished("edit_file")

    assert text(events) == "new code"
    assert {e.tool for e in events} == {"edit_file"}
    assert events[-1].type == RunDraft.END
    assert events[-1].path == "engines/a/a.ts"


def test_tells_which_tool_a_whole_file_came_from(events):
    streamer = CodeDraftStreamer("r1", events.append, CODE_AGENT_TOOLS, False)
    streamer.on_tool_call_started("write_file")
    streamer.on_tool_arguments_delta("write_file", '{"path":"a.ts","content":"x"}')
    streamer.on_tool_call_finished("write_file")

    assert {e.tool for e in events} == {"write_file"}


def test_puts_the_title_of_the_object_on_every_event(events):
    streamer = CodeDraftStreamer("r1", events.append, CODE_AGENT_TOOLS, True, "Pit-tông nhỏ")
    streamer.on_tool_call_started("write_file")
    streamer.on_tool_arguments_delta("write_file", '{"path":"_drawn/a.ts","content":"x"}')
    streamer.on_tool_call_finished("write_file")

    assert {e.title for e in events} == {"Pit-tông nhỏ"}


def test_never_publishes_a_half_written_path_when_the_code_comes_first(events):
    streamer = CodeDraftStreamer("r1", events.append, CODE_AGENT_TOOLS, True)
    streamer.on_tool_call_started("write_file")
    streamer.on_tool_arguments_delta("write_file", '{"content":"let x = 1;","path":"_drawn/con-lac-don-28')
    streamer.on_tool_call_finished("write_file")
    assert {e.path for e in events if e.type == RunDraft.DELTA} == {""}

    events.clear()
    whole = CodeDraftStreamer("r1", events.append, CODE_AGENT_TOOLS, True)
    whole.on_tool_call_started("write_file")
    whole.on_tool_arguments_delta("write_file", '{"content":"let x = 1;","path":"_drawn/con-lac-don-28')
    whole.on_tool_arguments_delta("write_file", '3c.ts"}')
    whole.on_tool_call_finished("write_file")
    assert events[-1].type == RunDraft.END
    assert events[-1].path == "_drawn/con-lac-don-283c.ts"


def test_a_fixed_path_is_on_every_event_from_the_start(events):
    streamer = CodeDraftStreamer("r1", events.append, CODE_AGENT_TOOLS, True, "Con lắc", "_drawn/a.ts")
    streamer.on_tool_call_started("write_file")
    streamer.on_tool_arguments_delta("write_file", '{"content":"x"}')
    streamer.on_tool_call_finished("write_file")

    assert {e.path for e in events} == {"_drawn/a.ts"}


def test_ends_the_file_only_when_asked(events):
    plain = CodeDraftStreamer("r1", events.append)
    plain.on_tool_call_started("write_file")
    plain.on_tool_arguments_delta("write_file", '{"path":"a.ts","content":"x"}')
    plain.on_tool_call_finished("write_file")
    assert RunDraft.END not in [e.type for e in events]

    events.clear()
    announcing = CodeDraftStreamer("r1", events.append, WRITE_FILE, True)
    announcing.on_tool_call_started("write_file")
    announcing.on_tool_arguments_delta("write_file", '{"path":"a.ts","content":"x"}')
    announcing.on_tool_call_finished("write_file")
    assert [e.type for e in events] == [RunDraft.START, RunDraft.DELTA, RunDraft.END]
    assert events[-1].path == "a.ts"


def test_abort_drops_the_draft(events):
    streamer = CodeDraftStreamer("r1", events.append)
    streamer.on_tool_call_started("write_file")
    streamer.on_tool_arguments_delta("write_file", '{"path":"a.ts","content":"par')
    streamer.on_stream_aborted()
    streamer.on_tool_arguments_delta("write_file", "tial")

    assert events[-1].type == RunDraft.ABORT
    assert not [e for e in events if e.type == RunDraft.DELTA]


def test_a_draft_goes_on_the_wire_with_the_field_names_the_frontend_reads():
    from beneviadsystem.domain.model.base import to_jsonable

    assert to_jsonable(RunDraft("r1", RunDraft.DELTA, "x", 3, "a.ts", "write_file", "Con lắc")) == {
        "runId": "r1", "type": "DELTA", "text": "x", "seq": 3, "path": "a.ts", "tool": "write_file", "title": "Con lắc"}
