from __future__ import annotations

import os
from typing import Any

from beneviadsystem.config.settings import Settings
from beneviadsystem.service import json_fields as j

from .assembly_validator import AssemblyValidator, Part
from .node_script_runner import NodeScriptRunner, ScriptFailure


class NodeAssemblyValidator(AssemblyValidator):
    """Runs ``fe/scripts/validate-assembly.mjs``."""

    def __init__(self, fe_root: str | os.PathLike[str], node_command: str = "node", timeout_seconds: float = 240):
        self._runner = NodeScriptRunner(fe_root, node_command, timeout_seconds)

    @classmethod
    def from_settings(cls, settings: Settings) -> NodeAssemblyValidator:
        return cls(NodeScriptRunner.resolve_fe_root(settings.app_pipeline_fe_root), settings.app_pipeline_node_command,
                   max(10, settings.app_pipeline_gate_timeout_seconds))

    def validate(self, plan: dict[str, Any], parts: list[Part]) -> list[str]:
        payload = {"plan": plan, "components": [{"id": p.id, "name": p.name, "js": p.js} for p in parts]}
        try:
            return [j.text(item) for item in j.items(j.field(self._runner.run("validate-assembly.mjs", payload), "problems"))]
        except ScriptFailure as failure:
            return [str(failure)]
