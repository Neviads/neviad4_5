from __future__ import annotations

import logging
from datetime import UTC, datetime

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from beneviadsystem.infrastructure.ai.ai_provider_unavailable_error import AiProviderUnavailableError
from beneviadsystem.presentation.dto.errors import api_error
from beneviadsystem.service.agent.invalid_agent_response_error import InvalidAgentResponseError

log = logging.getLogger(__name__)
INVALID_JSON = "JSON không hợp lệ hoặc sai kiểu dữ liệu."
_UNREADABLE = ("json_invalid", "model_attributes_type", "dict_type", "list_type", "model_type")


def _validation_message(error: RequestValidationError) -> str:
    errors = error.errors()
    if any(e.get("type") in _UNREADABLE and len(e.get("loc", ())) <= 1 for e in errors) or any(e.get("type") == "json_invalid" for e in errors):
        return INVALID_JSON
    parts = []
    for e in errors:
        location = ".".join(str(p) for p in e.get("loc", ())[1:]) or str((e.get("loc") or ["body"])[0])
        parts.append(f"{location}: {e.get('msg', 'invalid')}")
    return "; ".join(parts) or INVALID_JSON


def register_exception_handlers(app: FastAPI) -> None:
    """The error bodies every endpoint shares: 400 for a request that is not valid, 503 when no AI provider can answer, 502 when the AI
    answered something unusable, 500 for anything unexpected. Endpoints with errors of their own (``{"error": ...}``) answer those first."""

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request: Request, error: RequestValidationError) -> JSONResponse:
        return api_error(400, "Bad Request", _validation_message(error))

    @app.exception_handler(AiProviderUnavailableError)
    async def provider_unavailable(request: Request, error: AiProviderUnavailableError) -> JSONResponse:
        return api_error(503, "AI Provider Unavailable", str(error))

    @app.exception_handler(InvalidAgentResponseError)
    async def invalid_agent_response(request: Request, error: InvalidAgentResponseError) -> JSONResponse:
        return api_error(502, "Invalid AI Response", str(error))

    @app.exception_handler(Exception)
    async def unexpected(request: Request, error: Exception) -> JSONResponse:
        log.error("Unexpected error on %s %s", request.method, request.url.path, exc_info=error)
        return JSONResponse(status_code=500, content={"timestamp": datetime.now(UTC).isoformat(), "status": 500, "error": "Internal Server Error",
                                                      "message": str(error) or "Unexpected error"})
