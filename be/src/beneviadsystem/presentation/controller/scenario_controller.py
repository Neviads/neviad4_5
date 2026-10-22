from fastapi import APIRouter, Depends

from beneviadsystem.config.container import Container
from beneviadsystem.presentation.dto.errors import AGENT_ERRORS, agent_error
from beneviadsystem.presentation.dto.requests import ScenarioBody
from beneviadsystem.service.agent.impl.scenario_agent import ObjectInfo, Scenario
from beneviadsystem.service.agent.invalid_agent_response_error import InvalidAgentResponseError

from .dependencies import container

router = APIRouter(prefix="/api/v1/scenario", tags=["Agents"])


@router.post("", response_model=Scenario, responses=AGENT_ERRORS, summary="Write the scenario of an experiment")
def execute(body: ScenarioBody, app: Container = Depends(container)):
    """The prose scenario of an experiment and the shared geometry of its objects, from the teacher's sentence and its objects."""
    objects = [ObjectInfo(id=o.id, title=o.title.strip(), request=o.request.strip(), hint=(o.hint or "").strip(), frame=o.frame) for o in body.objects]
    try:
        return app.scenario_agent.scenario(body.request.strip(), objects)
    except InvalidAgentResponseError as invalid:
        return agent_error(str(invalid))
