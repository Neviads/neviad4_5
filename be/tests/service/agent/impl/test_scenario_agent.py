import re

import pytest

from beneviadsystem.infrastructure.ai.ai_client import AiClient
from beneviadsystem.infrastructure.ai.ai_generation_result import AiGenerationResult
from beneviadsystem.service.agent.impl.scenario_agent import MAX_ATTEMPTS, ObjectInfo, ScenarioAgent
from beneviadsystem.service.agent.invalid_agent_response_error import InvalidAgentResponseError

INPUTS = ('"objectGeometry":[{"objectId":"pump","width":0.6,"height":0.8,"anchor":"tâm đáy","points":[{"name":"handle","description":"tay cầm"}],'
          '"parts":[{"name":"lever","motion":"rotate","axis":"up","min":0,"max":25,"description":"cần bơm"}]},'
          '{"objectId":"lift","width":0.8,"height":1.0,"anchor":"tâm đáy","points":[],'
          '"parts":[{"name":"platform","motion":"slide","axis":"up","min":0,"max":0.3,"description":"bàn nâng"}]}]')
GOOD = ('{"summary":"Cho thấy lực được khuếch đại qua chất lỏng.","formulas":["F₂/F₁ = A₂/A₁ — lực tỉ lệ với diện tích"],'
        '"phases":[{"name":"Ấn cần","description":"Pít-tông nhỏ đi xuống, pít-tông lớn đi lên ít hơn"},{"name":"Nhấc cần","description":"Cần trở về"}],'
        '"layout":"Xi lanh nhỏ bên trái, xi lanh lớn bên phải, nối ở đáy.","view":"Nhìn ngang từ phía trước, thấy mặt cắt hai xi lanh.",'
        '"adjustable":["lực ấn, từ 0 đến 500 N"],"observable":["lực nâng (N)"],"assumptions":["bỏ qua ma sát"],'
        '"workedExamples":[{"text":"Với F1 = 10 N và A2/A1 = 5","expression":"10*5","unit":"N"},{"text":"Với F1 = 500 N và A2/A1 = 5","expression":"500*5","unit":"N"}],'
        + INPUTS + "}")
OBJECTS = [ObjectInfo(id="pump", title="Bộ bơm", request="mô tả, điểm neo ở đáy", hint="Đầu ra: x. Port: z."),
           ObjectInfo(id="lift", title="Bộ nâng", request="mô tả, điểm neo ở đáy", hint="Đầu ra: y. Port: w.")]


class Scripted(AiClient):
    def __init__(self, *replies):
        self.replies, self.prompts = list(replies), []

    def generate(self, prompt):
        return self.generate_reasoned(prompt, None).text

    def generate_reasoned(self, prompt, spec):
        self.prompts.append(prompt)
        return AiGenerationResult(self.replies[min(len(self.prompts), len(self.replies)) - 1], "test", "test")


def test_a_valid_scenario_comes_back_with_the_geometry_of_every_object():
    scripted = Scripted(GOOD)

    scenario = ScenarioAgent(scripted).scenario("máy nâng thuỷ lực", OBJECTS)

    assert scenario.formulas == ["F₂/F₁ = A₂/A₁ — lực tỉ lệ với diện tích"]
    assert [p.name for p in scenario.phases] == ["Ấn cần", "Nhấc cần"]
    assert len(scenario.adjustable) == 1
    assert scenario.view == "Nhìn ngang từ phía trước, thấy mặt cắt hai xi lanh."
    assert [g.object_id for g in scenario.object_geometry] == ["pump", "lift"]
    assert scenario.object_geometry[0].width == 0.6
    assert [p.name for p in scenario.object_geometry[0].points] == ["handle"]
    (part,) = scenario.object_geometry[0].parts
    assert (part.motion, part.axis, part.max) == ("rotate", "", 25.0)
    assert scenario.object_geometry[-1].parts[0].axis == "up"
    assert all(s in scripted.prompts[0] for s in ("máy nâng thuỷ lực", "id: pump | Bộ bơm", "id: lift | Bộ nâng", "objectGeometry", "MÉT", "RỖNG"))


