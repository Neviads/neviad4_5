package com.neviad.beneviadsystem.service.agent.impl;

import com.neviad.beneviadsystem.infrastructure.ai.AiClient;
import com.neviad.beneviadsystem.infrastructure.ai.AiGenerationResult;
import com.neviad.beneviadsystem.infrastructure.ai.StructuredOutputSpec;
import com.neviad.beneviadsystem.infrastructure.ai.ToolImageSource;
import com.neviad.beneviadsystem.service.agent.codegen.AgentActivity;
import com.neviad.beneviadsystem.service.agent.codegen.BridgedCodeStore;
import com.neviad.beneviadsystem.service.agent.codegen.FakeBrowserBridge;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.ToolCallback;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

/** The draw-object agent SEES its figure (pictures with every check) and an independent judge must pass it before finish is accepted. */
class DrawObjectAgentJudgeTest {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String DONE = "{\"status\":\"PASSED\",\"summary\":\"xong\"}";
    private static final String CODE = "const makeScope = () => 1;";
    private static final ToolImageSource.Image REST = new ToolImageSource.Image("tư thế nghỉ", "data:image/png;base64,AAAA");
    private static final DrawObjectAgent.DrawObjectRequest REQUEST = new DrawObjectAgent.DrawObjectRequest("Kính hiển vi", "kính hiển vi học đường, nhìn ngang", "");
    private static final DrawObjectJudge.Criteria CRITERIA = new DrawObjectJudge.Criteria("nhìn ngang", List.of(), List.of("cánh tay chữ C"), List.of("không lộ mặt trước"));

    interface Script { void run(List<ToolCallback> tools) throws Exception; }

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

    /** A judge that answers from a list of verdicts and remembers what it was shown. */
    private static final class FakeJudge implements DrawObjectJudge {
        final List<Verdict> verdicts;
        int criteriaCalls;
        final List<List<ToolImageSource.Image>> shown = new ArrayList<>();
        RuntimeException failure;
        FakeJudge(Verdict... verdicts) { this.verdicts = List.of(verdicts); }
        @Override public Criteria criteria(DrawObjectAgent.DrawObjectRequest request) { criteriaCalls++; return CRITERIA; }
        @Override public Verdict judge(DrawObjectAgent.DrawObjectRequest request, Criteria criteria, List<ToolImageSource.Image> images) {
            if (failure != null) throw failure;
            shown.add(images);
            return verdicts.get(Math.min(shown.size(), verdicts.size()) - 1);
        }
    }

    private final FakeBrowserBridge browser = new FakeBrowserBridge();
    private final List<AgentActivity> steps = new ArrayList<>();
    private String codePath;

    private DrawObjectAgent agent(ScriptedModel model, DrawObjectJudge judge) {
        DrawObjectValidator validator = answer -> new DrawObjectValidator.Validation(List.of(), List.of("✓ chạy được"), CODE, null, List.of(REST));
        return new DrawObjectAgent(model, validator, MAPPER, runId -> new BridgedCodeStore(browser, runId), steps::add, "medium", null, judge);
    }

    private static ToolCallback tool(List<ToolCallback> tools, String name) {
        return tools.stream().filter(t -> name.equals(t.getToolDefinition().name())).findFirst().orElseThrow();
    }

    private static String call(List<ToolCallback> tools, String name, Map<String, Object> input) throws Exception {
        return tool(tools, name).call(MAPPER.writeValueAsString(input));
    }

    private void write(List<ToolCallback> tools, ScriptedModel model) throws Exception {
        String task = model.prompts.getLast();
        int first = task.indexOf("- _drawn/");
        codePath = task.substring(first + 2, task.indexOf('\n', first));
        call(tools, "describe_real_object", DrawObjectAgentTest.realObject("thân", "ống kính", "bàn mẫu"));
        call(tools, "write_file", Map.of("path", codePath, "content", CODE));
    }

