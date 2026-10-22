from __future__ import annotations

from typing import Any

from beneviadsystem.config.settings import Settings

from ..adapter.deepseek_adapter import DeepSeekAdapter
from ..adapter.openai_adapter import OpenAiAdapter
from ..ai_client import AiClient
from ..chat_completions import ChatCompletionsModel
from ..fallback_ai_client import FallbackAiClient
from ..openai_responses_tool_loop import OpenAiResponsesToolLoop
from ..strict_tool_schemas import StrictToolSchemas
from ..unavailable_ai_client import UnavailableAiClient

MAX_TOKENS = 8_192


class AiClientConfig:
    """Builds the one :class:`AiClient` of the application from the settings: OpenAI first, DeepSeek as fallback, or a client that explains
    how to configure one when no key is set."""

    @staticmethod
    def ai_client(settings: Settings) -> AiClient:
        providers: list[AiClient] = []
        if settings.app_ai_openai_api_key.strip():
            effort = settings.app_ai_openai_agent_reasoning_effort.strip()
            # Chat Completions refuses function tools once reasoning is on, so iterative agents use /v1/responses.
            loop = OpenAiResponsesToolLoop(settings.app_ai_openai_base_url, settings.app_ai_openai_api_key, effort,
                                           settings.app_ai_openai_agent_code_reasoning_effort.strip() or effort,
                                           settings.app_ai_openai_agent_max_output_tokens,
                                           float(settings.app_ai_openai_agent_request_timeout_seconds)) if effort else None
            # GPT-6 Luna accepts function tools through Chat Completions only when reasoning is off.
            chat = ChatCompletionsModel(settings.app_ai_openai_base_url, settings.app_ai_openai_api_key, settings.app_ai_openai_default_model,
                                        default_options={"max_completion_tokens": MAX_TOKENS, "reasoning_effort": "none"},
                                        request_rewriter=AiClientConfig.strictify_tool_schemas)
            providers.append(OpenAiAdapter(chat, settings.app_ai_openai_default_model, loop))
        if settings.app_ai_deepseek_api_key.strip():
            chat = ChatCompletionsModel(settings.app_ai_deepseek_base_url, settings.app_ai_deepseek_api_key, settings.app_ai_deepseek_default_model,
                                        default_options={"max_tokens": MAX_TOKENS}, request_rewriter=AiClientConfig.prepare_deepseek_request)
            providers.append(DeepSeekAdapter(chat, settings.app_ai_deepseek_default_model))
        return FallbackAiClient(providers) if providers else UnavailableAiClient()

    @staticmethod
    def strictify_tool_schemas(payload: dict[str, Any]) -> None:
        """Marks every function tool strict and makes its parameters (nested objects, array items, anyOf branches) fit strict calling."""
        tools = payload.get("tools")
        if not isinstance(tools, list):
            return
        for tool in tools:
            function = tool.get("function") if isinstance(tool, dict) else None
            if not isinstance(function, dict):
                continue
            function["strict"] = True
            StrictToolSchemas.strictify(function.get("parameters"))

    @staticmethod
    def prepare_deepseek_request(payload: dict[str, Any]) -> None:
        AiClientConfig.strictify_tool_schemas(payload)
        payload["thinking"] = {"type": "disabled"}
