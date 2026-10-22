from __future__ import annotations

import os
from typing import Any

from beneviadsystem.config.settings import Settings
from beneviadsystem.infrastructure.ai.tool_image_source import Image
from beneviadsystem.service import json_fields as j

from .draw_object_validator import DrawObjectValidator, Validation
from .node_script_runner import NodeScriptRunner, ScriptFailure

#: At most this many pictures per check, and none larger than this (a picture is a data URL), so one check cannot flood the model.
MAX_IMAGES = 2
MAX_IMAGE_CHARS = 1_500_000


class NodeDrawObjectValidator(DrawObjectValidator):
    """Runs ``fe/scripts/validate-draw-object.mjs``: the answer goes in on stdin, one JSON line comes out on stdout."""

    def __init__(self, fe_root: str | os.PathLike[str], node_command: str = "node", timeout_seconds: float = 240):
        self._runner = NodeScriptRunner(fe_root, node_command, timeout_seconds)

    @classmethod
    def from_settings(cls, settings: Settings) -> NodeDrawObjectValidator:
        return cls(NodeScriptRunner.resolve_fe_root(settings.app_pipeline_fe_root), settings.app_pipeline_node_command,
                   max(10, settings.app_pipeline_gate_timeout_seconds))

    def validate(self, answer: dict[str, Any]) -> Validation:
        try:
            node = self._runner.run("validate-draw-object.mjs", answer)
        except ScriptFailure as failure:
            return Validation([str(failure)], [])
        problems = self.texts(j.field(node, "problems"))
        js = j.field(node, "js") if j.is_text(j.field(node, "js")) else None
        if not problems and (js is None or not js.strip()):
            return Validation(["Script kiểm tra không trả code đã biên dịch."], [])
        meta = j.field(node, "meta")
        return Validation(problems, self.texts(j.field(node, "report")), js if not problems else None, meta if isinstance(meta, dict) else None,
                          self.images(j.field(node, "images")))

    @staticmethod
    def texts(array: Any) -> list[str]:
        return [j.text(item) for item in j.items(array)]

    @staticmethod
    def images(array: Any) -> list[Image]:
        out: list[Image] = []
        for item in j.items(array):
            if len(out) >= MAX_IMAGES:
                break
            url = j.text(j.field(item, "dataUrl"))
            if url.startswith("data:image/png;base64,") and len(url) <= MAX_IMAGE_CHARS:
                out.append(Image(j.text(j.field(item, "label"), "vật"), url))
        return out
