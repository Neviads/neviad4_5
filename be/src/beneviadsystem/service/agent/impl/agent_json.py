"""Reading what a model answered: the JSON object, or the reason it is not one, in the words sent back to the model."""
from __future__ import annotations

import json
from typing import Any


class MalformedJson(ValueError):
    """The model's answer is not JSON; ``reason`` is what to tell it."""

    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


def parse(raw: str | None) -> Any:
    try:
        return json.loads(raw if raw is not None else "")
    except json.JSONDecodeError as malformed:
        raise MalformedJson(malformed.msg) from malformed


def extract_json(raw: str | None) -> str:
    """Providers that ignore a non-strict schema may still wrap the object in a markdown fence or prose: take the object out."""
    text = (raw or "").strip()
    first, last = text.find("{"), text.rfind("}")
    return text[first:last + 1] if first >= 0 and last > first else text
