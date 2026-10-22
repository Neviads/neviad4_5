"""The NEVIAD Physics backend: ``uvicorn beneviadsystem.main:app`` or ``python -m beneviadsystem``."""
from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

import anyio.to_thread
from fastapi import FastAPI

from .config import openapi_config
from .config.container import Container
from .config.cors_config import configure_cors
from .config.security_config import configure_security
from .config.settings import Settings, get_settings
from .config.websocket_config import configure_websocket
from .infrastructure.persistence.migrations import FlywayMigrator
from .presentation.advice.global_exception_handler import register_exception_handlers
from .presentation.controller import (
    assembly_controller,
    code_agent_controller,
    code_tools_debug_controller,
    draw_object_controller,
    experiment_match_controller,
    health_controller,
    lite_spec_controller,
    scenario_controller,
    source_controller,
)

log = logging.getLogger("beneviadsystem")
#: Agent requests hold a worker thread for minutes (they wait on the model and on the browser), so the pool is larger than the default 40.
WORKER_THREADS = 256


def create_app(settings: Settings | None = None, container: Container | None = None) -> FastAPI:
    settings = settings or get_settings()
    container = container or Container(settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        anyio.to_thread.current_default_thread_limiter().total_tokens = WORKER_THREADS
        container.stomp_broker.bind(asyncio.get_running_loop())
        database = container.database
        if database is not None:
            await anyio.to_thread.run_sync(database.open)
            if settings.flyway_enabled:
                applied = await anyio.to_thread.run_sync(FlywayMigrator(database).migrate)
                log.info("Database migrations applied: %s", applied or "none")
        log.info("%s started on port %s", settings.app_name, settings.app_port)
        try:
            yield
        finally:
            if database is not None:
                database.close()

    app = FastAPI(title=openapi_config.TITLE, description=openapi_config.DESCRIPTION, version=openapi_config.VERSION,
                  openapi_url=openapi_config.OPENAPI_URL, docs_url=openapi_config.SWAGGER_UI_URL, redoc_url=openapi_config.REDOC_URL,
                  openapi_tags=openapi_config.TAGS, lifespan=lifespan)
    app.state.container = container
    configure_security(app)
    configure_cors(app, settings)
    register_exception_handlers(app)
    for router in (health_controller.router, experiment_match_controller.router, lite_spec_controller.router, scenario_controller.router,
                   draw_object_controller.router, assembly_controller.router, code_agent_controller.router, source_controller.router):
        app.include_router(router)
    if settings.app_livecode_debug:
        app.include_router(code_tools_debug_controller.router)
    configure_websocket(app, container.stomp_broker)
    return app


def main() -> None:
    import uvicorn

    settings = get_settings()
    logging.basicConfig(level=settings.app_log_level.upper(), format="%(asctime)s %(levelname)s [%(threadName)s] %(name)s: %(message)s")
    uvicorn.run(create_app(settings), host="0.0.0.0", port=settings.app_port, ws_max_size=4 * 1024 * 1024, log_level=settings.app_log_level.lower())


def __getattr__(name: str):
    """``app`` is built on first access, so importing this module (tests, tools) does not read the environment."""
    if name == "app":
        globals()["app"] = create_app()
        return globals()["app"]
    raise AttributeError(name)
