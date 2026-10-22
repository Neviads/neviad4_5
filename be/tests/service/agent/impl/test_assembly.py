import json
import threading

import pytest

from beneviadsystem.infrastructure.ai.ai_client import AiClient
from beneviadsystem.infrastructure.ai.ai_generation_result import AiGenerationResult
from beneviadsystem.service.agent.impl.assembly_agent import AssemblyAgent
from beneviadsystem.service.agent.impl.assembly_planner import MAX_ATTEMPTS, AssemblyPlanner
from beneviadsystem.service.agent.impl.assembly_validator import AssemblyValidator, Part
from beneviadsystem.service.agent.impl.draw_object_agent import DrawObjectRequest, DrawObjectResult
from beneviadsystem.service.agent.impl.node_assembly_validator import NodeAssemblyValidator
from beneviadsystem.service.agent.impl.node_script_runner import NodeScriptRunner
from beneviadsystem.service.agent.invalid_agent_response_error import InvalidAgentResponseError

MACHINE = DrawObjectRequest(title="Máy nâng", request="mô tả máy, điểm neo ở đáy", hint="đầu vào: pumpStroke (m). Đầu ra: h (m). Port: a.")


def plan(driver_expr, platform_parent_port):
    """A frame, a cylinder whose top rises with its input, and a platform that sits on the cylinder top."""
    return json.dumps({
        "input": {"name": "pumpStroke", "label": "Hành trình", "unit": "m", "min": 0, "max": 1, "default": 0}, "root": "frame",
        "components": [
            {"id": "frame", "title": "Đế", "moving": False, "driver": None, "request": "Đế dẹt. Đứng trên sàn, điểm neo ở giữa đáy.", "hint": "Port: socket."},
            {"id": "cyl", "title": "Xi lanh", "moving": True, "driver": {"input": "rise", "expr": driver_expr}, "request": "Xi lanh có pít-tông. Điểm neo ở đáy.",
             "hint": "đầu vào: rise (m, quãng đi lên). Đầu ra: độ cao (m). Port: base, top."},
            {"id": "platform", "title": "Bệ", "moving": False, "driver": None, "request": "Bệ nằm ngang. Điểm neo ở giữa mặt dưới.", "hint": "Port: under."}],
        "attachments": [
            {"child": "cyl", "childPort": "base", "parent": "frame", "parentPort": "socket"},
            {"child": "platform", "childPort": "under", "parent": "cyl", "parentPort": platform_parent_port}]}, ensure_ascii=False)


class Scripted(AiClient):
    def __init__(self, *replies):
        self.replies, self.prompts = list(replies), []

    def generate(self, prompt):
        return self.generate_structured(prompt, None).text

    def generate_structured(self, prompt, spec):
        self.prompts.append(prompt)
        return AiGenerationResult(self.replies[min(len(self.prompts), len(self.replies)) - 1], "test", "test")


def test_a_valid_plan_is_accepted():
    result = AssemblyPlanner(Scripted(plan("u", "top"))).plan(MACHINE)

    assert len(result["components"]) == 3
    assert result["root"] == "frame"


def test_a_port_that_the_part_never_declared_is_sent_back():
    scripted = Scripted(plan("u", "nowhere"), plan("u", "top"))

    AssemblyPlanner(scripted).plan(MACHINE)

    assert len(scripted.prompts) == 2
    assert 'không khai port "nowhere"' in scripted.prompts[-1]


def test_a_driver_that_is_not_a_plain_expression_of_the_machine_input_is_rejected():
    scripted = Scripted(plan("Math.max(u, 1)", "top"))

    with pytest.raises(InvalidAgentResponseError, match="driver.expr"):
        AssemblyPlanner(scripted).plan(MACHINE)
    assert len(scripted.prompts) == MAX_ATTEMPTS


def test_a_part_that_cannot_be_reached_from_the_root_is_rejected():
    cycle = plan("u", "top").replace('"parent": "frame", "parentPort": "socket"', '"parent": "platform", "parentPort": "under"')

    with pytest.raises(InvalidAgentResponseError, match="không nối được tới root"):
        AssemblyPlanner(Scripted(cycle)).plan(MACHINE)


