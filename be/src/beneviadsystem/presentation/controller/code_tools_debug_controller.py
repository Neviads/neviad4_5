from __future__ import annotations

import logging
import re
import threading

from fastapi import APIRouter, Body, Depends, Query, Request
from fastapi.responses import JSONResponse, Response
from starlette.concurrency import run_in_threadpool

from beneviadsystem.config.container import Container
from beneviadsystem.service.agent.codegen.bridged_code_store import BridgedCodeStore
from beneviadsystem.service.agent.codegen.code_session import CodeSession, Limits
from beneviadsystem.service.agent.codegen.overlay_code_store import OverlayCodeStore
from beneviadsystem.service.agent.codegen.source_store import NOTES_DIR
from beneviadsystem.service.agent.tools.livecode.live_code_bridge import LiveCodeBridge
from beneviadsystem.service.source_library_service import SourceLibraryService

from .dependencies import container

log = logging.getLogger(__name__)
_RUN_ID = re.compile(r"[A-Za-z0-9_-]{1,40}")
DB = "db"
CHROME = "chrome"


def _playground(run_id: str) -> str:
    return f"_playground/{run_id}"


def _notes_path(run_id: str) -> str:
    return f"{NOTES_DIR}playground-{run_id}.md"


def _check(run_id: str, store: str) -> str | None:
    """None when the run id and the store name are acceptable, otherwise the reason."""
    if not _RUN_ID.fullmatch(run_id):
        return "runId chỉ gồm chữ, số, gạch ngang và gạch dưới (tối đa 40)"
    if store not in (DB, CHROME):
        return "store phải là db hoặc chrome"
    return None


class CodeToolsDebugController:
    """Development-only hook that calls the tools of :class:`CodeSession` over HTTP, so they can be exercised before an agent uses them.
    Two places for the tree, chosen by ``?store=``: ``db`` (default) reads the template from the database and keeps what the run writes in
    memory, only under ``_playground/<runId>/``; ``chrome`` works on the copy the browser holds (it needs the live code session of that run).
    Notes go to ``_notes/playground-<runId>.md``. DELETE forgets the run. Enabled only by ``APP_LIVECODE_DEBUG=true``; unauthenticated."""

    def __init__(self, source_library: SourceLibraryService, bridge: LiveCodeBridge):
        self._source_library = source_library
        self._bridge = bridge
        self._sessions: dict[str, CodeSession] = {}
        self._options: dict[str, dict[str, list[str]]] = {}
        self._lock = threading.Lock()
        log.warning("Code tools DEBUG endpoint is enabled (APP_LIVECODE_DEBUG=true). It is unauthenticated: local use only.")

    def session(self, store: str, run_id: str) -> CodeSession:
        key = f"{store}:{run_id}"
        with self._lock:
            if key not in self._sessions:
                tree = BridgedCodeStore(self._bridge, run_id) if store == CHROME else OverlayCodeStore(self._source_library.template_store())
                self._sessions[key] = CodeSession(tree, "playground", _notes_path(run_id), set(self.writable(store, run_id)),
                                                  set(self.must_read(store, run_id)), Limits.defaults())
            return self._sessions[key]

    def writable(self, store: str, run_id: str) -> list[str]:
        chosen = self._options.get(f"{store}:{run_id}", {}).get("writable")
        return chosen if chosen is not None else [f"{_playground(run_id)}/physics.ts", f"{_playground(run_id)}/types.ts"]

    def must_read(self, store: str, run_id: str) -> list[str]:
        chosen = self._options.get(f"{store}:{run_id}", {}).get("mustRead")
        return list(dict.fromkeys(chosen)) if chosen is not None else ["README.md"]

    def set_options(self, store: str, run_id: str, options: dict[str, list[str]]) -> None:
        with self._lock:
            self._options[f"{store}:{run_id}"] = options
            self._sessions.pop(f"{store}:{run_id}", None)

    def reset(self, store: str, run_id: str) -> None:
        with self._lock:
            self._sessions.pop(f"{store}:{run_id}", None)
            self._options.pop(f"{store}:{run_id}", None)


router = APIRouter(prefix="/api/v1/codetools/debug", tags=["Code tools (debug)"])


def _tools(app: Container) -> CodeToolsDebugController:
    return app.code_tools_debug_controller


@router.post("/{run_id}/{tool}", summary="Call one tool of the run's session")
async def call(run_id: str, tool: str, request: Request, store: str = Query(DB), app: Container = Depends(container)):
    """The body is the tool's own JSON input; the response is the tool's JSON result."""
    problem = _check(run_id, store)
    if problem is not None:
        return JSONResponse(status_code=400, content={"error": problem})
    body = (await request.body()).decode("utf-8") or "{}"

    def invoke():
        session = _tools(app).session(store, run_id)
        callback = next((c for c in session.callbacks() if c.definition.name == tool), None)
        if callback is None:
            return JSONResponse(status_code=404, content={"error": "unknown tool", "tools": [c.definition.name for c in session.callbacks()]})
        return Response(content=callback.call(body), media_type="application/json")

    return await run_in_threadpool(invoke)


@router.get("/{run_id}/state", summary="What the run's session has done so far")
def state(run_id: str, store: str = Query(DB), app: Container = Depends(container)):
    problem = _check(run_id, store)
    if problem is not None:
        return JSONResponse(status_code=400, content={"error": problem})
    controller = _tools(app)
    session = controller.session(store, run_id)
    s = session.state()
    return {"state": {"reads": s.reads, "writes": s.writes, "notes": s.notes, "finished": s.finished, "summary": s.summary}, "ledger": session.ledger(),
            "writable": controller.writable(store, run_id), "mustRead": controller.must_read(store, run_id), "notes": _notes_path(run_id)}


@router.put("/{run_id}/options", summary="Set the files the run may write and must read first")
def set_options(run_id: str, options: dict[str, list[str]] = Body(...), store: str = Query(DB), app: Container = Depends(container)):
    """``writable`` must stay under ``_playground/<runId>/`` and be TypeScript; the run's session starts over."""
    problem = _check(run_id, store)
    if problem is not None:
        return JSONResponse(status_code=400, content={"error": problem})
    prefix = _playground(run_id) + "/"
    for path in options.get("writable", []):
        if not path.startswith(prefix) or not path.endswith((".ts", ".tsx")):
            return JSONResponse(status_code=400, content={"error": f"writable chỉ được nằm dưới {prefix} và là .ts/.tsx: {path}"})
    _tools(app).set_options(store, run_id, options)
    return {"runId": run_id, "options": list(options)}


@router.delete("/{run_id}", summary="Forget the run's session and options")
def reset(run_id: str, store: str = Query(DB), app: Container = Depends(container)):
    problem = _check(run_id, store)
    if problem is not None:
        return JSONResponse(status_code=400, content={"error": problem})
    _tools(app).reset(store, run_id)
    return {"runId": run_id, "store": store, "reset": True}

