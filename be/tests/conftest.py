"""Shared test helpers: a tool built from a plain function, and a call by tool name."""
import json

from pydantic import BaseModel

from beneviadsystem.infrastructure.ai.tool_callback import FunctionToolCallback, ToolCallback


class Echo(BaseModel):
    text: str | None = None


def echo_tool(function=lambda echo: echo.text, name: str = "echo") -> ToolCallback:
    return FunctionToolCallback(name, function, description=name, input_type=Echo)


def call_tool(tools: list[ToolCallback], name: str, payload: dict) -> str:
    tool = next(t for t in tools if t.definition.name == name)
    return tool.call(json.dumps(payload, ensure_ascii=False))


def call_json(tools: list[ToolCallback], name: str, payload: dict) -> dict:
    return json.loads(call_tool(tools, name, payload))
