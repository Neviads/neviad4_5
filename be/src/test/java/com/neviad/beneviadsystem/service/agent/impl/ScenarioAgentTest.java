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

class ScenarioAgentTest {
    private static final String INPUTS = """
            "objectGeometry":[{"objectId":"pump","width":0.6,"height":0.8,"anchor":"tâm đáy","points":[{"name":"handle","description":"tay cầm"}],
                              "parts":[{"name":"lever","motion":"rotate","axis":"up","min":0,"max":25,"description":"cần bơm"}]},
                              {"objectId":"lift","width":0.8,"height":1.0,"anchor":"tâm đáy","points":[],
                              "parts":[{"name":"platform","motion":"slide","axis":"up","min":0,"max":0.3,"description":"bàn nâng"}]}]""";
    private static final String GOOD = """
            {"summary":"Cho thấy lực được khuếch đại qua chất lỏng.","formulas":["F₂/F₁ = A₂/A₁ — lực tỉ lệ với diện tích"],
             "phases":[{"name":"Ấn cần","description":"Pít-tông nhỏ đi xuống, pít-tông lớn đi lên ít hơn"},{"name":"Nhấc cần","description":"Cần trở về"}],
             "layout":"Xi lanh nhỏ bên trái, xi lanh lớn bên phải, nối ở đáy.","view":"Nhìn ngang từ phía trước, thấy mặt cắt hai xi lanh.","adjustable":["lực ấn, từ 0 đến 500 N"],
             "observable":["lực nâng (N)"],"assumptions":["bỏ qua ma sát"],
             "workedExamples":[{"text":"Với F1 = 10 N và A2/A1 = 5","expression":"10*5","unit":"N"},{"text":"Với F1 = 500 N và A2/A1 = 5","expression":"500*5","unit":"N"}],""" + INPUTS + "}";
    private static final List<ScenarioAgent.ObjectInfo> OBJECTS = List.of(
            new ScenarioAgent.ObjectInfo("pump", "Bộ bơm", "mô tả, điểm neo ở đáy", "Đầu ra: x. Port: z."),
            new ScenarioAgent.ObjectInfo("lift", "Bộ nâng", "mô tả, điểm neo ở đáy", "Đầu ra: y. Port: w."));

    private static final class Scripted implements AiClient {
        final List<String> replies;
        final List<String> prompts = new ArrayList<>();
        Scripted(String... replies) { this.replies = List.of(replies); }
        @Override public String generate(String prompt) { return generateReasoned(prompt, null).text(); }
        @Override public AiGenerationResult generateReasoned(String prompt, StructuredOutputSpec spec) {
            prompts.add(prompt);
            return new AiGenerationResult(replies.get(Math.min(prompts.size(), replies.size()) - 1), "test", "test");
        }
    }

    private static ScenarioAgent agent(Scripted scripted) { return new ScenarioAgent(scripted, new ObjectMapper()); }

    @Test
    void aValidScenarioComesBackWithTheGeometryOfEveryObject() {
        var scripted = new Scripted(GOOD);

        var scenario = agent(scripted).scenario("máy nâng thuỷ lực", OBJECTS);

        assertThat(scenario.formulas()).containsExactly("F₂/F₁ = A₂/A₁ — lực tỉ lệ với diện tích");
        assertThat(scenario.phases()).extracting(ScenarioAgent.Phase::name).containsExactly("Ấn cần", "Nhấc cần");
        assertThat(scenario.adjustable()).hasSize(1);
        assertThat(scenario.view()).isEqualTo("Nhìn ngang từ phía trước, thấy mặt cắt hai xi lanh.");
        assertThat(scenario.objectGeometry()).extracting(ScenarioAgent.ObjectGeometry::objectId).containsExactly("pump", "lift");
        assertThat(scenario.objectGeometry().getFirst().width()).isEqualTo(0.6);
        assertThat(scenario.objectGeometry().getFirst().points()).extracting(ScenarioAgent.NamedPoint::name).containsExactly("handle");
        assertThat(scenario.objectGeometry().getFirst().parts()).singleElement().satisfies(part -> {
            assertThat(part.motion()).isEqualTo("rotate");
            assertThat(part.axis()).isEmpty();
            assertThat(part.max()).isEqualTo(25.0);
        });
        assertThat(scenario.objectGeometry().getLast().parts().getFirst().axis()).isEqualTo("up");
        assertThat(scripted.prompts.getFirst()).contains("máy nâng thuỷ lực", "id: pump | Bộ bơm", "id: lift | Bộ nâng", "objectGeometry", "MÉT", "RỖNG");
    }

