"""Application settings, read from environment variables (and the repository's ``.env``) with the names and defaults of the old
``application.properties``. One immutable :class:`Settings` is built at start-up and handed to whatever needs it."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

#: The repository root (``be/src/beneviadsystem/config`` → ``.``), where ``.env`` lives.
REPOSITORY_ROOT = Path(__file__).resolve().parents[4]


def _env(*names: str) -> AliasChoices:
    return AliasChoices(*names)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(REPOSITORY_ROOT / ".env", ".env"), env_file_encoding="utf-8", extra="ignore",
                                      case_sensitive=False, populate_by_name=True, frozen=True)

    app_name: str = "be-neviad-system"
    app_port: int = 8080
    app_log_level: str = "INFO"

    # PostgreSQL (Supabase) and migrations. DB_URL may be a JDBC URL (jdbc:postgresql://...) as the frontend scripts use it.
    db_url: str = ""
    db_username: str = ""
    db_password: str = ""
    flyway_enabled: bool = True

    #: The frontend's port (NEXT_PORT in .env); empty CORS origins default to http://localhost:<next_port>.
    next_port: int = 3000
    app_cors_allowed_origins: str = ""

    # AI providers
    app_ai_openai_api_key: str = Field("", validation_alias=_env("APP_AI_OPENAI_API_KEY", "OPENAI_API_KEY"))
    app_ai_openai_base_url: str = "https://api.openai.com"
    app_ai_openai_default_model: str = "gpt-6-luna"
    #: Iterative agents (tools with a budget) use /v1/responses so reasoning can stay on next to tools. Empty disables that path.
    app_ai_openai_agent_reasoning_effort: str = "medium"
    #: Tool-using calls (live code generation) reason deeper than the tool-less analysis call above.
    app_ai_openai_agent_code_reasoning_effort: str = "high"
    #: The draw-object agent writes one short file per turn; "medium" keeps a turn under a gateway's 60 s silent-request cut.
    app_ai_openai_agent_draw_object_reasoning_effort: str = "medium"
    app_ai_openai_agent_max_output_tokens: int = 100_000
    app_ai_openai_agent_request_timeout_seconds: int = 900
    app_ai_deepseek_api_key: str = Field("", validation_alias=_env("APP_AI_DEEPSEEK_API_KEY", "DEEPSEEK_API_KEY"))
    app_ai_deepseek_base_url: str = Field("https://api.deepseek.com", validation_alias=_env("APP_AI_DEEPSEEK_BASE_URL", "DEEPSEEK_BASE_URL"))
    app_ai_deepseek_default_model: str = Field("deepseek-flash", validation_alias=_env("APP_AI_DEEPSEEK_DEFAULT_MODEL", "DEEPSEEK_MODEL"))

    #: Dev only: exposes the code tools at /api/v1/codetools/debug. Unauthenticated; keep false outside a local machine.
    app_livecode_debug: bool = False

    # Node scripts that check a drawn object and an assembly (fe/scripts/validate-*.mjs). Empty fe root = fe or ../fe from the working directory.
    app_pipeline_fe_root: str = ""
    app_pipeline_node_command: str = "node"
    app_pipeline_gate_timeout_seconds: int = 240

    #: POST /api/v1/draw-object/headless: run the draw-object agent without the browser. Dev only; it calls the real model.
    app_draw_object_headless_enabled: bool = False

    def allowed_origins(self) -> list[str]:
        origins = [origin.strip() for origin in self.app_cors_allowed_origins.split(",") if origin.strip()]
        return origins or [f"http://localhost:{self.next_port}"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
