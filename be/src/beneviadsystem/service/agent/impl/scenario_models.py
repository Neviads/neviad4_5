"""The records of a scenario: the shared geometry of every object and what the experiment shows over time. Every layer (drawer, engine,
scene) reads them, and they cross the REST boundary as they are."""
from __future__ import annotations

from typing import Annotated

from pydantic import Field

from beneviadsystem.domain.model.base import CamelModel, EmptyIfNone, Text, TextList


class FramePart(CamelModel):
    """One visible part of the object, in words: the frame the drawer builds the figure on."""

    name: Text = ""
    shape: Text = ""
    position: Text = ""
    proportion: Text = ""


class Phase(CamelModel):
    name: Text = ""
    description: Text = ""


class NamedPoint(CamelModel):
    """A point of an object that another object or something the experiment produces uses (an edge that touches, an outlet)."""

    name: Text = ""
    description: Text = ""


class MovingPart(CamelModel):
    """A part that moves inside its object because of the phenomenon: it slides along ``axis`` or rotates about its own joint, by a value
    in ``[min, max]`` (metres for a slide, degrees for a rotation) from its rest pose. The engine gives the value; the object only has the part."""

    name: Text = ""
    motion: Text = ""
    axis: Text = ""
    min: float = 0.0
    max: float = 0.0
    description: Text = ""


class ObjectGeometry(CamelModel):
    """The geometry of one object that the drawer, the engine and the scene all use: size in metres, anchor (the point whose position the
    engine reports), named points and moving parts. The object carries no physics; this is the one source of its geometry."""

    object_id: Text = ""
    width: float = 0.0
    height: float = 0.0
    anchor: Text = ""
    points: Annotated[list[NamedPoint], EmptyIfNone] = []
    parts: Annotated[list[MovingPart], EmptyIfNone] = []


class WorkedExample(CamelModel):
    """One numeric example of the scenario's formulas: ``text`` says the inputs, ``expression`` is what the backend evaluates, and ``value``
    is the result the BACKEND computed from it (the model never states a result, so it cannot be miscalculated)."""

    text: Text = ""
    expression: Text = ""
    unit: Text = ""
    value: float = 0.0


class Phenomenon(CamelModel):
    """A thing the experiment PRODUCES over time (debris, particles, rays, spots). It belongs to no object: the engine emits it through
    ``metrics.items`` and the scene draws it. ``from`` names the point of an object it comes out of; ``appearance`` tells what it looks like."""

    name: Text = ""
    description: Text = ""
    from_: Text = Field("", alias="from")
    appearance: Text = ""


class Scenario(CamelModel):
    """``work_examples`` are the engine's test cases; ``view`` is the one viewpoint of the whole scene; ``phenomena`` is what the experiment
    produces over time, which no object owns."""

    summary: Text = ""
    formulas: TextList = []
    phases: Annotated[list[Phase], EmptyIfNone] = []
    layout: Text = ""
    adjustable: TextList = []
    observable: TextList = []
    assumptions: TextList = []
    object_geometry: Annotated[list[ObjectGeometry], EmptyIfNone] = []
    worked_examples: Annotated[list[WorkedExample], EmptyIfNone] = []
    view: Text = ""
    phenomena: Annotated[list[Phenomenon], EmptyIfNone] = []
