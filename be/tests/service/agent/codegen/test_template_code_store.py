import pytest

from beneviadsystem.domain.exception import IllegalStateError
from beneviadsystem.domain.model.source_file import SourceFile
from beneviadsystem.service.agent.codegen.overlay_code_store import OverlayCodeStore
from beneviadsystem.service.agent.codegen.template_code_store import TemplateCodeStore

STORE = TemplateCodeStore([SourceFile("shared/b.ts", "b"), SourceFile("README.md", "# khung"), SourceFile("shared/a.ts", "a"),
                           SourceFile("shared-extra/c.ts", "c")])


def test_reads_and_lists_the_files_sorted_by_folder():
    assert STORE.read("README.md") == "# khung"
    assert STORE.read("shared/zzz.ts") is None
    assert STORE.exists("shared/a.ts")
    assert STORE.list_files("") == ["README.md", "shared-extra/c.ts", "shared/a.ts", "shared/b.ts"]
    assert STORE.list_files("shared") == ["shared/a.ts", "shared/b.ts"]


def test_refuses_unsafe_paths_and_any_write():
    with pytest.raises(ValueError):
        STORE.read("../.env")
    with pytest.raises(IllegalStateError):
        STORE.write("shared/a.ts", "x")
    with pytest.raises(IllegalStateError):
        STORE.append_note("_notes/x.md", "x")


def test_an_overlay_writes_on_top_without_touching_the_template():
    overlay = OverlayCodeStore(STORE)
    overlay.write("shared/a.ts", "mới")

    assert overlay.read("shared/a.ts") == "mới\n"
    assert STORE.read("shared/a.ts") == "a"
