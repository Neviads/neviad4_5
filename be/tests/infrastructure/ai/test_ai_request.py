import pytest

from beneviadsystem.infrastructure.ai.ai_client import AiClient
from beneviadsystem.infrastructure.ai.ai_generation_result import AiGenerationResult
from beneviadsystem.infrastructure.ai.ai_request import AiRequest
from beneviadsystem.infrastructure.ai.structured_output_schema_registry import StructuredOutputSchemaRegistry
from beneviadsystem.infrastructure.ai.tool_image_source import Image
from tests.conftest import echo_tool

GENERIC = StructuredOutputSchemaRegistry.GENERIC


class Probe(AiClient):
    """Records which method a default generate_request reached and with which prompt."""

    def __init__(self):
        self.calls: list[str] = []

    def generate(self, prompt):
        self.calls.append("generate:" + prompt)
        return prompt

    def generate_detailed(self, prompt, json_mode=True):
        self.calls.append("detailed-json:" + prompt)
        return AiGenerationResult("x", "p", "m")

    def generate_structured(self, prompt, spec):
        self.calls.append("detailed-schema:" + prompt)
        return AiGenerationResult("x", "p", "m")

    def generate_reasoned(self, prompt, spec):
        self.calls.append("reasoned:" + prompt)
        return AiGenerationResult("x", "p", "m")

    def generate_with_tools(self, prompt, tools, spec=None, max_tool_calls=0, listener=None):
        self.calls.append(f"tools-budget:{max_tool_calls}:{prompt}")
        return AiGenerationResult("x", "p", "m")


def test_the_reasoning_effort_survives_the_other_with_methods_and_blank_means_the_provider_own():
    request = AiRequest.of("S", "U").with_reasoning_effort(" medium ").with_schema(GENERIC).with_tools([], 3, None)

    assert request.reasoning_effort == "medium"
    assert request.with_reasoning_effort(" ").reasoning_effort is None


def test_a_request_without_a_system_prompt_reaches_the_old_method_unchanged():
    probe = Probe()

    probe.generate_request(AiRequest(system=None, user="hello", schema=GENERIC))

    assert probe.calls == ["detailed-schema:hello"]


def test_the_default_folds_the_system_prompt_in_front_of_the_user_text_for_providers_without_a_system_role():
    probe = Probe()

    probe.generate_request(AiRequest.of("SYSTEM", "USER"))

    assert probe.calls == ["detailed-json:SYSTEM\n\nUSER"]


def test_reasoning_and_tool_budgets_pick_the_matching_method():
    probe = Probe()

    probe.generate_request(AiRequest.of("S", "U").with_schema(GENERIC).with_reasoning())
    probe.generate_request(AiRequest.of("S", "U").with_schema(GENERIC).with_tools([echo_tool()], 7, None))

    assert probe.calls == ["reasoned:S\n\nU", "tools-budget:7:S\n\nU"]


def test_pictures_survive_every_with_method_so_the_fallback_client_keeps_them():
    picture = Image("tư thế nghỉ", "data:image/png;base64,AAAA")

    request = (AiRequest.of("S", "U").with_images([picture]).with_schema(GENERIC).with_reasoning()
               .with_reasoning_effort("high").with_tools([], 0, None))

    assert request.has_images()
    assert request.images == (picture,)
    assert not AiRequest.of("S", "U").has_images()


def test_a_provider_without_pictures_refuses_them_rather_than_answer_about_a_picture_it_never_saw():
    probe = Probe()
    request = AiRequest.of("S", "U").with_images([Image("x", "data:image/png;base64,AAAA")])

    with pytest.raises(NotImplementedError):
        probe.generate_request(request)
    assert probe.calls == []


def test_the_user_message_is_required_and_a_blank_system_prompt_counts_as_none():
    with pytest.raises(ValueError):
        AiRequest.of("S", " ")
    assert not AiRequest.of("  ", "U").has_system()
    assert AiRequest.of(None, "U").flattened_prompt() == "U"
