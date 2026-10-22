from beneviadsystem.service.agent.impl.scenario_models import MovingPart, ObjectGeometry, Phase, Scenario
from beneviadsystem.service.agent.invalid_agent_response_error import InvalidAgentResponseError
from tests.presentation.conftest import Recorder

BODY = {"request": " máy nâng thuỷ lực ", "objects": [{"id": "pump", "title": "Máy nâng", "request": "mô tả", "hint": "Đầu ra: y. Port: z.",
                                                       "inputs": None, "outputs": None}]}


class Agent:
    def __init__(self, recorder):
        self.scenario = recorder


def test_returns_the_scenario_and_passes_the_objects_on(client_for):
    recorder = Recorder(Scenario(summary="tóm tắt", formulas=["F = pA"], phases=[Phase(name="Ấn", description="mô tả")], layout="bố cục",
                                 object_geometry=[ObjectGeometry(object_id="pump", width=0.6, height=0.8, anchor="tâm đáy",
                                                                 parts=[MovingPart(name="lever", motion="rotate", axis="", min=0.0, max=25.0, description="cần bơm")])]))

    response = client_for(scenario_agent=Agent(recorder)).post("/api/v1/scenario", json=BODY)

    assert response.status_code == 200
    body = response.json()
    assert body["formulas"][0] == "F = pA"
    assert body["phases"][0]["name"] == "Ấn"
    assert body["objectGeometry"][0]["parts"][0]["name"] == "lever"
    request, objects = recorder.calls[0]
    assert request == "máy nâng thuỷ lực"
    assert (objects[0].id, objects[0].title) == ("pump", "Máy nâng")


def test_a_request_without_objects_is_rejected(client_for):
    assert client_for(scenario_agent=Agent(Recorder())).post("/api/v1/scenario", json={"request": "x", "objects": []}).status_code == 400


def test_an_object_id_that_is_not_an_identifier_is_rejected(client_for):
    body = {**BODY, "objects": [{**BODY["objects"][0], "id": "../x"}]}

    assert client_for(scenario_agent=Agent(Recorder())).post("/api/v1/scenario", json=body).status_code == 400


def test_an_agent_that_cannot_write_a_valid_scenario_is_a_bad_request(client_for):
    response = client_for(scenario_agent=Agent(Recorder(failure=InvalidAgentResponseError("hết lượt")))).post("/api/v1/scenario", json=BODY)

    assert response.status_code == 400
    assert response.json() == {"error": "hết lượt"}
