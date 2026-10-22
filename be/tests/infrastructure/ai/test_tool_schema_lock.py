import json
import threading

from beneviadsystem.domain.model.base import CamelModel
from beneviadsystem.infrastructure.ai.strict_tool_schemas import StrictToolSchemas
from beneviadsystem.infrastructure.ai.tool_callback import FunctionToolCallback
from beneviadsystem.infrastructure.ai.tool_schema_lock import ToolSchemaLock


class Part(CamelModel):
    name: str | None = None
    min_value: float = 0


class Input(CamelModel):
    path: str | None = None
    offset: int = 0
    flag: bool = False
    tags: list[str] | None = None
    parts: list[Part] | None = None


def test_tools_built_by_many_threads_at_once_all_succeed():
    failures, results = [], []
    go = threading.Event()

    def build():
        go.wait()
        try:
            results.append(ToolSchemaLock.build(lambda: FunctionToolCallback("append_note", lambda i: "ok", description="d", input_type=Input)))
        except Exception as error:  # noqa: BLE001 - any failure fails the test
            failures.append(error)

    threads = [threading.Thread(target=build) for _ in range(16)]
    for thread in threads:
        thread.start()
    go.set()
    for thread in threads:
        thread.join()

    assert failures == []
    assert len({tool.definition.input_schema for tool in results}) == 1


def test_the_input_schema_names_every_field_by_its_json_name_with_a_plain_type():
    schema = json.loads(FunctionToolCallback("t", lambda i: "ok", description="d", input_type=Input).definition.input_schema)

    assert schema["type"] == "object"
    assert {name: prop["type"] for name, prop in schema["properties"].items()} == {
        "path": "string", "offset": "integer", "flag": "boolean", "tags": "array", "parts": "array"}
    assert schema["properties"]["parts"]["items"]["properties"]["minValue"]["type"] == "number"


def test_strictify_closes_every_object_and_requires_every_property():
    schema = json.loads(FunctionToolCallback("t", lambda i: "ok", description="d", input_type=Input).definition.input_schema)

    StrictToolSchemas.strictify(schema)

    assert schema["additionalProperties"] is False
    assert schema["required"] == ["path", "offset", "flag", "tags", "parts"]
    item = schema["properties"]["parts"]["items"]
    assert item["additionalProperties"] is False and item["required"] == ["name", "minValue"]


def test_a_tool_reads_missing_fields_as_their_defaults_and_ignores_unknown_ones():
    seen = []
    tool = FunctionToolCallback("t", lambda i: seen.append(i) or {"ok": True}, description="d", input_type=Input)

    assert json.loads(tool.call('{"unknown": 1}')) == {"ok": True}
    assert seen[0].path is None and seen[0].offset == 0
