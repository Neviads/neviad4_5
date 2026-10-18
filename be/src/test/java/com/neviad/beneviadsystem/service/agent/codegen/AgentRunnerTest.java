package com.neviad.beneviadsystem.service.agent.codegen;

import com.neviad.beneviadsystem.infrastructure.ai.AiClient;
import com.neviad.beneviadsystem.infrastructure.ai.AiGenerationResult;
import com.neviad.beneviadsystem.infrastructure.ai.StructuredOutputSpec;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.function.FunctionToolCallback;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;

/** The runner knows nothing of experiments: a spec made of plain strings is enough. */
class AgentRunnerTest {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String NOTES = "_notes/x.md";
    private static final String FILE = "objects/x.ts";
    private static final String DONE = "{\"status\":\"PASSED\",\"summary\":\"xong\"}";

    private static final class MemoryStore implements CodeStore {
        final Map<String, String> files = new LinkedHashMap<>();
        @Override public Optional<String> read(String path) { return Optional.ofNullable(files.get(path)); }
        @Override public void write(String path, String content) { files.put(path, content); }
        @Override public boolean exists(String path) { return files.containsKey(path); }
        @Override public List<String> list(String folder) { return files.keySet().stream().filter(p -> p.startsWith(folder)).sorted().toList(); }
        @Override public void appendNote(String path, String text) { files.merge(path, text, String::concat); }
        @Override public void checkPath(String path, boolean forWrite) { }
    }

    interface Script { void run(List<ToolCallback> tools) throws Exception; }

    private static final class ScriptedModel implements AiClient {
        final List<Script> rounds;
        final List<String> prompts = new ArrayList<>();
        final List<Integer> budgets = new ArrayList<>();
        ScriptedModel(Script... rounds) { this.rounds = List.of(rounds); }
        @Override public String generate(String prompt) { throw new UnsupportedOperationException(); }
        @Override public AiGenerationResult generateWithTools(String prompt, List<ToolCallback> tools, StructuredOutputSpec spec, int maxToolCalls) {
            prompts.add(prompt);
            budgets.add(maxToolCalls);
            try {
                rounds.get(Math.min(prompts.size(), rounds.size()) - 1).run(tools);
            } catch (RuntimeException exception) {
                throw exception;
            } catch (Exception exception) {
                throw new IllegalStateException(exception);
            }
            return new AiGenerationResult(DONE, "test", "test");
        }
    }

    private static String call(List<ToolCallback> tools, String name, Map<String, Object> input) throws Exception {
        return tools.stream().filter(t -> name.equals(t.getToolDefinition().name())).findFirst().orElseThrow().call(MAPPER.writeValueAsString(input));
    }

    private static void writeNoteAndFinish(List<ToolCallback> tools) throws Exception {
        call(tools, "write_file", Map.of("path", FILE, "content", "const make = () => 1;"));
        call(tools, "append_note", Map.of("text", "đã viết"));
        call(tools, "finish", Map.of("summary", "xong"));
    }

    record CheckInput(String path) { }

    private static ToolCallback checkTool(List<String> seen) {
        return FunctionToolCallback.builder("check_file", (Function<CheckInput, String>) input -> { seen.add(input.path()); return "ok"; })
                .description("test tool").inputType(CheckInput.class).build();
    }

    @Test
    void aSpecOfPlainStringsRunsTheAgentToTheEnd() {
        var store = new MemoryStore();
        var model = new ScriptedModel(AgentRunnerTest::writeNoteAndFinish);

        var outcome = new AgentRunner(model).run(AgentSpec.of("SYSTEM", "# Nhiệm vụ\nviết vật", "object", NOTES, Set.of(FILE), Set.of()), store);

        assertThat(outcome.status()).isEqualTo("finished");
        assertThat(outcome.rounds()).isEqualTo(1);
        assertThat(outcome.files()).containsExactly(FILE);
        assertThat(outcome.summary()).isEqualTo("xong");
        assertThat(store.files).containsKey(FILE);
        assertThat(model.prompts.getFirst()).startsWith("SYSTEM").contains("viết vật");
        assertThat(model.budgets.getFirst()).isEqualTo(60 + 30 + 20 + 10);
    }

