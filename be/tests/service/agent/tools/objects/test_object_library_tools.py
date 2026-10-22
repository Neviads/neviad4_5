import json

from beneviadsystem.service.agent.tools.objects.object_library_tools import ObjectLibraryTools
from tests.service.test_object_library_service import CATALOG, library, object_file

TOOLS = ObjectLibraryTools.of(library({"luc-ke.ts": object_file("Lực kế", "Lực kế lò xo")}, CATALOG))


def tool(name):
    return next(t for t in TOOLS if t.definition.name == name)


def test_every_tool_input_has_at_least_one_property():
    """OpenAI rejects a function whose object schema has no properties ("object schema missing properties")."""
    for t in TOOLS:
        assert json.loads(t.definition.input_schema)["properties"], t.definition.name


def test_get_objects_returns_the_full_summary_of_each_id_and_names_the_unknown_ones():
    assert [t.definition.name for t in TOOLS] == ["get_objects"]
    one = tool("get_objects").call('{"ids":["luc-ke.ts"]}')
    assert "luc-ke.ts" in one and "needle" in one and "cần cân điện tử có số đọc" in one and '"avoidWhen"' in one
    two = tool("get_objects").call('{"ids":["luc-ke.ts","khong-co.ts"]}')
    assert "luc-ke.ts" in two and "not in the library: khong-co.ts" in two
    assert "ids (from the index of the library) are required" in tool("get_objects").call('{"ids":[]}')
