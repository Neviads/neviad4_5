from beneviadsystem.service.agent.impl.assembly_agent import AssemblyResult
from beneviadsystem.service.agent.invalid_agent_response_error import InvalidAgentResponseError

BODY = {"runId": "run-1", "title": " Máy nâng ", "request": " máy nâng thuỷ lực ", "hint": " đầu vào: u ", "view": "Nhìn ngang"}


class Agent:
    def __init__(self, failure=None):
        self.calls, self.failure = [], failure

    def assemble(self, machine, run_id):
        self.calls.append((machine, run_id))
        if self.failure:
            raise self.failure
        return AssemblyResult(status="ok", title=machine.title, plan={"root": "frame"}, parts=[], problems=[])


def test_builds_the_machine_on_the_browser_copy_of_the_run(client_for):
    agent = Agent()

    response = client_for(assembly_agent=agent).post("/api/v1/assembly", json=BODY)

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "title": "Máy nâng", "plan": {"root": "frame"}, "parts": [], "problems": []}
    machine, run_id = agent.calls[0]
    assert (machine.title, machine.request, machine.hint, machine.view, machine.geometry, run_id) == (
        "Máy nâng", "máy nâng thuỷ lực", "đầu vào: u", "Nhìn ngang", None, "run-1")


def test_a_plan_that_never_gets_valid_is_a_bad_request(client_for):
    response = client_for(assembly_agent=Agent(InvalidAgentResponseError("hết lượt"))).post("/api/v1/assembly", json=BODY)

    assert response.status_code == 400
    assert response.json() == {"error": "hết lượt"}
