package com.neviad.beneviadsystem.service.agent.codegen;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.ai.tool.ToolCallback;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class CodeSessionTest {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String PHYSICS = "engines/x/physics.ts";
    private static final String TYPES = "engines/x/types.ts";
    private static final String NOTES = "_notes/x.md";

    @TempDir Path root;
    private SourceStore store;

    @BeforeEach
    void setUp() { store = new SourceStore(root); }

    /** Seeds any file, including the .md and .json files the agent may read but never write. */
    private void seed(String path, String content) throws IOException {
        Path file = root.resolve(path);
        Files.createDirectories(file.getParent());
        Files.writeString(file, content);
    }

    private CodeSession session(CodeSession.Limits limits, Set<String> writable, Set<String> mustRead) {
        return new CodeSession(store, "engine", NOTES, writable, mustRead, limits, null);
    }

    private CodeSession session(Set<String> writable, Set<String> mustRead) {
        return session(CodeSession.Limits.defaults(), writable, mustRead);
    }

    private static JsonNode call(CodeSession session, String tool, Map<String, Object> input) throws Exception {
        var callback = session.callbacks().stream().filter(t -> tool.equals(t.getToolDefinition().name())).findFirst().map(ToolCallback.class::cast).orElseThrow();
        return MAPPER.readTree(callback.call(MAPPER.writeValueAsString(input)));
    }

    private static Map<String, Object> read(String path, int offset, int limit) { return Map.of("path", path, "offset", offset, "limit", limit); }

    private static Map<String, Object> write(String path, String content) { return Map.of("path", path, "content", content); }

    @Test
    void offersTheSevenTools() {
        assertThat(session(Set.of(PHYSICS), Set.of()).callbacks()).extracting(t -> t.getToolDefinition().name())
                .containsExactly("read_file", "list_files", "search", "write_file", "edit_file", "append_note", "finish");
    }

    @Test
    void everyToolHasAnInputSchemaThatStrictFunctionCallingAccepts() throws Exception {
        for (ToolCallback tool : session(Set.of(PHYSICS), Set.of()).callbacks()) {
            JsonNode schema = MAPPER.readTree(tool.getToolDefinition().inputSchema());
            com.neviad.beneviadsystem.infrastructure.ai.StrictToolSchemas.strictify(schema);
            String name = tool.getToolDefinition().name();

            assertThat(schema.path("type").asText()).as(name).isEqualTo("object");
            assertThat(schema.path("additionalProperties").asBoolean(true)).as(name).isFalse();
            assertThat(schema.path("required")).extracting(JsonNode::asText).as(name).containsExactlyInAnyOrderElementsOf(
                    () -> schema.path("properties").fieldNames());
            schema.path("properties").forEach(property -> assertThat(property.path("type").asText()).as(name + " " + property).isIn("string", "integer", "number", "boolean", "array", "object"));
        }
    }

    @Test
    void readsARangeOfLinesAndSaysHowMuchIsLeft() throws Exception {
        seed("README.md", "l1\nl2\nl3\nl4\nl5\nl6\nl7\nl8\nl9\nl10\n");
        var session = session(Set.of(PHYSICS), Set.of());

        JsonNode part = call(session, "read_file", read("README.md", 3, 2));
        JsonNode whole = call(session, "read_file", read("README.md", 0, 0));

        assertThat(part.path("success").asBoolean()).isTrue();
        assertThat(part.path("content").asText()).isEqualTo("l3\nl4");
        assertThat(part.path("message").asText()).contains("3 đến 4 trên tổng 10", "còn nữa");
        assertThat(whole.path("content").asText()).startsWith("l1\n").endsWith("l10");
        assertThat(whole.path("message").asText()).doesNotContain("còn nữa");
    }

    @Test
    void aMissingFileOrAnOffsetPastTheEndIsAnErrorNotACrash() throws Exception {
        seed("README.md", "only\n");
        var session = session(Set.of(PHYSICS), Set.of());

        assertThat(call(session, "read_file", read("nope.md", 0, 0)).path("message").asText()).contains("FILE_NOT_FOUND");
        assertThat(call(session, "read_file", read("README.md", 9, 0)).path("message").asText()).contains("OFFSET_OUT_OF_RANGE");
        assertThat(call(session, "read_file", read("../secret.md", 0, 0)).path("success").asBoolean()).isFalse();
    }

    @Test
    void writingIsRefusedUntilTheFilesToReadFirstAreRead() throws Exception {
        seed("README.md", "framework");
        store.write("engines/template/physics.ts", "export const t = 1;");
        var session = session(Set.of(PHYSICS), Set.of("README.md", "engines/template/physics.ts"));

        JsonNode refused = call(session, "write_file", write(PHYSICS, "export const a = 1;"));
        call(session, "read_file", read("README.md", 0, 0));
        JsonNode stillRefused = call(session, "write_file", write(PHYSICS, "export const a = 1;"));
        call(session, "read_file", read("engines/template/physics.ts", 0, 0));
        JsonNode allowed = call(session, "write_file", write(PHYSICS, "export const a = 1;"));

        assertThat(refused.path("message").asText()).contains("MUST_READ_FIRST", "README.md", "engines/template/physics.ts");
        assertThat(stillRefused.path("message").asText()).contains("MUST_READ_FIRST").doesNotContain("README.md");
        assertThat(allowed.path("success").asBoolean()).isTrue();
        assertThat(store.read(PHYSICS)).isPresent();
    }

    @Test
    void onlyTheAssignedTypeScriptFilesCanBeWritten() throws Exception {
        var session = session(Set.of(PHYSICS), Set.of());

        assertThat(call(session, "write_file", write(TYPES, "x")).path("message").asText()).contains("PATH_NOT_ALLOWED");
        assertThat(call(session, "write_file", write("../evil.ts", "x")).path("success").asBoolean()).isFalse();
        assertThat(call(session, "write_file", write(NOTES, "x")).path("success").asBoolean()).isFalse();
        assertThat(call(session, "write_file", write(PHYSICS, "ok")).path("success").asBoolean()).isTrue();
    }

    @Test
    void editsOneExactPieceAndRefusesAmbiguousOnes() throws Exception {
        store.write(PHYSICS, "const a = 1;\nconst b = 1;\n");
        var session = session(Set.of(PHYSICS), Set.of());

        JsonNode ok = call(session, "edit_file", Map.of("path", PHYSICS, "expectedText", "const a = 1;", "replacement", "const a = 2;"));
        JsonNode ambiguous = call(session, "edit_file", Map.of("path", PHYSICS, "expectedText", " = ", "replacement", "="));
        JsonNode missing = call(session, "edit_file", Map.of("path", PHYSICS, "expectedText", "zzz", "replacement", "y"));

        assertThat(ok.path("success").asBoolean()).isTrue();
        assertThat(store.read(PHYSICS).orElseThrow()).contains("const a = 2;");
        assertThat(ambiguous.path("message").asText()).contains("EXPECTED_TEXT_NOT_UNIQUE");
        assertThat(missing.path("message").asText()).contains("EXPECTED_TEXT_NOT_FOUND");
    }

    @Test
    void listsOnlyReadableFilesUnderAFolder() throws Exception {
        store.write("engines/x/physics.ts", "1");
        store.write("shared/view.ts", "2");
        seed("shared/data.bin", "3");
        var session = session(Set.of(PHYSICS), Set.of());

        JsonNode shared = call(session, "list_files", Map.of("folder", "shared"));
        JsonNode all = call(session, "list_files", Map.of("folder", ""));

        assertThat(shared.path("items")).extracting(JsonNode::asText).containsExactly("shared/view.ts");
        assertThat(all.path("items")).extracting(JsonNode::asText).containsExactly("engines/x/physics.ts", "shared/view.ts");
    }

    @Test
    void searchFindsLinesWithoutCaringAboutCase() throws Exception {
        store.write("shared/frame.tsx", "export function ExperimentFrame() {}\nconst other = 1;\n");
        store.write("experiments/A.tsx", "<ExperimentFrame title=\"a\" />\n");
        var session = session(Set.of(PHYSICS), Set.of());

        JsonNode result = call(session, "search", Map.of("query", "experimentframe", "folder", ""));
        JsonNode none = call(session, "search", Map.of("query", "khong-co-gi", "folder", ""));

        assertThat(result.path("items")).extracting(JsonNode::asText)
                .containsExactly("experiments/A.tsx:1: <ExperimentFrame title=\"a\" />", "shared/frame.tsx:1: export function ExperimentFrame() {}");
        assertThat(none.path("items")).isEmpty();
        assertThat(call(session, "search", Map.of("query", "  ", "folder", "")).path("success").asBoolean()).isFalse();
    }

    @Test
    void notesOnlyGrowAndTheNextLayerCanReadThem() throws Exception {
        var first = session(Set.of(PHYSICS), Set.of());
        var second = new CodeSession(store, "renderer", NOTES, Set.of("renderers/x/x-scene.tsx"), Set.of(), CodeSession.Limits.defaults(), null);

        assertThat(call(first, "append_note", Map.of("text", "biến v1 là vận tốc xe A")).path("success").asBoolean()).isTrue();
        assertThat(call(second, "append_note", Map.of("text", "đã nối v1 vào carOnePosition")).path("success").asBoolean()).isTrue();
        String notes = call(second, "read_file", read(NOTES, 0, 0)).path("content").asText();

        assertThat(notes).contains("## Lớp engine", "biến v1 là vận tốc xe A", "## Lớp renderer", "đã nối v1 vào carOnePosition");
        assertThat(notes.indexOf("engine")).isLessThan(notes.indexOf("renderer"));
        assertThat(call(first, "append_note", Map.of("text", "x".repeat(CodeSession.MAX_NOTE_CHARS + 1))).path("message").asText()).contains("NOTE_TOO_LARGE");
    }

    @Test
    void finishNeedsEveryAssignedFileToExist() throws Exception {
        var session = session(Set.of(PHYSICS, TYPES), Set.of());

        assertThat(call(session, "finish", Map.of("summary", "xong")).path("message").asText()).contains("NOT_DONE", "chưa ghi file nào");
        call(session, "write_file", write(PHYSICS, "a"));
        assertThat(call(session, "finish", Map.of("summary", "xong")).path("message").asText()).contains("NOT_DONE", TYPES);
        assertThat(session.state().finished()).isFalse();

        call(session, "write_file", write(TYPES, "b"));
        call(session, "append_note", Map.of("text", "đặt tên theo kịch bản"));
        assertThat(call(session, "finish", Map.of("summary", "đã viết engine")).path("success").asBoolean()).isTrue();

        assertThat(session.state().finished()).isTrue();
        assertThat(session.state().summary()).isEqualTo("đã viết engine");
        assertThat(session.ledger()).contains("Đã ghi: " + PHYSICS, TYPES, "đã xong — đã viết engine");
    }

    @Test
    void finishNeedsAtLeastOneNoteOfTheAgentsOwn() throws Exception {
        var session = session(Set.of(PHYSICS), Set.of());
        call(session, "write_file", write(PHYSICS, "a"));

        JsonNode refused = call(session, "finish", Map.of("summary", "xong"));

        assertThat(refused.path("success").asBoolean()).isFalse();
        assertThat(refused.path("message").asText()).contains("NOTE_REQUIRED", "append_note");
        assertThat(session.state().finished()).isFalse();
        assertThat(store.exists(NOTES)).isFalse();

        call(session, "append_note", Map.of("text", "biến a là 1"));
        assertThat(call(session, "finish", Map.of("summary", "xong")).path("success").asBoolean()).isTrue();
    }

    @Test
    void finishingAddsTheLedgerToTheNotesAfterTheAgentsOwn() throws Exception {
        seed("README.md", "khung\n");
        var session = session(Set.of(PHYSICS), Set.of());
        call(session, "read_file", read("README.md", 0, 0));
        call(session, "write_file", write(PHYSICS, "a"));
        call(session, "append_note", Map.of("text", "biến a là 1"));

        call(session, "finish", Map.of("summary", "đã viết physics"));
        String notes = call(session, "read_file", read(NOTES, 0, 0)).path("content").asText();

        assertThat(notes).contains("## Lớp engine", "biến a là 1", "## Sổ cái của lớp engine", "Đã đọc: README.md", "Đã ghi: " + PHYSICS, "đã xong — đã viết physics");
        assertThat(notes.indexOf("## Lớp engine")).isLessThan(notes.indexOf("## Sổ cái của lớp engine"));
        assertThat(session.state().notes()).isEqualTo(1);
    }

    @Test
    void finishingTwiceDoesNotAddTheLedgerTwice() throws Exception {
        var session = session(Set.of(PHYSICS), Set.of());
        call(session, "write_file", write(PHYSICS, "a"));
        call(session, "append_note", Map.of("text", "ghi chú"));

        call(session, "finish", Map.of("summary", "xong"));
        JsonNode again = call(session, "finish", Map.of("summary", "xong lần nữa"));
        String notes = store.read(NOTES).orElseThrow();

        assertThat(again.path("success").asBoolean()).isTrue();
        assertThat(notes.split("## Sổ cái của lớp engine", -1)).hasSize(2);
        assertThat(session.state().summary()).isEqualTo("xong");
    }

    @Test
    void theLedgerDoesNotUseUpTheNoteBudget() throws Exception {
        var session = session(new CodeSession.Limits(60, 30, 1, 120_000, 20_000), Set.of(PHYSICS), Set.of());
        call(session, "write_file", write(PHYSICS, "a"));
        call(session, "append_note", Map.of("text", "ghi chú duy nhất"));

        assertThat(call(session, "finish", Map.of("summary", "xong")).path("success").asBoolean()).isTrue();
        assertThat(store.read(NOTES).orElseThrow()).contains("ghi chú duy nhất", "## Sổ cái của lớp engine");
    }

    @Test
    void anExhaustedBudgetAnswersInsteadOfThrowing() throws Exception {
        seed("README.md", "x\n");
        var session = session(new CodeSession.Limits(2, 1, 1, 120_000, 20_000), Set.of(PHYSICS), Set.of());

        call(session, "read_file", read("README.md", 0, 0));
        call(session, "list_files", Map.of("folder", ""));
        assertThat(call(session, "search", Map.of("query", "x", "folder", "")).path("message").asText()).contains("TOOL_BUDGET_EXCEEDED");

        assertThat(call(session, "write_file", write(PHYSICS, "a")).path("success").asBoolean()).isTrue();
        assertThat(call(session, "write_file", write(PHYSICS, "b")).path("message").asText()).contains("TOOL_BUDGET_EXCEEDED");
        call(session, "append_note", Map.of("text", "một"));
        assertThat(call(session, "append_note", Map.of("text", "hai")).path("message").asText()).contains("TOOL_BUDGET_EXCEEDED");
        assertThat(session.state().reads()).isEqualTo(2);
    }

    @Test
    void theLedgerRemembersWhatWasReadAndWritten() throws Exception {
        seed("README.md", "x\n");
        var session = session(Set.of(PHYSICS), Set.of());

        call(session, "read_file", read("README.md", 0, 0));
        call(session, "write_file", write(PHYSICS, "a"));

        assertThat(session.ledger()).contains("Sổ cái của lớp engine", "Đã đọc: README.md", "Đã ghi: " + PHYSICS, "chưa xong");
        assertThat(List.of(session.state().reads(), session.state().writes())).containsExactly(1, 1);
    }
}
