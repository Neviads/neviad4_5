from __future__ import annotations

from collections.abc import Callable
from typing import Any, TypeVar

from beneviadsystem.config.resources import read_text
from beneviadsystem.domain.exception import IllegalStateError
from beneviadsystem.infrastructure.ai.ai_client import AiClient
from beneviadsystem.infrastructure.ai.ai_request import AiRequest
from beneviadsystem.infrastructure.ai.structured_output_schema_registry import StructuredOutputSchemaRegistry
from beneviadsystem.infrastructure.ai.tool_image_source import Image
from beneviadsystem.service import json_fields as j

from .agent_json import MalformedJson, extract_json, parse
from .draw_object_judge import Criteria, DrawObjectJudge, Feature, Observed, Ratio, Report, Verdict, round_half_up


class ModelDrawObjectJudge(DrawObjectJudge):
    """The drawing judge as two model calls through the shared :class:`AiClient`: the criteria (no picture, ``prompts/drawobject/judge-criteria.md``)
    and the report on the pictures (``prompts/drawobject/judge.md``, pictures sent with the user message). Each call is a fresh context that
    never sees the drawer's code or turns. The pass is decided by :meth:`DrawObjectJudge.decide`."""

    def __init__(self, ai_client: AiClient):
        self._ai_client = ai_client
        self._criteria_prompt = read_text("prompts/drawobject/judge-criteria.md")
        self._judge_prompt = read_text("prompts/drawobject/judge.md")

    def criteria(self, request) -> Criteria:
        raw = self._ai_client.generate_request(AiRequest.of(self._criteria_prompt, self.describe(request) + "\n\nChốt tiêu chí theo hướng dẫn và trả JSON.")
                                               .with_schema(StructuredOutputSchemaRegistry.DRAW_CRITERIA_RESPONSE).with_reasoning()).text
        node = _parse(raw)
        ratios = _list(j.field(node, "ratios"), lambda r: Ratio(name=j.text(j.field(r, "name")), expected=j.number(j.field(r, "expected")))
                       if j.number(j.field(r, "expected")) > 0 else None)
        view = j.field(node, "view")
        return Criteria(view=request.view if view is None else j.text(view), ratios=ratios[:4], features=_texts(j.field(node, "features"))[:6],
                        view_rules=_texts(j.field(node, "viewRules"))[:4])

    def judge(self, request, criteria: Criteria, images: list[Image]) -> Verdict:
        user = (self.describe(request) + "\n\nTiêu chí đã chốt (theo hình mẫu quen thuộc của vật):" + criteria.model_dump_json(by_alias=True)
                + "\n\nCác ảnh dưới đây là hình người vẽ nộp. Đo và chấm theo hướng dẫn, trả JSON.")
        raw = self._ai_client.generate_request(AiRequest.of(self._judge_prompt, user).with_schema(StructuredOutputSchemaRegistry.DRAW_VERDICT_RESPONSE)
                                               .with_reasoning().with_images(images)).text
        node = _parse(raw)
        report = Report(
            ratios=_list(j.field(node, "ratios"), lambda r: Observed(name=j.text(j.field(r, "name")), observed=j.number(j.field(r, "observed")))),
            features=_list(j.field(node, "features"), lambda f: Feature(feature=j.text(j.field(f, "feature")), present=j.boolean(j.field(f, "present")),
                                                                        note=j.text(j.field(f, "note")))),
            view_ok=j.boolean(j.field(node, "viewOk")), view_problems=_texts(j.field(node, "viewProblems")), defects=_texts(j.field(node, "defects")),
            score=round_half_up(j.number(j.field(node, "score"), 1)),
            passed=j.boolean(j.field(node, "pass")), summary=j.text(j.field(node, "summary")))
        return DrawObjectJudge.decide(criteria, report)

    @staticmethod
    def describe(request) -> str:
        """The object as the judge sees it: what was asked, the geometry the scenario fixed and the scene's view; never the code."""
        out = [f"Vật thể: {request.title}\n{request.request}"]
        if request.hint and request.hint.strip():
            out.append(f"\nGợi ý: {request.hint}")
        if request.style.strip():
            out.append(f"\nPhong cách hình đã chốt với giáo viên: {request.style}")
        if request.frame:
            out.append("\nKhung (các bộ phận nhìn thấy được mà hình phải có):")
            out.extend(f"\n- {p.name}: {p.shape}; {p.position}; {p.proportion}" for p in request.frame)
        g = request.geometry
        if g is not None:
            out.append(f"\nHình học đã chốt: rộng {float(g.width)!r} m, cao {float(g.height)!r} m" + ("" if not g.anchor.strip() else f", điểm neo: {g.anchor}") + ".")
            for p in g.parts:
                motion = f"trượt {p.axis}" if p.motion == "slide" else "quay"
                out.append(f"\nBộ phận chuyển động {p.name}: {motion} từ {float(p.min)!r} đến {float(p.max)!r}" + ("" if not p.description.strip() else f" ({p.description})"))
        if request.view.strip():
            out.append(f"\nGóc nhìn của cảnh: {request.view}")
        return "".join(out)


def _parse(raw: str) -> Any:
    try:
        return parse(extract_json(raw))
    except MalformedJson as malformed:
        raise IllegalStateError("Giám khảo trả JSON không hợp lệ: " + malformed.reason) from malformed


def _texts(array: Any) -> list[str]:
    return [j.text(item) for item in j.items(array) if j.text(item).strip()]


T = TypeVar("T")


def _list(array: Any, read: Callable[[Any], T | None]) -> list[T]:
    return [value for value in (read(item) for item in j.items(array)) if value is not None]
