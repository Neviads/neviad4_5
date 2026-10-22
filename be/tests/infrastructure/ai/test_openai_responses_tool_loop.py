import json

import httpx
import pytest

from beneviadsystem.domain.exception import IllegalStateError
from beneviadsystem.infrastructure.ai.ai_provider_unavailable_error import AiProviderUnavailableError
from beneviadsystem.infrastructure.ai.openai_responses_tool_loop import OpenAiResponsesToolLoop
from beneviadsystem.infrastructure.ai.structured_output_schema_registry import StructuredOutputSchemaRegistry
from beneviadsystem.infrastructure.ai.structured_output_spec import StructuredOutputSpec
from beneviadsystem.infrastructure.ai.tool_callback import ToolCallback
from beneviadsystem.infrastructure.ai.tool_image_source import Image, ToolImageSource
from beneviadsystem.infrastructure.ai.tool_stream_listener import ToolStreamListener
from tests.conftest import echo_tool


class Server:
    """Answers POST /v1/responses with the scripted replies in order and keeps every request body."""

    def __init__(self):
        self.requests: list[dict] = []
        self.replies: list[str] = []

    def handle(self, request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/responses"
        assert request.headers["Authorization"] == "Bearer k"
        self.requests.append(json.loads(request.content))
        body = self.replies[len(self.requests) - 1]
        streaming = self.requests[-1].get("stream")
        return httpx.Response(200, content=body.encode(), headers={"Content-Type": "text/event-stream" if streaming else "application/json"})


@pytest.fixture
def server():
    return Server()


@pytest.fixture
def loop(server):
    return OpenAiResponsesToolLoop("http://test/", "k", "high", "high", 5000, 5.0, transport=httpx.MockTransport(server.handle))


def echo():
    return echo_tool(lambda e: json.dumps({"echo": e.text}))


def call(response_id, call_id):
    return json.dumps({"id": response_id, "status": "completed", "output": [
        {"type": "function_call", "name": "echo", "call_id": call_id, "arguments": json.dumps({"text": "hi"})}]})


def message(response_id, text):
    return json.dumps({"id": response_id, "status": "completed", "output": [{"type": "message", "content": [{"type": "output_text", "text": text}]}]})


def sse(kind, payload):
    return f"event: {kind}\ndata: {payload}\n\n"


def test_runs_tools_then_returns_the_final_text_with_reasoning_on(server, loop):
    server.replies += [call("r1", "c1"), message("r2", "done")]

    result = loop.generate("m", None, "go", [echo()], None, 5)

    assert result.text == "done"
    first, second = server.requests
    assert first["reasoning"]["effort"] == "high"
    assert first["max_output_tokens"] == 5000
    assert first["tools"][0]["strict"] is True
    assert first["tools"][0]["parameters"]["additionalProperties"] is False
    assert second["previous_response_id"] == "r1"
    assert second["input"][0]["type"] == "function_call_output"
    assert "hi" in second["input"][0]["output"]


def test_streaming_forwards_argument_fragments_then_runs_the_tool_from_the_final_response(server, loop):
    server.replies.append(
        sse("response.created", '{"type":"response.created"}')
        + sse("response.output_item.added", '{"type":"response.output_item.added","item":{"type":"function_call","id":"i1","name":"echo"}}')
        + sse("response.function_call_arguments.delta", json.dumps({"type": "response.function_call_arguments.delta", "item_id": "i1", "delta": '{"text":"h'}))
        + sse("response.function_call_arguments.delta", json.dumps({"type": "response.function_call_arguments.delta", "item_id": "i1", "delta": 'i"}'}))
        + sse("response.output_item.done", '{"type":"response.output_item.done","item":{"type":"function_call","id":"i1","name":"echo"}}')
        + sse("response.completed", '{"type":"response.completed","response":' + call("r1", "c1") + "}"))
    server.replies.append(sse("response.completed", '{"type":"response.completed","response":' + message("r2", "done") + "}"))
    events = []

    class Listener(ToolStreamListener):
        def on_tool_call_started(self, tool_name): events.append("start:" + tool_name)
        def on_tool_arguments_delta(self, tool_name, fragment): events.append("delta:" + fragment)
        def on_tool_call_finished(self, tool_name): events.append("end:" + tool_name)
        def on_stream_aborted(self): events.append("abort")

    result = loop.generate("m", None, "go", [echo()], None, 5, Listener())

    assert result.text == "done"
    assert server.requests[0]["stream"] is True
    assert events == ["start:echo", 'delta:{"text":"h', 'delta:i"}', "end:echo"]
    assert "hi" in server.requests[1]["input"][0]["output"]


def test_a_stream_that_ends_without_a_final_response_aborts_the_listener(server, loop):
    server.replies.append(sse("response.created", '{"type":"response.created"}'))
    events = []

    class Listener(ToolStreamListener):
        def on_stream_aborted(self): events.append("abort")

    with pytest.raises(AiProviderUnavailableError, match="final response"):
        loop.generate("m", None, "go", [echo()], None, 3, Listener())
    assert events == ["abort"]


class PictureTool(ToolCallback, ToolImageSource):
    """An echo tool that also attaches one picture to its result, the way check_object attaches screenshots."""

    def __init__(self, delegate):
        self.delegate = delegate

    @property
    def definition(self):
        return self.delegate.definition

    def call(self, tool_input):
        return self.delegate.call(tool_input)

    def take_images(self):
        return [Image("cảnh đang chạy", "data:image/jpeg;base64,AAAA")]


def test_a_tool_result_with_pictures_is_sent_as_text_plus_input_image_parts(server, loop):
    server.replies += [call("r1", "c1"), message("r2", "done")]

    assert loop.generate("m", None, "go", [PictureTool(echo())], None, 5).text == "done"

    output = server.requests[1]["input"][0]["output"]
    assert isinstance(output, list)
    assert output[0]["type"] == "input_text" and "hi" in output[0]["text"]
    assert "cảnh đang chạy" in output[1]["text"]
    assert output[2] == {"type": "input_image", "image_url": "data:image/jpeg;base64,AAAA", "detail": "high"}


def test_pictures_of_the_request_go_with_the_user_message_as_labelled_input_images(server, loop):
    server.replies.append(message("r1", '{"value":"ok"}'))

    result = loop.generate("m", "giám khảo", "chấm hình này", [], StructuredOutputSchemaRegistry.GENERIC, 1,
                           images=[Image("tư thế nghỉ", "data:image/png;base64,BBBB")])

    assert "ok" in result.text
    first = server.requests[0]
    assert first["instructions"] == "giám khảo"
    content = first["input"][0]["content"]
    assert content[0]["text"] == "chấm hình này"
    assert content[1]["text"] == "Ảnh: tư thế nghỉ"
    assert content[2] == {"type": "input_image", "image_url": "data:image/png;base64,BBBB", "detail": "high"}


def test_without_pictures_the_user_message_stays_plain_text(server, loop):
    server.replies.append(message("r1", "done"))

    loop.generate("m", None, "go", [echo()], None, 5)

    assert isinstance(server.requests[0]["input"][0]["content"], str)


def test_a_tool_without_pictures_still_returns_plain_text(server, loop):
    server.replies += [call("r1", "c1"), message("r2", "done")]

    loop.generate("m", None, "go", [echo()], None, 5)

    assert isinstance(server.requests[1]["input"][0]["output"], str)


def test_stops_when_the_tool_budget_is_exceeded(server, loop):
    server.replies += [call("r1", "c1"), call("r2", "c2")]

    with pytest.raises(AiProviderUnavailableError, match="limit"):
        loop.generate("m", None, "go", [echo()], None, 1)


def test_an_effort_override_replaces_the_tool_effort_on_every_turn_of_the_loop(server, loop):
    server.replies += [call("r1", "c1"), message("r2", "done")]

    loop.generate("m", "SYS", "go", [echo()], None, 5, None, "medium")

    assert len(server.requests) == 2
    assert all(request["reasoning"]["effort"] == "medium" for request in server.requests)


def test_an_incomplete_response_is_an_error_not_a_success(server, loop):
    server.replies.append('{"id":"r1","status":"incomplete","incomplete_details":{"reason":"max_output_tokens"},"output":[]}')

    with pytest.raises(IllegalStateError, match="max_output_tokens"):
        loop.generate("m", None, "go", [echo()], None, 3)


def test_with_no_tools_it_is_one_reasoning_call_that_omits_the_tool_fields(server, loop):
    server.replies.append(message("r1", "{}"))

    assert loop.generate("m", None, "go", [], None, 1).text == "{}"
    assert "tools" not in server.requests[0]
    assert "parallel_tool_calls" not in server.requests[0]
    assert server.requests[0]["reasoning"]["effort"] == "high"


def test_sends_the_strict_final_schema_as_text_format(server, loop):
    server.replies.append(message("r1", "{}"))
    spec = StructuredOutputSpec.of("final", {"type": "object", "properties": {}, "required": [], "additionalProperties": False})

    loop.generate("m", None, "go", [echo()], spec, 3)

    assert server.requests[0]["text"]["format"]["type"] == "json_schema"
    assert server.requests[0]["text"]["format"]["name"] == "final"


def test_sends_the_system_prompt_as_instructions_on_every_request_of_the_loop(server, loop):
    server.replies += [call("r1", "c1"), message("r2", "done")]

    assert loop.generate("m", "Bạn là EngineAgent.", "go", [echo()], None, 5).text == "done"
    # Instructions are not inherited through previous_response_id, so both requests must carry them.
    assert [r["instructions"] for r in server.requests] == ["Bạn là EngineAgent.", "Bạn là EngineAgent."]
    assert server.requests[0]["input"][0] == {"role": "user", "content": "go"}


def test_sends_no_instructions_field_when_there_is_no_system_prompt(server, loop):
    server.replies.append(message("r1", "done"))

    loop.generate("m", None, "go", [], None, 1)

    assert "instructions" not in server.requests[0]


def test_an_http_error_names_the_status_and_the_provider_message(server):
    loop = OpenAiResponsesToolLoop("http://test", "k", "high", "high", 5000, 5.0,
                                   transport=httpx.MockTransport(lambda r: httpx.Response(429, json={"error": {"message": "slow down"}})))

    with pytest.raises(AiProviderUnavailableError, match="429: slow down"):
        loop.generate("m", None, "go", [], None, 1)
