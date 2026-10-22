import json

import pytest

from beneviadsystem.infrastructure.ai.strict_tool_schemas import StrictToolSchemas
from beneviadsystem.service.agent.codegen.code_session import MAX_NOTE_CHARS, CodeSession, Limits
from beneviadsystem.service.agent.codegen.source_store import SourceStore

PHYSICS = "engines/x/physics.ts"
TYPES = "engines/x/types.ts"
NOTES = "_notes/x.md"


@pytest.fixture
def root(tmp_path):
    return tmp_path


@pytest.fixture
def store(root):
    return SourceStore(root)


def seed(root, path, content):
    """Seeds any file, including the .md and .json files the agent may read but never write."""
    file = root / path
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(content)


def session(store, writable, must_read=(), limits=None):
    return CodeSession(store, "engine", NOTES, set(writable), set(must_read), limits or Limits.defaults())


def call(s, tool, payload):
    return json.loads(next(t for t in s.callbacks() if t.definition.name == tool).call(json.dumps(payload)))


def read(path, offset=0, limit=0):
    return {"path": path, "offset": offset, "limit": limit}


def write(path, content):
    return {"path": path, "content": content}


def test_offers_the_seven_tools(store):
    assert [t.definition.name for t in session(store, {PHYSICS}).callbacks()] == [
        "read_file", "list_files", "search", "write_file", "edit_file", "append_note", "finish"]


def test_every_tool_has_an_input_schema_that_strict_function_calling_accepts(store):
    for tool in session(store, {PHYSICS}).callbacks():
        schema = json.loads(tool.definition.input_schema)
        StrictToolSchemas.strictify(schema)
        name = tool.definition.name

        assert schema["type"] == "object", name
        assert schema["additionalProperties"] is False, name
        assert sorted(schema["required"]) == sorted(schema["properties"]), name
        assert schema["properties"], name
        assert all(p["type"] in ("string", "integer", "number", "boolean", "array", "object") for p in schema["properties"].values()), name


def test_reads_a_range_of_lines_and_says_how_much_is_left(root, store):
    seed(root, "README.md", "l1\nl2\nl3\nl4\nl5\nl6\nl7\nl8\nl9\nl10\n")
    s = session(store, {PHYSICS})

    part = call(s, "read_file", read("README.md", 3, 2))
    whole = call(s, "read_file", read("README.md"))

    assert part["success"]
    assert part["content"] == "l3\nl4"
    assert "3 đến 4 trên tổng 10" in part["message"] and "còn nữa" in part["message"]
    assert whole["content"].startswith("l1\n") and whole["content"].endswith("l10")
    assert "còn nữa" not in whole["message"]


def test_a_missing_file_or_an_offset_past_the_end_is_an_error_not_a_crash(root, store):
    seed(root, "README.md", "only\n")
    s = session(store, {PHYSICS})

    assert "FILE_NOT_FOUND" in call(s, "read_file", read("nope.md"))["message"]
    assert "OFFSET_OUT_OF_RANGE" in call(s, "read_file", read("README.md", 9))["message"]
    assert not call(s, "read_file", read("../secret.md"))["success"]


def test_writing_is_refused_until_the_files_to_read_first_are_read(root, store):
    seed(root, "README.md", "framework")
    store.write("engines/template/physics.ts", "export const t = 1;")
    s = session(store, {PHYSICS}, {"README.md", "engines/template/physics.ts"})

    refused = call(s, "write_file", write(PHYSICS, "export const a = 1;"))
    call(s, "read_file", read("README.md"))
    still_refused = call(s, "write_file", write(PHYSICS, "export const a = 1;"))
    call(s, "read_file", read("engines/template/physics.ts"))
    allowed = call(s, "write_file", write(PHYSICS, "export const a = 1;"))

    assert all(part in refused["message"] for part in ("MUST_READ_FIRST", "README.md", "engines/template/physics.ts"))
    assert "MUST_READ_FIRST" in still_refused["message"] and "README.md" not in still_refused["message"]
    assert allowed["success"]
    assert store.read(PHYSICS) is not None


