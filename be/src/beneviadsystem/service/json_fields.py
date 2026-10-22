"""Lenient readers of parsed JSON values, the way the agents read what a model wrote: a missing field, a null or a value of another type
reads as the default instead of raising, so a half-right answer is sent back with the reasons instead of crashing the agent."""
from __future__ import annotations

from typing import Any


def field(node: Any, name: str) -> Any:
    return node.get(name) if isinstance(node, dict) else None


def text(value: Any, default: str = "") -> str:
    """A string as is; a number or boolean written out; anything else (null, missing, object, array) the default."""
    if value is None:
        return default
    if isinstance(value, str):
        return value
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        return repr(value)
    return ""


def number(value: Any, default: float = 0.0) -> float:
    """A number; a numeric string read as one; a boolean as 1 or 0; anything else the default."""
    if isinstance(value, bool):
        return 1.0 if value else 0.0
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.strip())
        except ValueError:
            return default
    return default


def boolean(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str) and value.strip().lower() in ("true", "false"):
        return value.strip().lower() == "true"
    return default


def is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def is_text(value: Any) -> bool:
    return isinstance(value, str)


def items(value: Any) -> list[Any]:
    """The elements of an array, or nothing."""
    return value if isinstance(value, list) else []


def texts(value: Any) -> list[str]:
    """The non-blank strings of an array, trimmed."""
    return [item.strip() for item in items(value) if isinstance(item, str) and item.strip()]
