import pytest

from beneviadsystem.service.agent.codegen.agent_activity import AgentActivity
from beneviadsystem.service.agent.codegen.bridged_code_store import BridgedCodeStore
from beneviadsystem.service.agent.impl.draw_object_agent import DescribeInput, DrawObjectAgent, DrawObjectRequest, RealPart
from beneviadsystem.service.agent.impl.model_draw_object_judge import ModelDrawObjectJudge
from beneviadsystem.service.agent.impl.scenario_models import FramePart, MovingPart, NamedPoint, ObjectGeometry
from tests.conftest import call_tool
from tests.service.agent.codegen.fake_browser_bridge import FakeBrowserBridge
from tests.service.agent.impl.drawing_support import Drawer, FnValidator, Validation, describe_and_write, real_object

CODE = "const makeLift = () => 1;"
REQUEST = DrawObjectRequest(title="Máy nâng", request="mô tả, điểm neo ở đáy", hint="đầu vào: pumpStroke. Đầu ra: height. Port: handle.")
DECLARED = {"name": "makeLift", "inputs": [{"name": "pumpStroke", "label": "Hành trình", "unit": "m", "min": 0, "max": 0.1, "default": 0}],
            "outputs": [], "ports": [{"name": "handle"}]}


@pytest.fixture
def browser():
    return FakeBrowserBridge()


@pytest.fixture
def steps():
    return []


@pytest.fixture
def validated():
    return []


@pytest.fixture
def make_agent(browser, steps, validated):
    def make(model, problems_per_check, validator=None, activity=True):
        checks = []

        def validate(answer):
            validated.append(answer)
            problems = problems_per_check[min(len(checks), len(problems_per_check) - 1)]
            checks.append(1)
            return Validation(problems, ["✓ chạy được"] if not problems else [], CODE if not problems else None, DECLARED if not problems else None)

        return DrawObjectAgent(model, validator or FnValidator(validate), lambda run_id: BridgedCodeStore(browser, run_id), steps.append if activity else None)
    return make


def car_geometry():
    return ObjectGeometry(object_id="car", width=2.0, height=1.3, anchor="tâm đáy, chạm sàn",
                          points=[NamedPoint(name="frontEdge", description="mép ngoài cùng của cản trước")],
                          parts=[MovingPart(name="frontWheel", motion="rotate", axis="", min=0, max=360, description="bánh trước quay")])


def check_and_finish(tools, model):
    describe_and_write(tools, model, CODE)
    call_tool(tools, "check_object", {})
    call_tool(tools, "finish", {"summary": "xong"})


def test_a_drawing_that_ran_and_was_finished_is_ok_without_any_contract_or_note(make_agent, validated):
    def script(tools, model):
        describe_and_write(tools, model, CODE)
        assert '"ok":true' in call_tool(tools, "check_object", {"reason": "xong"})
        assert '"success":true' in call_tool(tools, "finish", {"summary": "xong"})

    model = Drawer(script)
    result = make_agent(model, [[]]).generate(REQUEST, "run-1")

    assert result.status == "ok"
    assert result.attempts == 1
    assert result.name == "makeLift"
    assert result.code == CODE and result.js == CODE
    assert len(result.inputs) == 1 and len(result.ports) == 1
    assert result.self_tests == []
    assert result.self_test_report == ["✓ chạy được"]
    assert all(s in model.prompts[0] for s in ("Luật về hình", "đẹp và giống thật", "Vật thể: Máy nâng", "mô tả, điểm neo ở đáy", "chỉ để tham khảo"))
    assert not any(s in model.prompts[0] for s in ("selfTests", "partAnchors", "30 px"))
    assert validated[0]["code"] == CODE


def test_a_figure_that_declares_nothing_is_still_ok(make_agent):
    validator = FnValidator(lambda answer: Validation([], ["✓"], CODE, {"name": "makeBox"}))

    result = make_agent(Drawer(check_and_finish), [[]], validator, activity=False).generate(REQUEST, "run-1")

    assert result.status == "ok"
    assert result.name == "makeBox"
    assert result.inputs == [] and result.ports == []


