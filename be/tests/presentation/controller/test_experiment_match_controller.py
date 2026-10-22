from beneviadsystem.service.agent.impl.experiment_match_agent import Match, MatchResult
from beneviadsystem.service.agent.invalid_agent_response_error import InvalidAgentResponseError
from tests.presentation.conftest import Recorder

CATALOG = [{"id": "con-lac-don", "title": "Con lắc đơn", "domain": "Cơ học", "grade": 10, "desc": "d", "objective": "o"}]


class Agent:
    def __init__(self, recorder):
        self.match = recorder


def test_returns_the_matched_experiments_of_the_catalog(client_for):
    recorder = Recorder(MatchResult(matches=[Match(id="con-lac-don", reason="Đúng là con lắc đơn.")]))

    response = client_for(experiment_match_agent=Agent(recorder)).post("/api/v1/experiment-match", json={"request": "  con lắc đơn ", "catalog": CATALOG})

    assert response.status_code == 200
    assert response.json() == {"matches": [{"id": "con-lac-don", "reason": "Đúng là con lắc đơn."}]}
    request, catalog = recorder.calls[0]
    assert request == "con lắc đơn"
    assert catalog[0].id == "con-lac-don"


def test_a_request_without_catalog_is_rejected_before_the_agent_runs(client_for):
    recorder = Recorder()

    response = client_for(experiment_match_agent=Agent(recorder)).post("/api/v1/experiment-match", json={"request": "con lắc", "catalog": []})

    assert response.status_code == 400
    assert recorder.calls == []


def test_an_agent_that_cannot_produce_a_valid_answer_is_a_bad_request(client_for):
    agent = Agent(Recorder(failure=InvalidAgentResponseError("hết lượt")))

    response = client_for(experiment_match_agent=agent).post("/api/v1/experiment-match", json={"request": "x", "catalog": CATALOG})

    assert response.status_code == 400
    assert response.json() == {"error": "hết lượt"}
