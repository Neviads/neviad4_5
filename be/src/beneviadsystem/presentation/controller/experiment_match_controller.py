from fastapi import APIRouter, Depends

from beneviadsystem.config.container import Container
from beneviadsystem.presentation.dto.errors import AGENT_ERRORS, agent_error
from beneviadsystem.presentation.dto.requests import MatchRequest
from beneviadsystem.service.agent.impl.experiment_match_agent import MatchResult
from beneviadsystem.service.agent.invalid_agent_response_error import InvalidAgentResponseError

from .dependencies import container

router = APIRouter(prefix="/api/v1/experiment-match", tags=["Agents"])


@router.post("", response_model=MatchResult, responses=AGENT_ERRORS, summary="Match the request against the experiment library")
def execute(body: MatchRequest, app: Container = Depends(container)):
    """Which ready-made experiments of the library (catalog sent by the frontend) the teacher's request already is, before anything is built."""
    try:
        return app.experiment_match_agent.match(body.request.strip(), body.catalog)
    except InvalidAgentResponseError as invalid:
        return agent_error(str(invalid))
