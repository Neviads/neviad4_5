from beneviadsystem.presentation.dto.requirement.clarification_question import ClarificationQuestion
from beneviadsystem.service.agent.impl.lite_spec_agent import LiteOutcome, ObjectRequest, Status
from beneviadsystem.service.agent.invalid_agent_response_error import InvalidAgentResponseError
from tests.presentation.conftest import Recorder


class Agent:
    def __init__(self, recorder):
        self.analyze = recorder


def test_returns_the_drawing_requests_of_the_sentence(client_for):
    recorder = Recorder(LiteOutcome(status=Status.READY, phenomenon="Thuỷ lực", style="Tả thực", objects=[
        ObjectRequest(id="lift", title="Máy nâng", request="mô tả, điểm neo ở đáy", hint="đầu vào: x. Đầu ra: y. Port: z.")]))

    response = client_for(lite_spec_agent=Agent(recorder)).post("/api/v1/lite-spec", json={"request": "  máy nâng thuỷ lực ", "runId": "run-1"})

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "READY"
    assert body["objects"][0]["id"] == "lift"
    assert body["objects"][0]["hint"] == "đầu vào: x. Đầu ra: y. Port: z."
    assert body["objects"][0]["reference"] is None
    assert body["style"] == "Tả thực"
    assert recorder.calls == [("máy nâng thuỷ lực", "run-1")]


def test_returns_the_question_when_the_look_is_still_open(client_for):
    recorder = Recorder(LiteOutcome(status=Status.NEEDS_CLARIFICATION, phenomenon="Dao động",
                                    question=ClarificationQuestion(topic="Phong cách hình", text="Tả thực hay sơ đồ SGK?", suggestions=["Tả thực", "Sơ đồ SGK"])))

    response = client_for(lite_spec_agent=Agent(recorder)).post("/api/v1/lite-spec", json={"request": "con lắc"})

    assert response.json()["status"] == "NEEDS_CLARIFICATION"
    assert response.json()["question"]["text"] == "Tả thực hay sơ đồ SGK?"
    assert response.json()["question"]["suggestions"][1] == "Sơ đồ SGK"
    assert recorder.calls == [("con lắc", None)]


def test_a_blank_sentence_is_rejected_before_the_agent_runs(client_for):
    recorder = Recorder()

    assert client_for(lite_spec_agent=Agent(recorder)).post("/api/v1/lite-spec", json={"request": "  "}).status_code == 400
    assert recorder.calls == []


def test_an_agent_that_cannot_produce_a_valid_answer_is_a_bad_request(client_for):
    response = client_for(lite_spec_agent=Agent(Recorder(failure=InvalidAgentResponseError("hết lượt")))).post("/api/v1/lite-spec", json={"request": "x"})

    assert response.status_code == 400
    assert response.json() == {"error": "hết lượt"}
