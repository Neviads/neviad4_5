import pytest

from beneviadsystem.domain.model.source_file import SourceFile
from beneviadsystem.infrastructure.persistence.source_file_repository import SourceFileRepository
from beneviadsystem.service.source_library_service import SourceLibraryService
from tests.service.agent.codegen.fake_browser_bridge import FakeBrowserBridge

READ = {"path": "README.md", "offset": 0, "limit": 0}


class Repository(SourceFileRepository):
    def __init__(self):
        super().__init__(None)

    def find_all(self, collection):
        return [SourceFile("README.md", "khung\nmẫu\n")] if collection == "template" else []


@pytest.fixture
def browser():
    return FakeBrowserBridge()


@pytest.fixture
def api(client_for, browser):
    return client_for({"app_livecode_debug": True}, source_library_service=SourceLibraryService(Repository()), live_code_bridge=browser)


def tool(api, run, name, payload, store=None):
    return api.post(f"/api/v1/codetools/debug/{run}/{name}" + (f"?store={store}" if store else ""), json=payload)


def test_the_endpoint_does_not_exist_unless_debug_is_on(client_for):
    assert client_for().post("/api/v1/codetools/debug/r1/read_file", json=READ).status_code == 404


def test_calls_a_tool_of_the_session_and_keeps_the_session_between_calls(api):
    read = tool(api, "r1", "read_file", READ)
    assert read.status_code == 200
    assert read.json()["success"] is True and read.json()["content"] == "khung\nmẫu"

    state = api.get("/api/v1/codetools/debug/r1/state").json()
    assert state["state"]["reads"] == 1
    assert "Đã đọc: README.md" in state["ledger"]
    assert state["writable"][0] == "_playground/r1/physics.ts"
    assert state["mustRead"][0] == "README.md"


def test_writing_waits_for_the_read_and_stays_inside_the_playground(api):
    write = {"path": "_playground/r2/physics.ts", "content": "export const a = 1;"}

    assert "MUST_READ_FIRST" in tool(api, "r2", "write_file", write).json()["message"]
    assert tool(api, "r2", "read_file", READ).json()["success"]
    assert tool(api, "r2", "write_file", write).json()["success"]
    assert "PATH_NOT_ALLOWED" in tool(api, "r2", "write_file", {"path": "engines/x/physics.ts", "content": "x"}).json()["message"]
    back = tool(api, "r2", "read_file", {"path": "_playground/r2/physics.ts", "offset": 0, "limit": 0}).json()
    assert back["success"] and back["content"] == "export const a = 1;"


def test_an_unknown_tool_lists_the_known_ones_and_a_bad_run_id_is_refused(api):
    unknown = tool(api, "r3", "nope", {})
    assert unknown.status_code == 404
    assert unknown.json()["tools"][0] == "read_file" and unknown.json()["tools"][6] == "finish"
    assert tool(api, "bad.id", "read_file", {}).status_code == 400


def test_options_cannot_move_the_writable_files_out_of_the_playground(api):
    assert api.put("/api/v1/codetools/debug/r4/options", json={"writable": ["engines/x/physics.ts"]}).status_code == 400
    assert api.put("/api/v1/codetools/debug/r4/options", json={"writable": ["_playground/r4/a.ts"], "mustRead": []}).status_code == 200

    assert tool(api, "r4", "write_file", {"path": "_playground/r4/a.ts", "content": "ok"}).json()["success"]


def test_reset_forgets_what_the_run_wrote_and_noted(api):
    tool(api, "r5", "read_file", READ)
    assert tool(api, "r5", "write_file", {"path": "_playground/r5/types.ts", "content": "export type T = 1;"}).json()["success"]
    assert tool(api, "r5", "append_note", {"text": "một ghi chú"}).json()["success"]

    reset = api.delete("/api/v1/codetools/debug/r5")
    assert reset.status_code == 200 and reset.json()["reset"] is True and reset.json()["store"] == "db"

    assert api.get("/api/v1/codetools/debug/r5/state").json()["state"]["writes"] == 0
    assert not tool(api, "r5", "read_file", {"path": "_playground/r5/types.ts", "offset": 0, "limit": 0}).json()["success"]
    assert not tool(api, "r5", "read_file", {"path": "_notes/playground-r5.md", "offset": 0, "limit": 0}).json()["success"]


def test_the_chrome_store_works_on_the_browser_copy_and_leaves_the_db_store_alone(api, browser):
    browser.files["README.md"] = "bản sao trong Chrome"

    read = tool(api, "c1", "read_file", READ, "chrome").json()
    assert read["success"] and read["content"] == "bản sao trong Chrome"
    assert tool(api, "c1", "write_file", {"path": "_playground/c1/physics.ts", "content": "export const a = 1;"}, "chrome").json()["success"]

    assert browser.files["_playground/c1/physics.ts"] == "export const a = 1;"
    assert api.get("/api/v1/codetools/debug/c1/state?store=chrome").json()["state"]["writes"] == 1
    assert api.get("/api/v1/codetools/debug/c1/state").json()["state"]["writes"] == 0
    assert not tool(api, "c1", "read_file", {"path": "_playground/c1/physics.ts", "offset": 0, "limit": 0}).json()["success"]


def test_a_chrome_call_without_a_browser_session_fails_as_a_tool_result(api, browser):
    browser.down = True

    result = tool(api, "c2", "read_file", READ, "chrome")

    assert result.status_code == 200
    assert result.json()["success"] is False
    assert "chưa có phiên live code" in result.json()["message"]


def test_an_unknown_store_is_refused(api):
    assert tool(api, "c3", "read_file", {}, "disk").status_code == 400
    deleted = api.delete("/api/v1/codetools/debug/c3?store=chrome")
    assert deleted.status_code == 200 and deleted.json()["store"] == "chrome"
