from fastapi import APIRouter, Depends

from beneviadsystem.config.container import Container
from beneviadsystem.presentation.dto.errors import AGENT_ERRORS, agent_error
from beneviadsystem.presentation.dto.requests import LiteSpecRequest
from beneviadsystem.service.agent.impl.lite_spec_agent import LiteOutcome
from beneviadsystem.service.agent.invalid_agent_response_error import InvalidAgentResponseError

from .dependencies import container

router = APIRouter(prefix="/api/v1/lite-spec", tags=["Agents"])


@router.post("", response_model=LiteOutcome, responses=AGENT_ERRORS, summary="Split a request into drawing requests")
def execute(body: LiteSpecRequest, app: Container = Depends(container)):
    """Turns one short sentence into the drawing requests (title, request, frame, hint) the draw-object agent takes, or one question back."""
    try:
        return app.lite_spec_agent.analyze(body.request.strip(), body.run_id)
    except InvalidAgentResponseError as invalid:
        return agent_error(str(invalid))
