import copy

from beneviadsystem.service.agent.codegen.code_agent_service import Result
from beneviadsystem.service.agent.codegen.code_layer import CodeLayer
from tests.presentation.conftest import Recorder

BODY = {"runId": "run-1", "slug": "va-cham", "request": " 2 ô tô đâm nhau ",
        "scenario": {"summary": "Hai xe va chạm.", "formulas": ["p = m·v"], "phases": [{"name": "Tiến lại", "description": "Hai xe chạy vào nhau"}],
                     "layout": "Xe 1 bên trái.", "adjustable": None, "observable": ["vị trí"], "assumptions": None,
                     "objectGeometry": [{"objectId": "leftCar", "width": 2, "height": 1.3, "anchor": "tâm đáy", "points": None, "parts": None}]},
        "objects": [{"id": "leftCar", "title": "Ô tô trái", "file": "objects/va-cham-1.ts", "functionName": "makeLeftCar", "notes": None}]}
RESULT = Result(status="finished", rounds=1, summary="xong", ledger="sổ cái", notes_path="_notes/va-cham.md", files=["engines/va-cham/physics.ts"])


class Service:
    def __init__(self, recorder):
        self.run = recorder


def changed(path, value):
    body = copy.deepcopy(BODY)
    target = body
    for key in path[:-1]:
        target = target[key]
    target[path[-1]] = value
    return body


def test_runs_the_engine_agent_and_fills_in_the_lists_the_browser_left_out(client_for):
    recorder = Recorder(RESULT)

    response = client_for(code_agent_service=Service(recorder)).post("/api/v1/codeagent/engine", json=BODY)

    assert response.status_code == 200
    assert response.json()["status"] == "finished"
    assert response.json()["files"][0] == "engines/va-cham/physics.ts"
    assert response.json()["notesPath"] == "_notes/va-cham.md"
    layer, request = recorder.calls[0]
    assert layer is CodeLayer.ENGINE
    assert request.request == "2 ô tô đâm nhau"
    assert request.scenario.adjustable == [] and request.scenario.assumptions == []
    assert request.objects[0].file == "objects/va-cham-1.ts"
    assert request.scenario.object_geometry[0].width == 2.0
    assert request.scenario.object_geometry[0].parts == []


def test_refuses_a_request_that_could_not_run_before_calling_the_agent(client_for):
    recorder = Recorder(RESULT)
    api = client_for(code_agent_service=Service(recorder))

    for body in (changed(["runId"], "run 1!"), changed(["scenario", "summary"], ""), changed(["objects", 0, "file"], "engines/evil.ts"),
                 changed(["objects", 0, "id"], "../x"), changed(["objects"], [])):
        assert api.post("/api/v1/codeagent/engine", json=body).status_code == 400, body
    assert recorder.calls == []


def test_the_layer_in_the_url_decides_which_agent_runs_and_an_unknown_layer_is_a_bad_request(client_for):
    recorder = Recorder(RESULT)
    api = client_for(code_agent_service=Service(recorder))

    for layer in ("renderer", "experiment"):
        assert api.post(f"/api/v1/codeagent/{layer}", json=BODY).status_code == 200
    assert [call[0] for call in recorder.calls] == [CodeLayer.RENDERER, CodeLayer.EXPERIMENT]

    unknown = api.post("/api/v1/codeagent/physics", json=BODY)
    assert unknown.status_code == 400
    assert "engine, renderer hoặc experiment" in unknown.json()["error"]


def test_a_slug_that_is_not_valid_comes_back_as_a_bad_request(client_for):
    response = client_for(code_agent_service=Service(Recorder(failure=ValueError("slug phải gồm chữ thường")))).post("/api/v1/codeagent/engine", json=BODY)

    assert response.status_code == 400
    assert response.json() == {"error": "slug phải gồm chữ thường"}