def test_only_the_assigned_type_script_files_can_be_written(store):
    s = session(store, {PHYSICS})

    assert "PATH_NOT_ALLOWED" in call(s, "write_file", write(TYPES, "x"))["message"]
    assert not call(s, "write_file", write("../evil.ts", "x"))["success"]
    assert not call(s, "write_file", write(NOTES, "x"))["success"]
    assert call(s, "write_file", write(PHYSICS, "ok"))["success"]


def test_edits_one_exact_piece_and_refuses_ambiguous_ones(store):
    store.write(PHYSICS, "const a = 1;\nconst b = 1;\n")
    s = session(store, {PHYSICS})

    ok = call(s, "edit_file", {"path": PHYSICS, "expectedText": "const a = 1;", "replacement": "const a = 2;"})
    ambiguous = call(s, "edit_file", {"path": PHYSICS, "expectedText": " = ", "replacement": "="})
    missing = call(s, "edit_file", {"path": PHYSICS, "expectedText": "zzz", "replacement": "y"})

    assert ok["success"]
    assert "const a = 2;" in store.read(PHYSICS)
    assert "EXPECTED_TEXT_NOT_UNIQUE" in ambiguous["message"]
    assert "EXPECTED_TEXT_NOT_FOUND" in missing["message"]


def test_lists_only_readable_files_under_a_folder(root, store):
    store.write("engines/x/physics.ts", "1")
    store.write("shared/view.ts", "2")
    seed(root, "shared/data.bin", "3")
    s = session(store, {PHYSICS})

    assert call(s, "list_files", {"folder": "shared"})["items"] == ["shared/view.ts"]
    assert call(s, "list_files", {"folder": ""})["items"] == ["engines/x/physics.ts", "shared/view.ts"]


def test_search_finds_lines_without_caring_about_case(store):
    store.write("shared/frame.tsx", "export function ExperimentFrame() {}\nconst other = 1;\n")
    store.write("experiments/A.tsx", '<ExperimentFrame title="a" />\n')
    s = session(store, {PHYSICS})

    assert call(s, "search", {"query": "experimentframe", "folder": ""})["items"] == [
        'experiments/A.tsx:1: <ExperimentFrame title="a" />', "shared/frame.tsx:1: export function ExperimentFrame() {}"]
    assert call(s, "search", {"query": "khong-co-gi", "folder": ""})["items"] == []
    assert not call(s, "search", {"query": "  ", "folder": ""})["success"]


def test_notes_only_grow_and_the_next_layer_can_read_them(store):
    first = session(store, {PHYSICS})
    second = CodeSession(store, "renderer", NOTES, {"renderers/x/x-scene.tsx"}, set(), Limits.defaults())

    assert call(first, "append_note", {"text": "biến v1 là vận tốc xe A"})["success"]
    assert call(second, "append_note", {"text": "đã nối v1 vào carOnePosition"})["success"]
    notes = call(second, "read_file", read(NOTES))["content"]

    assert all(part in notes for part in ("## Lớp engine", "biến v1 là vận tốc xe A", "## Lớp renderer", "đã nối v1 vào carOnePosition"))
    assert notes.index("engine") < notes.index("renderer")
    assert "NOTE_TOO_LARGE" in call(first, "append_note", {"text": "x" * (MAX_NOTE_CHARS + 1)})["message"]


def test_finish_needs_every_assigned_file_to_exist(store):
    s = session(store, {PHYSICS, TYPES})

    first = call(s, "finish", {"summary": "xong"})["message"]
    assert "NOT_DONE" in first and "chưa ghi file nào" in first
    call(s, "write_file", write(PHYSICS, "a"))
    second = call(s, "finish", {"summary": "xong"})["message"]
    assert "NOT_DONE" in second and TYPES in second
    assert not s.state().finished

    call(s, "write_file", write(TYPES, "b"))
    call(s, "append_note", {"text": "đặt tên theo kịch bản"})
    assert call(s, "finish", {"summary": "đã viết engine"})["success"]

    assert s.state().finished
    assert s.state().summary == "đã viết engine"
    assert all(part in s.ledger() for part in ("Đã ghi: " + PHYSICS, TYPES, "đã xong — đã viết engine"))


