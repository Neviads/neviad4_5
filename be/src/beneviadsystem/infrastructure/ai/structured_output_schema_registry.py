"""Canonical schemas of every model-produced JSON envelope."""
from __future__ import annotations

from typing import Any

from .structured_output_spec import StructuredOutputSpec


def _object(properties: dict[str, Any], required: list[str]) -> dict[str, Any]:
    return {"type": "object", "properties": properties, "required": required, "additionalProperties": False}


def _open_object() -> dict[str, Any]:
    """An object whose keys are not fixed (not valid in a strict schema)."""
    return {"type": "object", "additionalProperties": True}


def _string() -> dict[str, Any]:
    return {"type": "string"}


def _number() -> dict[str, Any]:
    return {"type": "number"}


def _boolean() -> dict[str, Any]:
    return {"type": "boolean"}


def _enum(*values: str) -> dict[str, Any]:
    return {"type": "string", "enum": list(values)}


def _nullable(value: dict[str, Any]) -> dict[str, Any]:
    return {"anyOf": [value, {"type": "null"}]}


def _array(items: dict[str, Any]) -> dict[str, Any]:
    return {"type": "array", "items": items}


def _question() -> dict[str, Any]:
    return _object({"topic": _string(), "text": _string(), "suggestions": _array(_string())}, ["topic", "text", "suggestions"])


def _named(*fields: str) -> dict[str, Any]:
    return _object({name: _string() for name in fields}, list(fields))


class StructuredOutputSchemaRegistry:
    GENERIC = StructuredOutputSpec.of("neviad_generic_json", _object({"value": _string()}, ["value"]))
    RUNTIME_MODULE_STATUS = StructuredOutputSpec.of("neviad_runtime_module_status", _object({"status": _enum("ok")}, ["status"]))

    #: Lite spec: ask about the look, refuse, or one drawing request per apparatus (title, prose, frame, hint) and the agreed style; no physics.
    LITE_SPEC_RESPONSE = StructuredOutputSpec.of("neviad_lite_spec", _object({
        "status": _enum("READY", "NEEDS_CLARIFICATION", "UNSUPPORTED"), "phenomenon": _string(), "reason": _nullable(_string()),
        "question": _nullable(_question()), "style": _string(),
        "objects": _array(_object({
            "id": _string(), "title": _string(), "request": _string(),
            "frame": _array(_named("name", "shape", "position", "proportion")),
            "hint": _string(), "reference": _nullable(_string())},
            ["id", "title", "request", "frame", "hint", "reference"]))},
        ["status", "phenomenon", "reason", "question", "style", "objects"]))

    #: Experiments of the library the teacher's request already is: ids from the catalog sent with the request, best first, each with a reason.
    EXPERIMENT_MATCH_RESPONSE = StructuredOutputSpec.of("neviad_experiment_match", _object({"matches": _array(_named("id", "reason"))}, ["matches"]))

    #: One smart object written with the draw-object skill. Not strict on purpose (free keys); the backend checks the answer field by field.
    DRAW_OBJECT_RESPONSE = StructuredOutputSpec("neviad_draw_object", _object({
        "name": _string(), "shape": _string(), "anchor": _string(),
        "ports": _array(_open_object()), "joints": _array(_open_object()), "partAnchors": _array({"anyOf": [_string(), _open_object()]}),
        "inputs": _array(_open_object()), "outputs": _array(_open_object()),
        "selfTests": _array(_open_object()), "parts": _array(_string()), "notes": _string(), "code": _string()},
        ["name", "shape", "anchor", "ports", "inputs", "outputs", "selfTests", "code"]), False)

    #: Scenario of an experiment in plain prose: formulas, phases over time, layout, what students adjust and watch, and the shared geometry.
    SCENARIO_RESPONSE = StructuredOutputSpec.of("neviad_scenario", _object({
        "summary": _string(), "formulas": _array(_string()),
        "phases": _array(_named("name", "description")),
        "layout": _string(), "view": _string(), "adjustable": _array(_string()), "observable": _array(_string()), "assumptions": _array(_string()),
        "workedExamples": _array(_named("text", "expression", "unit")),
        "objectGeometry": _array(_object({
            "objectId": _string(), "width": _number(), "height": _number(), "anchor": _string(),
            "points": _array(_named("name", "description")),
            "parts": _array(_object({"name": _string(), "motion": _string(), "axis": _string(), "min": _number(), "max": _number(),
                                     "description": _string()}, ["name", "motion", "axis", "min", "max", "description"]))},
            ["objectId", "width", "height", "anchor", "points", "parts"])),
        "phenomena": _array(_named("name", "description", "from", "appearance"))},
        ["summary", "formulas", "phases", "layout", "view", "adjustable", "observable", "assumptions", "workedExamples", "objectGeometry", "phenomena"]))

    #: How a machine splits into parts and how the parts attach; not strict (open objects), the backend checks it field by field.
    ASSEMBLY_PLAN_RESPONSE = StructuredOutputSpec("neviad_assembly_plan", _object({
        "input": _open_object(), "root": _string(), "components": _array(_open_object()), "attachments": _array(_open_object())},
        ["input", "root", "components", "attachments"]), False)

    #: Step 1 of the drawing judge: what the real object looks like from the scene's view, fixed before any picture is seen.
    DRAW_CRITERIA_RESPONSE = StructuredOutputSpec.of("neviad_drawing_criteria", _object({
        "view": _string(), "ratios": _array(_object({"name": _string(), "expected": _number()}, ["name", "expected"])),
        "features": _array(_string()), "viewRules": _array(_string())},
        ["view", "ratios", "features", "viewRules"]))

    #: Step 2 of the drawing judge: what it measured and saw on the picture; the backend, not the judge, decides the pass.
    DRAW_VERDICT_RESPONSE = StructuredOutputSpec.of("neviad_drawing_verdict", _object({
        "ratios": _array(_object({"name": _string(), "observed": _number()}, ["name", "observed"])),
        "features": _array(_object({"feature": _string(), "present": _boolean(), "note": _string()}, ["feature", "present", "note"])),
        "viewOk": _boolean(), "viewProblems": _array(_string()), "defects": _array(_string()),
        "score": _number(), "pass": _boolean(), "summary": _string()},
        ["ratios", "features", "viewOk", "viewProblems", "defects", "score", "pass", "summary"]))

    #: Final answer of a code agent; the backend never trusts it over what the session recorded.
    CODE_AGENT_RESULT = StructuredOutputSpec.of("neviad_simulation_result", _object({"status": _enum("PASSED", "FAILED"), "summary": _string()},
                                                                                    ["status", "summary"]))
