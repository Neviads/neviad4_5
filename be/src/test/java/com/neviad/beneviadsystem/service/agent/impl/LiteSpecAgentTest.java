package com.neviad.beneviadsystem.service.agent.impl;

import com.neviad.beneviadsystem.infrastructure.ai.AiClient;
import com.neviad.beneviadsystem.infrastructure.ai.AiGenerationResult;
import com.neviad.beneviadsystem.infrastructure.ai.StructuredOutputSpec;
import com.neviad.beneviadsystem.service.agent.InvalidAgentResponseException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LiteSpecAgentTest {
    private static final String REQUEST = "Máy nâng thuỷ lực: một xi lanh nhỏ bên trái có cần ấn, một xi lanh lớn bên phải nâng bệ tải có nhãn \\\"tải\\\". "
            + "Đứng trên sàn, điểm neo ở giữa đáy. Khi ấn cần bơm, pít-tông nhỏ đi xuống, pít-tông lớn đi lên.";

    private static String ready(String hint) {
        return """
                {"status":"READY","phenomenon":"Máy nâng thuỷ lực","reason":null,"question":null,"style":"%s","objects":[
                 {"id":"hydraulicLift","title":"Máy nâng thuỷ lực","request":"%s","frame":%s,"hint":"%s"}]}
                """.formatted(STYLE, REQUEST, FRAME, hint);
    }

    private static final String FRAME = "[" + part("xi lanh nhỏ") + "," + part("xi lanh lớn") + "," + part("cần bơm") + "]";

    private static String part(String name) {
        return "{\"name\":\"" + name + "\",\"shape\":\"trụ đứng bo miệng\",\"position\":\"đứng trên đế\",\"proportion\":\"cao nửa máy\"}";
    }

    private static final String GOOD_HINT = "Đầu ra: độ cao bệ tải (m). Port: tay cầm, bệ tải.";
    private static final String STYLE = "Sơ đồ như sách giáo khoa: nét phẳng, màu đơn giản, có nhãn tên bộ phận.";
    private static final String QUESTION = """
            {"status":"NEEDS_CLARIFICATION","phenomenon":"Máy nâng thuỷ lực","reason":null,
             "question":{"topic":"Phong cách hình","text":"Thầy/cô muốn hình tả thực hay sơ đồ như sách giáo khoa?","suggestions":["Tả thực","Sơ đồ SGK"]},
             "style":"","objects":[]}
            """;

    private static final class Scripted implements AiClient {
        final List<String> replies;
        final List<String> prompts = new ArrayList<>();
        Scripted(String... replies) { this.replies = List.of(replies); }
        @Override public String generate(String prompt) { return generateReasoned(prompt, null).text(); }
        @Override public AiGenerationResult generateWithTools(String prompt, List<org.springframework.ai.tool.ToolCallback> tools, StructuredOutputSpec spec, int maxToolCalls) {
            org.assertj.core.api.Assertions.assertThat(tools).extracting(t -> t.getToolDefinition().name()).containsExactly("get_objects");
            return generateReasoned(prompt, spec);
        }
        @Override public AiGenerationResult generateReasoned(String prompt, StructuredOutputSpec spec) {
            prompts.add(prompt);
            return new AiGenerationResult(replies.get(Math.min(prompts.size(), replies.size()) - 1), "test", "test");
        }
    }

    @Test
    void aReadyOutcomeCarriesOneDrawingRequestPerApparatus() {
        var outcome = new LiteSpecAgent(new Scripted(ready(GOOD_HINT)), new ObjectMapper()).analyze("máy nâng thuỷ lực");

        assertThat(outcome.status()).isEqualTo(LiteSpecAgent.Status.READY);
        assertThat(outcome.objects()).singleElement().satisfies(o -> {
            assertThat(o.id()).isEqualTo("hydraulicLift");
            assertThat(o.request()).contains("điểm neo");
            assertThat(o.hint()).isEqualTo(GOOD_HINT);
            assertThat(o.frame()).extracting(LiteSpecAgent.FramePart::name).containsExactly("xi lanh nhỏ", "xi lanh lớn", "cần bơm");
        });
    }

    @Test
    void anOpenQuestionAboutTheLookComesBackWithSuggestions() {
        var outcome = new LiteSpecAgent(new Scripted(QUESTION), new ObjectMapper()).analyze("máy nâng thuỷ lực");

        assertThat(outcome.status()).isEqualTo(LiteSpecAgent.Status.NEEDS_CLARIFICATION);
        assertThat(outcome.question().text()).contains("sách giáo khoa");
        assertThat(outcome.question().suggestions()).containsExactly("Tả thực", "Sơ đồ SGK");
        assertThat(outcome.objects()).isEmpty();
    }

    @Test
    void aReadyOutcomeCarriesTheAgreedStyleAndWithoutOneIsSentBack() {
        var scripted = new Scripted(ready(GOOD_HINT).replace(STYLE, ""), ready(GOOD_HINT));

        var outcome = new LiteSpecAgent(scripted, new ObjectMapper()).analyze("máy nâng thuỷ lực\nTrả lời: Sơ đồ SGK");

        assertThat(outcome.style()).isEqualTo(STYLE);
        assertThat(scripted.prompts.getLast()).contains("READY cần style");
    }

    @Test
    void afterFiveAnswersAnotherQuestionIsSentBack() {
        String answered = "máy nâng thuỷ lực" + "\nTrả lời: tuỳ bạn".repeat(LiteSpecAgent.MAX_ANSWERS);
        var scripted = new Scripted(QUESTION, ready(GOOD_HINT));

        var outcome = new LiteSpecAgent(scripted, new ObjectMapper()).analyze(answered);

        assertThat(outcome.status()).isEqualTo(LiteSpecAgent.Status.READY);
        assertThat(scripted.prompts.getLast()).contains("không hỏi thêm");
    }

    @Test
    void fewerThanFiveAnswersMayStillAsk() {
        var outcome = new LiteSpecAgent(new Scripted(QUESTION), new ObjectMapper()).analyze("máy nâng\nTrả lời: Sơ đồ SGK");

        assertThat(outcome.status()).isEqualTo(LiteSpecAgent.Status.NEEDS_CLARIFICATION);
    }

    @Test
    void anEmptyOrRepeatedOrHalfDescribedFrameIsSentBack() {
        String thin = ready(GOOD_HINT).replace(FRAME, "[" + part("thân") + "," + part("Thân").replace("trụ đứng bo miệng", "") + "]");
        var scripted = new Scripted(thin, ready(GOOD_HINT).replace(FRAME, "[]"), ready(GOOD_HINT));

        var outcome = new LiteSpecAgent(scripted, new ObjectMapper()).analyze("máy nâng thuỷ lực");

        assertThat(outcome.objects().getFirst().frame()).hasSize(3);
        assertThat(scripted.prompts.get(1)).contains("tên bị trùng trong frame", "cần đủ shape");
        assertThat(scripted.prompts.getLast()).contains("frame có 0 phần, cần ít nhất 1");
    }

    @Test
    void aParticleWithASingleRoundPartIsAnObjectLikeAnyOther() {
        String neutron = "{\"id\":\"neutron\",\"title\":\"Neutron\",\"request\":\"Một neutron theo hình minh hoạ quen thuộc: quả cầu nhỏ màu xám bạc, "
                + "mặt mịn, có khối nhờ ánh sáng. Nó bay tự do nên không có điểm neo. Hình dáng và chi tiết cứ tự do sáng tạo cho đẹp.\","
                + "\"frame\":[{\"name\":\"quả cầu\",\"shape\":\"tròn đều\",\"position\":\"là cả vật\",\"proportion\":\"chính là cả vật\"}],\"hint\":\"\"}";
        String reply = "{\"status\":\"READY\",\"phenomenon\":\"Phân hạch\",\"reason\":null,\"style\":\"" + STYLE + "\",\"objects\":[" + neutron + "]}";

        var outcome = new LiteSpecAgent(new Scripted(reply), new ObjectMapper()).analyze("bắn neutron vào hạt nhân uranium\nTrả lời: mức hạt");

        assertThat(outcome.objects()).singleElement().satisfies(o -> {
            assertThat(o.id()).isEqualTo("neutron");
            assertThat(o.frame()).hasSize(1);
        });
    }

    @Test
    void anUnsupportedRequestNeedsAReason() {
        var agent = new LiteSpecAgent(new Scripted("{\"status\":\"UNSUPPORTED\",\"phenomenon\":\"x\",\"reason\":\"Không phải vật lý\",\"objects\":[]}"), new ObjectMapper());

        var outcome = agent.analyze("nấu phở");

        assertThat(outcome.status()).isEqualTo(LiteSpecAgent.Status.UNSUPPORTED);
        assertThat(outcome.reason()).isEqualTo("Không phải vật lý");
        assertThat(outcome.objects()).isEmpty();
    }

    @Test
    void aHintThatNamesAnInputIsSentBackBecauseTheScenarioDecidesInputs() {
        var scripted = new Scripted(ready("đầu vào: leverAngle (độ, góc cần). Đầu ra: độ cao (m). Port: tay cầm."), ready(GOOD_HINT));

        var outcome = new LiteSpecAgent(scripted, new ObjectMapper()).analyze("máy nâng thuỷ lực");

        assertThat(outcome.objects()).hasSize(1);
        assertThat(scripted.prompts).hasSize(2);
        assertThat(scripted.prompts.getLast()).contains("không được nêu \"đầu vào:\"");
    }

    @Test
    void aHintAndTheAnchorPhraseAreOptional() {
        String withoutBoth = ready("").replace("điểm neo", "gốc toạ độ");

        var outcome = new LiteSpecAgent(new Scripted(withoutBoth), new ObjectMapper()).analyze("máy nâng");

        assertThat(outcome.status()).isEqualTo(LiteSpecAgent.Status.READY);
        assertThat(outcome.objects()).singleElement().satisfies(o -> {
            assertThat(o.hint()).isEmpty();
            assertThat(o.request()).doesNotContain("điểm neo");
        });
    }

    private static String withReference(String reference) {
        return ready(GOOD_HINT).replace("\"hint\":\"" + GOOD_HINT + "\"}", "\"hint\":\"" + GOOD_HINT + "\",\"reference\":" + (reference == null ? "null" : "\"" + reference + "\"") + "}");
    }

    private static com.neviad.beneviadsystem.service.ObjectLibraryService library() {
        return com.neviad.beneviadsystem.service.ObjectLibraryServiceTest.library(
                java.util.Map.of("luc-ke.ts", com.neviad.beneviadsystem.service.ObjectLibraryServiceTest.object("Lực kế", "Lực kế lò xo")),
                com.neviad.beneviadsystem.service.ObjectLibraryServiceTest.CATALOG);
    }

    @Test
    void aChosenLibraryObjectIsKeptAndItsFixedGeometryIsAppendedToTheRequest() {
        var scripted = new Scripted(withReference("luc-ke.ts"));

        var outcome = new LiteSpecAgent(scripted, new ObjectMapper(), library()).analyze("lực kế");

        assertThat(outcome.objects()).singleElement().satisfies(o -> {
            assertThat(o.reference()).isEqualTo("luc-ke.ts");
            assertThat(o.request()).contains("KHÔNG vẽ lại", "0.1 m × 0.3 m", "Bộ phận needle");
        });
        assertThat(scripted.prompts.getFirst()).contains("KHO VẬT CÓ SẴN", "MỤC LỤC KHO VẬT:\n## Dụng cụ đo\n- luc-ke.ts | Lực kế | Lực kế lò xo");
        assertThat(scripted.prompts.getFirst().indexOf("luc-ke.ts")).isLessThan(scripted.prompts.getFirst().indexOf("Yêu cầu của giáo viên"));
    }

    @Test
    void aReferenceThatIsNotInTheLibraryIsSentBackAndNullMeansDrawIt() {
        var scripted = new Scripted(withReference("khong-co.ts"), withReference(null));

        var outcome = new LiteSpecAgent(scripted, new ObjectMapper(), library()).analyze("lực kế");

        assertThat(scripted.prompts.getLast()).contains("reference 'khong-co.ts' không có trong kho vật");
        assertThat(outcome.objects().getFirst().reference()).isNull();
        assertThat(outcome.objects().getFirst().request()).doesNotContain("KHÔNG vẽ lại");
    }

    @Test
    void withoutAnyDrawnObjectTheAgentDoesNotMentionTheLibrary() {
        var empty = com.neviad.beneviadsystem.service.ObjectLibraryServiceTest.library(java.util.Map.of(), null);
        var scripted = new Scripted(ready(GOOD_HINT));

        new LiteSpecAgent(scripted, new ObjectMapper(), empty).analyze("máy nâng thuỷ lực");

        assertThat(scripted.prompts.getFirst()).doesNotContain("KHO VẬT CÓ SẴN");
    }

    /** Calls the library tool the way the model does (the details of a candidate read off the index), then answers. */
    private static final class Browsing implements AiClient {
        @Override public String generate(String prompt) { return ready(GOOD_HINT); }
        @Override public AiGenerationResult generateWithTools(String prompt, List<org.springframework.ai.tool.ToolCallback> tools, StructuredOutputSpec spec, int maxToolCalls) {
            tools.get(0).call("{\"ids\":[\"luc-ke.ts\"]}");
            return new AiGenerationResult(ready(GOOD_HINT), "test", "test");
        }
        @Override public AiGenerationResult generateReasoned(String prompt, StructuredOutputSpec spec) { return new AiGenerationResult(ready(GOOD_HINT), "test", "test"); }
    }

    @Test
    void libraryToolCallsArePublishedToTheRunWhileTheAgentWorks() {
        var published = new ArrayList<com.neviad.beneviadsystem.service.agent.codegen.AgentActivity>();
        var agent = new LiteSpecAgent(new Browsing(), new ObjectMapper(), library(), published::add);

        agent.analyze("lực kế", "run-1");

        assertThat(published).extracting(a -> a.tool() + ":" + a.phase()).containsExactly(
                "get_objects:STARTED", "get_objects:FINISHED");
        assertThat(published).allSatisfy(a -> assertThat(a.runId()).isEqualTo("run-1"));
        assertThat(published.get(0).message()).contains("1 vật");
    }

    @Test
    void withoutARunIdNothingIsPublished() {
        var published = new ArrayList<com.neviad.beneviadsystem.service.agent.codegen.AgentActivity>();

        new LiteSpecAgent(new Browsing(), new ObjectMapper(), library(), published::add).analyze("lực kế");

        assertThat(published).isEmpty();
    }

    @Test
    void moreThanFourApparatusesAreRejected() {
        String one = "{\"id\":\"%s\",\"title\":\"t\",\"request\":\"" + REQUEST + "\",\"frame\":" + FRAME + ",\"hint\":\"" + GOOD_HINT + "\"}";
        String reply = "{\"status\":\"READY\",\"phenomenon\":\"p\",\"reason\":null,\"style\":\"" + STYLE + "\",\"objects\":[" + one.formatted("a") + "," + one.formatted("b") + "," + one.formatted("c") + "," + one.formatted("d") + "," + one.formatted("e") + "]}";

        assertThatThrownBy(() -> new LiteSpecAgent(new Scripted(reply), new ObjectMapper()).analyze("x"))
                .isInstanceOf(InvalidAgentResponseException.class).hasMessageContaining("tối đa 4");
    }
}
