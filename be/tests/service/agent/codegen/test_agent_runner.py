"""The runner knows nothing of experiments: a spec made of plain strings is enough."""
from pydantic import BaseModel

from beneviadsystem.infrastructure.ai.tool_callback import FunctionToolCallback
from beneviadsystem.service.agent.codegen.agent_runner import AgentRunner
from beneviadsystem.service.agent.codegen.agent_spec import AgentSpec
from beneviadsystem.service.agent.codegen.code_session import Listener
from tests.conftest import call_tool
from tests.service.agent.codegen.memory_store import MemoryStore
from tests.service.agent.codegen.scripted_model import ScriptedModel

NOTES = "_notes/x.md"
FILE = "objects/x.ts"


def write_note_and_finish(tools):
    call_tool(tools, "write_file", {"path": FILE, "content": "const make = () => 1;"})
    call_tool(tools, "append_note", {"text": "đã viết"})
    call_tool(tools, "finish", {"summary": "xong"})


class CheckInput(BaseModel):
    path: str | None = None


def check_tool(seen):
    return FunctionToolCallback("check_file", lambda i: seen.append(i.path) or "ok", description="test tool", input_type=CheckInput)


def test_a_spec_of_plain_strings_runs_the_agent_to_the_end():
    store = MemoryStore()
    model = ScriptedModel(write_note_and_finish)

    outcome = AgentRunner(model).run(AgentSpec.of("SYSTEM", "# Nhiệm vụ\nviết vật", "object", NOTES, {FILE}, set()), store)

    assert outcome.status == "finished"
    assert outcome.rounds == 1
    assert outcome.files == [FILE]
    assert outcome.summary == "xong"
    assert FILE in store.files
    assert model.prompts[0].startswith("SYSTEM") and "viết vật" in model.prompts[0]
    assert model.budgets[0] == 60 + 30 + 20 + 10


def test_a_round_that_does_not_finish_is_followed_by_one_that_is_handed_the_ledger_and_the_hint():
    model = ScriptedModel(lambda tools: call_tool(tools, "write_file", {"path": FILE, "content": "const make = () => 1;"}), write_note_and_finish)
    spec = AgentSpec("SYSTEM", "TASK", "object", NOTES, {FILE}, set(), continuation_hint="HINT CUA TOI")

    outcome = AgentRunner(model).run(spec, MemoryStore())

    assert outcome.status == "finished"
    assert outcome.rounds == 2
    assert all(part in model.prompts[1] for part in ("TASK", "KHÔNG nhớ lượt trước", "Đã ghi: " + FILE, "HINT CUA TOI"))


def test_a_round_that_fails_to_call_the_model_is_reported_with_its_reason_and_to_the_listener_as_it_happens():
    told = []

    class Told(Listener):
        def started(self, tool): told.append(f"{tool}|started|")
        def finished(self, tool, success, message): told.append(f"{tool}|{str(success).lower()}|{message}")

    def broken(tools):
        raise RuntimeError("openai responses call failed") from ConnectionResetError("Connection reset")

    model = ScriptedModel(broken, write_note_and_finish)
    spec = AgentSpec("SYSTEM", "TASK", "object", NOTES, {FILE}, set(), listener=Told())

    outcome = AgentRunner(model).run(spec, MemoryStore())

    assert outcome.status == "finished"
    assert len(outcome.failures) == 1
    assert all(part in outcome.failures[0] for part in ("Lượt 1 lỗi khi gọi model", "RuntimeError: openai responses call failed",
                                                        "ConnectionResetError: Connection reset"))
    assert "gọi model · lượt 1|false|" + outcome.failures[0] in told
    assert "gọi model · lượt 2|true|0 giây" in told
    assert told[0] == "gọi model · lượt 1|started|"


def test_the_streamed_arguments_become_progress_lines_that_name_the_file_and_count_the_characters():
    lines = []

    class Lines(Listener):
        def progress(self, tool, message): lines.append(f"{tool}|{message}")

    progress = AgentRunner.Progress(Lines())

    progress.on_tool_call_started("write_file")
    progress.on_tool_arguments_delta("write_file", '{"path":"engines/x/physics.ts","content":"')
    progress.on_tool_arguments_delta("write_file", "const a = 1;")
    progress.on_tool_call_finished("write_file")

    assert lines == ["write_file|model bắt đầu viết", "write_file|engines/x/physics.ts · 54 ký tự (đã nhận đủ)"]


def test_extra_tools_are_offered_and_counted_in_the_budget_and_the_finish_gate_can_refuse():
    seen, gate_asked, refusal = [], [], []

    def gate(session):
        gate_asked.append(1)
        return "hãy gọi check_file trước" if not seen else None

    def script(tools):
        call_tool(tools, "write_file", {"path": FILE, "content": "const make = () => 1;"})
        call_tool(tools, "append_note", {"text": "đã viết"})
        refusal.append(call_tool(tools, "finish", {"summary": "sớm"}))
        call_tool(tools, "check_file", {"path": FILE})
        call_tool(tools, "finish", {"summary": "xong"})

    model = ScriptedModel(script)
    spec = AgentSpec("SYSTEM", "TASK", "object", NOTES, {FILE}, set(), extra_tools=[check_tool(seen)], extra_tool_calls=5, finish_gate=gate)

    outcome = AgentRunner(model).run(spec, MemoryStore())

    assert outcome.status == "finished"
    assert "NOT_DONE" in refusal[0] and "hãy gọi check_file trước" in refusal[0]
    assert seen == [FILE]
    assert len(gate_asked) == 2
    assert model.budgets[0] == 60 + 30 + 20 + 10 + 5
