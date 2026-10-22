import uuid

from fastapi import APIRouter, Depends, Response

from beneviadsystem.config.container import Container
from beneviadsystem.presentation.dto.errors import AGENT_ERRORS
from beneviadsystem.presentation.dto.requests import DrawObjectBody, HeadlessBody
from beneviadsystem.service.agent.codegen.overlay_code_store import OverlayCodeStore
from beneviadsystem.service.agent.impl.draw_object_agent import DrawObjectRequest, DrawObjectResult

from .dependencies import container

router = APIRouter(prefix="/api/v1/draw-object", tags=["Agents"])


def _request(body: HeadlessBody) -> DrawObjectRequest:
    return DrawObjectRequest(title=body.title.strip(), request=body.request.strip(), hint=(body.hint or "").strip(), is_static=False,
                             geometry=body.geometry, view=body.view, frame=body.frame, style=body.style)


@router.post("", response_model=DrawObjectResult, responses=AGENT_ERRORS, summary="Draw one object")
def execute(body: DrawObjectBody, app: Container = Depends(container)):
    """Writes one object with the draw-object agent on the copy of the tree the browser of the live code session ``runId`` holds. Takes
    minutes (the agent reads, writes and checks, round trips to the browser included), so callers must not use a short timeout."""
    return app.draw_object_agent.generate(_request(body), body.run_id)


@router.post("/headless", response_model=DrawObjectResult, responses={**AGENT_ERRORS, 404: {"description": "Headless drawing is disabled"}},
             summary="Draw one object without a browser (dev only)")
def headless(body: HeadlessBody, app: Container = Depends(container)):
    """The very same agent, prompt, check and model, without the page: the template is read from the database and every file the agent writes
    stays in memory. It calls the real model, so it is off unless ``APP_DRAW_OBJECT_HEADLESS_ENABLED``."""
    if not app.settings.app_draw_object_headless_enabled:
        return Response(status_code=404)
    run_id = "headless-" + uuid.uuid4().hex[:8]
    return app.draw_object_agent.generate(_request(body), run_id, OverlayCodeStore(app.source_library_service.template_store()))
