"""A tool the model may call: a name, a description, a JSON schema of its input, and a function from JSON input to text output."""
from __future__ import annotations

import functools
import json
import types
import typing
from abc import ABC, abstractmethod
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel

from beneviadsystem.domain.model.base import compact_json


@dataclass(frozen=True)
class ToolDefinition:
    name: str
    description: str
    input_schema: str


class ToolCallback(ABC):
    @property
    @abstractmethod
    def definition(self) -> ToolDefinition: ...

    @abstractmethod
    def call(self, tool_input: str) -> str:
        """Runs the tool on its JSON input and returns its result as text (JSON for structured results)."""


class FunctionToolCallback(ToolCallback):
    """A tool made of a function of one pydantic input model. Missing fields take their defaults and unknown fields are ignored; a result
    that is not a string is written as compact JSON with camelCase keys."""

    def __init__(self, name: str, function: Callable[[Any], Any], *, description: str, input_type: type[BaseModel]):
        self._function = function
        self._input_type = input_type
        self._definition = ToolDefinition(name, description, json.dumps(tool_input_schema(input_type), ensure_ascii=False))

    @property
    def definition(self) -> ToolDefinition:
        return self._definition

    def call(self, tool_input: str) -> str:
        raw = json.loads(tool_input) if tool_input and tool_input.strip() else {}
        argument = None if raw is None else self._input_type.model_validate(raw)
        result = self._function(argument)
        return result if isinstance(result, str) else compact_json(result)


@functools.cache
def tool_input_schema(model: type[BaseModel]) -> dict[str, Any]:
    """The JSON schema of a tool input: every field by its JSON name with one plain type, nested models as objects."""
    properties: dict[str, Any] = {}
    for name, field in model.model_fields.items():
        schema = _type_schema(field.annotation)
        if field.description:
            schema = {**schema, "description": field.description}
        properties[field.alias or name] = schema
    return {"type": "object", "properties": properties}


def _type_schema(annotation: Any) -> dict[str, Any]:
    origin = typing.get_origin(annotation)
    if origin is typing.Annotated:
        return _type_schema(typing.get_args(annotation)[0])
    if origin in (typing.Union, types.UnionType):
        present = [arg for arg in typing.get_args(annotation) if arg is not type(None)]
        return _type_schema(present[0]) if present else {"type": "string"}
    if origin in (list, tuple, set, frozenset):
        args = typing.get_args(annotation)
        return {"type": "array", "items": _type_schema(args[0]) if args else {"type": "string"}}
    if origin is dict:
        return {"type": "object"}
    if isinstance(annotation, type):
        if issubclass(annotation, BaseModel):
            return tool_input_schema(annotation)
        if issubclass(annotation, bool):
            return {"type": "boolean"}
        if issubclass(annotation, int):
            return {"type": "integer"}
        if issubclass(annotation, float):
            return {"type": "number"}
        if issubclass(annotation, str):
            return {"type": "string"}
    return {"type": "object"}