    @Test
    void aRoundThatDoesNotFinishIsFollowedByOneThatIsHandedTheLedgerAndTheHint() {
        var model = new ScriptedModel(
                tools -> call(tools, "write_file", Map.of("path", FILE, "content", "const make = () => 1;")),
                AgentRunnerTest::writeNoteAndFinish);
        var spec = new AgentSpec("SYSTEM", "TASK", "object", NOTES, Set.of(FILE), Set.of(), null, "HINT CUA TOI", null, 0, null, null, true);

        var outcome = new AgentRunner(model).run(spec, new MemoryStore());

        assertThat(outcome.status()).isEqualTo("finished");
        assertThat(outcome.rounds()).isEqualTo(2);
        assertThat(model.prompts.get(1)).contains("TASK", "KHÔNG nhớ lượt trước", "Đã ghi: " + FILE, "HINT CUA TOI");
    }

    @Test
    void aRoundThatFailsToCallTheModelIsReportedWithItsReasonAndToTheListenerAsItHappens() {
        var told = new ArrayList<String>();
        var listener = new CodeSession.Listener() {
            @Override public void started(String tool) { told.add(tool + "|started|"); }
            @Override public void finished(String tool, boolean success, String message) { told.add(tool + "|" + success + "|" + message); }
        };
        var model = new ScriptedModel(
                tools -> { throw new RuntimeException("openai responses call failed", new java.io.IOException("Connection reset")); },
                AgentRunnerTest::writeNoteAndFinish);
        var spec = new AgentSpec("SYSTEM", "TASK", "object", NOTES, Set.of(FILE), Set.of(), null, null, null, 0, null, listener, true);

        var outcome = new AgentRunner(model).run(spec, new MemoryStore());

        assertThat(outcome.status()).isEqualTo("finished");
        assertThat(outcome.failures()).singleElement().asString().contains("Lượt 1 lỗi khi gọi model", "RuntimeException: openai responses call failed", "IOException: Connection reset");
        assertThat(told).contains("gọi model · lượt 1|false|" + outcome.failures().getFirst(), "gọi model · lượt 2|true|0 giây");
        assertThat(told.getFirst()).isEqualTo("gọi model · lượt 1|started|");
    }

    @Test
    void theStreamedArgumentsBecomeProgressLinesThatNameTheFileAndCountTheCharacters() {
        var lines = new ArrayList<String>();
        var progress = new AgentRunner.Progress(new CodeSession.Listener() {
            @Override public void progress(String tool, String message) { lines.add(tool + "|" + message); }
        });

        progress.onToolCallStarted("write_file");
        progress.onToolArgumentsDelta("write_file", "{\"path\":\"engines/x/physics.ts\",\"content\":\"");
        progress.onToolArgumentsDelta("write_file", "const a = 1;");
        progress.onToolCallFinished("write_file");

        assertThat(lines).containsExactly("write_file|model bắt đầu viết", "write_file|engines/x/physics.ts · 54 ký tự (đã nhận đủ)");
    }

    @Test
    void extraToolsAreOfferedAndCountedInTheBudgetAndTheFinishGateCanRefuse() {
        var seen = new ArrayList<String>();
        var gateAsked = new ArrayList<Integer>();
        CodeSession.FinishGate gate = session -> {
            gateAsked.add(1);
            return seen.isEmpty() ? Optional.of("hãy gọi check_file trước") : Optional.empty();
        };
        var refusal = new ArrayList<String>();
        var model = new ScriptedModel(tools -> {
            call(tools, "write_file", Map.of("path", FILE, "content", "const make = () => 1;"));
            call(tools, "append_note", Map.of("text", "đã viết"));
            refusal.add(call(tools, "finish", Map.of("summary", "sớm")));
            call(tools, "check_file", Map.of("path", FILE));
            call(tools, "finish", Map.of("summary", "xong"));
        });
        var spec = new AgentSpec("SYSTEM", "TASK", "object", NOTES, Set.of(FILE), Set.of(), null, null, List.of(checkTool(seen)), 5, gate, null, true);

        var outcome = new AgentRunner(model).run(spec, new MemoryStore());

        assertThat(outcome.status()).isEqualTo("finished");
        assertThat(refusal.getFirst()).contains("NOT_DONE", "hãy gọi check_file trước");
        assertThat(seen).containsExactly(FILE);
        assertThat(gateAsked).hasSize(2);
        assertThat(model.budgets.getFirst()).isEqualTo(60 + 30 + 20 + 10 + 5);
    }
}
