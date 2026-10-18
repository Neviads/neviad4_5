package com.neviad.beneviadsystem.service.agent.impl;

import com.neviad.beneviadsystem.infrastructure.ai.ToolImageSource;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/** Runs {@code fe/scripts/validate-draw-object.mjs}: the answer goes in on stdin, one JSON line comes out on stdout. */
@Component
public class NodeDrawObjectValidator implements DrawObjectValidator {
    /** At most this many pictures per check, and none larger than this (a picture is a data URL), so one check cannot flood the model. */
    static final int MAX_IMAGES = 2;
    static final int MAX_IMAGE_CHARS = 1_500_000;

    private final NodeScriptRunner runner;

    @Autowired
    public NodeDrawObjectValidator(@Value("${app.pipeline.fe-root:}") String feRootSetting,
                                   @Value("${app.pipeline.node-command:node}") String nodeCommand,
                                   @Value("${app.pipeline.gate-timeout-seconds:240}") long timeoutSeconds, ObjectMapper mapper) {
        this(NodeScriptRunner.resolveFeRoot(feRootSetting), nodeCommand, Duration.ofSeconds(Math.max(10, timeoutSeconds)), mapper);
    }

    NodeDrawObjectValidator(Path feRoot, String nodeCommand, Duration timeout, ObjectMapper mapper) {
        this.runner = new NodeScriptRunner(feRoot, nodeCommand, timeout, mapper);
    }

    @Override
    public Validation validate(JsonNode answer) {
        try {
            JsonNode node = runner.run("validate-draw-object.mjs", answer);
            List<String> problems = texts(node.path("problems"));
            String js = node.path("js").isTextual() ? node.path("js").asText() : null;
            if (problems.isEmpty() && (js == null || js.isBlank())) return failure("Script kiểm tra không trả code đã biên dịch.");
            return new Validation(problems, texts(node.path("report")), problems.isEmpty() ? js : null,
                    node.path("meta").isObject() ? node.path("meta") : null, images(node.path("images")));
        } catch (NodeScriptRunner.ScriptFailure failure) {
            return failure(failure.getMessage());
        }
    }

    static List<String> texts(JsonNode array) {
        List<String> out = new ArrayList<>();
        array.forEach(item -> out.add(item.asText()));
        return out;
    }

    static List<ToolImageSource.Image> images(JsonNode array) {
        List<ToolImageSource.Image> out = new ArrayList<>();
        for (JsonNode item : array) {
            if (out.size() >= MAX_IMAGES) break;
            String url = item.path("dataUrl").asText("");
            if (url.startsWith("data:image/png;base64,") && url.length() <= MAX_IMAGE_CHARS) out.add(new ToolImageSource.Image(item.path("label").asText("vật"), url));
        }
        return out;
    }

    private static Validation failure(String message) {
        return new Validation(List.of(message), List.of(), null);
    }
}
