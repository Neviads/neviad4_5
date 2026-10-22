"""Shared pieces of the draw-object tests: a scripted model that learns its file from the task, and a description the describe step accepts."""
from __future__ import annotations

import functools

from beneviadsystem.service.agent.impl.draw_object_validator import DrawObjectValidator, Validation
from tests.conftest import call_tool
from tests.service.agent.codegen.scripted_model import ScriptedModel


class Drawer(ScriptedModel):
    """A scripted model whose scripts get ``(tools, model)``, so they can read the file they were assigned off the last task."""

    def __init__(self, *rounds):
        super().__init__(*[functools.partial(self._run, r) for r in rounds])

    def _run(self, script, tools):
        return script(tools, self)

    def code_path(self) -> str:
        task = self.prompts[-1]
        first = task.index("- _drawn/")
        return task[first + 2:task.index("\n", first)]


class FnValidator(DrawObjectValidator):
    def __init__(self, function):
        self._function = function

    def validate(self, answer):
        return self._function(answer)


def real_object(*part_names: str) -> dict:
    """A description of the real object that the describe step accepts, with one part per name."""
    return {"overall": "Một máy nâng thuỷ lực phòng thí nghiệm, khung thép sơn, dáng thấp và chắc, hai xi lanh đứng cạnh nhau.",
            "size": "dài khoảng 0,6 m, cao 0,4 m", "viewNotes": "nhìn ngang, chỉ thấy mặt bên",
            "parts": [{"name": name, "realShape": "đường bao bo tròn ở hai góc trên, cạnh dưới thẳng", "position": "nằm giữa, nối vào thân",
                       "proportion": "khoảng một phần ba bề ngang", "material": "kim loại sơn, bắt sáng ở mép trên", "details": "hai con ốc"}
                      for name in part_names]}


def describe_and_write(tools, model: Drawer, code: str, *parts: str) -> str:
    path = model.code_path()
    assert '"ok":true' in call_tool(tools, "describe_real_object", real_object(*(parts or ("thân", "bánh", "cần bơm"))))
    call_tool(tools, "write_file", {"path": path, "content": code})
    return path


__all__ = ["Drawer", "FnValidator", "Validation", "describe_and_write", "real_object"]
