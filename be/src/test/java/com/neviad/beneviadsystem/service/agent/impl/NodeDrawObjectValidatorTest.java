package com.neviad.beneviadsystem.service.agent.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

class NodeDrawObjectValidatorTest {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static Path feRoot() {
        Path fe = NodeScriptRunner.resolveFeRoot("");
        assumeTrue(Files.isRegularFile(fe.resolve("scripts/validate-draw-object.mjs")) && Files.isDirectory(fe.resolve("node_modules/typescript")),
                "cần fe/ với node_modules để chạy script kiểm tra");
        return fe;
    }

    private static NodeDrawObjectValidator validator() {
        return new NodeDrawObjectValidator(feRoot(), "node", Duration.ofSeconds(120), MAPPER);
    }

    @Test
    void anAnswerWithoutCodeIsRejectedByTheRealScript() throws Exception {
        var result = validator().validate(MAPPER.readTree("{}"));

        assertThat(result.problems()).anyMatch(p -> p.contains("Chưa có code"));
        assertThat(result.js()).isNull();
    }

    @Test
    void aPlainDrawingThatRunsPassesWithNoContractAndDeclaresNothing() throws Exception {
        String code = "const makeBox = (p: Vec2, radius: number, fill: string) => { const group = new Konva.Group({ x: p.x, y: p.y }); group.add(new Konva.Rect({ width: 10, height: 10, fill })); return { group }; };";

        var result = validator().validate(MAPPER.createObjectNode().put("code", code));

        assertThat(result.problems()).isEmpty();
        assertThat(result.js()).contains("makeBox");
        assertThat(result.meta().path("name").asText()).isEqualTo("makeBox");
        assertThat(result.meta().path("inputs")).isEmpty();
    }

    @Test
    void theMovingPartsAndPointsOfAShapeAreReportedBackAndTheGeometryIsMeasured() throws Exception {
        String code = "const makeLift = (p: Vec2, ppm: number, fill: string) => { const group = new Konva.Group({ x: p.x, y: p.y });"
                + " group.add(new Konva.Rect({ x: -0.25 * ppm, y: -0.8 * ppm, width: 0.5 * ppm, height: 0.8 * ppm, fill }));"
                + " const piston = new Konva.Group({ x: 0.1 * ppm, y: -0.6 * ppm }); piston.add(new Konva.Rect({ x: -0.05 * ppm, y: 0, width: 0.1 * ppm, height: 0.04 * ppm })); group.add(piston);"
                + " return { group, parts: { piston: { node: piston, motion: 'slide', axis: 'up', min: 0, max: 0.05 } }, points: { top: { x: 0.1 * ppm, y: -0.6 * ppm } } }; };";
        var geometry = MAPPER.readTree("{\"width\":0.5,\"height\":0.8,\"anchor\":\"tâm đáy\",\"points\":[{\"name\":\"top\",\"description\":\"\"}],"
                + "\"parts\":[{\"name\":\"piston\",\"motion\":\"slide\",\"axis\":\"up\",\"min\":0,\"max\":0.05}]}");

        var result = validator().validate(MAPPER.createObjectNode().put("code", code).set("geometry", geometry));

        assertThat(result.problems()).isEmpty();
        assertThat(result.meta().path("size").path("width").asDouble()).isEqualTo(0.5);
        assertThat(result.meta().path("moving").get(0).path("name").asText()).isEqualTo("piston");
        assertThat(result.meta().path("points").get(0).path("name").asText()).isEqualTo("top");

        ((com.fasterxml.jackson.databind.node.ObjectNode) geometry).put("width", 1.0);
        var tooSmall = validator().validate(MAPPER.createObjectNode().put("code", code).set("geometry", geometry));
        assertThat(tooSmall.problems()).anyMatch(problem -> problem.contains("Kích thước phải là 1"));
    }

    @Test
    void codeThatThrowsOrCannotEscapeIsAProblemNeverAPass() throws Exception {
        var thrown = validator().validate(MAPPER.createObjectNode().put("code", "const makeX = () => { throw new Error('hỏng'); };"));
        var escape = validator().validate(MAPPER.createObjectNode().put("code", "const makeX = () => getSimulationFontFamily.constructor('return 1')();"));

        assertThat(thrown.problems()).anyMatch(p -> p.contains("Chạy hàm vẽ bị lỗi"));
        assertThat(thrown.js()).isNull();
        assertThat(escape.problems()).anyMatch(p -> p.contains("bị cấm"));
        assertThat(escape.js()).isNull();
    }

    @Test
    void aMissingNodeIsAProblemNeverAPass() throws Exception {
        var validator = new NodeDrawObjectValidator(feRoot(), "node-khong-ton-tai", Duration.ofSeconds(10), MAPPER);

        var result = validator.validate(MAPPER.readTree("{}"));

        assertThat(result.problems()).isNotEmpty();
        assertThat(result.js()).isNull();
    }

    @Test
    void springCanBuildTheBeanFromItsProperties() {
        try (var context = new org.springframework.context.annotation.AnnotationConfigApplicationContext()) {
            context.registerBean(ObjectMapper.class);
            context.registerBean(NodeDrawObjectValidator.class);
            context.refresh();
            assertThat(context.getBean(DrawObjectValidator.class)).isInstanceOf(NodeDrawObjectValidator.class);
        }
    }
}
