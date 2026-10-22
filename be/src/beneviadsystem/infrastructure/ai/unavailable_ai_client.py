from .ai_client import AiClient
from .ai_provider_unavailable_error import AiProviderUnavailableError


class UnavailableAiClient(AiClient):
    """Keeps the application startable where AI credentials are absent."""

    def generate(self, prompt: str) -> str:
        raise AiProviderUnavailableError("Không có AI provider nào được cấu hình. Hãy đặt APP_AI_DEEPSEEK_API_KEY hoặc APP_AI_OPENAI_API_KEY.")
