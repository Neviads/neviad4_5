"""Error bodies of the API, as the frontend reads them (``data?.error``)."""
from __future__ import annotations

from datetime import datetime

from fastapi.responses import JSONResponse

from beneviadsystem.domain.model.base import CamelModel


class ApiError(CamelModel):
    """The body of a request error (400), an unavailable provider (503), an invalid AI answer (502) or an unexpected failure (500)."""

    status: int
    error: str
    message: str
    timestamp: datetime | None = None


class AgentError(CamelModel):
    """The body an agent endpoint answers when its request cannot be served: what is wrong, in Vietnamese."""

    error: str


def agent_error(message: str | None, status: int = 400) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": message or "Yêu cầu không hợp lệ"})


def api_error(status: int, error: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"status": status, "error": error, "message": message})


AGENT_ERRORS = {400: {"model": AgentError, "description": "The request or the agent's answer is not valid"},
                502: {"model": ApiError, "description": "The AI provider answered something unusable"},
                503: {"model": ApiError, "description": "No AI provider is configured or reachable"}}
