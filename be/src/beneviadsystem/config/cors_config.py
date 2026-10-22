from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .settings import Settings


def configure_cors(app: FastAPI, settings: Settings) -> None:
    """Lets the frontend origins (``APP_CORS_ALLOWED_ORIGINS``, comma-separated) call every endpoint, with credentials."""
    app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins(), allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                       allow_headers=["*"], allow_credentials=True)
