package com.neviad.beneviadsystem.service.agent.codegen;

import com.neviad.beneviadsystem.infrastructure.ai.AiClient;
import com.neviad.beneviadsystem.infrastructure.ai.AiGenerationResult;
import com.neviad.beneviadsystem.infrastructure.ai.StructuredOutputSpec;
import com.neviad.beneviadsystem.service.agent.impl.ScenarioAgent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.ToolCallback;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class CodeAgentServiceTest {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String DONE = "{\"status\":\"PASSED\",\"summary\":\"xong\"}";
    private static final List<String> ENGINE_FILES = List.of("engines/va-cham/engine.ts");

    interface Script { String run(List<ToolCallback> tools, String system, String user) throws Exception; }

    /** A model that is a script calling the real tool callbacks; each model round consumes the next script. */
    private static final class ScriptedModel implements AiClient {
        final List<Script> rounds;
        final List<String> systems = new ArrayList<>();
        final List<String> users = new ArrayList<>();
        final List<Integer> budgets = new ArrayList<>();
        ScriptedModel(Script... rounds) { this.rounds = List.of(rounds); }
        @Override public String generate(String prompt) { throw new UnsupportedOperationException(); }
        @Override public AiGenerationResult generateWithTools(String prompt, List<ToolCallback> tools, StructuredOutputSpec spec, int maxToolCalls) {
            // The service builds an AiRequest with a system prompt; the default generate(AiRequest) flattens it as "system\n\nuser".
            int split = prompt.indexOf("# Nhiệm vụ");
            systems.add(prompt.substring(0, split));
            users.add(prompt.substring(split));
            budgets.add(maxToolCalls);
            try {
                return new AiGenerationResult(rounds.get(Math.min(users.size(), rounds.size()) - 1).run(tools, systems.getLast(), users.getLast()), "test", "test");
            } catch (RuntimeException exception) {
                throw exception;
            } catch (Exception exception) {
                throw new IllegalStateException(exception);
            }
        }
    }

    private static String call(List<ToolCallback> tools, String name, Map<String, Object> input) throws Exception {
        return tools.stream().filter(t -> name.equals(t.getToolDefinition().name())).findFirst().orElseThrow().call(MAPPER.writeValueAsString(input));
    }

    private static JsonNode json(String text) throws Exception { return MAPPER.readTree(text); }

    private FakeBrowserBridge browser;
    private CodeAgentService.Request request;

    @BeforeEach
    void setUp() {
        browser = new FakeBrowserBridge();
        browser.files.put("README.md", "khung");
        for (String file : CodeAgentService.TEMPLATE_FILES) browser.files.put(file, "// mẫu " + file);
        var scenario = new ScenarioAgent.Scenario("Hai xe va chạm.", List.of("p = m·v"), List.of(new ScenarioAgent.Phase("Tiến lại", "Hai xe chạy vào nhau")),
                "Xe 1 bên trái, xe 2 bên phải.", List.of("vận tốc đầu"), List.of("vị trí"), List.of("bỏ qua ma sát"),
                List.of(new ScenarioAgent.ObjectGeometry("leftCar", 2.0, 1.3, "tâm đáy, chạm sàn", List.of(new ScenarioAgent.NamedPoint("frontEdge", "mép cản trước")),
                        List.of(new ScenarioAgent.MovingPart("frontWheel", "rotate", "", 0, 360, "bánh trước")))));
        var car = new CodeAgentService.ObjectInfo("leftCar", "Ô tô trái", "objects/va-cham-1.ts", "makeLeftCar", "đã vẽ xong");
        request = new CodeAgentService.Request("run-1", "va-cham", "2 ô tô đâm nhau", scenario, List.of(car));
    }

    private CodeAgentService service(ScriptedModel model) {
        return new CodeAgentService(model, runId -> new BridgedCodeStore(browser, runId));
    }

    private static void readTheRequiredFiles(List<ToolCallback> tools) throws Exception {
        call(tools, "read_file", Map.of("path", "README.md", "offset", 0, "limit", 0));
        for (String file : CodeAgentService.TEMPLATE_FILES) call(tools, "read_file", Map.of("path", file, "offset", 0, "limit", 0));
    }

    private static void writeAllEngineFiles(List<ToolCallback> tools) throws Exception {
        for (String file : ENGINE_FILES) call(tools, "write_file", Map.of("path", file, "content", "export const x = 1; // " + file));
    }

    @Test
    void anAgentThatReadsWritesNotesAndFinishesLeavesTheEngineInTheBrowserCopy() throws Exception {
        var model = new ScriptedModel((tools, system, user) -> {
            readTheRequiredFiles(tools);
            writeAllEngineFiles(tools);
            call(tools, "append_note", Map.of("text", "biến v1 là vận tốc; dof.leftCar.position = x1"));
            assertThat(json(call(tools, "finish", Map.of("summary", "đã viết engine"))).path("success").asBoolean()).isTrue();
            return DONE;
        });

        var result = service(model).runEngine(request);

        assertThat(result.status()).isEqualTo("finished");
        assertThat(result.rounds()).isEqualTo(1);
        assertThat(result.files()).containsExactlyElementsOf(ENGINE_FILES);
        assertThat(result.summary()).isEqualTo("đã viết engine");
        assertThat(browser.files.keySet()).containsAll(ENGINE_FILES);
        assertThat(browser.files.get("_notes/va-cham.md")).contains("## Lớp engine", "biến v1 là vận tốc", "## Sổ cái của lớp engine");
        assertThat(result.notesPath()).isEqualTo("_notes/va-cham.md");
    }

    @Test
    void theTaskCarriesTheScenarioAndTheObjectInterfaceButNotTheirCode() {
        var model = new ScriptedModel((tools, system, user) -> DONE);

        service(model).runEngine(request);

        assertThat(model.systems.getFirst()).contains("engines/va-cham/engine.ts", "VaCham", "vaCham", "VA_CHAM").doesNotContain("{{");
        assertThat(model.users.getFirst()).contains("2 ô tô đâm nhau", "p = m·v", "Tiến lại", "Xe 1 bên trái", "bỏ qua ma sát")
                .contains("id `leftCar`", "objects/va-cham-1.ts", "makeLeftCar", "rộng 2 m, cao 1.3 m", "Điểm neo: tâm đáy, chạm sàn", "Điểm `frontEdge`", "Bộ phận `frontWheel`: quay")
                .contains("engines/va-cham/engine.ts", "engines/template-experiment/engine.ts", "README.md");
    }

    @Test
    void theAgentCannotWriteBeforeItHasReadAndCannotWriteOutsideItsFiles() throws Exception {
        var seen = new ArrayList<String>();
        var model = new ScriptedModel((tools, system, user) -> {
            seen.add(call(tools, "write_file", Map.of("path", ENGINE_FILES.get(0), "content", "x")));
            readTheRequiredFiles(tools);
            seen.add(call(tools, "write_file", Map.of("path", "renderers/va-cham/va-cham-scene.tsx", "content", "x")));
            return DONE;
        });

        service(model).runEngine(request);

        assertThat(seen.get(0)).contains("MUST_READ_FIRST");
        assertThat(seen.get(1)).contains("PATH_NOT_ALLOWED");
        assertThat(browser.files).doesNotContainKey("renderers/va-cham/va-cham-scene.tsx");
    }

    @Test
    void aRoundThatDoesNotFinishIsFollowedByOneThatIsToldWhatHappened() throws Exception {
        var model = new ScriptedModel(
                (tools, system, user) -> {
                    readTheRequiredFiles(tools);
                    call(tools, "write_file", Map.of("path", ENGINE_FILES.get(0), "content", "export const x = 1;"));
                    call(tools, "append_note", Map.of("text", "mới viết physics"));
                    return DONE; // claims to be done without calling finish
                },
                (tools, system, user) -> {
                    writeAllEngineFiles(tools);
                    assertThat(json(call(tools, "finish", Map.of("summary", "xong ở lượt hai"))).path("success").asBoolean()).isTrue();
                    return DONE;
                });

        var result = service(model).runEngine(request);

        assertThat(result.status()).isEqualTo("finished");
        assertThat(result.rounds()).isEqualTo(2);
        assertThat(model.users.get(1)).contains("KHÔNG nhớ lượt trước", "CHƯA gọi `finish`", "Đã ghi: " + ENGINE_FILES.get(0), "mới viết physics");
        assertThat(model.users.get(1)).startsWith(model.users.get(0));
    }

    @Test
    void whatTheModelClaimsDoesNotCountOnlyTheSessionDoes() {
        var model = new ScriptedModel((tools, system, user) -> DONE);

        var result = service(model).runEngine(request);

        assertThat(result.status()).isEqualTo("unfinished");
        assertThat(result.rounds()).isEqualTo(CodeAgentService.MAX_ROUNDS);
        assertThat(result.files()).isEmpty();
    }

    @Test
    void aRoundThatCrashesDoesNotLoseTheNextOne() throws Exception {
        var model = new ScriptedModel(
                (tools, system, user) -> { throw new IllegalStateException("nhà cung cấp lỗi"); },
                (tools, system, user) -> {
                    readTheRequiredFiles(tools);
                    writeAllEngineFiles(tools);
                    call(tools, "append_note", Map.of("text", "ghi chú"));
                    call(tools, "finish", Map.of("summary", "xong"));
                    return DONE;
                });

        var result = service(model).runEngine(request);

        assertThat(result.status()).isEqualTo("finished");
        assertThat(result.rounds()).isEqualTo(2);
    }

    @Test
    void theToolCallBudgetCoversEveryBudgetOfTheSession() {
        var model = new ScriptedModel((tools, system, user) -> DONE);

        service(model).runEngine(request);

        var limits = CodeSession.Limits.defaults();
        assertThat(model.budgets.getFirst()).isGreaterThan(limits.maxReads() + limits.maxWrites() + limits.maxNotes());
    }

    @Test
    void aSlugThatIsNotValidIsRefusedBeforeTheModelIsCalled() {
        var model = new ScriptedModel((tools, system, user) -> DONE);
        var bad = new CodeAgentService.Request("run-1", "Va Cham!", request.request(), request.scenario(), request.objects());

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service(model).runEngine(bad)).isInstanceOf(IllegalArgumentException.class);
        assertThat(model.users).isEmpty();
    }

    // ---- the renderer and experiment layers: what the earlier layers left in the copy is what they read

    private static final List<String> RENDERER_FILES = List.of("renderers/va-cham/view-constants.ts", "renderers/va-cham/va-cham-scene.tsx");
    private static final List<String> EXPERIMENT_FILES = List.of("experiments/VaChamExperiment.tsx", "presets/va-cham.ts");

    private void seedAfterTheEngine() {
        browser.files.put("renderers/template-experiment/view-constants.ts", "// mẫu view");
        browser.files.put("renderers/template-experiment/template-experiment-scene.tsx", "// mẫu cảnh");
        browser.files.put("renderers/hydraulic-lift/hydraulic-lift-scene.tsx", "// ví dụ đầy đủ");
        browser.files.put("shared/view-transform.ts", "export const createViewTransform = 1;");
        browser.files.put("objects/types.ts", "export type SmartObject = unknown;");
        browser.files.put("engines/va-cham/engine.ts", "export const engine = 1;");
        browser.files.put("_notes/va-cham.md", "## Lớp engine\nbiến v1 là vận tốc; dof.leftCar.position = x1\n");
    }

    /** What a model that does as it is told does: list everything, read all of it. */
    private static void readEverything(List<ToolCallback> tools) throws Exception {
        for (JsonNode item : json(call(tools, "list_files", Map.of("folder", ""))).path("items")) {
            call(tools, "read_file", Map.of("path", item.asText(), "offset", 0, "limit", 0));
        }
    }

    @Test
    void theRendererLayerReadsWhatTheEngineLeftAndWritesOnlyItsTwoFiles() throws Exception {
        seedAfterTheEngine();
        var seen = new ArrayList<String>();
        var model = new ScriptedModel((tools, system, user) -> {
            seen.add(call(tools, "write_file", Map.of("path", RENDERER_FILES.get(1), "content", "x")));
            readEverything(tools);
            seen.add(call(tools, "write_file", Map.of("path", ENGINE_FILES.get(0), "content", "x")));
            for (String file : RENDERER_FILES) call(tools, "write_file", Map.of("path", file, "content", "export const x = 1; // " + file));
            call(tools, "append_note", Map.of("text", "Scene nhận dof.leftCar.position"));
            call(tools, "finish", Map.of("summary", "đã viết renderer"));
            return DONE;
        });

        var result = service(model).run(CodeLayer.RENDERER, request);

        assertThat(seen.get(0)).contains("MUST_READ_FIRST");
        assertThat(seen.get(1)).contains("PATH_NOT_ALLOWED");
        assertThat(result.status()).isEqualTo("finished");
        assertThat(result.files()).containsExactlyElementsOf(RENDERER_FILES);
        assertThat(model.systems.getFirst()).contains("RENDERER", "VaChamScene", "createViewTransform").doesNotContain("{{");
        assertThat(model.users.getFirst()).contains("tầng RENDERER", "Các tầng trước đã xong", "_notes/va-cham.md", "renderers/template-experiment/template-experiment-scene.tsx",
                "engines/va-cham/engine.ts", "- renderers/va-cham/va-cham-scene.tsx");
        assertThat(browser.files.get("_notes/va-cham.md")).contains("## Lớp engine", "## Lớp renderer", "Scene nhận dof", "## Sổ cái của lớp renderer");
    }

    @Test
    void theRendererMayReviseTheDraftObjectsButIsNotRequiredTo() throws Exception {
        seedAfterTheEngine();
        browser.files.put("objects/va-cham-1.ts", "// bản nháp của vật");
        var model = new ScriptedModel((tools, system, user) -> {
            readEverything(tools);
            for (String file : RENDERER_FILES) call(tools, "write_file", Map.of("path", file, "content", "x"));
            call(tools, "append_note", Map.of("text", "ghi chú"));
            call(tools, "finish", Map.of("summary", "xong mà không sửa vật"));
            return DONE;
        });
        var result = service(model).run(CodeLayer.RENDERER, request);
        assertThat(result.status()).isEqualTo("finished");
        assertThat(model.users.getFirst()).contains("BẢN THAM KHẢO", "- objects/va-cham-1.ts");

        var revising = new ScriptedModel((tools, system, user) -> {
            readEverything(tools);
            call(tools, "write_file", Map.of("path", "objects/va-cham-1.ts", "content", "// đã sửa"));
            for (String file : RENDERER_FILES) call(tools, "write_file", Map.of("path", file, "content", "x"));
            call(tools, "append_note", Map.of("text", "đã bỏ chấm vẽ cứng khỏi vật"));
            call(tools, "finish", Map.of("summary", "xong"));
            return DONE;
        });
        var revised = service(revising).run(CodeLayer.RENDERER, request);
        assertThat(revised.status()).isEqualTo("finished");
        assertThat(revised.files()).contains("objects/va-cham-1.ts");
    }

    @Test
    void aSampleMissingFromTheCopyDoesNotBlockTheLayerForGood() throws Exception {
        seedAfterTheEngine();
        browser.files.remove("renderers/hydraulic-lift/hydraulic-lift-scene.tsx");
        var model = new ScriptedModel((tools, system, user) -> {
            readEverything(tools);
            for (String file : RENDERER_FILES) call(tools, "write_file", Map.of("path", file, "content", "x"));
            call(tools, "append_note", Map.of("text", "ghi chú"));
            call(tools, "finish", Map.of("summary", "xong"));
            return DONE;
        });

        var result = service(model).run(CodeLayer.RENDERER, request);

        assertThat(result.status()).isEqualTo("finished");
        assertThat(model.users.getFirst()).doesNotContain("- renderers/hydraulic-lift/hydraulic-lift-scene.tsx");
    }

    @Test
    void theExperimentLayerWritesItsFilesAndEditsTheTwoFilesThatRegisterAPreset() throws Exception {
        seedAfterTheEngine();
        browser.files.put("renderers/va-cham/va-cham-scene.tsx", "export function VaChamScene() { return null; }");
        browser.files.put("experiments/TemplateExperiment.tsx", "// mẫu trang");
        browser.files.put("presets/template-experiment.ts", "// mẫu preset");
        browser.files.put("presets/types.ts", "export type Preset = HydraulicLiftPreset;");
        browser.files.put("presets/index.ts", "export const PRESETS: Preset[] = [hydraulicLiftPreset];");
        browser.files.put("shared/param-panel.tsx", "export type ParamDef = {};");
        var seen = new ArrayList<String>();
        var model = new ScriptedModel((tools, system, user) -> {
            readEverything(tools);
            for (String file : EXPERIMENT_FILES) call(tools, "write_file", Map.of("path", file, "content", "export const x = 1; // " + file));
            seen.add(call(tools, "edit_file", Map.of("path", "presets/types.ts", "expectedText", "export type Preset = HydraulicLiftPreset;",
                    "replacement", "export type Preset = HydraulicLiftPreset | VaChamPreset;")));
            seen.add(call(tools, "edit_file", Map.of("path", "presets/index.ts", "expectedText", "[hydraulicLiftPreset]", "replacement", "[hydraulicLiftPreset, vaChamPreset]")));
            seen.add(call(tools, "write_file", Map.of("path", "engines/va-cham/engine.ts", "content", "x")));
            call(tools, "append_note", Map.of("text", "preset va-cham có hai tham số"));
            call(tools, "finish", Map.of("summary", "đã viết experiment"));
            return DONE;
        });

        var result = service(model).run(CodeLayer.EXPERIMENT, request);

        assertThat(result.status()).isEqualTo("finished");
        assertThat(result.files()).contains(EXPERIMENT_FILES.get(0), EXPERIMENT_FILES.get(1), "presets/types.ts", "presets/index.ts");
        assertThat(seen.get(0)).contains("\"success\":true");
        assertThat(seen.get(2)).contains("PATH_NOT_ALLOWED");
        assertThat(browser.files.get("presets/types.ts")).contains("VaChamPreset");
        assertThat(browser.files.get("presets/index.ts")).contains("vaChamPreset");
        assertThat(model.systems.getFirst()).contains("EXPERIMENT", "VaChamExperiment", "vaChamPreset").doesNotContain("{{");
        assertThat(model.users.getFirst()).contains("tầng EXPERIMENT", "- presets/types.ts", "- presets/index.ts", "experiments/TemplateExperiment.tsx");
    }

    @Test
    void everyLayerNamesItself() {
        assertThat(CodeLayer.parse("engine")).isEqualTo(CodeLayer.ENGINE);
        assertThat(CodeLayer.parse("renderer")).isEqualTo(CodeLayer.RENDERER);
        assertThat(CodeLayer.parse("experiment")).isEqualTo(CodeLayer.EXPERIMENT);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> CodeLayer.parse("physics")).isInstanceOf(IllegalArgumentException.class);
    }
}