    private static DrawObjectJudge.Verdict fail(int score, String defect) { return new DrawObjectJudge.Verdict(false, score, List.of(defect), "chưa giống"); }

    private static DrawObjectJudge.Verdict pass(int score) { return new DrawObjectJudge.Verdict(true, score, List.of(), "giống"); }

    @Test
    void everyCheckShowsThePicturesOfTheFigureToTheModelOnce() {
        var holder = new AtomicReference<ScriptedModel>();
        var seen = new ArrayList<List<ToolImageSource.Image>>();
        var model = new ScriptedModel(tools -> {
            write(tools, holder.get());
            call(tools, "check_object", Map.of("reason", "xem"));
            ToolCallback check = tool(tools, "check_object");
            assertThat(check).isInstanceOf(ToolImageSource.class);
            seen.add(((ToolImageSource) check).takeImages());
            seen.add(((ToolImageSource) check).takeImages());
            call(tools, "finish", Map.of("summary", "xong"));
        });
        holder.set(model);

        agent(model, null).generate(REQUEST, "run-1");

        assertThat(seen.get(0)).containsExactly(REST);
        assertThat(seen.get(1)).isEmpty();
        assertThat(model.prompts.getFirst()).contains("tả hình mẫu trước, rồi dựng theo khung", "describe_real_object", "TRẢ ẢNH", "GIÁM KHẢO")
                .doesNotContain("tối đa 120 dòng", "bức tranh liền");
    }

    @Test
    void theJudgeRefusesFinishWithItsDefectsUntilAFixedFigurePasses() {
        var holder = new AtomicReference<ScriptedModel>();
        var refusals = new ArrayList<String>();
        var model = new ScriptedModel(tools -> {
            write(tools, holder.get());
            call(tools, "check_object", Map.of("reason", "1"));
            refusals.add(call(tools, "finish", Map.of("summary", "lần 1")));
            call(tools, "edit_file", Map.of("path", codePath, "expectedText", "1;", "replacement", "2;"));
            call(tools, "check_object", Map.of("reason", "2"));
            assertThat(call(tools, "finish", Map.of("summary", "lần 2"))).contains("\"success\":true");
        });
        holder.set(model);
        var judge = new FakeJudge(fail(4, "Đèn chiếu nằm trên bàn mẫu: dời xuống dưới."), pass(8));

        var result = agent(model, judge).generate(REQUEST, "run-1");

        assertThat(refusals.getFirst()).contains("\"success\":false", "4/10", "Đèn chiếu nằm trên bàn mẫu", "Còn 2 lần chấm");
        assertThat(judge.criteriaCalls).isEqualTo(1);
        assertThat(judge.shown).hasSize(2).allSatisfy(images -> assertThat(images).containsExactly(REST));
        assertThat(result.status()).isEqualTo("ok");
        assertThat(result.selfTestReport()).contains("giám khảo lần 1: 4/10, chưa qua — Đèn chiếu nằm trên bàn mẫu: dời xuống dưới.", "giám khảo lần 2: 8/10, qua");
        assertThat(steps).anySatisfy(step -> assertThat(step.message()).contains("Giám khảo: 8/10, qua"));
    }

    @Test
    void afterTheLastRefusalTheObjectIsAcceptedWithAWarningSoTheExperimentGoesOn() {
        var holder = new AtomicReference<ScriptedModel>();
        var answers = new ArrayList<String>();
        var model = new ScriptedModel(tools -> {
            write(tools, holder.get());
            call(tools, "check_object", Map.of("reason", "1"));
            for (int i = 0; i < DrawObjectAgent.MAX_JUDGINGS; i++) answers.add(call(tools, "finish", Map.of("summary", "thử")));
        });
        holder.set(model);
        var judge = new FakeJudge(fail(3, "Chỉ là các khối ghép lại."));

        var result = agent(model, judge).generate(REQUEST, "run-1");

        assertThat(answers.subList(0, DrawObjectAgent.MAX_JUDGINGS - 1)).allSatisfy(a -> assertThat(a).contains("\"success\":false"));
        assertThat(answers.getLast()).contains("\"success\":true");
        assertThat(judge.shown).hasSize(DrawObjectAgent.MAX_JUDGINGS);
        assertThat(result.status()).isEqualTo("ok");
        assertThat(result.selfTestReport()).anySatisfy(line -> assertThat(line).startsWith("⚠ giám khảo chưa cho qua sau 3 lần chấm (điểm cuối 3/10)"));
    }

