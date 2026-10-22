import pytest

from beneviadsystem.domain.exception import IllegalStateError
from beneviadsystem.infrastructure.ai.ai_client import AiClient
from beneviadsystem.infrastructure.ai.ai_generation_result import AiGenerationResult
from beneviadsystem.infrastructure.ai.ai_provider_unavailable_error import AiProviderUnavailableError
from beneviadsystem.infrastructure.ai.ai_request import AiRequest
from beneviadsystem.infrastructure.ai.fallback_ai_client import FallbackAiClient
from tests.conftest import echo_tool


class Fixed(AiClient):
    def __init__(self, answer=None, failure=None):
        self.answer, self.failure, self.calls = answer, failure, 0

    def generate(self, prompt):
        self.calls += 1
        if self.failure:
            raise self.failure
        return self.answer


def test_returns_the_primary_provider_response_when_it_succeeds():
    fallback = Fixed("fallback response")

    response = FallbackAiClient([Fixed("primary response"), fallback]).generate("hello")

    assert response == "primary response"
    assert fallback.calls == 0


def test_uses_the_next_provider_when_the_primary_provider_fails():
    response = FallbackAiClient([Fixed(failure=IllegalStateError("DeepSeek unavailable")), Fixed("OpenAI response")]).generate("hello")

    assert response == "OpenAI response"


def test_reports_an_error_when_every_provider_fails():
    with pytest.raises(AiProviderUnavailableError) as raised:
        FallbackAiClient([Fixed(failure=IllegalStateError("provider unavailable"))]).generate("hello")
    assert isinstance(raised.value.__cause__, IllegalStateError)


class Recording(AiClient):
    """A provider that records the request it receives, to check what reaches it."""

    def __init__(self, fail=False, run_tool=False):
        self.seen, self.fail, self.run_tool = None, fail, run_tool

    def generate(self, prompt):
        return prompt

    def generate_request(self, request):
        self.seen = request
        if self.run_tool:
            request.tools[0].call('{"text":"hi"}')
        if self.fail:
            raise IllegalStateError("down")
        return AiGenerationResult("ok", "fake", "m")


def test_forwards_the_system_prompt_of_a_request_to_the_provider():
    provider = Recording()

    result = FallbackAiClient([provider]).generate_request(AiRequest.of("SYSTEM", "USER"))

    assert result.text == "ok"
    assert provider.seen.system == "SYSTEM"
    assert provider.seen.user == "USER"


def test_moves_to_the_next_provider_for_a_request_when_no_tool_ran_yet():
    healthy = Recording()

    result = FallbackAiClient([Recording(fail=True), healthy]).generate_request(AiRequest.of("SYSTEM", "USER"))

    assert result.text == "ok"
    assert healthy.seen.system == "SYSTEM"


def test_never_replays_a_request_after_a_tool_already_ran():
    healthy = Recording()
    request = AiRequest.of("SYSTEM", "USER").with_tools([echo_tool()], 3, None)

    with pytest.raises(IllegalStateError):
        FallbackAiClient([Recording(fail=True, run_tool=True), healthy]).generate_request(request)
    assert healthy.seen is None


def test_no_provider_at_all_is_unavailable():
    with pytest.raises(AiProviderUnavailableError):
        FallbackAiClient([]).generate("hello")