def test_a_scenario_without_formulas_is_sent_back_with_the_reason():
    scripted = Scripted(GOOD.replace('"F₂/F₁ = A₂/A₁ — lực tỉ lệ với diện tích"', ""), GOOD)

    assert len(ScenarioAgent(scripted).scenario("máy nâng", OBJECTS).formulas) == 1
    assert len(scripted.prompts) == 2
    assert "Lần trước bị từ chối vì" in scripted.prompts[-1] and "ít nhất một công thức" in scripted.prompts[-1]


def test_a_scenario_without_numeric_examples_is_sent_back_because_the_engine_needs_test_cases():
    scripted = Scripted(re.sub(r'"workedExamples":\[[^\]]*\],', "", GOOD), GOOD)

    scenario = ScenarioAgent(scripted).scenario("máy nâng", OBJECTS)

    assert len(scenario.worked_examples) == 2
    assert scenario.worked_examples[0].value == 50.0
    assert len(scripted.prompts) == 2
    assert "workedExamples cần ít nhất 2 phép tính bằng số" in scripted.prompts[-1]


def test_an_example_whose_expression_cannot_be_computed_is_sent_back_with_the_reason():
    scripted = Scripted(GOOD.replace('"expression":"500*5"', '"expression":"500*gia_tri"'), GOOD)

    ScenarioAgent(scripted).scenario("máy nâng", OBJECTS)

    assert len(scripted.prompts) == 2
    assert "workedExamples[2]" in scripted.prompts[-1] and "không tính được" in scripted.prompts[-1]


def test_a_scenario_without_a_view_is_sent_back_because_every_object_must_be_seen_from_one_side():
    scripted = Scripted(GOOD.replace('"view":"Nhìn ngang từ phía trước, thấy mặt cắt hai xi lanh.",', ""), GOOD)

    assert ScenarioAgent(scripted).scenario("máy nâng", OBJECTS).view.strip()
    assert len(scripted.prompts) == 2
    assert "thiếu view" in scripted.prompts[-1]


def test_a_scenario_that_never_gets_valid_is_an_error():
    scripted = Scripted('{"summary":"","formulas":[],"phases":[],"layout":"","adjustable":[],"observable":[],"assumptions":[],"objectGeometry":[]}')

    with pytest.raises(InvalidAgentResponseError, match="thiếu summary"):
        ScenarioAgent(scripted).scenario("x", OBJECTS)
    assert len(scripted.prompts) == MAX_ATTEMPTS


def test_an_object_without_its_geometry_is_sent_back():
    scripted = Scripted(GOOD.replace('"objectId":"lift"', '"objectId":"other"'), GOOD)

    ScenarioAgent(scripted).scenario("máy nâng", OBJECTS)

    assert len(scripted.prompts) == 2
    assert 'objectGeometry thiếu vật có id "lift"' in scripted.prompts[-1]


@pytest.mark.parametrize("bad", [
    GOOD.replace('"width":0.6', '"width":0'),
    GOOD.replace('"name":"lever"', '"name":"Lever Arm"'),
    GOOD.replace('"min":0,"max":25', '"min":25,"max":25'),
    GOOD.replace('"motion":"rotate"', '"motion":"swing"'),
    GOOD.replace('"motion":"slide","axis":"up"', '"motion":"slide","axis":""'),
])
def test_a_geometry_without_size_or_with_a_bad_part_is_sent_back(bad):
    assert bad != GOOD
    scripted = Scripted(bad, GOOD)

    ScenarioAgent(scripted).scenario("máy nâng", OBJECTS)

    assert len(scripted.prompts) == 2


def test_a_sliding_part_without_an_axis_is_told_so():
    scripted = Scripted(GOOD.replace('"motion":"slide","axis":"up"', '"motion":"slide","axis":""'), GOOD)

    ScenarioAgent(scripted).scenario("máy nâng", OBJECTS)

    assert "trượt nên cần axis" in scripted.prompts[-1]


def test_a_phenomenon_must_come_from_a_declared_point():
    with_phenomenon = GOOD[:-1] + ',"phenomena":[{"name":"oilDrop","description":"giọt dầu","from":"nozzle","appearance":"giọt vàng"}]}'
    scripted = Scripted(with_phenomenon, GOOD[:-1] + ',"phenomena":[{"name":"oilDrop","description":"giọt dầu","from":"handle","appearance":"giọt vàng"}]}')

    scenario = ScenarioAgent(scripted).scenario("máy nâng", OBJECTS)

    assert 'from "nozzle"' in scripted.prompts[-1]
    assert scenario.phenomena[0].from_ == "handle"