def test_the_geometry_the_scenario_fixed_is_a_firm_part_of_the_task_and_is_sent_to_the_check(make_agent, validated):
    model = Drawer(check_and_finish)

    result = make_agent(model, [[]]).generate(DrawObjectRequest(title="Ô tô", request="mô tả ô tô", hint="", geometry=car_geometry()), "run-1")

    assert result.status == "ok"
    assert result.anchor == "tâm đáy, chạm sàn"
    for s in ("Hình học của vật (BẮT BUỘC", "rộng 2 m, cao 1.3 m", "tâm đáy, chạm sàn", "`frontEdge`: mép ngoài cùng của cản trước",
              "`frontWheel`: quay từ 0 đến 360 độ", 'motion: "rotate"', "không có vật lý"):
        assert s in model.prompts[0], s
    sent = validated[0]["geometry"]
    assert sent["width"] == 2.0
    assert sent["parts"][0]["name"] == "frontWheel"


def test_a_still_object_is_told_it_has_no_moving_part_and_without_a_scenario_nothing_is_measured(make_agent, validated):
    model = Drawer(check_and_finish)
    foil = ObjectGeometry(object_id="foil", width=0.01, height=0.2, anchor="tâm lá")

    make_agent(model, [[]]).generate(DrawObjectRequest(title="Lá vàng", request="mô tả", hint="", geometry=foil), "run-1")
    make_agent(model, [[]]).generate(REQUEST, "run-2")

    assert all(s in model.prompts[0] for s in ("Bộ phận chuyển động: KHÔNG CÓ", "parts: {}", "Điểm có tên: không có"))
    assert "## Hình học của vật" not in model.prompts[-1]
    assert "geometry" not in validated[-1]


def test_the_measured_size_moving_parts_and_points_of_the_check_come_back_in_the_result(make_agent):
    meta = {"name": "makeCar", "size": {"width": 2.02, "height": 1.28}, "moving": [{"name": "frontWheel", "motion": "rotate", "axis": "", "min": 0, "max": 360}],
            "points": [{"name": "frontEdge", "x": 1.0, "y": -0.4}]}
    validator = FnValidator(lambda answer: Validation([], ["✓"], CODE, meta))

    result = make_agent(Drawer(check_and_finish), [[]], validator, activity=False).generate(
        DrawObjectRequest(title="Ô tô", request="mô tả", hint="", geometry=car_geometry()), "run-1")

    assert result.status == "ok"
    assert result.size["width"] == 2.02
    assert len(result.moving) == 1
    assert result.points[0]["name"] == "frontEdge"


def test_the_view_of_the_whole_scene_is_a_firm_part_of_the_task_only_when_the_scenario_gave_one(make_agent):
    model = Drawer(check_and_finish)

    make_agent(model, [[]]).generate(DrawObjectRequest(title="Lá vàng", request="mô tả, điểm neo ở tâm lá", hint="", view="Nhìn ngang; lá vàng thấy từ cạnh."), "run-1")
    make_agent(model, [[]]).generate(REQUEST, "run-2")

    assert "Góc nhìn chung của cả cảnh (BẮT BUỘC)" in model.prompts[0] and "Nhìn ngang; lá vàng thấy từ cạnh." in model.prompts[0]
    assert "## Góc nhìn chung của cả cảnh (BẮT BUỘC)" not in model.prompts[-1]


def test_a_model_that_cannot_be_called_gives_a_failed_result_with_the_reason_and_never_ok(make_agent, steps):
    def broken(tools, model):
        raise RuntimeError("openai responses call failed") from ConnectionResetError("Connection reset")

    result = make_agent(Drawer(broken), [[]]).generate(REQUEST, "run-1")

    assert result.status == "failed"
    assert len(result.problems) == 3
    assert all("lỗi khi gọi model" in p and "Connection reset" in p for p in result.problems)
    assert any(s.tool.startswith("gọi model") and not s.success and "Connection reset" in s.message for s in steps)
    assert steps[-1].message.startswith("Chưa xong: Lượt 3")