    @Test
    void aJudgeThatCannotRunNeverBlocksTheObjectAndTheResultSaysSo() {
        var holder = new AtomicReference<ScriptedModel>();
        var model = new ScriptedModel(tools -> {
            write(tools, holder.get());
            call(tools, "check_object", Map.of("reason", "1"));
            assertThat(call(tools, "finish", Map.of("summary", "xong"))).contains("\"success\":true");
        });
        holder.set(model);
        var judge = new FakeJudge(pass(9));
        judge.failure = new IllegalStateException("provider không trả lời");

        var result = agent(model, judge).generate(REQUEST, "run-1");

        assertThat(result.status()).isEqualTo("ok");
        assertThat(result.selfTestReport()).anySatisfy(line -> assertThat(line).contains("⚠ giám khảo không chạy được: provider không trả lời"));
    }

    @Test
    void theCodeNotTheJudgeDecidesThePass() {
        var criteria = new DrawObjectJudge.Criteria("nhìn ngang", List.of(new DrawObjectJudge.Ratio("chân đế / cả vật", 0.1)),
                List.of("cánh tay chữ C", "bàn mẫu", "thị kính nghiêng"), List.of());
        var good = List.of(new DrawObjectJudge.Feature("cánh tay chữ C", true, ""), new DrawObjectJudge.Feature("bàn mẫu", true, ""),
                new DrawObjectJudge.Feature("thị kính nghiêng", false, "thẳng đứng"));
        var ratioOk = List.of(new DrawObjectJudge.Observed("chân đế / cả vật", 0.12));

        var passes = DrawObjectJudge.decide(criteria, new DrawObjectJudge.Report(ratioOk, good, true, List.of(), List.of(), 8, true, ""));
        var ratioOff = DrawObjectJudge.decide(criteria, new DrawObjectJudge.Report(List.of(new DrawObjectJudge.Observed("chân đế / cả vật", 0.2)), good, true, List.of(), List.of(), 9, true, ""));
        var wrongView = DrawObjectJudge.decide(criteria, new DrawObjectJudge.Report(ratioOk, good, false, List.of("mặt trước xoay ra phía người xem"), List.of(), 9, true, ""));
        var lowScore = DrawObjectJudge.decide(criteria, new DrawObjectJudge.Report(ratioOk, good, true, List.of(), List.of(), 6, true, ""));
        var twoMissing = DrawObjectJudge.decide(criteria, new DrawObjectJudge.Report(ratioOk,
                List.of(new DrawObjectJudge.Feature("cánh tay chữ C", false, ""), good.get(1), good.get(2)), true, List.of(), List.of(), 9, true, ""));

        assertThat(passes.pass()).isTrue();
        assertThat(passes.defects()).containsExactly("Thiếu đặc điểm nhận diện: thị kính nghiêng (thẳng đứng).");
        assertThat(ratioOff.pass()).isFalse();
        assertThat(ratioOff.defects().getFirst()).contains("chân đế / cả vật", "0.20", "0.10", "lệch 100%");
        assertThat(wrongView.pass()).isFalse();
        assertThat(wrongView.defects()).contains("Góc nhìn (nhìn ngang): mặt trước xoay ra phía người xem");
        assertThat(lowScore.pass()).isFalse();
        assertThat(twoMissing.pass()).isFalse();
    }
}
