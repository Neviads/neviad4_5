from fastapi import APIRouter, Depends

from beneviadsystem.config.container import Container
from beneviadsystem.presentation.dto.errors import AGENT_ERRORS, agent_error
from beneviadsystem.presentation.dto.requests import DrawObjectBody
from beneviadsystem.service.agent.impl.assembly_agent import AssemblyResult
from beneviadsystem.service.agent.impl.draw_object_agent import DrawObjectRequest
from beneviadsystem.service.agent.invalid_agent_response_error import InvalidAgentResponseError

from .dependencies import container

router = APIRouter(prefix="/api/v1/assembly", tags=["Agents"])


@router.post("", response_model=AssemblyResult, responses=AGENT_ERRORS, summary="Build a machine as an assembly of parts")
def execute(body: DrawObjectBody, app: Container = Depends(container)):
    """Takes minutes (a plan, then every part drawn by an agent that reads, writes and checks), so callers must not use a short timeout."""
    machine = DrawObjectRequest(title=body.title.strip(), request=body.request.strip(), hint=(body.hint or "").strip(), is_static=False,
                                geometry=None, view=body.view)
    try:
        return app.assembly_agent.assemble(machine, body.run_id)
    except InvalidAgentResponseError as invalid:
        return agent_error(str(invalid))
