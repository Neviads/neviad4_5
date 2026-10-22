from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from beneviadsystem.domain.model.base import CamelModel, TextList
from beneviadsystem.service import json_fields as j

from .assembly_planner import AssemblyPlanner
from .assembly_validator import AssemblyValidator, Part
from .draw_object_agent import DrawObjectAgent, DrawObjectRequest, DrawObjectResult

log = logging.getLogger(__name__)


class PartResult(CamelModel):
    """One drawn part; ``object`` has the same shape the gallery draws."""

    id: str
    object: DrawObjectResult


class AssemblyResult(CamelModel):
    status: str
    title: str
    plan: Any = None
    parts: list[PartResult] = []
    problems: TextList = []


class AssemblyAgent:
    """Builds a machine as an assembly: :class:`AssemblyPlanner` splits it into parts, :class:`DrawObjectAgent` draws every part on its own
    (in parallel, each through its own gate), then the assembly gate checks that the parts attach by their ports and that the machine moves.
    The answer is "ok" only when every part and the assembly passed; a failed part still comes back so it can be looked at."""

    def __init__(self, planner: AssemblyPlanner, drawer: DrawObjectAgent, validator: AssemblyValidator, max_parallel: int = 6):
        self._planner = planner
        self._drawer = drawer
        self._validator = validator
        self._max_parallel = max_parallel

    def assemble(self, machine: DrawObjectRequest, run_id: str) -> AssemblyResult:
        """``run_id`` is the live code session of the browser whose copy of the tree every part is drawn on."""
        plan = self._planner.plan(machine)
        components = [c for c in j.items(plan.get("components")) if isinstance(c, dict)]
        with ThreadPoolExecutor(max_workers=max(1, min(self._max_parallel, len(components))), thread_name_prefix="assembly-part") as pool:
            futures = []
            for c in components:
                part = DrawObjectRequest(title=j.text(c.get("title")), request=j.text(c.get("request")), hint=j.text(c.get("hint")),
                                         is_static=not j.boolean(c.get("moving")), view=machine.view)
                futures.append((j.text(c.get("id")), pool.submit(self._drawer.generate, part, run_id)))
            parts = [PartResult(id=part_id, object=future.result()) for part_id, future in futures]
        problems = [f"Bộ phận {p.id}: {problem}" for p in parts if p.object.status != "ok" for problem in p.object.problems]
        if not problems:
            problems.extend(self._validator.validate(plan, [Part(p.id, p.object.name, p.object.js) for p in parts]))
        log.info("AssemblyAgent: parts=%d, problems=%d", len(parts), len(problems))
        return AssemblyResult(status="ok" if not problems else "failed", title=machine.title, plan=plan, parts=parts, problems=problems)
