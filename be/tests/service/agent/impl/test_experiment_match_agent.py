import pytest

from beneviadsystem.infrastructure.ai.ai_client import AiClient
from beneviadsystem.infrastructure.ai.ai_generation_result import AiGenerationResult
from beneviadsystem.infrastructure.ai.structured_output_schema_registry import StructuredOutputSchemaRegistry
from beneviadsystem.service.agent.impl.experiment_match_agent import MAX_ATTEMPTS, CatalogEntry, ExperimentMatchAgent
from beneviadsystem.service.agent.invalid_agent_response_error import InvalidAgentResponseError

CATALOG = [
    CatalogEntry(id="con-lac-don", title="Con lắc đơn", domain="Cơ học", grade=10, desc="Quả nặng treo dây\ndao động", objective="Chu kì phụ thuộc chiều dài"),
    CatalogEntry(id="con-lac-lo-xo", title="Con lắc lò xo", domain="Cơ học", grade=11, desc="Vật gắn lò xo | dao động", objective="Chu kì theo k và m"),
    CatalogEntry(id="roi-tu-do", title="Rơi tự do", domain="Cơ học", grade=10, desc="Thả vật rơi", objective="Gia tốc g"),
    CatalogEntry(id="nem-ngang", title="Ném ngang", domain="Cơ học", grade=10, desc="Ném vật theo phương ngang", objective="Quỹ đạo parabol"),
]


class Scripted(AiClient):
    def __init__(self, *replies):
        self.replies, self.prompts = list(replies), []

    def generate(self, prompt):
        return self.generate_structured(prompt, None).text

    def generate_structured(self, prompt, spec):
        if spec is not None:
            assert spec == StructuredOutputSchemaRegistry.EXPERIMENT_MATCH_RESPONSE
        self.prompts.append(prompt)
        return AiGenerationResult(self.replies[min(len(self.prompts), len(self.replies)) - 1], "test", "test")


def test_a_request_worded_differently_comes_back_as_the_experiment_of_the_library():
    scripted = Scripted('{"matches":[{"id":"con-lac-don","reason":"Quả nặng treo dây dao động là con lắc đơn."}]}')

    result = ExperimentMatchAgent(scripted).match("quả nặng treo dây đung đưa qua lại", CATALOG)

    assert [m.id for m in result.matches] == ["con-lac-don"]
    assert "con lắc đơn" in result.matches[0].reason
    prompt = scripted.prompts[0]
    assert "con-lac-don | Con lắc đơn | Cơ học | 10 | Quả nặng treo dây dao động | Chu kì phụ thuộc chiều dài" in prompt
    assert "Vật gắn lò xo / dao động" in prompt
    assert prompt.index("MỤC LỤC") < prompt.index("quả nặng treo dây đung đưa")


def test_nothing_in_the_library_is_an_empty_list():
    assert ExperimentMatchAgent(Scripted('{"matches":[]}')).match("bắn neutron vào uranium", CATALOG).matches == []


def test_an_id_outside_the_catalog_is_sent_back_and_the_next_answer_is_taken():
    scripted = Scripted('{"matches":[{"id":"con-lac","reason":"x"}]}', '{"matches":[{"id":"con-lac-don","reason":"x"}]}')

    result = ExperimentMatchAgent(scripted).match("con lắc", CATALOG)

    assert [m.id for m in result.matches] == ["con-lac-don"]
    assert len(scripted.prompts) == 2
    assert "Lần trước bị từ chối vì: id 'con-lac' không có trong mục lục" in scripted.prompts[1]


def test_repeats_are_dropped_and_only_the_best_three_are_kept():
    scripted = Scripted('{"matches":[{"id":"roi-tu-do","reason":"a"},{"id":"roi-tu-do","reason":"b"},{"id":"nem-ngang","reason":"c"},'
                        '{"id":"con-lac-don","reason":"d"},{"id":"con-lac-lo-xo","reason":"e"}]}')

    result = ExperimentMatchAgent(scripted).match("vật rơi", CATALOG)

    assert [m.id for m in result.matches] == ["roi-tu-do", "nem-ngang", "con-lac-don"]
    assert result.matches[0].reason == "a"


def test_an_agent_that_never_answers_right_fails_after_the_last_attempt():
    scripted = Scripted("không phải JSON")

    with pytest.raises(InvalidAgentResponseError):
        ExperimentMatchAgent(scripted).match("con lắc", CATALOG)
    assert len(scripted.prompts) == MAX_ATTEMPTS
