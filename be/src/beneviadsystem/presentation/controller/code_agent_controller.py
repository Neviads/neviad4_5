from __future__ import annotations

import re

from fastapi import APIRouter, Depends

from beneviadsystem.config.container import Container
from beneviadsystem.domain.model.base import CamelModel
from beneviadsystem.presentation.dto.errors import AGENT_ERRORS, agent_error
from beneviadsystem.service.agent.codegen.code_agent_service import ObjectInfo, Request, Result
from beneviadsystem.service.agent.codegen.code_layer import CodeLayer
from beneviadsystem.service.agent.impl.scenario_models import Scenario

from .dependencies import container

router = APIRouter(prefix="/api/v1/codeagent", tags=["Agents"])
_RUN_ID = re.compile(r"[A-Za-z0-9_-]{1,40}")
_IDENTIFIER = re.compile(r"[A-Za-z][A-Za-z0-9_]{0,39}")
MAX_OBJECTS = 4


class ObjectBody(CamelModel):
    id: str | None = None
    title: str | None = None
    file: str | None = None
    function_name: str | None = None
    notes: str | None = None


class CodeAgentBody(CamelModel):
    """What the browser sends; :func:`checked` turns it into a request the agent can run, or says what is wrong with it."""

    run_id: str | None = None
    slug: str | None = None
    request: str | None = None
    scenario: Scenario | None = None
    objects: list[ObjectBody | None] | None = None


def _blank(text: str | None) -> bool:
    return text is None or not text.strip()


def checked(body: CodeAgentBody | None) -> Request:
    """The request with every list present, or ``ValueError`` saying what is wrong with it."""
    if body is None:
        raise ValueError("Thiếu nội dung yêu cầu.")
    if body.run_id is None or not _RUN_ID.fullmatch(body.run_id):
        raise ValueError("runId chỉ gồm chữ, số, gạch ngang và gạch dưới (tối đa 40).")
    if _blank(body.request) or len(body.request) > 3000:
        raise ValueError("request phải có từ 1 đến 3000 ký tự.")
    if body.scenario is None or _blank(body.scenario.summary) or _blank(body.scenario.layout):
        raise ValueError("Thiếu kịch bản (cần tóm tắt và bố cục).")
    if not body.objects or len(body.objects) > MAX_OBJECTS:
        raise ValueError(f"Cần từ 1 đến {MAX_OBJECTS} vật.")
    objects = []
    for o in body.objects:
        if o is None or o.id is None or not _IDENTIFIER.fullmatch(o.id):
            raise ValueError("id của vật phải là định danh ASCII.")
        if _blank(o.file) or not o.file.startswith("objects/") or not o.file.endswith(".ts"):
            raise ValueError(f"file của vật {o.id} phải nằm ở objects/*.ts.")
        if _blank(o.function_name):
            raise ValueError(f"Thiếu tên hàm của vật {o.id}.")
        objects.append(ObjectInfo(id=o.id, title=o.title if o.title is not None else o.id, file=o.file, function_name=o.function_name, notes=o.notes))
    return Request(run_id=body.run_id, slug=body.slug, request=body.request.strip(), scenario=body.scenario, objects=objects)


@router.post("/{layer}", response_model=Result, responses=AGENT_ERRORS, summary="Run the code agent of one layer")
def run(layer: str, body: CodeAgentBody, app: Container = Depends(container)):
    """Runs the code agent on the copy of neviadlike_structure that the browser of the live code session ``runId`` holds. ``layer`` is
    engine, renderer or experiment; the layers before it must already be in the copy. Takes minutes, so callers must not use a short timeout."""
    try:
        return app.code_agent_service.run(CodeLayer.parse(layer), checked(body))
    except ValueError as invalid:
        return agent_error(str(invalid))