def drawn(title, ok):
    return DrawObjectResult(id=1, title=title, request="r", hint="h", source="lite", status="ok" if ok else "failed", attempts=1, name="make" + title,
                            shape="s", anchor="a", ports=[], inputs=[], outputs=[], self_tests=[], self_test_report=[], parts=[], notes="", code="code",
                            js="js" if ok else None, problems=[] if ok else ["khớp hở"], size=None, moving=[], points=[])


class FixedPlanner:
    def plan(self, machine):
        return json.loads(plan("u", "top"))


class Drawer:
    def __init__(self, ok=lambda title: True):
        self.requests, self.run_ids, self.ok, self.lock = [], [], ok, threading.Lock()

    def generate(self, request, run_id):
        with self.lock:
            self.requests.append(request)
            self.run_ids.append(run_id)
        return drawn(request.title, self.ok(request.title))


class Recording(AssemblyValidator):
    def __init__(self, fail=False):
        self.checked, self.fail = [], fail

    def validate(self, plan, parts):
        if self.fail:
            raise AssertionError("không được chạy cổng lắp ráp")
        self.checked.extend(parts)
        return []


def test_every_part_is_drawn_and_static_parts_are_marked_static():
    drawer, validator = Drawer(), Recording()

    result = AssemblyAgent(FixedPlanner(), drawer, validator).assemble(MACHINE, "run-1")

    assert result.status == "ok"
    assert [p.id for p in result.parts] == ["frame", "cyl", "platform"]
    assert sorted(r.title for r in drawer.requests if r.is_static) == ["Bệ", "Đế"]
    assert len(validator.checked) == 3
    assert drawer.run_ids == ["run-1"] * 3


def test_a_part_that_failed_stops_the_assembly_before_the_gate():
    result = AssemblyAgent(FixedPlanner(), Drawer(lambda title: title != "Bệ"), Recording(fail=True)).assemble(MACHINE, "run-1")

    assert result.status == "failed"
    assert result.problems == ["Bộ phận platform: khớp hở"]
    assert len(result.parts) == 3


FRAME = "const makeFrame = () => ({ group: {}, ports: { socket: { x: 40, y: 0 } }, inputs: {}, outputs: {}, set() {}, get() { return {}; }, read() { return {}; } });"
CYL = ("const makeCyl = () => { let v = 0; const o = { group: {}, ports: { base: { x: 0, y: 0 }, top: { x: 0, y: -20 } }, inputs: { rise: { min: 0, max: 0.5, default: 0 } },"
       " outputs: {}, set(a) { if ('rise' in a) v = Math.min(0.5, Math.max(0, a.rise)); o.ports.top = { x: 0, y: -20 - v * 100 }; }, get() { return { rise: v }; }, read() { return {}; } }; return o; };")
PLATFORM = "const makePlatform = () => ({ group: {}, ports: { under: { x: 0, y: 0 } }, inputs: {}, outputs: {}, set() {}, get() { return {}; }, read() { return {}; } });"


@pytest.fixture
def gate():
    fe = NodeScriptRunner.resolve_fe_root("")
    if not (fe / "scripts/validate-assembly.mjs").is_file():
        pytest.skip("cần fe/ để chạy script kiểm tra lắp ráp")
    return NodeAssemblyValidator(fe, "node", 120)


def parts():
    return [Part("frame", "makeFrame", FRAME), Part("cyl", "makeCyl", CYL), Part("platform", "makePlatform", PLATFORM)]


def test_parts_that_attach_by_their_ports_and_move_with_the_input_pass(gate):
    assert gate.validate(json.loads(plan("u*0.5", "top")), parts()) == []


def test_a_driver_that_pushes_a_part_out_of_its_range_is_reported(gate):
    assert any("kẹp" in p for p in gate.validate(json.loads(plan("u*5", "top")), parts()))


def test_a_machine_whose_nothing_moves_is_reported(gate):
    assert any("không chuyển động" in p for p in gate.validate(json.loads(plan("u*0", "top")), parts()))


def test_a_port_that_the_part_code_does_not_have_is_reported(gate):
    assert any('không có port "ghost"' in p for p in gate.validate(json.loads(plan("u*0.5", "ghost")), parts()))