def test_a_failed_check_is_fixed_with_the_agent_own_tools_and_checked_again(make_agent):
    def script(tools, model):
        path = describe_and_write(tools, model, CODE)
        assert "lỗi cú pháp" in call_tool(tools, "check_object", {})
        call_tool(tools, "edit_file", {"path": path, "expectedText": "=> 1;", "replacement": "=> 2;"})
        assert '"ok":true' in call_tool(tools, "check_object", {})
        call_tool(tools, "finish", {"summary": "xong"})

    result = make_agent(Drawer(script), [["lỗi cú pháp"], []]).generate(REQUEST, "run-1")

    assert result.status == "ok"
    assert result.attempts == 2
    assert result.code == "const makeLift = () => 2;"


def test_finish_is_refused_until_the_agent_has_checked(make_agent):
    refusal = []

    def script(tools, model):
        describe_and_write(tools, model, CODE)
        refusal.append(call_tool(tools, "finish", {"summary": "sớm"}))

    result = make_agent(Drawer(script), [[]]).generate(REQUEST, "run-1")

    assert "NOT_DONE" in refusal[0] and "chưa gọi check_object" in refusal[0]
    assert result.status == "failed"
    assert any("chưa xong" in p for p in result.problems)
    assert result.js is None


def test_an_edit_after_the_check_makes_the_check_stale(make_agent):
    refusal = []

    def script(tools, model):
        path = describe_and_write(tools, model, CODE)
        call_tool(tools, "check_object", {})
        call_tool(tools, "edit_file", {"path": path, "expectedText": "=> 1;", "replacement": "=> 2;"})
        refusal.append(call_tool(tools, "finish", {"summary": "sớm"}))
        call_tool(tools, "check_object", {})
        call_tool(tools, "finish", {"summary": "xong"})

    result = make_agent(Drawer(script), [[]]).generate(REQUEST, "run-1")

    assert "NOT_DONE" in refusal[0] and "sửa file sau lần check_object" in refusal[0]
    assert result.status == "ok"
    assert result.attempts == 2


def test_a_code_that_never_runs_is_failed_with_the_last_problems_and_no_code_to_run(make_agent):
    def script(tools, model):
        describe_and_write(tools, model, CODE)
        call_tool(tools, "check_object", {})
        call_tool(tools, "finish", {"summary": "dù sao"})

    result = make_agent(Drawer(script), [["Chạy hàm vẽ bị lỗi"]]).generate(REQUEST, "run-1")

    assert result.status == "failed"
    assert result.problems == ["Chạy hàm vẽ bị lỗi"]
    assert result.js is None
    assert result.code == CODE


def test_notes_are_optional_but_are_carried_when_the_agent_writes_one(make_agent):
    def script(tools, model):
        describe_and_write(tools, model, CODE)
        call_tool(tools, "append_note", {"text": "đầu vào dương là đi lên"})
        call_tool(tools, "check_object", {})
        call_tool(tools, "finish", {"summary": "xong"})

    result = make_agent(Drawer(script), [[]]).generate(REQUEST, "run-1")

    assert result.status == "ok"
    assert "đầu vào dương là đi lên" in result.notes


def test_every_step_of_the_agent_is_published_for_the_screen(make_agent, steps):
    make_agent(Drawer(check_and_finish), [[]]).generate(REQUEST, "run-1")

    assert all(s.run_id == "run-1" and s.title == "Máy nâng" for s in steps)
    assert len({s.agent for s in steps}) == 1
    assert {"agent", "write_file", "check_object", "finish"} <= {s.tool for s in steps}
    assert (steps[0].tool, steps[0].phase) == ("agent", AgentActivity.STARTED)
    assert (steps[-1].tool, steps[-1].phase, steps[-1].success) == ("agent", AgentActivity.FINISHED, True)


