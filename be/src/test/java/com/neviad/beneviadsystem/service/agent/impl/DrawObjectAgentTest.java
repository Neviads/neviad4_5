package com.neviad.beneviadsystem.service.agent.impl;

import com.neviad.beneviadsystem.infrastructure.ai.AiClient;
import com.neviad.beneviadsystem.infrastructure.ai.AiGenerationResult;
import com.neviad.beneviadsystem.infrastructure.ai.StructuredOutputSpec;
import com.neviad.beneviadsystem.service.agent.codegen.AgentActivity;
import com.neviad.beneviadsystem.service.agent.codegen.BridgedCodeStore;
import com.neviad.beneviadsystem.service.agent.codegen.FakeBrowserBridge;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.ToolCallback;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class DrawObjectAgentTest {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String DONE = "{\"status\":\"PASSED\",\"summary\":\"xong\"}";
    private static final String CODE = "const makeLift = () => 1;";
    private static final DrawObjectAgent.DrawObjectRequest REQUEST = new DrawObjectAgent.DrawObjectRequest("Máy nâng", "mô tả, điểm neo ở đáy", "đầu vào: pumpStroke. Đầu ra: height. Port: handle.");

    interface Script { void run(List<ToolCallback> tools) throws Exception; }

    /** A model that is a script calling the real tool callbacks; each round consumes the next script (the last one repeats). */
    private static final class ScriptedModel implements AiClient {
        final List<Script> rounds;
        final List<String> prompts = new ArrayList<>();
        ScriptedModel(Script... rounds) { this.rounds = List.of(rounds); }
        @Override public String generate(String prompt) { throw new UnsupportedOperationException(); }
        @Override public AiGenerationResult generateWithTools(String prompt, List<ToolCallback> tools, StructuredOutputSpec spec, int maxToolCalls) {
            prompts.add(prompt);
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

    private FakeBrowserBridge browser;
    private String codePath;
    private final List<JsonNode> validated = new ArrayList<>();
    private final List<AgentActivity> steps = new ArrayList<>();

    @BeforeEach
    void setUp() {
        browser = new FakeBrowserBridge();
    }

    private static String call(List<ToolCallback> tools, String name, Map<String, Object> input) throws Exception {
        return tools.stream().filter(t -> name.equals(t.getToolDefinition().name())).findFirst().orElseThrow().call(MAPPER.writeValueAsString(input));
    }

    private DrawObjectAgent agent(ScriptedModel model, List<List<String>> problemsPerCheck) {
        List<Integer> checks = new ArrayList<>();
        DrawObjectValidator validator = answer -> {
            validated.add(answer.deepCopy());
            List<String> problems = problemsPerCheck.get(Math.min(checks.size(), problemsPerCheck.size() - 1));
            checks.add(1);
            JsonNode meta = problems.isEmpty() ? declared() : null;
            return new DrawObjectValidator.Validation(problems, problems.isEmpty() ? List.of("✓ chạy được") : List.of(), problems.isEmpty() ? CODE : null, meta);
        };
        return new DrawObjectAgent(model, validator, MAPPER, runId -> new BridgedCodeStore(browser, runId), steps::add);
    }

    private static JsonNode declared() {
        try {
            return MAPPER.readTree("{\"name\":\"makeLift\",\"inputs\":[{\"name\":\"pumpStroke\",\"label\":\"Hành trình\",\"unit\":\"m\",\"min\":0,\"max\":0.1,\"default\":0}],"
                    + "\"outputs\":[],\"ports\":[{\"name\":\"handle\"}]}");
        } catch (Exception impossible) {
            throw new IllegalStateException(impossible);
        }
    }

    /** The one file the agent was assigned, taken from the task it was given. */
    private void learnPath(ScriptedModel model) {
        String task = model.prompts.getLast();
        int first = task.indexOf("- _drawn/");
        codePath = task.substring(first + 2, task.indexOf('\n', first));
    }

    private void write(List<ToolCallback> tools, ScriptedModel model) throws Exception {
        learnPath(model);
        assertThat(call(tools, "describe_real_object", realObject("thân", "bánh", "cần bơm"))).contains("\"ok\":true");
        call(tools, "write_file", Map.of("path", codePath, "content", CODE));
    }

    /** A description of the real object that the describe step accepts, with one part per name. */
    static Map<String, Object> realObject(String... partNames) {
        List<Map<String, Object>> parts = new ArrayList<>();
        for (String name : partNames)
            parts.add(Map.of("name", name, "realShape", "đường bao bo tròn ở hai góc trên, cạnh dưới thẳng", "position", "nằm giữa, nối vào thân",
                    "proportion", "khoảng một phần ba bề ngang", "material", "kim loại sơn, bắt sáng ở mép trên", "details", "hai con ốc"));
        return Map.of("overall", "Một máy nâng thuỷ lực phòng thí nghiệm, khung thép sơn, dáng thấp và chắc, hai xi lanh đứng cạnh nhau.",
                "size", "dài khoảng 0,6 m, cao 0,4 m", "parts", parts, "viewNotes", "nhìn ngang, chỉ thấy mặt bên");
    }

    @Test
    void aDrawingThatRanAndWasFinishedIsOkWithoutAnyContractOrNote() {
        var holder = new AtomicReference<ScriptedModel>();
        var model = new ScriptedModel(tools -> {
            write(tools, holder.get());
            assertThat(call(tools, "check_object", Map.of("reason", "xong"))).contains("\"ok\":true");
            assertThat(call(tools, "finish", Map.of("summary", "xong"))).contains("\"success\":true");
        });
        holder.set(model);

        var result = agent(model, List.of(List.of())).generate(REQUEST, "run-1");

        assertThat(result.status()).isEqualTo("ok");
        assertThat(result.attempts()).isEqualTo(1);
        assertThat(result.name()).isEqualTo("makeLift");
        assertThat(result.code()).isEqualTo(CODE);
        assertThat(result.js()).isEqualTo(CODE);
        assertThat(result.inputs()).hasSize(1);
        assertThat(result.ports()).hasSize(1);
        assertThat(result.selfTests()).isEmpty();
        assertThat(result.selfTestReport()).containsExactly("✓ chạy được");
        assertThat(model.prompts.getFirst()).contains("Luật về hình", "đẹp và giống thật", "Vật thể: Máy nâng", "mô tả, điểm neo ở đáy", "chỉ để tham khảo");
        assertThat(model.prompts.getFirst()).doesNotContain("selfTests", "partAnchors", "30 px");
        assertThat(validated.getFirst().path("code").asText()).isEqualTo(CODE);
    }

    @Test
    void aFigureThatDeclaresNothingIsStillOk() {
        var holder = new AtomicReference<ScriptedModel>();
        var model = new ScriptedModel(tools -> {
            write(tools, holder.get());
            call(tools, "check_object", Map.of());
            call(tools, "finish", Map.of("summary", "xong"));
        });
        holder.set(model);
        DrawObjectValidator validator = answer -> new DrawObjectValidator.Validation(List.of(), List.of("✓"), CODE, MAPPER.createObjectNode().put("name", "makeBox"));

        var result = new DrawObjectAgent(model, validator, MAPPER, runId -> new BridgedCodeStore(browser, runId), null).generate(REQUEST, "run-1");

        assertThat(result.status()).isEqualTo("ok");
        assertThat(result.name()).isEqualTo("makeBox");
        assertThat(result.inputs()).isEmpty();
        assertThat(result.ports()).isEmpty();
    }

    private static ScenarioAgent.ObjectGeometry carGeometry() {
        return new ScenarioAgent.ObjectGeometry("car", 2.0, 1.3, "tâm đáy, chạm sàn",
                List.of(new ScenarioAgent.NamedPoint("frontEdge", "mép ngoài cùng của cản trước")),
                List.of(new ScenarioAgent.MovingPart("frontWheel", "rotate", "", 0, 360, "bánh trước quay")));
    }

    @Test
    void theGeometryTheScenarioFixedIsAFirmPartOfTheTaskAndIsSentToTheCheck() {
        var holder = new AtomicReference<ScriptedModel>();
        var model = new ScriptedModel(tools -> {
            write(tools, holder.get());
            assertThat(call(tools, "check_object", Map.of())).contains("\"ok\":true");
            call(tools, "finish", Map.of("summary", "xong"));
        });
        holder.set(model);
        var request = new DrawObjectAgent.DrawObjectRequest("Ô tô", "mô tả ô tô", "", carGeometry(), "");

        var result = agent(model, List.of(List.of())).generate(request, "run-1");

        assertThat(result.status()).isEqualTo("ok");
        assertThat(result.anchor()).isEqualTo("tâm đáy, chạm sàn");
        assertThat(model.prompts.getFirst()).contains("Hình học của vật (BẮT BUỘC", "rộng 2 m, cao 1.3 m", "tâm đáy, chạm sàn",
                "`frontEdge`: mép ngoài cùng của cản trước", "`frontWheel`: quay từ 0 đến 360 độ", "motion: \"rotate\"", "không có vật lý");
        JsonNode sent = validated.getFirst().path("geometry");
        assertThat(sent.path("width").asDouble()).isEqualTo(2.0);
        assertThat(sent.path("parts").get(0).path("name").asText()).isEqualTo("frontWheel");
    }

    @Test
    void aStillObjectIsToldItHasNoMovingPartAndWithoutAScenarioNothingIsMeasured() {
        var holder = new AtomicReference<ScriptedModel>();
        var model = new ScriptedModel(tools -> {
            write(tools, holder.get());
            call(tools, "check_object", Map.of());
            call(tools, "finish", Map.of("summary", "xong"));
        });
        holder.set(model);
        var foil = new ScenarioAgent.ObjectGeometry("foil", 0.01, 0.2, "tâm lá", List.of(), List.of());

        agent(model, List.of(List.of())).generate(new DrawObjectAgent.DrawObjectRequest("Lá vàng", "mô tả", "", foil, ""), "run-1");
        agent(model, List.of(List.of())).generate(REQUEST, "run-2");

        assertThat(model.prompts.getFirst()).contains("Bộ phận chuyển động: KHÔNG CÓ", "parts: {}", "Điểm có tên: không có");
        assertThat(model.prompts.getLast()).doesNotContain("## Hình học của vật");
        assertThat(validated.getLast().has("geometry")).isFalse();
    }

    @Test
    void theMeasuredSizeMovingPartsAndPointsOfTheCheckComeBackInTheResult() throws Exception {
        var holder = new AtomicReference<ScriptedModel>();
        var model = new ScriptedModel(tools -> {
            write(tools, holder.get());
            call(tools, "check_object", Map.of());
            call(tools, "finish", Map.of("summary", "xong"));
        });
        holder.set(model);
        JsonNode meta = MAPPER.readTree("{\"name\":\"makeCar\",\"size\":{\"width\":2.02,\"height\":1.28},"
                + "\"moving\":[{\"name\":\"frontWheel\",\"motion\":\"rotate\",\"axis\":\"\",\"min\":0,\"max\":360}],\"points\":[{\"name\":\"frontEdge\",\"x\":1.0,\"y\":-0.4}]}");
        DrawObjectValidator validator = answer -> new DrawObjectValidator.Validation(List.of(), List.of("✓"), CODE, meta);

        var result = new DrawObjectAgent(model, validator, MAPPER, runId -> new BridgedCodeStore(browser, runId), null)
                .generate(new DrawObjectAgent.DrawObjectRequest("Ô tô", "mô tả", "", carGeometry(), ""), "run-1");

        assertThat(result.status()).isEqualTo("ok");
        assertThat(result.size().path("width").asDouble()).isEqualTo(2.02);
        assertThat(result.moving()).hasSize(1);
        assertThat(result.points().get(0).path("name").asText()).isEqualTo("frontEdge");
    }

    @Test
    void theViewOfTheWholeSceneIsAFirmPartOfTheTaskOnlyWhenTheScenarioGaveOne() {
        var holder = new AtomicReference<ScriptedModel>();
        var model = new ScriptedModel(tools -> {
            write(tools, holder.get());
            call(tools, "check_object", Map.of());
            call(tools, "finish", Map.of("summary", "xong"));
        });
        holder.set(model);
        var request = new DrawObjectAgent.DrawObjectRequest("Lá vàng", "mô tả, điểm neo ở tâm lá", "", null, "Nhìn ngang; lá vàng thấy từ cạnh.");

        agent(model, List.of(List.of())).generate(request, "run-1");
        agent(model, List.of(List.of())).generate(REQUEST, "run-2");

        assertThat(model.prompts.getFirst()).contains("Góc nhìn chung của cả cảnh (BẮT BUỘC)", "Nhìn ngang; lá vàng thấy từ cạnh.");
        assertThat(model.prompts.getLast()).doesNotContain("## Góc nhìn chung của cả cảnh (BẮT BUỘC)");
    }


    @Test
    void aModelThatCannotBeCalledGivesAFailedResultWithTheReasonAndNeverOk() {
        var model = new ScriptedModel(tools -> { throw new RuntimeException("openai responses call failed", new java.io.IOException("Connection reset")); });

        var result = agent(model, List.of(List.of())).generate(REQUEST, "run-1");

        assertThat(result.status()).isEqualTo("failed");
        assertThat(result.problems()).hasSize(3).allSatisfy(p -> assertThat(p).contains("lỗi khi gọi model", "Connection reset"));
        assertThat(steps).anyMatch(s -> s.tool().startsWith("gọi model") && !s.success() && s.message().contains("Connection reset"));
        assertThat(steps.getLast().message()).startsWith("Chưa xong: Lượt 3");
    }

    @Test
    void aFailedCheckIsFixedWithTheAgentOwnToolsAndCheckedAgain() {
        var holder = new AtomicReference<ScriptedModel>();
        var model = new ScriptedModel(tools -> {
            write(tools, holder.get());
            assertThat(call(tools, "check_object", Map.of())).contains("lỗi cú pháp");
            call(tools, "edit_file", Map.of("path", codePath, "expectedText", "=> 1;", "replacement", "=> 2;"));
            assertThat(call(tools, "check_object", Map.of())).contains("\"ok\":true");
            call(tools, "finish", Map.of("summary", "xong"));
        });
        holder.set(model);

        var result = agent(model, List.of(List.of("lỗi cú pháp"), List.of())).generate(REQUEST, "run-1");

        assertThat(result.status()).isEqualTo("ok");
        assertThat(result.attempts()).isEqualTo(2);
        assertThat(result.code()).isEqualTo("const makeLift = () => 2;");
    }

    @Test
    void finishIsRefusedUntilTheAgentHasChecked() {
        var holder = new AtomicReference<ScriptedModel>();
        var refusal = new ArrayList<String>();
        var model = new ScriptedModel(tools -> {
            write(tools, holder.get());
            refusal.add(call(tools, "finish", Map.of("summary", "sớm")));
        });
        holder.set(model);

        var result = agent(model, List.of(List.of())).generate(REQUEST, "run-1");

        assertThat(refusal.getFirst()).contains("NOT_DONE", "chưa gọi check_object");
        assertThat(result.status()).isEqualTo("failed");
        assertThat(result.problems()).anyMatch(p -> p.contains("chưa xong"));
        assertThat(result.js()).isNull();
    }

    @Test
    void anEditAfterTheCheckMakesTheCheckStale() {
        var holder = new AtomicReference<ScriptedModel>();
        var refusal = new ArrayList<String>();
        var model = new ScriptedModel(tools -> {
            write(tools, holder.get());
            call(tools, "check_object", Map.of());
            call(tools, "edit_file", Map.of("path", codePath, "expectedText", "=> 1;", "replacement", "=> 2;"));
            refusal.add(call(tools, "finish", Map.of("summary", "sớm")));
            call(tools, "check_object", Map.of());
            call(tools, "finish", Map.of("summary", "xong"));
        });
        holder.set(model);

        var result = agent(model, List.of(List.of())).generate(REQUEST, "run-1");

        assertThat(refusal.getFirst()).contains("NOT_DONE", "sửa file sau lần check_object");
        assertThat(result.status()).isEqualTo("ok");
        assertThat(result.attempts()).isEqualTo(2);
    }

    @Test
    void aCodeThatNeverRunsIsFailedWithTheLastProblemsAndNoCodeToRun() {
        var holder = new AtomicReference<ScriptedModel>();
        var model = new ScriptedModel(tools -> {
            write(tools, holder.get());
            call(tools, "check_object", Map.of());
            call(tools, "finish", Map.of("summary", "dù sao"));
        });
        holder.set(model);

        var result = agent(model, List.of(List.of("Chạy hàm vẽ bị lỗi"))).generate(REQUEST, "run-1");

        assertThat(result.status()).isEqualTo("failed");
        assertThat(result.problems()).containsExactly("Chạy hàm vẽ bị lỗi");
        assertThat(result.js()).isNull();
        assertThat(result.code()).isEqualTo(CODE);
    }

    @Test
    void notesAreOptionalButAreCarriedWhenTheAgentWritesOne() {
        var holder = new AtomicReference<ScriptedModel>();
        var model = new ScriptedModel(tools -> {
            write(tools, holder.get());
            call(tools, "append_note", Map.of("text", "đầu vào dương là đi lên"));
            call(tools, "check_object", Map.of());
            call(tools, "finish", Map.of("summary", "xong"));
        });
        holder.set(model);

        var result = agent(model, List.of(List.of())).generate(REQUEST, "run-1");

        assertThat(result.status()).isEqualTo("ok");
        assertThat(result.notes()).contains("đầu vào dương là đi lên");
    }

    @Test
    void everyStepOfTheAgentIsPublishedForTheScreen() {
        var holder = new AtomicReference<ScriptedModel>();
        var model = new ScriptedModel(tools -> {
            write(tools, holder.get());
            call(tools, "check_object", Map.of());
            call(tools, "finish", Map.of("summary", "xong"));
        });
        holder.set(model);

        agent(model, List.of(List.of())).generate(REQUEST, "run-1");

        assertThat(steps).allSatisfy(step -> {
            assertThat(step.runId()).isEqualTo("run-1");
            assertThat(step.title()).isEqualTo("Máy nâng");
        });
        assertThat(steps.stream().map(AgentActivity::agent).distinct()).hasSize(1);
        assertThat(steps).extracting(AgentActivity::tool).contains("agent", "write_file", "check_object", "finish");
        assertThat(steps.getFirst().tool()).isEqualTo("agent");
        assertThat(steps.getFirst().phase()).isEqualTo(AgentActivity.STARTED);
        assertThat(steps.getLast().tool()).isEqualTo("agent");
        assertThat(steps.getLast().phase()).isEqualTo(AgentActivity.FINISHED);
        assertThat(steps.getLast().success()).isTrue();
    }

    @Test
    void codeIsRefusedUntilTheRealObjectIsDescribedWithEveryPartOfTheFrame() {
        var frame = List.of(new LiteSpecAgent.FramePart("Thân xe", "hộp dài bo góc", "giữa, trên hai bánh", "chiếm gần hết bề ngang"),
                new LiteSpecAgent.FramePart("Ca-bin", "vòm kính thấp", "trên thân, lệch về sau", "dài nửa thân"),
                new LiteSpecAgent.FramePart("Bánh xe", "tròn, lốp đen", "dưới thân, hai đầu", "cao một phần ba xe"));
        var request = new DrawObjectAgent.DrawObjectRequest("Ô tô", "mô tả ô tô", "", false, carGeometry(), "", frame);
        var holder = new AtomicReference<ScriptedModel>();
        var answers = new ArrayList<String>();
        var model = new ScriptedModel(tools -> {
            learnPath(holder.get());
            answers.add(call(tools, "write_file", Map.of("path", codePath, "content", CODE)));
            answers.add(call(tools, "describe_real_object", realObject("thân xe", "bánh trước", "bánh sau")));
            answers.add(call(tools, "describe_real_object", realObject("thân xe", "ca-bin", "bánh xe")));
            answers.add(call(tools, "write_file", Map.of("path", codePath, "content", CODE)));
            call(tools, "check_object", Map.of());
            call(tools, "finish", Map.of("summary", "xong"));
        });
        holder.set(model);

        var result = agent(model, List.of(List.of())).generate(request, "run-1");

        assertThat(answers.get(0)).contains("DESCRIBE_FIRST");
        assertThat(answers.get(1)).contains("\"ok\":false", "thiếu bộ phận 'Ca-bin' của khung");
        assertThat(answers.get(2)).contains("\"ok\":true");
        assertThat(answers.get(3)).contains("\"success\":true");
        assertThat(result.status()).isEqualTo("ok");
        assertThat(result.notes()).contains("Hình mẫu của vật (người vẽ tả trước khi code)", "**ca-bin**");
        assertThat(model.prompts.getFirst()).contains("Khung của vật", "**Ca-bin**: vòm kính thấp; trên thân, lệch về sau; dài nửa thân", "describe_real_object");
    }

    @Test
    void aThinDescriptionIsToldExactlyWhatIsMissing() {
        var thin = new DrawObjectAgent.DescribeInput("ngắn", "", List.of(new DrawObjectAgent.RealPart("thân", "hộp", "", "to", "sắt", "")), "");

        assertThat(DrawObjectAgent.describeProblems(thin, List.of())).anyMatch(p -> p.startsWith("overall"))
                .anyMatch(p -> p.startsWith("size")).anyMatch(p -> p.startsWith("viewNotes"))
                .anyMatch(p -> p.contains("'thân': realShape")).anyMatch(p -> p.contains("'thân': cần đủ position"));
        assertThat(DrawObjectAgent.describeProblems(new DrawObjectAgent.DescribeInput("ngắn", "", List.of(), ""), List.of()))
                .anyMatch(p -> p.startsWith("parts: có 0 bộ phận"));
    }

    @Test
    void aParticleWithOnePartAndNoMaterialIsAFullDescription() {
        var neutron = new DrawObjectAgent.DescribeInput(
                "Neutron theo hình minh hoạ quen thuộc trong sách: một quả cầu nhỏ màu xám bạc, có khối nhờ ánh sáng từ trên-trái.",
                "Cỡ mô hình bằng khoảng một phần năm hạt nhân uranium trong cảnh",
                List.of(new DrawObjectAgent.RealPart("quả cầu", "tròn đều, mép mịn, phồng đều mọi phía", "là toàn bộ vật", "chính là cả vật", "", "")),
                "nhìn từ bên, thấy một hình tròn");

        assertThat(DrawObjectAgent.describeProblems(neutron, List.of(new LiteSpecAgent.FramePart("quả cầu", "tròn", "toàn bộ", "cả vật")))).isEmpty();
        assertThat(DrawObjectAgent.describeNote(neutron)).contains("Hình mẫu của vật", "**quả cầu**").doesNotContain("; ;");
    }

    @Test
    void theStyleAgreedWithTheTeacherReachesTheDrawerAndTheJudge() {
        var request = new DrawObjectAgent.DrawObjectRequest("Con lắc", "con lắc đơn treo trên giá", "", false, null, "", List.of(), " Sơ đồ SGK, nét phẳng ");

        assertThat(request.style()).isEqualTo("Sơ đồ SGK, nét phẳng");
        assertThat(DrawObjectAgent.styleSection(request.style())).contains("Phong cách hình đã chốt với giáo viên", "Sơ đồ SGK, nét phẳng");
        assertThat(DrawObjectAgent.styleSection("")).isEmpty();
        assertThat(ModelDrawObjectJudge.describe(request)).contains("Phong cách hình đã chốt với giáo viên: Sơ đồ SGK, nét phẳng");
        assertThat(ModelDrawObjectJudge.describe(new DrawObjectAgent.DrawObjectRequest("Con lắc", "con lắc", ""))).doesNotContain("Phong cách");
    }

    @Test
    void aBrowserThatIsNotThereIsAFailedResultNotACrash() {
        browser.down = true;

        var result = agent(new ScriptedModel(tools -> { }), List.of(List.of())).generate(REQUEST, "run-1");

        assertThat(result.status()).isEqualTo("failed");
        assertThat(result.problems().getFirst()).contains("Agent không chạy được");
    }
}
