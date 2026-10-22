from beneviadsystem.domain.model.source_file import SourceFile
from beneviadsystem.infrastructure.ai.ai_provider_unavailable_error import AiProviderUnavailableError
from beneviadsystem.infrastructure.persistence.source_file_repository import SourceFileRepository
from beneviadsystem.service.agent.codegen.overlay_code_store import OverlayCodeStore
from beneviadsystem.service.agent.impl.draw_object_agent import DrawObjectResult
from beneviadsystem.service.agent.invalid_agent_response_error import InvalidAgentResponseError
from beneviadsystem.service.source_library_service import SourceLibraryService

BODY = {"runId": "run-1", "title": " Con lắc ", "request": " con lắc đơn ", "hint": None, "view": "Nhìn ngang", "style": " Sơ đồ SGK ",
        "geometry": {"objectId": "pendulum", "width": 0.3, "height": 1.0, "anchor": "điểm treo", "points": None, "parts": None},
        "frame": [{"name": "quả nặng", "shape": "tròn", "position": "cuối dây", "proportion": "nhỏ"}]}


def drawn(status="ok"):
    return DrawObjectResult(id=1, title="Con lắc", request="con lắc đơn", hint="", source="lite", status=status, attempts=1, name="makePendulum",
                            ports=[], inputs=[], outputs=[], self_tests=[], self_test_report=["✓"], parts=[], code="c", js="j", moving=[], points=[])


class Agent:
    def __init__(self, failure=None):
        self.calls, self.failure = [], failure

    def generate(self, request, run_id, store=None):
        self.calls.append((request, run_id, store))
        if self.failure:
            raise self.failure
        return drawn()


class Repository(SourceFileRepository):
    def __init__(self):
        super().__init__(None)

    def find_all(self, collection):
        return [SourceFile("README.md", "khung")]


def test_draws_one_object_on_the_browser_copy_of_the_run(client_for):
    agent = Agent()

    response = client_for(draw_object_agent=agent).post("/api/v1/draw-object", json=BODY)

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["selfTestReport"] == ["✓"]
    request, run_id, store = agent.calls[0]
    assert (request.title, request.request, request.hint, request.style, run_id, store) == ("Con lắc", "con lắc đơn", "", "Sơ đồ SGK", "run-1", None)
    assert request.geometry.anchor == "điểm treo" and request.frame[0].name == "quả nặng"


def test_a_body_that_breaks_the_limits_is_rejected_before_the_agent_runs(client_for):
    agent = Agent()
    api = client_for(draw_object_agent=agent)

    for body in ({**BODY, "runId": "run 1!"}, {**BODY, "title": "  "}, {**BODY, "request": "x" * 4001}, {**BODY, "frame": [BODY["frame"][0]] * 21}):
        response = api.post("/api/v1/draw-object", json=body)
        assert response.status_code == 400, body
        assert response.json()["error"] == "Bad Request"
    assert agent.calls == []


def test_the_headless_run_is_off_unless_configured(client_for):
    assert client_for(draw_object_agent=Agent()).post("/api/v1/draw-object/headless", json=BODY).status_code == 404


def test_the_headless_run_draws_on_the_template_from_the_database_in_memory(client_for):
    agent = Agent()
    api = client_for({"app_draw_object_headless_enabled": True}, draw_object_agent=agent, source_library_service=SourceLibraryService(Repository()))

    response = api.post("/api/v1/draw-object/headless", json={k: v for k, v in BODY.items() if k != "runId"})

    assert response.status_code == 200
    _, run_id, store = agent.calls[0]
    assert run_id.startswith("headless-") and len(run_id) == len("headless-") + 8
    assert isinstance(store, OverlayCodeStore) and store.read("README.md") == "khung"


def test_an_invalid_answer_of_the_agent_is_a_bad_gateway_and_a_missing_provider_is_unavailable(client_for):
    invalid = client_for(draw_object_agent=Agent(InvalidAgentResponseError("không hợp lệ"))).post("/api/v1/draw-object", json=BODY)
    unavailable = client_for(draw_object_agent=Agent(AiProviderUnavailableError("không có provider"))).post("/api/v1/draw-object", json=BODY)

    assert invalid.status_code == 502 and invalid.json() == {"status": 502, "error": "Invalid AI Response", "message": "không hợp lệ"}
    assert unavailable.status_code == 503 and unavailable.json()["error"] == "AI Provider Unavailable"
