"""The draw-object agent SEES its figure (pictures with every check) and an independent judge must pass it before finish is accepted."""
import pytest

from beneviadsystem.infrastructure.ai.tool_image_source import Image, ToolImageSource
from beneviadsystem.service.agent.codegen.bridged_code_store import BridgedCodeStore
from beneviadsystem.service.agent.impl.draw_object_agent import MAX_JUDGINGS, DrawObjectAgent, DrawObjectRequest
from beneviadsystem.service.agent.impl.draw_object_judge import Criteria, DrawObjectJudge, Feature, Observed, Ratio, Report, Verdict
from tests.conftest import call_tool
from tests.service.agent.codegen.fake_browser_bridge import FakeBrowserBridge
from tests.service.agent.impl.drawing_support import Drawer, FnValidator, Validation, real_object

CODE = "const makeScope = () => 1;"
REST = Image("tư thế nghỉ", "data:image/png;base64,AAAA")
REQUEST = DrawObjectRequest(title="Kính hiển vi", request="kính hiển vi học đường, nhìn ngang", hint="")
CRITERIA = Criteria(view="nhìn ngang", ratios=[], features=["cánh tay chữ C"], view_rules=["không lộ mặt trước"])


class FakeJudge(DrawObjectJudge):
    """A judge that answers from a list of verdicts and remembers what it was shown."""

    def __init__(self, *verdicts):
        self.verdicts, self.criteria_calls, self.shown, self.failure = list(verdicts), 0, [], None

    def criteria(self, request):
        self.criteria_calls += 1
        return CRITERIA

    def judge(self, request, criteria, images):
        if self.failure:
            raise self.failure
        self.shown.append(list(images))
        return self.verdicts[min(len(self.shown), len(self.verdicts)) - 1]


@pytest.fixture
def browser():
    return FakeBrowserBridge()


@pytest.fixture
def steps():
    return []


@pytest.fixture
def make_agent(browser, steps):
    def make(model, judge):
        validator = FnValidator(lambda answer: Validation([], ["✓ chạy được"], CODE, None, [REST]))
        return DrawObjectAgent(model, validator, lambda run_id: BridgedCodeStore(browser, run_id), steps.append, "medium", None, judge)
    return make


def write(tools, model):
    path = model.code_path()
    call_tool(tools, "describe_real_object", real_object("thân", "ống kính", "bàn mẫu"))
    call_tool(tools, "write_file", {"path": path, "content": CODE})
    return path


def fail(score, defect):
    return Verdict(passed=False, score=score, defects=[defect], summary="chưa giống")


def passing(score):
    return Verdict(passed=True, score=score, defects=[], summary="giống")


def test_every_check_shows_the_pictures_of_the_figure_to_the_model_once(make_agent):
    seen = []

    def script(tools, model):
        write(tools, model)
        call_tool(tools, "check_object", {"reason": "xem"})
        check = next(t for t in tools if t.definition.name == "check_object")
        assert isinstance(check, ToolImageSource)
        seen.append(check.take_images())
        seen.append(check.take_images())
        call_tool(tools, "finish", {"summary": "xong"})

    model = Drawer(script)
    make_agent(model, None).generate(REQUEST, "run-1")

    assert seen[0] == [REST]
    assert seen[1] == []
    assert all(s in model.prompts[0] for s in ("tả hình mẫu trước, rồi dựng theo khung", "describe_real_object", "TRẢ ẢNH", "GIÁM KHẢO"))
    assert not any(s in model.prompts[0] for s in ("tối đa 120 dòng", "bức tranh liền"))


