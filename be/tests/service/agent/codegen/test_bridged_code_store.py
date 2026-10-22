import json

import pytest

from beneviadsystem.domain.exception import IllegalStateError
from beneviadsystem.service.agent.codegen.bridged_code_store import BridgedCodeStore
from beneviadsystem.service.agent.codegen.code_session import CodeSession, Limits
from beneviadsystem.service.agent.codegen.code_store import SearchRules
from beneviadsystem.service.agent.tools.livecode.live_code_protocol import LiveCodeProtocol
from tests.service.agent.codegen.fake_browser_bridge import FakeBrowserBridge


@pytest.fixture
def browser():
    return FakeBrowserBridge()


@pytest.fixture
def store(browser):
    return BridgedCodeStore(browser, "run-1")


def call(session, tool, payload):
    return json.loads(next(t for t in session.callbacks() if t.definition.name == tool).call(json.dumps(payload)))


def test_reads_what_the_browser_holds_and_says_when_a_file_is_missing(browser, store):
    browser.files["README.md"] = "khung"

    assert store.read("README.md") == "khung"
    assert store.read("nope.md") is None
    assert store.exists("README.md")
    assert not store.exists("nope.md")


def test_writes_and_lists_through_the_browser(browser, store):
    store.write("engines/x/physics.ts", "export const a = 1;")
    browser.files["shared/view.ts"] = "v"

    assert browser.files["engines/x/physics.ts"] == "export const a = 1;"
    assert store.list_files("") == ["engines/x/physics.ts", "shared/view.ts"]
    assert store.list_files("shared") == ["shared/view.ts"]


def test_unsafe_paths_never_reach_the_browser(browser, store):
    for action in (lambda: store.read("../secret.md"), lambda: store.write("README.md", "x"), lambda: store.write("a b.ts", "x"),
                   lambda: store.append_note("engines/x/n.md", "x"), lambda: store.check_path("data.bin", False)):
        with pytest.raises(ValueError):
            action()
    assert browser.ops == []


def test_notes_are_appended_not_replaced(browser, store):
    store.append_note("_notes/x.md", "một")
    store.append_note("_notes/x.md", "hai")

    assert browser.files["_notes/x.md"] == "một\nhai\n"


def test_a_search_is_one_request_and_marks_a_cut_result(browser, store):
    browser.files["shared/a.ts"] = "export one\nexport two\nexport three"

    assert store.search("EXPORT", "", 2, 160) == ["shared/a.ts:1: export one", "shared/a.ts:2: export two", SearchRules.CUT_MARK]
    assert browser.ops == [LiveCodeProtocol.OP_FS_SEARCH]


def test_a_browser_that_cannot_answer_is_an_error_with_its_reason(browser, store):
    browser.down = True

    with pytest.raises(IllegalStateError, match="chưa có phiên live code"):
        store.read("README.md")


def test_the_tools_of_a_code_session_work_on_the_browser_copy(browser, store):
    browser.files["README.md"] = "khung mẫu"
    session = CodeSession(store, "engine", "_notes/x.md", {"engines/x/physics.ts"}, {"README.md"}, Limits.defaults())

    refused = call(session, "write_file", {"path": "engines/x/physics.ts", "content": "export const a = 1;"})
    call(session, "read_file", {"path": "README.md", "offset": 0, "limit": 0})
    written = call(session, "write_file", {"path": "engines/x/physics.ts", "content": "export const a = 1;"})
    noted = call(session, "append_note", {"text": "biến a là 1"})
    listed = call(session, "list_files", {"folder": ""})
    found = call(session, "search", {"query": "const a", "folder": ""})
    done = call(session, "finish", {"summary": "xong"})

    assert "MUST_READ_FIRST" in refused["message"]
    assert written["success"] and noted["success"] and done["success"]
    assert "## Lớp engine" in browser.files["_notes/x.md"] and "biến a là 1" in browser.files["_notes/x.md"]
    assert {"README.md", "engines/x/physics.ts"} <= set(listed["items"])
    assert found["items"] == ["engines/x/physics.ts:1: export const a = 1;"]
    assert {LiveCodeProtocol.OP_FS_SEARCH, LiveCodeProtocol.OP_FS_APPEND} <= set(browser.ops)
    # The ledger is written into the browser's notes file after the agent's own note.
    notes = browser.files["_notes/x.md"]
    assert "## Sổ cái của lớp engine" in notes and "Đã ghi: engines/x/physics.ts" in notes


def test_finish_fails_when_the_ledger_cannot_be_written_and_can_be_retried(browser, store):
    browser.appends_before_failure = 1  # the agent's note goes through, the ledger does not
    session = CodeSession(store, "engine", "_notes/x.md", {"engines/x/physics.ts"}, set(), Limits.defaults())
    call(session, "write_file", {"path": "engines/x/physics.ts", "content": "export const a = 1;"})
    call(session, "append_note", {"text": "biến a là 1"})

    failed = call(session, "finish", {"summary": "xong"})

    assert not failed["success"]
    assert all(part in failed["message"] for part in ("NOT_DONE", "sổ cái", "mất kết nối"))
    assert not session.state().finished

    browser.appends_before_failure = 10**9
    assert call(session, "finish", {"summary": "xong"})["success"]
    assert session.state().finished


def test_a_dead_browser_shows_up_as_a_failed_tool_call_not_a_crash(browser, store):
    browser.down = True
    session = CodeSession(store, "engine", "_notes/x.md", {"engines/x/physics.ts"}, set(), Limits.defaults())

    result = call(session, "read_file", {"path": "README.md", "offset": 0, "limit": 0})

    assert not result["success"]
    assert "chưa có phiên live code" in result["message"]
