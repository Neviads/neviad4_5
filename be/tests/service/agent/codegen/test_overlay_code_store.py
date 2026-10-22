"""A run without the browser reads the tree on disk and never writes to it."""
import pytest

from beneviadsystem.service.agent.codegen.overlay_code_store import OverlayCodeStore
from beneviadsystem.service.agent.codegen.source_store import SourceStore


@pytest.fixture
def root(tmp_path):
    (tmp_path / "objects").mkdir()
    (tmp_path / "objects/types.ts").write_text("export type Vec2 = { x: number; y: number };\n", encoding="utf-8")
    (tmp_path / "_notes").mkdir()
    (tmp_path / "_notes/run.md").write_text("trước\n", encoding="utf-8")
    return tmp_path


@pytest.fixture
def store(root):
    return OverlayCodeStore(SourceStore(root))


def test_reads_the_tree_on_disk_and_keeps_what_the_agent_writes_in_memory_only(store, root):
    assert store.read("objects/types.ts") == "export type Vec2 = { x: number; y: number };\n"

    store.write("_drawn/kinh-hien-vi.ts", "const makeMicroscope = () => 1;")

    assert store.read("_drawn/kinh-hien-vi.ts") == "const makeMicroscope = () => 1;\n"
    assert store.exists("_drawn/kinh-hien-vi.ts")
    assert not (root / "_drawn").exists()


def test_a_written_file_hides_the_same_file_on_disk_without_changing_it(store, root):
    store.write("objects/types.ts", "export type Vec2 = [number, number];")

    assert store.read("objects/types.ts") == "export type Vec2 = [number, number];\n"
    assert (root / "objects/types.ts").read_text(encoding="utf-8") == "export type Vec2 = { x: number; y: number };\n"


def test_the_listing_has_the_files_on_disk_and_the_written_ones_once(store):
    store.write("objects/new.ts", "x")
    store.write("objects/types.ts", "y")
    store.write("_drawn/a.ts", "z")

    assert store.list_files("objects") == ["objects/new.ts", "objects/types.ts"]
    assert {"_drawn/a.ts", "_notes/run.md", "objects/new.ts", "objects/types.ts"} <= set(store.list_files(""))


def test_notes_are_added_to_the_end_of_the_note_on_disk_in_memory(store, root):
    store.append_note("_notes/run.md", "sau")
    store.append_note("_notes/run.md", "nữa")

    assert store.read("_notes/run.md") == "trước\nsau\nnữa\n"
    assert (root / "_notes/run.md").read_text(encoding="utf-8") == "trước\n"


def test_the_path_rules_are_the_same_as_on_disk(store):
    for action in (lambda: store.write("../escape.ts", "x"), lambda: store.write("objects/x.js", "x"), lambda: store.append_note("objects/x.md", "x")):
        with pytest.raises(ValueError):
            action()