def test_code_is_refused_until_the_real_object_is_described_with_every_part_of_the_frame(make_agent):
    frame = [FramePart(name="Thân xe", shape="hộp dài bo góc", position="giữa, trên hai bánh", proportion="chiếm gần hết bề ngang"),
             FramePart(name="Ca-bin", shape="vòm kính thấp", position="trên thân, lệch về sau", proportion="dài nửa thân"),
             FramePart(name="Bánh xe", shape="tròn, lốp đen", position="dưới thân, hai đầu", proportion="cao một phần ba xe")]
    request = DrawObjectRequest(title="Ô tô", request="mô tả ô tô", hint="", geometry=car_geometry(), frame=frame)
    answers = []

    def script(tools, model):
        path = model.code_path()
        answers.append(call_tool(tools, "write_file", {"path": path, "content": CODE}))
        answers.append(call_tool(tools, "describe_real_object", real_object("thân xe", "bánh trước", "bánh sau")))
        answers.append(call_tool(tools, "describe_real_object", real_object("thân xe", "ca-bin", "bánh xe")))
        answers.append(call_tool(tools, "write_file", {"path": path, "content": CODE}))
        call_tool(tools, "check_object", {})
        call_tool(tools, "finish", {"summary": "xong"})

    model = Drawer(script)
    result = make_agent(model, [[]]).generate(request, "run-1")

    assert "DESCRIBE_FIRST" in answers[0]
    assert '"ok":false' in answers[1] and "thiếu bộ phận 'Ca-bin' của khung" in answers[1]
    assert '"ok":true' in answers[2]
    assert '"success":true' in answers[3]
    assert result.status == "ok"
    assert "Hình mẫu của vật (người vẽ tả trước khi code)" in result.notes and "**ca-bin**" in result.notes
    assert all(s in model.prompts[0] for s in ("Khung của vật", "**Ca-bin**: vòm kính thấp; trên thân, lệch về sau; dài nửa thân", "describe_real_object"))


def test_a_thin_description_is_told_exactly_what_is_missing():
    thin = DescribeInput(overall="ngắn", size="", parts=[RealPart(name="thân", real_shape="hộp", position="", proportion="to", material="sắt", details="")], view_notes="")

    problems = DrawObjectAgent.describe_problems(thin, [])
    assert any(p.startswith("overall") for p in problems)
    assert any(p.startswith("size") for p in problems)
    assert any(p.startswith("viewNotes") for p in problems)
    assert any("'thân': realShape" in p for p in problems)
    assert any("'thân': cần đủ position" in p for p in problems)
    assert any(p.startswith("parts: có 0 bộ phận") for p in DrawObjectAgent.describe_problems(DescribeInput(overall="ngắn", size="", parts=[], view_notes=""), []))


def test_a_particle_with_one_part_and_no_material_is_a_full_description():
    neutron = DescribeInput(overall="Neutron theo hình minh hoạ quen thuộc trong sách: một quả cầu nhỏ màu xám bạc, có khối nhờ ánh sáng từ trên-trái.",
                            size="Cỡ mô hình bằng khoảng một phần năm hạt nhân uranium trong cảnh",
                            parts=[RealPart(name="quả cầu", real_shape="tròn đều, mép mịn, phồng đều mọi phía", position="là toàn bộ vật",
                                            proportion="chính là cả vật", material="", details="")],
                            view_notes="nhìn từ bên, thấy một hình tròn")

    assert DrawObjectAgent.describe_problems(neutron, [FramePart(name="quả cầu", shape="tròn", position="toàn bộ", proportion="cả vật")]) == []
    note = DrawObjectAgent.describe_note(neutron)
    assert "Hình mẫu của vật" in note and "**quả cầu**" in note and "; ;" not in note


def test_the_style_agreed_with_the_teacher_reaches_the_drawer_and_the_judge():
    request = DrawObjectRequest(title="Con lắc", request="con lắc đơn treo trên giá", hint="", style=" Sơ đồ SGK, nét phẳng ")

    assert request.style == "Sơ đồ SGK, nét phẳng"
    assert "Phong cách hình đã chốt với giáo viên" in DrawObjectAgent.style_section(request.style)
    assert DrawObjectAgent.style_section("") == ""
    assert "Phong cách hình đã chốt với giáo viên: Sơ đồ SGK, nét phẳng" in ModelDrawObjectJudge.describe(request)
    assert "Phong cách" not in ModelDrawObjectJudge.describe(DrawObjectRequest(title="Con lắc", request="con lắc", hint=""))


def test_a_browser_that_is_not_there_is_a_failed_result_not_a_crash(make_agent, browser):
    browser.down = True

    result = make_agent(Drawer(lambda tools, model: None), [[]]).generate(REQUEST, "run-1")

    assert result.status == "failed"
    assert "Agent không chạy được" in result.problems[0]
