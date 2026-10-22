import pytest

from beneviadsystem.config.settings import Settings
from beneviadsystem.infrastructure.ai.ai_provider_unavailable_error import AiProviderUnavailableError
from beneviadsystem.infrastructure.ai.config.ai_client_config import AiClientConfig
from beneviadsystem.infrastructure.ai.fallback_ai_client import FallbackAiClient
from beneviadsystem.infrastructure.ai.unavailable_ai_client import UnavailableAiClient


def settings(**values) -> Settings:
    return Settings(_env_file=None, **values)


def test_creates_an_unavailable_client_when_no_provider_key_is_configured():
    client = AiClientConfig.ai_client(settings(app_ai_openai_api_key="", app_ai_deepseek_api_key=""))

    assert isinstance(client, UnavailableAiClient)
    with pytest.raises(AiProviderUnavailableError):
        client.generate("hello")


def test_creates_a_fallback_client_when_at_least_one_provider_key_is_configured():
    client = AiClientConfig.ai_client(settings(app_ai_openai_api_key="openai-key", app_ai_deepseek_api_key="deepseek-key"))

    assert isinstance(client, FallbackAiClient)
    assert [type(p).__name__ for p in client.providers] == ["OpenAiAdapter", "DeepSeekAdapter"]


def test_strictifies_filesystem_tool_schemas_at_provider_boundary():
    payload = {"tools": [{"type": "function", "function": {"name": "edit_file", "parameters": {
        "type": "object", "properties": {"path": {"type": "string"}, "replacement": {"type": "string"}}}}}]}

    AiClientConfig.strictify_tool_schemas(payload)

    function = payload["tools"][0]["function"]
    assert function["strict"] is True
    assert function["parameters"]["additionalProperties"] is False
    assert function["parameters"]["required"] == ["path", "replacement"]


def test_strictifies_nested_tool_objects_and_array_items():
    payload = {"tools": [{"type": "function", "function": {"name": "json_patch", "parameters": {"type": "object", "properties": {
        "operations": {"type": "array", "items": {"type": "object", "properties": {"op": {"type": "string"}, "value": {"type": "string"}}}}}}}}]}

    AiClientConfig.strictify_tool_schemas(payload)

    operation = payload["tools"][0]["function"]["parameters"]["properties"]["operations"]["items"]
    assert operation["additionalProperties"] is False
    assert operation["required"] == ["op", "value"]


def test_deepseek_requests_turn_thinking_off():
    payload = {"model": "deepseek-flash", "messages": []}

    AiClientConfig.prepare_deepseek_request(payload)

    assert payload["thinking"] == {"type": "disabled"}