def test_the_judge_refuses_finish_with_its_defects_until_a_fixed_figure_passes(make_agent, steps):
    refusals = []

    def script(tools, model):
        path = write(tools, model)
        call_tool(tools, "check_object", {"reason": "1"})
        refusals.append(call_tool(tools, "finish", {"summary": "lần 1"}))
        call_tool(tools, "edit_file", {"path": path, "expectedText": "1;", "replacement": "2;"})
        call_tool(tools, "check_object", {"reason": "2"})
        assert '"success":true' in call_tool(tools, "finish", {"summary": "lần 2"})

    judge = FakeJudge(fail(4, "Đèn chiếu nằm trên bàn mẫu: dời xuống dưới."), passing(8))
    result = make_agent(Drawer(script), judge).generate(REQUEST, "run-1")

    assert all(s in refusals[0] for s in ('"success":false', "4/10", "Đèn chiếu nằm trên bàn mẫu", "Còn 2 lần chấm"))
    assert judge.criteria_calls == 1
    assert judge.shown == [[REST], [REST]]
    assert result.status == "ok"
    assert "giám khảo lần 1: 4/10, chưa qua — Đèn chiếu nằm trên bàn mẫu: dời xuống dưới." in result.self_test_report
    assert "giám khảo lần 2: 8/10, qua" in result.self_test_report
    assert any("Giám khảo: 8/10, qua" in s.message for s in steps)


def test_after_the_last_refusal_the_object_is_accepted_with_a_warning_so_the_experiment_goes_on(make_agent):
    answers = []

    def script(tools, model):
        write(tools, model)
        call_tool(tools, "check_object", {"reason": "1"})
        for _ in range(MAX_JUDGINGS):
            answers.append(call_tool(tools, "finish", {"summary": "thử"}))

    judge = FakeJudge(fail(3, "Chỉ là các khối ghép lại."))
    result = make_agent(Drawer(script), judge).generate(REQUEST, "run-1")

    assert all('"success":false' in a for a in answers[:MAX_JUDGINGS - 1])
    assert '"success":true' in answers[-1]
    assert len(judge.shown) == MAX_JUDGINGS
    assert result.status == "ok"
    assert any(line.startswith("⚠ giám khảo chưa cho qua sau 3 lần chấm (điểm cuối 3/10)") for line in result.self_test_report)


def test_a_judge_that_cannot_run_never_blocks_the_object_and_the_result_says_so(make_agent):
    def script(tools, model):
        write(tools, model)
        call_tool(tools, "check_object", {"reason": "1"})
        assert '"success":true' in call_tool(tools, "finish", {"summary": "xong"})

    judge = FakeJudge(passing(9))
    judge.failure = RuntimeError("provider không trả lời")
    result = make_agent(Drawer(script), judge).generate(REQUEST, "run-1")

    assert result.status == "ok"
    assert any("⚠ giám khảo không chạy được: provider không trả lời" in line for line in result.self_test_report)


def test_the_code_not_the_judge_decides_the_pass():
    criteria = Criteria(view="nhìn ngang", ratios=[Ratio(name="chân đế / cả vật", expected=0.1)],
                        features=["cánh tay chữ C", "bàn mẫu", "thị kính nghiêng"], view_rules=[])
    good = [Feature(feature="cánh tay chữ C", present=True, note=""), Feature(feature="bàn mẫu", present=True, note=""),
            Feature(feature="thị kính nghiêng", present=False, note="thẳng đứng")]
    ratio_ok = [Observed(name="chân đế / cả vật", observed=0.12)]

    def report(ratios=ratio_ok, features=good, view_ok=True, view_problems=(), score=8):
        return Report(ratios=ratios, features=features, view_ok=view_ok, view_problems=list(view_problems), defects=[], score=score, passed=True, summary="")

    passes = DrawObjectJudge.decide(criteria, report())
    ratio_off = DrawObjectJudge.decide(criteria, report(ratios=[Observed(name="chân đế / cả vật", observed=0.2)], score=9))
    wrong_view = DrawObjectJudge.decide(criteria, report(view_ok=False, view_problems=["mặt trước xoay ra phía người xem"], score=9))
    low_score = DrawObjectJudge.decide(criteria, report(score=6))
    two_missing = DrawObjectJudge.decide(criteria, report(features=[Feature(feature="cánh tay chữ C", present=False, note=""), good[1], good[2]], score=9))

    assert passes.passed
    assert passes.defects == ["Thiếu đặc điểm nhận diện: thị kính nghiêng (thẳng đứng)."]
    assert not ratio_off.passed
    assert all(s in ratio_off.defects[0] for s in ("chân đế / cả vật", "0.20", "0.10", "lệch 100%"))
    assert not wrong_view.passed
    assert "Góc nhìn (nhìn ngang): mặt trước xoay ra phía người xem" in wrong_view.defects
    assert not low_score.passed
    assert not two_missing.passed
