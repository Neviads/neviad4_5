import json

import pytest

from beneviadsystem.service.agent.codegen.bridged_code_store import BridgedCodeStore
from beneviadsystem.service.agent.codegen.code_agent_service import MAX_ROUNDS, TEMPLATE_FILES, CodeAgentService, ObjectInfo, Request
from beneviadsystem.service.agent.codegen.code_layer import CodeLayer
from beneviadsystem.service.agent.codegen.code_session import Limits
from beneviadsystem.service.agent.impl.scenario_agent import MovingPart, NamedPoint, ObjectGeometry, Phase, Scenario
from tests.conftest import call_json, call_tool
from tests.service.agent.codegen.fake_browser_bridge import FakeBrowserBridge
from tests.service.agent.codegen.scripted_model import ScriptedModel

ENGINE_FILES = ["engines/va-cham/engine.ts"]
RENDERER_FILES = ["renderers/va-cham/view-constants.ts", "renderers/va-cham/va-cham-scene.tsx"]
EXPERIMENT_FILES = ["experiments/VaChamExperiment.tsx", "presets/va-cham.ts"]


class SplitModel(ScriptedModel):
    """The service sends a system prompt; the default generate_request folds it in front of the task, which starts with '# Nhiệm vụ'."""

    @property
    def systems(self):
        return [p[:p.index("# Nhiệm vụ")] for p in self.prompts]

    @property
    def users(self):
        return [p[p.index("# Nhiệm vụ"):] for p in self.prompts]


@pytest.fixture
def browser():
    bridge = FakeBrowserBridge()
    bridge.files["README.md"] = "khung"
    for file in TEMPLATE_FILES:
        bridge.files[file] = "// mẫu " + file
    return bridge


@pytest.fixture
def request_():
    scenario = Scenario(summary="Hai xe va chạm.", formulas=["p = m·v"], phases=[Phase(name="Tiến lại", description="Hai xe chạy vào nhau")],
                        layout="Xe 1 bên trái, xe 2 bên phải.", adjustable=["vận tốc đầu"], observable=["vị trí"], assumptions=["bỏ qua ma sát"],
                        object_geometry=[ObjectGeometry(object_id="leftCar", width=2.0, height=1.3, anchor="tâm đáy, chạm sàn",
                                                        points=[NamedPoint(name="frontEdge", description="mép cản trước")],
                                                        parts=[MovingPart(name="frontWheel", motion="rotate", axis="", min=0, max=360, description="bánh trước")])])
    car = ObjectInfo(id="leftCar", title="Ô tô trái", file="objects/va-cham-1.ts", function_name="makeLeftCar", notes="đã vẽ xong")
    return Request(run_id="run-1", slug="va-cham", request="2 ô tô đâm nhau", scenario=scenario, objects=[car])


def service(model, browser):
    return CodeAgentService(model, lambda run_id: BridgedCodeStore(browser, run_id))


def read_required(tools):
    call_tool(tools, "read_file", {"path": "README.md", "offset": 0, "limit": 0})
    for file in TEMPLATE_FILES:
        call_tool(tools, "read_file", {"path": file, "offset": 0, "limit": 0})


def write_engine(tools):
    for file in ENGINE_FILES:
        call_tool(tools, "write_file", {"path": file, "content": "export const x = 1; // " + file})


def read_everything(tools):
    """What a model that does as it is told does: list everything, read all of it."""
    for item in call_json(tools, "list_files", {"folder": ""})["items"]:
        call_tool(tools, "read_file", {"path": item, "offset": 0, "limit": 0})


