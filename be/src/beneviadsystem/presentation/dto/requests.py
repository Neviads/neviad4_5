"""Request bodies of the agent endpoints, with the limits the old Bean Validation annotations set."""
from __future__ import annotations

from typing import Annotated

from pydantic import AfterValidator, Field, StringConstraints

from beneviadsystem.domain.model.base import CamelModel, EmptyIfNone
from beneviadsystem.service.agent.impl.experiment_match_agent import CatalogEntry
from beneviadsystem.service.agent.impl.scenario_models import FramePart, ObjectGeometry


def _not_blank(value: str) -> str:
    if not value.strip():
        raise ValueError("must not be blank")
    return value


def NotBlank(max_length: int, pattern: str | None = None):  # noqa: N802 - named after the constraint it replaces
    return Annotated[str, StringConstraints(max_length=max_length, pattern=pattern), AfterValidator(_not_blank)]


Optional2000 = Annotated[str | None, StringConstraints(max_length=2000)]
Frame = Annotated[list[FramePart], EmptyIfNone, Field(max_length=20)]
RUN_ID = r"^[A-Za-z0-9_-]{1,40}$"
OBJECT_ID = r"^[A-Za-z][A-Za-z0-9_]{0,39}$"


class MatchRequest(CamelModel):
    request: NotBlank(3000)
    catalog: Annotated[list[CatalogEntry], Field(min_length=1, max_length=200)]


class LiteSpecRequest(CamelModel):
    """``run_id`` (optional): the run the frontend listens to for the library tools the agent calls."""

    request: NotBlank(3000)
    run_id: Annotated[str | None, StringConstraints(max_length=100)] = None


class ScenarioObjectBody(CamelModel):
    id: NotBlank(40, OBJECT_ID)
    title: NotBlank(200)
    request: NotBlank(4000)
    hint: Optional2000 = None
    frame: Frame = []


class ScenarioBody(CamelModel):
    request: NotBlank(3000)
    objects: Annotated[list[ScenarioObjectBody], Field(min_length=1, max_length=4)]


class HeadlessBody(CamelModel):
    """The draw-object request without a browser session: the template is read from the database and what the agent writes stays in memory."""

    title: NotBlank(200)
    request: NotBlank(4000)
    hint: Optional2000 = None
    geometry: ObjectGeometry | None = None
    view: Optional2000 = None
    frame: Frame = []
    style: Optional2000 = None


class DrawObjectBody(HeadlessBody):
    run_id: NotBlank(40, RUN_ID)
