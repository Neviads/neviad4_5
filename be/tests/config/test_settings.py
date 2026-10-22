from beneviadsystem.config.settings import Settings


def test_the_defaults_are_those_of_the_old_application_properties(monkeypatch):
    for name in ("APP_PORT", "APP_AI_OPENAI_DEFAULT_MODEL", "APP_PIPELINE_GATE_TIMEOUT_SECONDS", "APP_LIVECODE_DEBUG", "OPENAI_API_KEY", "APP_AI_OPENAI_API_KEY"):
        monkeypatch.delenv(name, raising=False)
    s = Settings(_env_file=None)

    assert s.app_port == 8080
    assert s.app_ai_openai_default_model == "gpt-6-luna"
    assert s.app_ai_openai_agent_code_reasoning_effort == "high"
    assert s.app_pipeline_gate_timeout_seconds == 240
    assert s.app_livecode_debug is False
    assert s.allowed_origins() == ["http://localhost:3000"]


def test_environment_variables_keep_their_names_and_fallbacks(monkeypatch):
    monkeypatch.delenv("APP_AI_OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("OPENAI_API_KEY", "from-openai-name")
    monkeypatch.setenv("DEEPSEEK_MODEL", "deepseek-old-name")
    monkeypatch.setenv("APP_CORS_ALLOWED_ORIGINS", "http://a.example, http://b.example ,")
    monkeypatch.setenv("APP_LIVECODE_DEBUG", "true")

    s = Settings(_env_file=None)

    assert s.app_ai_openai_api_key == "from-openai-name"
    assert s.app_ai_deepseek_default_model == "deepseek-old-name"
    assert s.allowed_origins() == ["http://a.example", "http://b.example"]
    assert s.app_livecode_debug is True


def test_the_project_name_wins_over_the_fallback_name(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "fallback")
    monkeypatch.setenv("APP_AI_OPENAI_API_KEY", "primary")

    assert Settings(_env_file=None).app_ai_openai_api_key == "primary"
