package com.neviad.beneviadsystem.service.agent.impl;

import com.neviad.beneviadsystem.infrastructure.ai.AiClient;
import com.neviad.beneviadsystem.infrastructure.ai.AiGenerationResult;
import com.neviad.beneviadsystem.infrastructure.ai.StructuredOutputSpec;
import com.neviad.beneviadsystem.service.agent.InvalidAgentResponseException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AssemblyTest {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final DrawObjectAgent.DrawObjectRequest MACHINE = new DrawObjectAgent.DrawObjectRequest("Máy nâng", "mô tả máy, điểm neo ở đáy", "đầu vào: pumpStroke (m). Đầu ra: h (m). Port: a.");

    /** A frame, a cylinder whose top rises with its input, and a platform that sits on the cylinder top. */
    private static String plan(String driverExpr, String platformParentPort) {
        return """
                {"input":{"name":"pumpStroke","label":"Hành trình","unit":"m","min":0,"max":1,"default":0},"root":"frame",
                 "components":[
                  {"id":"frame","title":"Đế","moving":false,"driver":null,"request":"Đế dẹt. Đứng trên sàn, điểm neo ở giữa đáy.","hint":"Port: socket."},
                  {"id":"cyl","title":"Xi lanh","moving":true,"driver":{"input":"rise","expr":"%s"},"request":"Xi lanh có pít-tông. Điểm neo ở đáy.","hint":"đầu vào: rise (m, quãng đi lên). Đầu ra: độ cao (m). Port: base, top."},
                  {"id":"platform","title":"Bệ","moving":false,"driver":null,"request":"Bệ nằm ngang. Điểm neo ở giữa mặt dưới.","hint":"Port: under."}],
                 "attachments":[
                  {"child":"cyl","childPort":"base","parent":"frame","parentPort":"socket"},
                  {"child":"platform","childPort":"under","parent":"cyl","parentPort":"%s"}]}
                """.formatted(driverExpr, platformParentPort);
    }

    private static final class Scripted implements AiClient {
        final List<String> replies;
        final List<String> prompts = new ArrayList<>();
        Scripted(String... replies) { this.replies = List.of(replies); }
        @Override public String generate(String prompt) { return generate(prompt, (StructuredOutputSpec) null); }
        @Override public String generate(String prompt, StructuredOutputSpec spec) {
            prompts.add(prompt);
            return replies.get(Math.min(prompts.size(), replies.size()) - 1);
        }
        @Override public AiGenerationResult generateDetailed(String prompt, StructuredOutputSpec spec) { return new AiGenerationResult(generate(prompt, spec), "test", "test"); }
    }

    // ---- planner

    @Test
    void aValidPlanIsAccepted() {
        JsonNode result = new AssemblyPlanner(new Scripted(plan("u", "top")), MAPPER).plan(MACHINE);

        assertThat(result.path("components")).hasSize(3);
        assertThat(result.path("root").asText()).isEqualTo("frame");
    }

    @Test
    void aPortThatThePartNeverDeclaredIsSentBack() {
        var scripted = new Scripted(plan("u", "nowhere"), plan("u", "top"));

        new AssemblyPlanner(scripted, MAPPER).plan(MACHINE);

        assertThat(scripted.prompts).hasSize(2);
        assertThat(scripted.prompts.getLast()).contains("không khai port \"nowhere\"");
    }

    @Test
    void aDriverThatIsNotAPlainExpressionOfTheMachineInputIsRejected() {
        var scripted = new Scripted(plan("Math.max(u, 1)", "top"));

        assertThatThrownBy(() -> new AssemblyPlanner(scripted, MAPPER).plan(MACHINE))
                .isInstanceOf(InvalidAgentResponseException.class).hasMessageContaining("driver.expr");
        assertThat(scripted.prompts).hasSize(AssemblyPlanner.MAX_ATTEMPTS);
    }

    @Test
    void aPartThatCannotBeReachedFromTheRootIsRejected() throws Exception {
        String cycle = plan("u", "top").replace("\"parent\":\"frame\",\"parentPort\":\"socket\"", "\"parent\":\"platform\",\"parentPort\":\"under\"");

        assertThatThrownBy(() -> new AssemblyPlanner(new Scripted(cycle), MAPPER).plan(MACHINE))
                .isInstanceOf(InvalidAgentResponseException.class).hasMessageContaining("không nối được tới root");
    }

    // ---- agent

    private static DrawObjectAgent.DrawObjectResult drawn(String title, boolean ok) {
        return new DrawObjectAgent.DrawObjectResult(1, title, "r", "h", "lite", ok ? "ok" : "failed", 1, "make" + title, "s", "a",
                MAPPER.createArrayNode(), MAPPER.createArrayNode(), MAPPER.createArrayNode(), MAPPER.createArrayNode(), List.of(), MAPPER.createArrayNode(),
                "", "code", ok ? "js" : null, ok ? List.of() : List.of("khớp hở"), null, MAPPER.createArrayNode(), MAPPER.createArrayNode());
    }

    @Test
    void everyPartIsDrawnAndStaticPartsAreMarkedStatic() throws Exception {
        var planner = mock(AssemblyPlanner.class);
        when(planner.plan(any())).thenReturn(MAPPER.readTree(plan("u", "top")));
        var drawer = mock(DrawObjectAgent.class);
        var requests = new ArrayList<DrawObjectAgent.DrawObjectRequest>();
        var runIds = new ArrayList<String>();
        when(drawer.generate(any(), any())).thenAnswer(call -> {
            DrawObjectAgent.DrawObjectRequest r = call.getArgument(0);
            synchronized (requests) { requests.add(r); runIds.add(call.getArgument(1)); }
            return drawn(r.title(), true);
        });
        var checked = new ArrayList<AssemblyValidator.Part>();

        var result = new AssemblyAgent(planner, drawer, (p, parts) -> { checked.addAll(parts); return List.of(); }).assemble(MACHINE, "run-1");

        assertThat(result.status()).isEqualTo("ok");
        assertThat(result.parts()).extracting(AssemblyAgent.PartResult::id).containsExactly("frame", "cyl", "platform");
        assertThat(requests).filteredOn(DrawObjectAgent.DrawObjectRequest::isStatic).extracting(DrawObjectAgent.DrawObjectRequest::title).containsExactlyInAnyOrder("Đế", "Bệ");
        assertThat(checked).hasSize(3);
        assertThat(runIds).containsOnly("run-1").hasSize(3);
    }

    @Test
    void aPartThatFailedStopsTheAssemblyBeforeTheGate() throws Exception {
        var planner = mock(AssemblyPlanner.class);
        when(planner.plan(any())).thenReturn(MAPPER.readTree(plan("u", "top")));
        var drawer = mock(DrawObjectAgent.class);
        when(drawer.generate(any(), any())).thenAnswer(call -> drawn(((DrawObjectAgent.DrawObjectRequest) call.getArgument(0)).title(), !"Bệ".equals(((DrawObjectAgent.DrawObjectRequest) call.getArgument(0)).title())));

        var result = new AssemblyAgent(planner, drawer, (p, parts) -> { throw new AssertionError("không được chạy cổng lắp ráp"); }).assemble(MACHINE, "run-1");

        assertThat(result.status()).isEqualTo("failed");
        assertThat(result.problems()).containsExactly("Bộ phận platform: khớp hở");
        assertThat(result.parts()).hasSize(3);
    }

    // ---- the real gate script

    private static final String FRAME = "const makeFrame = () => ({ group: {}, ports: { socket: { x: 40, y: 0 } }, inputs: {}, outputs: {}, set() {}, get() { return {}; }, read() { return {}; } });";
    private static final String CYL = "const makeCyl = () => { let v = 0; const o = { group: {}, ports: { base: { x: 0, y: 0 }, top: { x: 0, y: -20 } }, inputs: { rise: { min: 0, max: 0.5, default: 0 } },"
            + " outputs: {}, set(a) { if ('rise' in a) v = Math.min(0.5, Math.max(0, a.rise)); o.ports.top = { x: 0, y: -20 - v * 100 }; }, get() { return { rise: v }; }, read() { return {}; } }; return o; };";
    private static final String PLATFORM = "const makePlatform = () => ({ group: {}, ports: { under: { x: 0, y: 0 } }, inputs: {}, outputs: {}, set() {}, get() { return {}; }, read() { return {}; } });";

    private static NodeAssemblyValidator gate() {
        Path fe = NodeScriptRunner.resolveFeRoot("");
        assumeTrue(Files.isRegularFile(fe.resolve("scripts/validate-assembly.mjs")), "cần fe/ để chạy script kiểm tra lắp ráp");
        return new NodeAssemblyValidator(fe, "node", Duration.ofSeconds(120), MAPPER);
    }

    private static List<AssemblyValidator.Part> parts() {
        return List.of(new AssemblyValidator.Part("frame", "makeFrame", FRAME), new AssemblyValidator.Part("cyl", "makeCyl", CYL),
                new AssemblyValidator.Part("platform", "makePlatform", PLATFORM));
    }

    @Test
    void partsThatAttachByTheirPortsAndMoveWithTheInputPass() throws Exception {
        assertThat(gate().validate(MAPPER.readTree(plan("u*0.5", "top")), parts())).isEmpty();
    }

    @Test
    void aDriverThatPushesAPartOutOfItsRangeIsReported() throws Exception {
        assertThat(gate().validate(MAPPER.readTree(plan("u*5", "top")), parts())).anyMatch(p -> p.contains("kẹp"));
    }

    @Test
    void aMachineWhoseNothingMovesIsReported() throws Exception {
        String still = plan("u*0", "top");

        assertThat(gate().validate(MAPPER.readTree(still), parts())).anyMatch(p -> p.contains("không chuyển động"));
    }

    @Test
    void aPortThatThePartCodeDoesNotHaveIsReported() throws Exception {
        assertThat(gate().validate(MAPPER.readTree(plan("u*0.5", "ghost")), parts())).anyMatch(p -> p.contains("không có port \"ghost\""));
    }
}