def test_an_agent_that_reads_writes_notes_and_finishes_leaves_the_engine_in_the_browser_copy(browser, request_):
    def script(tools):
        read_required(tools)
        write_engine(tools)
        call_tool(tools, "append_note", {"text": "biến v1 là vận tốc; dof.leftCar.position = x1"})
        assert call_json(tools, "finish", {"summary": "đã viết engine"})["success"]

    result = service(SplitModel(script), browser).run_engine(request_)

    assert result.status == "finished"
    assert result.rounds == 1
    assert result.files == ENGINE_FILES
    assert result.summary == "đã viết engine"
    assert set(ENGINE_FILES) <= set(browser.files)
    assert all(part in browser.files["_notes/va-cham.md"] for part in ("## Lớp engine", "biến v1 là vận tốc", "## Sổ cái của lớp engine"))
    assert result.notes_path == "_notes/va-cham.md"


def test_the_task_carries_the_scenario_and_the_object_interface_but_not_their_code(browser, request_):
    model = SplitModel(lambda tools: None)

    service(model, browser).run_engine(request_)

    system, user = model.systems[0], model.users[0]
    assert all(part in system for part in ("engines/va-cham/engine.ts", "VaCham", "vaCham", "VA_CHAM")) and "{{" not in system
    for part in ("2 ô tô đâm nhau", "p = m·v", "Tiến lại", "Xe 1 bên trái", "bỏ qua ma sát", "id `leftCar`", "objects/va-cham-1.ts", "makeLeftCar",
                 "rộng 2 m, cao 1.3 m", "Điểm neo: tâm đáy, chạm sàn", "Điểm `frontEdge`", "Bộ phận `frontWheel`: quay",
                 "engines/va-cham/engine.ts", "engines/template-experiment/engine.ts", "README.md"):
        assert part in user, part


def test_the_agent_cannot_write_before_it_has_read_and_cannot_write_outside_its_files(browser, request_):
    seen = []

    def script(tools):
        seen.append(call_tool(tools, "write_file", {"path": ENGINE_FILES[0], "content": "x"}))
        read_required(tools)
        seen.append(call_tool(tools, "write_file", {"path": "renderers/va-cham/va-cham-scene.tsx", "content": "x"}))

    service(SplitModel(script), browser).run_engine(request_)

    assert "MUST_READ_FIRST" in seen[0]
    assert "PATH_NOT_ALLOWED" in seen[1]
    assert "renderers/va-cham/va-cham-scene.tsx" not in browser.files


def test_a_round_that_does_not_finish_is_followed_by_one_that_is_told_what_happened(browser, request_):
    def first(tools):
        read_required(tools)
        call_tool(tools, "write_file", {"path": ENGINE_FILES[0], "content": "export const x = 1;"})
        call_tool(tools, "append_note", {"text": "mới viết physics"})  # claims to be done without calling finish

    def second(tools):
        write_engine(tools)
        assert call_json(tools, "finish", {"summary": "xong ở lượt hai"})["success"]

    model = SplitModel(first, second)
    result = service(model, browser).run_engine(request_)

    assert result.status == "finished"
    assert result.rounds == 2
    assert all(part in model.users[1] for part in ("KHÔNG nhớ lượt trước", "CHƯA gọi `finish`", "Đã ghi: " + ENGINE_FILES[0], "mới viết physics"))
    assert model.users[1].startswith(model.users[0])


def test_what_the_model_claims_does_not_count_only_the_session_does(browser, request_):
    result = service(SplitModel(lambda tools: None), browser).run_engine(request_)

    assert result.status == "unfinished"
    assert result.rounds == MAX_ROUNDS
    assert result.files == []


def test_a_round_that_crashes_does_not_lose_the_next_one(browser, request_):
    def crash(tools):
        raise RuntimeError("nhà cung cấp lỗi")

    def work(tools):
        read_required(tools)
        write_engine(tools)
        call_tool(tools, "append_note", {"text": "ghi chú"})
        call_tool(tools, "finish", {"summary": "xong"})

    result = service(SplitModel(crash, work), browser).run_engine(request_)

    assert result.status == "finished"
    assert result.rounds == 2


