from __future__ import annotations

import math
from abc import ABC, abstractmethod
from typing import Annotated

from beneviadsystem.domain.model.base import CamelModel, EmptyIfNone, Text, TextList
from beneviadsystem.infrastructure.ai.tool_image_source import Image

#: Lowest score that can pass, and how far an observed part ratio may stray from the real one.
PASS_SCORE = 7
RATIO_TOLERANCE = 0.3


class Ratio(CamelModel):
    name: str
    expected: float


class Criteria(CamelModel):
    view: Text = ""
    ratios: Annotated[list[Ratio], EmptyIfNone] = []
    features: TextList = []
    view_rules: TextList = []


class Observed(CamelModel):
    name: str
    observed: float


class Feature(CamelModel):
    feature: str
    present: bool
    note: Text = ""


class Report(CamelModel):
    """What the judge reported on the pictures, before the code decides."""

    ratios: Annotated[list[Observed], EmptyIfNone] = []
    features: Annotated[list[Feature], EmptyIfNone] = []
    view_ok: bool = False
    view_problems: TextList = []
    defects: TextList = []
    score: int = 1
    passed: bool = False
    summary: Text = ""


class Verdict(CamelModel):
    """The decision: ``defects`` are what the drawer must fix, written with the measured numbers."""

    passed: bool
    score: int
    defects: TextList = []
    summary: Text = ""


def round_half_up(value: float) -> int:
    """Java's Math.round: halves go up."""
    return math.floor(value + 0.5)


class DrawObjectJudge(ABC):
    """An independent judge of how a drawn object LOOKS, the part ``check_object`` cannot measure. Two steps, each a call of its own:
    :meth:`criteria` fixes, before any picture exists, what the real object looks like from the scene's view; :meth:`judge` then reads only
    the request, those criteria and the pictures (never the code or the drawer's turns) and reports what it measured and saw. The pass is
    decided by :meth:`decide` in code, not by what the judge says."""

    @abstractmethod
    def criteria(self, request) -> Criteria: ...

    @abstractmethod
    def judge(self, request, criteria: Criteria, images: list[Image]) -> Verdict: ...

    @staticmethod
    def decide(criteria: Criteria, report: Report) -> Verdict:
        """It fails when the score is below :data:`PASS_SCORE`, the view is wrong, two or more features are missing, or a part ratio is
        more than :data:`RATIO_TOLERANCE` off the real one, whatever the judge's own pass says."""
        score = max(1, min(10, report.score))
        defects: list[str] = []
        ratio_off = False
        for expected in criteria.ratios:
            seen = next((o for o in report.ratios if o.name == expected.name), None)
            if seen is None or not seen.observed > 0 or not expected.expected > 0:
                continue
            off = abs(seen.observed / expected.expected - 1)
            if off > RATIO_TOLERANCE:
                ratio_off = True
                defects.append(f'Tỉ lệ "{expected.name}" trên hình khoảng {seen.observed:.2f}, vật thật khoảng {expected.expected:.2f} '
                               f"(lệch {round_half_up(off * 100)}%): sửa kích thước bộ phận cho đúng.")
        if not report.view_ok:
            for problem in report.view_problems or ["góc nhìn chưa đúng hay chưa nhất quán"]:
                defects.append(f"Góc nhìn ({criteria.view}): {problem}")
        missing = sum(1 for f in report.features if not f.present)
        for f in report.features:
            if not f.present:
                defects.append(f"Thiếu đặc điểm nhận diện: {f.feature}" + (f" ({f.note})" if f.note and f.note.strip() else "") + ".")
        defects.extend(report.defects)
        passed = report.passed and score >= PASS_SCORE and report.view_ok and missing < 2 and not ratio_off
        return Verdict(passed=passed, score=score, defects=defects, summary=report.summary)