    @Test
    void aScenarioWithoutFormulasIsSentBackWithTheReason() {
        var scripted = new Scripted(GOOD.replace("\"F₂/F₁ = A₂/A₁ — lực tỉ lệ với diện tích\"", ""), GOOD);

        var scenario = agent(scripted).scenario("máy nâng", OBJECTS);

        assertThat(scenario.formulas()).hasSize(1);
        assertThat(scripted.prompts).hasSize(2);
        assertThat(scripted.prompts.getLast()).contains("Lần trước bị từ chối vì", "ít nhất một công thức");
    }

    @Test
    void aScenarioWithoutNumericExamplesIsSentBackBecauseTheEngineNeedsTestCases() {
        String noExamples = GOOD.replaceAll("\"workedExamples\":\\[[^\\]]*\\],", "");
        var scripted = new Scripted(noExamples, GOOD);

        var scenario = agent(scripted).scenario("máy nâng", OBJECTS);

        assertThat(scenario.workedExamples()).hasSize(2);
        assertThat(scenario.workedExamples().getFirst().value()).isEqualTo(50.0);
        assertThat(scripted.prompts).hasSize(2);
        assertThat(scripted.prompts.getLast()).contains("workedExamples cần ít nhất 2 phép tính bằng số");
    }

    @Test
    void anExampleWhoseExpressionCannotBeComputedIsSentBackWithTheReason() {
        String broken = GOOD.replace("\"expression\":\"500*5\"", "\"expression\":\"500*gia_tri\"");
        var scripted = new Scripted(broken, GOOD);

        agent(scripted).scenario("máy nâng", OBJECTS);

        assertThat(scripted.prompts).hasSize(2);
        assertThat(scripted.prompts.getLast()).contains("workedExamples[2]", "không tính được");
    }

    @Test
    void aScenarioWithoutAViewIsSentBackBecauseEveryObjectMustBeSeenFromOneSide() {
        var scripted = new Scripted(GOOD.replace("\"view\":\"Nhìn ngang từ phía trước, thấy mặt cắt hai xi lanh.\",", ""), GOOD);

        var scenario = agent(scripted).scenario("máy nâng", OBJECTS);

        assertThat(scenario.view()).isNotBlank();
        assertThat(scripted.prompts).hasSize(2);
        assertThat(scripted.prompts.getLast()).contains("thiếu view");
    }

    @Test
    void aScenarioThatNeverGetsValidIsAnError() {
        var scripted = new Scripted("{\"summary\":\"\",\"formulas\":[],\"phases\":[],\"layout\":\"\",\"adjustable\":[],\"observable\":[],\"assumptions\":[],\"objectGeometry\":[]}");

        assertThatThrownBy(() -> agent(scripted).scenario("x", OBJECTS))
                .isInstanceOf(InvalidAgentResponseException.class).hasMessageContaining("thiếu summary");
        assertThat(scripted.prompts).hasSize(ScenarioAgent.MAX_ATTEMPTS);
    }

    @Test
    void anObjectWithoutItsGeometryIsSentBack() {
        var missing = GOOD.replace("\"objectId\":\"lift\"", "\"objectId\":\"other\"");
        var scripted = new Scripted(missing, GOOD);

        agent(scripted).scenario("máy nâng", OBJECTS);

        assertThat(scripted.prompts).hasSize(2);
        assertThat(scripted.prompts.getLast()).contains("objectGeometry thiếu vật có id \"lift\"");
    }

    @Test
    void aGeometryWithoutSizeOrWithABadPartIsSentBack() {
        var noSize = GOOD.replace("\"width\":0.6", "\"width\":0");
        var badName = GOOD.replace("\"name\":\"lever\"", "\"name\":\"Lever Arm\"");
        var badRange = GOOD.replace("\"min\":0,\"max\":25", "\"min\":25,\"max\":25");
        var badMotion = GOOD.replace("\"motion\":\"rotate\"", "\"motion\":\"swing\"");
        var slideWithoutAxis = GOOD.replace("\"motion\":\"slide\",\"axis\":\"up\"", "\"motion\":\"slide\",\"axis\":\"\"");
        for (String bad : List.of(noSize, badName, badRange, badMotion, slideWithoutAxis)) {
            assertThat(bad).isNotEqualTo(GOOD);
            var scripted = new Scripted(bad, GOOD);
            agent(scripted).scenario("máy nâng", OBJECTS);
            assertThat(scripted.prompts).hasSize(2);
        }
        var scripted = new Scripted(slideWithoutAxis, GOOD);
        agent(scripted).scenario("máy nâng", OBJECTS);
        assertThat(scripted.prompts.getLast()).contains("trượt nên cần axis");
    }
}