def test_the_tool_call_budget_covers_every_budget_of_the_session(browser, request_):
    model = SplitModel(lambda tools: None)

    service(model, browser).run_engine(request_)

    limits = Limits.defaults()
    assert model.budgets[0] > limits.max_reads + limits.max_writes + limits.max_notes


def test_a_slug_that_is_not_valid_is_refused_before_the_model_is_called(browser, request_):
    model = SplitModel(lambda tools: None)
    bad = request_.model_copy(update={"slug": "Va Cham!"})

    with pytest.raises(ValueError):
        service(model, browser).run_engine(bad)
    assert model.prompts == []


def seed_after_the_engine(browser):
    browser.files.update({
        "renderers/template-experiment/view-constants.ts": "// mẫu view",
        "renderers/template-experiment/template-experiment-scene.tsx": "// mẫu cảnh",
        "renderers/hydraulic-lift/hydraulic-lift-scene.tsx": "// ví dụ đầy đủ",
        "shared/view-transform.ts": "export const createViewTransform = 1;",
        "objects/types.ts": "export type SmartObject = unknown;",
        "engines/va-cham/engine.ts": "export const engine = 1;",
        "_notes/va-cham.md": "## Lớp engine\nbiến v1 là vận tốc; dof.leftCar.position = x1\n",
    })


def test_the_renderer_layer_reads_what_the_engine_left_and_writes_only_its_two_files(browser, request_):
    seed_after_the_engine(browser)
    seen = []

    def script(tools):
        seen.append(call_tool(tools, "write_file", {"path": RENDERER_FILES[1], "content": "x"}))
        read_everything(tools)
        seen.append(call_tool(tools, "write_file", {"path": ENGINE_FILES[0], "content": "x"}))
        for file in RENDERER_FILES:
            call_tool(tools, "write_file", {"path": file, "content": "export const x = 1; // " + file})
        call_tool(tools, "append_note", {"text": "Scene nhận dof.leftCar.position"})
        call_tool(tools, "finish", {"summary": "đã viết renderer"})

    model = SplitModel(script)
    result = service(model, browser).run(CodeLayer.RENDERER, request_)

    assert "MUST_READ_FIRST" in seen[0]
    assert "PATH_NOT_ALLOWED" in seen[1]
    assert result.status == "finished"
    assert result.files == RENDERER_FILES
    assert all(part in model.systems[0] for part in ("RENDERER", "VaChamScene", "createViewTransform")) and "{{" not in model.systems[0]
    for part in ("tầng RENDERER", "Các tầng trước đã xong", "_notes/va-cham.md", "renderers/template-experiment/template-experiment-scene.tsx",
                 "engines/va-cham/engine.ts", "- renderers/va-cham/va-cham-scene.tsx"):
        assert part in model.users[0], part
    assert all(part in browser.files["_notes/va-cham.md"] for part in ("## Lớp engine", "## Lớp renderer", "Scene nhận dof", "## Sổ cái của lớp renderer"))


def test_the_renderer_may_revise_the_draft_objects_but_is_not_required_to(browser, request_):
    seed_after_the_engine(browser)
    browser.files["objects/va-cham-1.ts"] = "// bản nháp của vật"

    def untouched(tools):
        read_everything(tools)
        for file in RENDERER_FILES:
            call_tool(tools, "write_file", {"path": file, "content": "x"})
        call_tool(tools, "append_note", {"text": "ghi chú"})
        call_tool(tools, "finish", {"summary": "xong mà không sửa vật"})

    model = SplitModel(untouched)
    assert service(model, browser).run(CodeLayer.RENDERER, request_).status == "finished"
    assert "BẢN THAM KHẢO" in model.users[0] and "- objects/va-cham-1.ts" in model.users[0]

    def revising(tools):
        read_everything(tools)
        call_tool(tools, "write_file", {"path": "objects/va-cham-1.ts", "content": "// đã sửa"})
        for file in RENDERER_FILES:
            call_tool(tools, "write_file", {"path": file, "content": "x"})
        call_tool(tools, "append_note", {"text": "đã bỏ chấm vẽ cứng khỏi vật"})
        call_tool(tools, "finish", {"summary": "xong"})

    revised = service(SplitModel(revising), browser).run(CodeLayer.RENDERER, request_)
    assert revised.status == "finished"
    assert "objects/va-cham-1.ts" in revised.files