def test_finish_needs_at_least_one_note_of_the_agents_own(store):
    s = session(store, {PHYSICS})
    call(s, "write_file", write(PHYSICS, "a"))

    refused = call(s, "finish", {"summary": "xong"})

    assert not refused["success"]
    assert "NOTE_REQUIRED" in refused["message"] and "append_note" in refused["message"]
    assert not s.state().finished
    assert not store.exists(NOTES)

    call(s, "append_note", {"text": "biến a là 1"})
    assert call(s, "finish", {"summary": "xong"})["success"]


def test_finishing_adds_the_ledger_to_the_notes_after_the_agents_own(root, store):
    seed(root, "README.md", "khung\n")
    s = session(store, {PHYSICS})
    call(s, "read_file", read("README.md"))
    call(s, "write_file", write(PHYSICS, "a"))
    call(s, "append_note", {"text": "biến a là 1"})

    call(s, "finish", {"summary": "đã viết physics"})
    notes = call(s, "read_file", read(NOTES))["content"]

    assert all(part in notes for part in ("## Lớp engine", "biến a là 1", "## Sổ cái của lớp engine", "Đã đọc: README.md", "Đã ghi: " + PHYSICS,
                                          "đã xong — đã viết physics"))
    assert notes.index("## Lớp engine") < notes.index("## Sổ cái của lớp engine")
    assert s.state().notes == 1


def test_finishing_twice_does_not_add_the_ledger_twice(store):
    s = session(store, {PHYSICS})
    call(s, "write_file", write(PHYSICS, "a"))
    call(s, "append_note", {"text": "ghi chú"})

    call(s, "finish", {"summary": "xong"})
    again = call(s, "finish", {"summary": "xong lần nữa"})

    assert again["success"]
    assert store.read(NOTES).count("## Sổ cái của lớp engine") == 1
    assert s.state().summary == "xong"


def test_the_ledger_does_not_use_up_the_note_budget(store):
    s = session(store, {PHYSICS}, limits=Limits(60, 30, 1, 120_000, 20_000))
    call(s, "write_file", write(PHYSICS, "a"))
    call(s, "append_note", {"text": "ghi chú duy nhất"})

    assert call(s, "finish", {"summary": "xong"})["success"]
    assert "ghi chú duy nhất" in store.read(NOTES) and "## Sổ cái của lớp engine" in store.read(NOTES)


def test_an_exhausted_budget_answers_instead_of_raising(root, store):
    seed(root, "README.md", "x\n")
    s = session(store, {PHYSICS}, limits=Limits(2, 1, 1, 120_000, 20_000))

    call(s, "read_file", read("README.md"))
    call(s, "list_files", {"folder": ""})
    assert "TOOL_BUDGET_EXCEEDED" in call(s, "search", {"query": "x", "folder": ""})["message"]

    assert call(s, "write_file", write(PHYSICS, "a"))["success"]
    assert "TOOL_BUDGET_EXCEEDED" in call(s, "write_file", write(PHYSICS, "b"))["message"]
    call(s, "append_note", {"text": "một"})
    assert "TOOL_BUDGET_EXCEEDED" in call(s, "append_note", {"text": "hai"})["message"]
    assert s.state().reads == 2


def test_the_ledger_remembers_what_was_read_and_written(root, store):
    seed(root, "README.md", "x\n")
    s = session(store, {PHYSICS})

    call(s, "read_file", read("README.md"))
    call(s, "write_file", write(PHYSICS, "a"))

    assert all(part in s.ledger() for part in ("Sổ cái của lớp engine", "Đã đọc: README.md", "Đã ghi: " + PHYSICS, "chưa xong"))
    assert (s.state().reads, s.state().writes) == (1, 1)
