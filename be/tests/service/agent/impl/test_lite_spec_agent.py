import pytest

from beneviadsystem.infrastructure.ai.ai_client import AiClient
from beneviadsystem.infrastructure.ai.ai_generation_result import AiGenerationResult
from beneviadsystem.service.agent.impl.lite_spec_agent import MAX_ANSWERS, LiteSpecAgent, Status
from beneviadsystem.service.agent.invalid_agent_response_error import InvalidAgentResponseError
from tests.service.test_object_library_service import CATALOG, library, object_file

REQUEST = ('Máy nâng thuỷ lực: một xi lanh nhỏ bên trái có cần ấn, một xi lanh lớn bên phải nâng bệ tải có nhãn \\"tải\\". '
           "Đứng trên sàn, điểm neo ở giữa đáy. Khi ấn cần bơm, pít-tông nhỏ đi xuống, pít-tông lớn đi lên.")
GOOD_HINT = "Đầu ra: độ cao bệ tải (m). Port: tay cầm, bệ tải."
STYLE = "Sơ đồ như sách giáo khoa: nét phẳng, màu đơn giản, có nhãn tên bộ phận."


def part(name):
    return '{"name":"' + name + '","shape":"trụ đứng bo miệng","position":"đứng trên đế","proportion":"cao nửa máy"}'


FRAME = "[" + part("xi lanh nhỏ") + "," + part("xi lanh lớn") + "," + part("cần bơm") + "]"


def ready(hint):
    return ('{"status":"READY","phenomenon":"Máy nâng thuỷ lực","reason":null,"question":null,"style":"' + STYLE + '","objects":['
            '{"id":"hydraulicLift","title":"Máy nâng thuỷ lực","request":"' + REQUEST + '","frame":' + FRAME + ',"hint":"' + hint + '"}]}')


QUESTION = ('{"status":"NEEDS_CLARIFICATION","phenomenon":"Máy nâng thuỷ lực","reason":null,'
            '"question":{"topic":"Phong cách hình","text":"Thầy/cô muốn hình tả thực hay sơ đồ như sách giáo khoa?","suggestions":["Tả thực","Sơ đồ SGK"]},'
            '"style":"","objects":[]}')


class Scripted(AiClient):
    def __init__(self, *replies):
        self.replies, self.prompts = list(replies), []

    def generate(self, prompt):
        return self.generate_reasoned(prompt, None).text

    def generate_with_tools(self, prompt, tools, spec=None, max_tool_calls=0, listener=None):
        assert [t.definition.name for t in tools] == ["get_objects"]
        return self.generate_reasoned(prompt, spec)

    def generate_reasoned(self, prompt, spec):
        self.prompts.append(prompt)
        return AiGenerationResult(self.replies[min(len(self.prompts), len(self.replies)) - 1], "test", "test")


def test_a_ready_outcome_carries_one_drawing_request_per_apparatus():
    outcome = LiteSpecAgent(Scripted(ready(GOOD_HINT))).analyze("máy nâng thuỷ lực")

    assert outcome.status is Status.READY
    (obj,) = outcome.objects
    assert obj.id == "hydraulicLift"
    assert "điểm neo" in obj.request
    assert obj.hint == GOOD_HINT
    assert [p.name for p in obj.frame] == ["xi lanh nhỏ", "xi lanh lớn", "cần bơm"]


def test_an_open_question_about_the_look_comes_back_with_suggestions():
    outcome = LiteSpecAgent(Scripted(QUESTION)).analyze("máy nâng thuỷ lực")

    assert outcome.status is Status.NEEDS_CLARIFICATION
    assert "sách giáo khoa" in outcome.question.text
    assert outcome.question.suggestions == ["Tả thực", "Sơ đồ SGK"]
    assert outcome.objects == []


def test_a_ready_outcome_carries_the_agreed_style_and_without_one_is_sent_back():
    scripted = Scripted(ready(GOOD_HINT).replace(STYLE, ""), ready(GOOD_HINT))

    outcome = LiteSpecAgent(scripted).analyze("máy nâng thuỷ lực\nTrả lời: Sơ đồ SGK")

    assert outcome.style == STYLE
    assert "READY cần style" in scripted.prompts[-1]


def test_after_five_answers_another_question_is_sent_back():
    scripted = Scripted(QUESTION, ready(GOOD_HINT))

    outcome = LiteSpecAgent(scripted).analyze("máy nâng thuỷ lực" + "\nTrả lời: tuỳ bạn" * MAX_ANSWERS)

    assert outcome.status is Status.READY
    assert "không hỏi thêm" in scripted.prompts[-1]


def test_fewer_than_five_answers_may_still_ask():
    assert LiteSpecAgent(Scripted(QUESTION)).analyze("máy nâng\nTrả lời: Sơ đồ SGK").status is Status.NEEDS_CLARIFICATION


def test_an_empty_or_repeated_or_half_described_frame_is_sent_back():
    thin = ready(GOOD_HINT).replace(FRAME, "[" + part("thân") + "," + part("Thân").replace("trụ đứng bo miệng", "") + "]")
    scripted = Scripted(thin, ready(GOOD_HINT).replace(FRAME, "[]"), ready(GOOD_HINT))

    outcome = LiteSpecAgent(scripted).analyze("máy nâng thuỷ lực")

    assert len(outcome.objects[0].frame) == 3
    assert "tên bị trùng trong frame" in scripted.prompts[1] and "cần đủ shape" in scripted.prompts[1]
    assert "frame có 0 phần, cần ít nhất 1" in scripted.prompts[-1]


