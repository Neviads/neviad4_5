from __future__ import annotations

from beneviadsystem.domain.model.base import CamelModel
from beneviadsystem.infrastructure.ai.tool_callback import FunctionToolCallback, ToolCallback
from beneviadsystem.infrastructure.ai.tool_schema_lock import ToolSchemaLock
from beneviadsystem.service.agent.codegen.agent_activity import AgentActivity
from beneviadsystem.service.agent.codegen.agent_steps import AgentSteps
from beneviadsystem.service.object_library_service import ObjectLibraryService, Summary

#: Most ids one call may ask for.
MAX_IDS = 10


class GetInput(CamelModel):
    ids: list[str] | None = None


class ObjectsResult(CamelModel):
    success: bool
    total: int
    objects: list[Summary]
    message: str


def _failed(message: str) -> ObjectsResult:
    return ObjectsResult(success=False, total=0, objects=[], message=message)


class ObjectLibraryTools:
    """The read-only tool over the library of drawn objects, for an agent that already has the library's index in its prompt: it asks for
    the full summary (size, moving parts, points, useWhen, avoidWhen) of the objects it is weighing, by ``id``. Never source."""

    @staticmethod
    def of(library: ObjectLibraryService, steps: AgentSteps | None = None) -> list[ToolCallback]:
        """Each call is reported to ``steps`` (started, then finished with what it found) when given."""
        return ToolSchemaLock.build(lambda: [FunctionToolCallback("get_objects", lambda i: _get(library, steps, i), input_type=GetInput, description=(
            "Get the full summary of some ready-made objects of the library, by the ids of its index: size in metres, anchor, moving parts with "
            "their ranges, named points, useWhen (when to pick it) and avoidWhen (when NOT to pick it). Call it for the candidates you consider "
            f'before naming one as reference. Input: {{ids: up to {MAX_IDS} ids, e.g. ["can-don.ts"]}}.'))])


def _get(library: ObjectLibraryService, steps: AgentSteps | None, request: GetInput | None) -> ObjectsResult:
    ids = list(dict.fromkeys(i.strip() for i in (request.ids if request and request.ids else []) if i and i.strip()))
    if not ids:
        return _failed("ids (from the index of the library) are required")
    if len(ids) > MAX_IDS:
        return _failed(f"at most {MAX_IDS} ids per call")
    if steps is not None:
        steps.tool("get_objects", AgentActivity.STARTED, True, f"Xem chi tiết {len(ids)} vật trong kho")
    try:
        found, missing = [], []
        for object_id in ids:
            summary = library.find(object_id)
            (found.append(summary) if summary is not None else missing.append(object_id))
        result = ObjectsResult(success=True, total=len(found), objects=found,
                               message="" if not missing else f"not in the library: {', '.join(missing)} (use the ids exactly as the index writes them)")
    except Exception as failure:
        result = _failed(str(failure))
    if steps is not None:
        steps.tool("get_objects", AgentActivity.FINISHED, result.success, f"{result.total} vật" if result.success else result.message)
    return result
