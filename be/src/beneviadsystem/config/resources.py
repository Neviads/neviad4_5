"""Packaged text resources: prompts, skills and migrations under ``beneviadsystem/resources``."""
from __future__ import annotations

from importlib import resources
from importlib.resources.abc import Traversable


def resource(relative: str) -> Traversable:
    node = resources.files("beneviadsystem").joinpath("resources")
    for part in relative.split("/"):
        node = node.joinpath(part)
    return node


def read_text(relative: str) -> str:
    """The UTF-8 text of a resource such as ``prompts/codeagent/engine.md``; ``FileNotFoundError`` when it is missing."""
    return resource(relative).read_text(encoding="utf-8")
