"""The Chat Completions client that replaces Spring AI's ChatModel, its bounded tool loop, and the two adapters on top of it."""
import json

import httpx
import pytest

from beneviadsystem.domain.exception import IllegalStateError
from beneviadsystem.infrastructure.ai.adapter.deepseek_adapter import DeepSeekAdapter
from beneviadsystem.infrastructure.ai.adapter.openai_adapter import OpenAiAdapter
from beneviadsystem.infrastructure.ai.ai_provider_unavailable_error import AiProviderUnavailableError
from beneviadsystem.infrastructure.ai.ai_request import AiRequest
from beneviadsystem.infrastructure.ai.chat_completions import ChatCompletionsModel
from beneviadsystem.infrastructure.ai.chat_completions_tool_calling import ChatCompletionsToolCalling
from beneviadsystem.infrastructure.ai.structured_output_schema_registry import StructuredOutputSchemaRegistry
from beneviadsystem.infrastructure.ai.tool_image_source import Image
from tests.conftest import echo_tool


class Server:
    def __init__(self, *replies, status=200):
        self.replies, self.requests, self.status = list(replies), [], status

    def handle(self, request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/chat/completions"
        self.requests.append(json.loads(request.content))
        reply = self.replies[min(len(self.requests), len(self.replies)) - 1]
        return httpx.Response(self.status, json=reply)


def answer(content=None, tool_calls=None, finish="stop", refusal=None):
    message = {"role": "assistant", "content": content}
    if tool_calls:
        message["tool_calls"] = tool_calls
    if refusal:
        message["refusal"] = refusal
    return {"choices": [{"message": message, "finish_reason": finish}]}


def tool_call(call_id, text="hi"):
    return {"id": call_id, "type": "function", "function": {"name": "echo", "arguments": json.dumps({"text": text})}}


def model(server, rewrite=None, options=None):
    return ChatCompletionsModel("http://test/", "k", "gpt", default_options=options or {"max_completion_tokens": 8192},
                                request_rewriter=rewrite, transport=httpx.MockTransport(server.handle), retry_delays=())


def test_a_tool_loop_runs_the_calls_and_returns_the_final_text():
    server = Server(answer(tool_calls=[tool_call("c1")], finish="tool_calls"), answer('{"status":"ok"}'))

    result = ChatCompletionsToolCalling.generate(model(server), "openai", "gpt", "SYS", "go", [echo_tool()],
                                                 StructuredOutputSchemaRegistry.CODE_AGENT_RESULT, 4)

    assert result.text == '{"status":"ok"}'
    first, second = server.requests
    assert first["messages"] == [{"role": "system", "content": "SYS"}, {"role": "user", "content": "go"}]
    assert first["tools"][0]["function"]["name"] == "echo"
    assert first["response_format"]["json_schema"]["name"] == "neviad_simulation_result"
    assert first["max_completion_tokens"] == 8192
    assert second["messages"][2]["tool_calls"][0]["id"] == "c1"
    assert second["messages"][3] == {"role": "tool", "tool_call_id": "c1", "name": "echo", "content": "hi"}


def test_the_tool_budget_counts_every_call():
    server = Server(answer(tool_calls=[tool_call("c1"), tool_call("c2")], finish="tool_calls"))

    with pytest.raises(AiProviderUnavailableError, match="limit"):
        ChatCompletionsToolCalling.generate(model(server), "openai", "gpt", None, "go", [echo_tool()], None, 1)


def test_a_refusal_or_a_cut_answer_is_never_a_success():
    with pytest.raises(IllegalStateError, match="refused"):
        ChatCompletionsToolCalling.generate(model(Server(answer(refusal="no"))), "openai", "gpt", None, "go", [echo_tool()], None, 4)
    with pytest.raises(IllegalStateError, match="length"):
        ChatCompletionsToolCalling.generate(model(Server(answer("{", finish="length"))), "openai", "gpt", None, "go", [echo_tool()], None, 4)


def test_tool_only_forces_the_function_and_returns_its_result():
    server = Server(answer(tool_calls=[tool_call("c1", "repaired")], finish="tool_calls"))

    result = ChatCompletionsToolCalling.generate_tool_only(model(server), "openai", "gpt", "fix", [echo_tool()])

    assert result.text == "repaired"
    assert server.requests[0]["tool_choice"] == {"type": "function", "function": {"name": "echo"}}
    assert server.requests[0]["parallel_tool_calls"] is False


def test_the_request_rewriter_sees_the_payload_before_it_is_sent():
    server = Server(answer("{}"))

    model(server, rewrite=lambda payload: payload.update(thinking={"type": "disabled"})).call([{"role": "user", "content": "x"}])

    assert server.requests[0]["thinking"] == {"type": "disabled"}


def test_an_http_error_is_a_provider_failure():
    with pytest.raises(AiProviderUnavailableError, match="500"):
        model(Server({"error": {"message": "boom"}}, status=500)).call([{"role": "user", "content": "x"}])


class FakeLoop:
    def __init__(self):
        self.calls = []

    def generate(self, model_name, system, prompt, callbacks, spec, max_tool_calls, listener=None, effort_override=None, images=None):
        from beneviadsystem.infrastructure.ai.ai_generation_result import AiGenerationResult
        self.calls.append({"system": system, "prompt": prompt, "tools": len(callbacks or []), "budget": max_tool_calls,
                           "effort": effort_override, "images": list(images or [])})
        return AiGenerationResult("{}", "openai", model_name)


def test_the_openai_adapter_sends_reasoned_and_budgeted_tool_calls_through_the_responses_loop():
    loop = FakeLoop()
    adapter = OpenAiAdapter(model(Server(answer("{}"))), "gpt", loop)

    adapter.generate_reasoned("think", StructuredOutputSchemaRegistry.SCENARIO_RESPONSE)
    adapter.generate_with_tools("work", [echo_tool()], StructuredOutputSchemaRegistry.CODE_AGENT_RESULT, 9)
    adapter.generate_request(AiRequest.of("SYS", "U").with_tools([echo_tool()], 5, None).with_reasoning_effort("medium"))

    assert [(c["prompt"], c["budget"]) for c in loop.calls] == [("think", 1), ("work", 9), ("U", 5)]
    assert loop.calls[2]["system"] == "SYS" and loop.calls[2]["effort"] == "medium"


def test_the_openai_adapter_sends_pictures_only_through_the_responses_api():
    picture = Image("nghỉ", "data:image/png;base64,AAAA")
    loop = FakeLoop()

    OpenAiAdapter(model(Server(answer("{}"))), "gpt", loop).generate_request(AiRequest.of("S", "U").with_images([picture]))

    assert loop.calls[0]["images"] == [picture]
    with pytest.raises(NotImplementedError):
        OpenAiAdapter(model(Server(answer("{}"))), "gpt", None).generate_request(AiRequest.of("S", "U").with_images([picture]))


def test_the_openai_adapter_sends_a_structured_call_with_the_schema_as_response_format():
    server = Server(answer('{"value":"x"}'))

    result = OpenAiAdapter(model(server), "gpt").generate_structured("q", StructuredOutputSchemaRegistry.GENERIC)

    assert result.text == '{"value":"x"}' and result.provider == "openai"
    assert server.requests[0]["response_format"]["type"] == "json_schema"


def test_the_deepseek_adapter_asks_for_bare_json_in_the_prompt_and_refuses_pictures():
    server = Server(answer('{"value":"x"}'))
    adapter = DeepSeekAdapter(model(server, options={"max_tokens": 8192}), "deepseek-flash")

    assert adapter.generate_structured("q", StructuredOutputSchemaRegistry.GENERIC).provider == "deepseek"
    assert "response_format" not in server.requests[0]
    assert server.requests[0]["messages"][0]["content"].endswith("Do not use markdown fences or add prose.")
    with pytest.raises(NotImplementedError):
        adapter.generate_request(AiRequest.of("S", "U").with_images([Image("x", "data:image/png;base64,AAAA")]))
