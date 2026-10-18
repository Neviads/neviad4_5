package com.neviad.beneviadsystem.service.agent.impl;

import com.neviad.beneviadsystem.infrastructure.ai.AiClient;
import com.neviad.beneviadsystem.infrastructure.ai.AiRequest;
import com.neviad.beneviadsystem.infrastructure.ai.StructuredOutputSchemaRegistry;
import com.neviad.beneviadsystem.infrastructure.ai.ToolImageSource;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

/**
 * The drawing judge as two model calls through the shared {@link AiClient}: the criteria (no picture, prompt {@code prompts/drawobject/judge-criteria.md})
 * and the report on the pictures (prompt {@code prompts/drawobject/judge.md}, pictures sent with the user message). Each call is a fresh
 * context that never sees the drawer's code or turns. The pass is decided by {@link DrawObjectJudge#decide}.
 */
@Service
public class ModelDrawObjectJudge implements DrawObjectJudge {
    private final AiClient aiClient;
    private final ObjectMapper mapper;
    private final String criteriaPrompt;
    private final String judgePrompt;

    public ModelDrawObjectJudge(AiClient aiClient, ObjectMapper mapper) {
        this.aiClient = aiClient;
        this.mapper = mapper;
        this.criteriaPrompt = resource("prompts/drawobject/judge-criteria.md");
        this.judgePrompt = resource("prompts/drawobject/judge.md");
    }

    @Override
    public Criteria criteria(DrawObjectAgent.DrawObjectRequest request) {
        String raw = aiClient.generate(AiRequest.of(criteriaPrompt, describe(request) + "\n\nChốt tiêu chí theo hướng dẫn và trả JSON.")
                .withSchema(StructuredOutputSchemaRegistry.DRAW_CRITERIA_RESPONSE).withReasoning()).text();
        JsonNode node = parse(raw);
        List<Ratio> ratios = list(node.path("ratios"), r -> r.path("expected").asDouble(0) > 0 ? new Ratio(r.path("name").asText(), r.path("expected").asDouble()) : null);
        return new Criteria(node.path("view").asText(request.view()), ratios.stream().limit(4).toList(),
                texts(node.path("features")).stream().limit(6).toList(), texts(node.path("viewRules")).stream().limit(4).toList());
    }

    @Override
    public Verdict judge(DrawObjectAgent.DrawObjectRequest request, Criteria criteria, List<ToolImageSource.Image> images) {
        String criteriaJson;
        try {
            criteriaJson = mapper.writeValueAsString(criteria);
        } catch (JsonProcessingException impossible) {
            throw new IllegalStateException(impossible);
        }
        String user = describe(request) + "\n\nTiêu chí đã chốt (theo hình mẫu quen thuộc của vật):" + criteriaJson
                + "\n\nCác ảnh dưới đây là hình người vẽ nộp. Đo và chấm theo hướng dẫn, trả JSON.";
        String raw = aiClient.generate(AiRequest.of(judgePrompt, user).withSchema(StructuredOutputSchemaRegistry.DRAW_VERDICT_RESPONSE)
                .withReasoning().withImages(images)).text();
        JsonNode node = parse(raw);
        Report report = new Report(
                list(node.path("ratios"), r -> new Observed(r.path("name").asText(), r.path("observed").asDouble(0))),
                list(node.path("features"), f -> new Feature(f.path("feature").asText(), f.path("present").asBoolean(false), f.path("note").asText(""))),
                node.path("viewOk").asBoolean(false), texts(node.path("viewProblems")), texts(node.path("defects")),
                (int) Math.round(node.path("score").asDouble(1)), node.path("pass").asBoolean(false), node.path("summary").asText(""));
        return DrawObjectJudge.decide(criteria, report);
    }

    /** The object as the judge sees it: what was asked, the geometry the scenario fixed and the scene's view; never the code. */
    static String describe(DrawObjectAgent.DrawObjectRequest request) {
        StringBuilder out = new StringBuilder("Vật thể: ").append(request.title()).append("\n").append(request.request());
        if (request.hint() != null && !request.hint().isBlank()) out.append("\nGợi ý: ").append(request.hint());
        if (!request.style().isBlank()) out.append("\nPhong cách hình đã chốt với giáo viên: ").append(request.style());
        if (!request.frame().isEmpty()) {
            out.append("\nKhung (các bộ phận nhìn thấy được mà hình phải có):");
            for (LiteSpecAgent.FramePart p : request.frame())
                out.append("\n- ").append(p.name()).append(": ").append(p.shape()).append("; ").append(p.position()).append("; ").append(p.proportion());
        }
        ScenarioAgent.ObjectGeometry g = request.geometry();
        if (g != null) {
            out.append("\nHình học đã chốt: rộng ").append(g.width()).append(" m, cao ").append(g.height()).append(" m")
                    .append(g.anchor().isBlank() ? "" : ", điểm neo: " + g.anchor()).append(".");
            for (ScenarioAgent.MovingPart p : g.parts()) {
                out.append("\nBộ phận chuyển động ").append(p.name()).append(": ").append("slide".equals(p.motion()) ? "trượt " + p.axis() : "quay")
                        .append(" từ ").append(p.min()).append(" đến ").append(p.max()).append(p.description().isBlank() ? "" : " (" + p.description() + ")");
            }
        }
        if (!request.view().isBlank()) out.append("\nGóc nhìn của cảnh: ").append(request.view());
        return out.toString();
    }

    private JsonNode parse(String raw) {
        try {
            return mapper.readTree(DrawObjectAgent.extractJson(raw));
        } catch (JsonProcessingException malformed) {
            throw new IllegalStateException("Giám khảo trả JSON không hợp lệ: " + malformed.getOriginalMessage(), malformed);
        }
    }

    private static List<String> texts(JsonNode array) {
        List<String> out = new ArrayList<>();
        array.forEach(item -> { if (!item.asText("").isBlank()) out.add(item.asText()); });
        return out;
    }

    private static <T> List<T> list(JsonNode array, Function<JsonNode, T> read) {
        List<T> out = new ArrayList<>();
        array.forEach(item -> { T value = read.apply(item); if (value != null) out.add(value); });
        return out;
    }

    private static String resource(String path) {
        try {
            return new String(new ClassPathResource(path).getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException exception) {
            throw new UncheckedIOException("Không đọc được " + path, exception);
        }
    }
}
