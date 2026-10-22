import pytest

from beneviadsystem.service.agent.codegen.source_store import SourceStore


def test_writes_and_reads_back_with_unix_line_endings(tmp_path):
    store = SourceStore(tmp_path)

    store.write("engines/x/physics.ts", "a\r\nb")

    assert store.exists("engines/x/physics.ts")
    assert store.read("engines/x/physics.ts") == "a\nb\n"
    assert store.read("engines/x/missing.ts") is None


@pytest.mark.parametrize("bad", ["../secret.ts", "a/../../b.ts", "/etc/passwd.ts", "C:/x.ts", "a b.ts", "a//b.ts", "", "x\u0000.ts"])
def test_paths_cannot_leave_the_root_or_use_unsafe_characters(tmp_path, bad):
    with pytest.raises(ValueError):
        SourceStore(tmp_path).resolve(bad, True)


def test_only_typescript_can_be_written_while_the_readme_and_json_can_be_read(tmp_path):
    store = SourceStore(tmp_path)

    with pytest.raises(ValueError):
        store.write("engines/x/run.sh", "x")
    with pytest.raises(ValueError):
        store.write("README.md", "x")
    assert store.resolve("README.md", False) == tmp_path.resolve() / "README.md"


def test_lists_every_file_sorted_and_nothing_for_an_unknown_folder(tmp_path):
    store = SourceStore(tmp_path)
    store.write("b/two.ts", "2")
    store.write("a/one.ts", "1")

    assert store.list_files("") == ["a/one.ts", "b/two.ts"]
    assert store.list_files("a") == ["a/one.ts"]
    assert store.list_files("nope") == []
    assert store.list_files("../..") == []


def test_notes_only_grow_and_only_live_under_the_notes_folder(tmp_path):
    store = SourceStore(tmp_path)

    store.append_note("_notes/run.md", "## engine\nđã đặt biến v1")
    store.append_note("_notes/run.md", "## renderer\nđã nối v1")

    notes = store.read("_notes/run.md")
    assert "đã đặt biến v1" in notes and "đã nối v1" in notes
    for path, text in [("engines/x/notes.md", "x"), ("_notes/sub/run.md", "x"), ("_notes/run.ts", "x"), ("_notes/../run.md", "x"), ("_notes/run.md", "  ")]:
        with pytest.raises(ValueError):
            store.append_note(path, text)