def test_a_sample_missing_from_the_copy_does_not_block_the_layer_for_good(browser, request_):
    seed_after_the_engine(browser)
    del browser.files["renderers/hydraulic-lift/hydraulic-lift-scene.tsx"]

    def script(tools):
        read_everything(tools)
        for file in RENDERER_FILES:
            call_tool(tools, "write_file", {"path": file, "content": "x"})
        call_tool(tools, "append_note", {"text": "ghi chú"})
        call_tool(tools, "finish", {"summary": "xong"})

    model = SplitModel(script)
    assert service(model, browser).run(CodeLayer.RENDERER, request_).status == "finished"
    assert "- renderers/hydraulic-lift/hydraulic-lift-scene.tsx" not in model.users[0]


def test_the_experiment_layer_writes_its_files_and_edits_the_two_files_that_register_a_preset(browser, request_):
    seed_after_the_engine(browser)
    browser.files.update({
        "renderers/va-cham/va-cham-scene.tsx": "export function VaChamScene() { return null; }",
        "experiments/TemplateExperiment.tsx": "// mẫu trang",
        "presets/template-experiment.ts": "// mẫu preset",
        "presets/types.ts": "export type Preset = HydraulicLiftPreset;",
        "presets/index.ts": "export const PRESETS: Preset[] = [hydraulicLiftPreset];",
        "shared/param-panel.tsx": "export type ParamDef = {};",
    })
    seen = []

    def script(tools):
        read_everything(tools)
        for file in EXPERIMENT_FILES:
            call_tool(tools, "write_file", {"path": file, "content": "export const x = 1; // " + file})
        seen.append(call_tool(tools, "edit_file", {"path": "presets/types.ts", "expectedText": "export type Preset = HydraulicLiftPreset;",
                                                   "replacement": "export type Preset = HydraulicLiftPreset | VaChamPreset;"}))
        seen.append(call_tool(tools, "edit_file", {"path": "presets/index.ts", "expectedText": "[hydraulicLiftPreset]",
                                                   "replacement": "[hydraulicLiftPreset, vaChamPreset]"}))
        seen.append(call_tool(tools, "write_file", {"path": "engines/va-cham/engine.ts", "content": "x"}))
        call_tool(tools, "append_note", {"text": "preset va-cham có hai tham số"})
        call_tool(tools, "finish", {"summary": "đã viết experiment"})

    model = SplitModel(script)
    result = service(model, browser).run(CodeLayer.EXPERIMENT, request_)

    assert result.status == "finished"
    assert {EXPERIMENT_FILES[0], EXPERIMENT_FILES[1], "presets/types.ts", "presets/index.ts"} <= set(result.files)
    assert json.loads(seen[0])["success"] is True
    assert "PATH_NOT_ALLOWED" in seen[2]
    assert "VaChamPreset" in browser.files["presets/types.ts"]
    assert "vaChamPreset" in browser.files["presets/index.ts"]
    assert all(part in model.systems[0] for part in ("EXPERIMENT", "VaChamExperiment", "vaChamPreset")) and "{{" not in model.systems[0]
    assert all(part in model.users[0] for part in ("tầng EXPERIMENT", "- presets/types.ts", "- presets/index.ts", "experiments/TemplateExperiment.tsx"))


def test_every_layer_names_itself():
    assert CodeLayer.parse("engine") is CodeLayer.ENGINE
    assert CodeLayer.parse("renderer") is CodeLayer.RENDERER
    assert CodeLayer.parse("experiment") is CodeLayer.EXPERIMENT
    with pytest.raises(ValueError):
        CodeLayer.parse("physics")
