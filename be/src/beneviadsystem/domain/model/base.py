"""Base of every record that crosses a JSON boundary (REST, STOMP, tool calls): Python names in code, camelCase names on the wire."""
from __future__ import annotations

import dataclasses
import enum
import json
from typing import Annotated, Any

from pydantic import BaseModel, BeforeValidator, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """A record serialised with camelCase keys; it accepts either name when built, and ignores unknown keys like Jackson does."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="ignore", serialize_by_alias=True)

    def to_json_dict(self) -> dict[str, Any]:
        return self.model_dump(by_alias=True, mode="json")


def _empty_list(value: Any) -> Any:
    return [] if value is None else value


def _empty_text(value: Any) -> Any:
    return "" if value is None else value


#: A list that a client may send as null; it is read as empty (the Java records did the same in their constructors).
EmptyIfNone = BeforeValidator(_empty_list)
#: A string that a client may send as null; it is read as "".
Text = Annotated[str, BeforeValidator(_empty_text)]
TextList = Annotated[list[str], EmptyIfNone]


def to_jsonable(value: Any) -> Any:
    """Plain JSON data of a model, dataclass, enum or container, with camelCase keys for models."""
    if isinstance(value, BaseModel):
        return value.model_dump(by_alias=True, mode="json")
    if dataclasses.is_dataclass(value) and not isinstance(value, type):
        return {to_camel(f.name): to_jsonable(getattr(value, f.name)) for f in dataclasses.fields(value)}
    if isinstance(value, enum.Enum):
        return value.value
    if isinstance(value, dict):
        return {str(k): to_jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [to_jsonable(v) for v in value]
    return value


def compact_json(value: Any) -> str:
    """JSON without spaces and with UTF-8 text kept as is, the way Jackson writes it."""
    return json.dumps(to_jsonable(value), ensure_ascii=False, separators=(",", ":"))