def test_a_particle_with_a_single_round_part_is_an_object_like_any_other():
    neutron = ('{"id":"neutron","title":"Neutron","request":"Một neutron theo hình minh hoạ quen thuộc: quả cầu nhỏ màu xám bạc, '
               'mặt mịn, có khối nhờ ánh sáng. Nó bay tự do nên không có điểm neo. Hình dáng và chi tiết cứ tự do sáng tạo cho đẹp.",'
               '"frame":[{"name":"quả cầu","shape":"tròn đều","position":"là cả vật","proportion":"chính là cả vật"}],"hint":""}')
    reply = '{"status":"READY","phenomenon":"Phân hạch","reason":null,"style":"' + STYLE + '","objects":[' + neutron + "]}"

    (obj,) = LiteSpecAgent(Scripted(reply)).analyze("bắn neutron vào hạt nhân uranium\nTrả lời: mức hạt").objects

    assert obj.id == "neutron"
    assert len(obj.frame) == 1


def test_an_unsupported_request_needs_a_reason():
    outcome = LiteSpecAgent(Scripted('{"status":"UNSUPPORTED","phenomenon":"x","reason":"Không phải vật lý","objects":[]}')).analyze("nấu phở")

    assert outcome.status is Status.UNSUPPORTED
    assert outcome.reason == "Không phải vật lý"
    assert outcome.objects == []


def test_a_hint_that_names_an_input_is_sent_back_because_the_scenario_decides_inputs():
    scripted = Scripted(ready("đầu vào: leverAngle (độ, góc cần). Đầu ra: độ cao (m). Port: tay cầm."), ready(GOOD_HINT))

    outcome = LiteSpecAgent(scripted).analyze("máy nâng thuỷ lực")

    assert len(outcome.objects) == 1
    assert len(scripted.prompts) == 2
    assert 'không được nêu "đầu vào:"' in scripted.prompts[-1]


def test_a_hint_and_the_anchor_phrase_are_optional():
    outcome = LiteSpecAgent(Scripted(ready("").replace("điểm neo", "gốc toạ độ"))).analyze("máy nâng")

    assert outcome.status is Status.READY
    (obj,) = outcome.objects
    assert obj.hint == ""
    assert "điểm neo" not in obj.request


def with_reference(reference):
    return ready(GOOD_HINT).replace('"hint":"' + GOOD_HINT + '"}', '"hint":"' + GOOD_HINT + '","reference":' + ("null" if reference is None else '"' + reference + '"') + "}")


def a_library():
    return library({"luc-ke.ts": object_file("Lực kế", "Lực kế lò xo")}, CATALOG)


def test_a_chosen_library_object_is_kept_and_its_fixed_geometry_is_appended_to_the_request():
    scripted = Scripted(with_reference("luc-ke.ts"))

    (obj,) = LiteSpecAgent(scripted, a_library()).analyze("lực kế").objects

    assert obj.reference == "luc-ke.ts"
    assert all(s in obj.request for s in ("KHÔNG vẽ lại", "0.1 m × 0.3 m", "Bộ phận needle"))
    assert "KHO VẬT CÓ SẴN" in scripted.prompts[0]
    assert "MỤC LỤC KHO VẬT:\n## Dụng cụ đo\n- luc-ke.ts | Lực kế | Lực kế lò xo" in scripted.prompts[0]
    assert scripted.prompts[0].index("luc-ke.ts") < scripted.prompts[0].index("Yêu cầu của giáo viên")


def test_a_reference_that_is_not_in_the_library_is_sent_back_and_null_means_draw_it():
    scripted = Scripted(with_reference("khong-co.ts"), with_reference(None))

    outcome = LiteSpecAgent(scripted, a_library()).analyze("lực kế")

    assert "reference 'khong-co.ts' không có trong kho vật" in scripted.prompts[-1]
    assert outcome.objects[0].reference is None
    assert "KHÔNG vẽ lại" not in outcome.objects[0].request


def test_without_any_drawn_object_the_agent_does_not_mention_the_library():
    scripted = Scripted(ready(GOOD_HINT))

    LiteSpecAgent(scripted, library({}, None)).analyze("máy nâng thuỷ lực")

    assert "KHO VẬT CÓ SẴN" not in scripted.prompts[0]


class Browsing(AiClient):
    """Calls the library tool the way the model does (the details of a candidate read off the index), then answers."""

    def generate(self, prompt):
        return ready(GOOD_HINT)

    def generate_with_tools(self, prompt, tools, spec=None, max_tool_calls=0, listener=None):
        tools[0].call('{"ids":["luc-ke.ts"]}')
        return AiGenerationResult(ready(GOOD_HINT), "test", "test")

    def generate_reasoned(self, prompt, spec):
        return AiGenerationResult(ready(GOOD_HINT), "test", "test")


def test_library_tool_calls_are_published_to_the_run_while_the_agent_works():
    published = []

    LiteSpecAgent(Browsing(), a_library(), published.append).analyze("lực kế", "run-1")

    assert [f"{a.tool}:{a.phase}" for a in published] == ["get_objects:STARTED", "get_objects:FINISHED"]
    assert all(a.run_id == "run-1" for a in published)
    assert "1 vật" in published[0].message


def test_without_a_run_id_nothing_is_published():
    published = []

    LiteSpecAgent(Browsing(), a_library(), published.append).analyze("lực kế")

    assert published == []


def test_more_than_four_apparatuses_are_rejected():
    one = '{"id":"%s","title":"t","request":"' + REQUEST + '","frame":' + FRAME + ',"hint":"' + GOOD_HINT + '"}'
    reply = '{"status":"READY","phenomenon":"p","reason":null,"style":"' + STYLE + '","objects":[' + ",".join(one % c for c in "abcde") + "]}"

    with pytest.raises(InvalidAgentResponseError, match="tối đa 4"):
        LiteSpecAgent(Scripted(reply)).analyze("x")
