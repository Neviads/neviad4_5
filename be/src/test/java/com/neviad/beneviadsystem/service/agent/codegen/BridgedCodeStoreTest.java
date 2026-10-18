package com.neviad.beneviadsystem.service.agent.codegen;

import com.neviad.beneviadsystem.service.agent.tools.livecode.LiveCodeProtocol;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.ToolCallback;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BridgedCodeStoreTest {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private FakeBrowserBridge browser;
    private BridgedCodeStore store;

    @BeforeEach
    void setUp() {
        browser = new FakeBrowserBridge();
        store = new BridgedCodeStore(browser, "run-1");
    }

    @Test
    void readsWhatTheBrowserHoldsAndSaysWhenAFileIsMissing() {
        browser.files.put("README.md", "khung");

        assertThat(store.read("README.md")).contains("khung");
        assertThat(store.read("nope.md")).isEmpty();
        assertThat(store.exists("README.md")).isTrue();
        assertThat(store.exists("nope.md")).isFalse();
    }

    @Test
    void writesAndListsThroughTheBrowser() {
        store.write("engines/x/physics.ts", "export const a = 1;");
        browser.files.put("shared/view.ts", "v");

        assertThat(browser.files).containsEntry("engines/x/physics.ts", "export const a = 1;");
        assertThat(store.list("")).containsExactly("engines/x/physics.ts", "shared/view.ts");
        assertThat(store.list("shared")).containsExactly("shared/view.ts");
    }

    @Test
    void unsafePathsNeverReachTheBrowser() {
        assertThatThrownBy(() -> store.read("../secret.md")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> store.write("README.md", "x")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> store.write("a b.ts", "x")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> store.appendNote("engines/x/n.md", "x")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> store.checkPath("data.bin", false)).isInstanceOf(IllegalArgumentException.class);

        assertThat(browser.ops).isEmpty();
    }

    @Test
    void notesAreAppendedNotReplaced() {
        store.appendNote("_notes/x.md", "một");
        store.appendNote("_notes/x.md", "hai");

        assertThat(browser.files.get("_notes/x.md")).isEqualTo("một\nhai\n");
    }

    @Test
    void aSearchIsOneRequestAndMarksACutResult() {
        browser.files.put("shared/a.ts", "export one\nexport two\nexport three");

        List<String> found = store.search("EXPORT", "", 2, 160);

        assertThat(found).containsExactly("shared/a.ts:1: export one", "shared/a.ts:2: export two", CodeStore.SearchRules.CUT_MARK);
        assertThat(browser.ops).containsExactly(LiveCodeProtocol.OP_FS_SEARCH);
    }

    @Test
    void aBrowserThatCannotAnswerIsAnErrorWithItsReason() {
        browser.down = true;

        assertThatThrownBy(() -> store.read("README.md")).isInstanceOf(IllegalStateException.class).hasMessageContaining("chưa có phiên live code");
    }

    @Test
    void theToolsOfACodeSessionWorkOnTheBrowserCopy() throws Exception {
        browser.files.put("README.md", "khung mẫu");
        var session = new CodeSession(store, "engine", "_notes/x.md", Set.of("engines/x/physics.ts"), Set.of("README.md"), CodeSession.Limits.defaults(), null);

        JsonNode refused = call(session, "write_file", Map.of("path", "engines/x/physics.ts", "content", "export const a = 1;"));
        call(session, "read_file", Map.of("path", "README.md", "offset", 0, "limit", 0));
        JsonNode written = call(session, "write_file", Map.of("path", "engines/x/physics.ts", "content", "export const a = 1;"));
        JsonNode noted = call(session, "append_note", Map.of("text", "biến a là 1"));
        JsonNode listed = call(session, "list_files", Map.of("folder", ""));
        JsonNode found = call(session, "search", Map.of("query", "const a", "folder", ""));
        JsonNode done = call(session, "finish", Map.of("summary", "xong"));

        assertThat(refused.path("message").asText()).contains("MUST_READ_FIRST");
        assertThat(written.path("success").asBoolean()).isTrue();
        assertThat(noted.path("success").asBoolean()).isTrue();
        assertThat(browser.files.get("_notes/x.md")).contains("## Lớp engine", "biến a là 1");
        assertThat(listed.path("items")).extracting(JsonNode::asText).contains("README.md", "engines/x/physics.ts");
        assertThat(found.path("items")).extracting(JsonNode::asText).containsExactly("engines/x/physics.ts:1: export const a = 1;");
        assertThat(done.path("success").asBoolean()).isTrue();
        assertThat(browser.ops).contains(LiveCodeProtocol.OP_FS_SEARCH, LiveCodeProtocol.OP_FS_APPEND);
        // The ledger is written into the browser's notes file after the agent's own note.
        assertThat(browser.files.get("_notes/x.md")).contains("biến a là 1", "## Sổ cái của lớp engine", "Đã ghi: engines/x/physics.ts");
    }

    @Test
    void finishFailsWhenTheLedgerCannotBeWrittenAndCanBeRetried() throws Exception {
        browser.appendsBeforeFailure = 1; // the agent's note goes through, the ledger does not
        var session = new CodeSession(store, "engine", "_notes/x.md", Set.of("engines/x/physics.ts"), Set.of(), CodeSession.Limits.defaults(), null);
        call(session, "write_file", Map.of("path", "engines/x/physics.ts", "content", "export const a = 1;"));
        call(session, "append_note", Map.of("text", "biến a là 1"));

        JsonNode failed = call(session, "finish", Map.of("summary", "xong"));

        assertThat(failed.path("success").asBoolean()).isFalse();
        assertThat(failed.path("message").asText()).contains("NOT_DONE", "sổ cái", "mất kết nối");
        assertThat(session.state().finished()).isFalse();

        browser.appendsBeforeFailure = Integer.MAX_VALUE;
        assertThat(call(session, "finish", Map.of("summary", "xong")).path("success").asBoolean()).isTrue();
        assertThat(session.state().finished()).isTrue();
    }

    @Test
    void aDeadBrowserShowsUpAsAFailedToolCallNotACrash() throws Exception {
        browser.down = true;
        var session = new CodeSession(store, "engine", "_notes/x.md", Set.of("engines/x/physics.ts"), Set.of(), CodeSession.Limits.defaults(), null);

        JsonNode result = call(session, "read_file", Map.of("path", "README.md", "offset", 0, "limit", 0));

        assertThat(result.path("success").asBoolean()).isFalse();
        assertThat(result.path("message").asText()).contains("chưa có phiên live code");
    }

    private static JsonNode call(CodeSession session, String tool, Map<String, Object> input) throws Exception {
        var callback = session.callbacks().stream().filter(t -> tool.equals(t.getToolDefinition().name())).findFirst().map(ToolCallback.class::cast).orElseThrow();
        return MAPPER.readTree(callback.call(MAPPER.writeValueAsString(input)));
    }
}
