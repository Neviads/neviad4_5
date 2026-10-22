import pytest

from beneviadsystem.infrastructure.ai.ai_provider_unavailable_error import AiProviderUnavailableError
from beneviadsystem.infrastructure.ai.unavailable_ai_client import UnavailableAiClient


def test_explains_how_to_configure_an_ai_provider():
    with pytest.raises(AiProviderUnavailableError, match="APP_AI_DEEPSEEK_API_KEY"):
        UnavailableAiClient().generate("hello")
