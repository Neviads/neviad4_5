package com.neviad.beneviadsystem.service.agent.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.file.Path;
import java.time.Duration;
import java.util.List;

/** Runs {@code fe/scripts/validate-assembly.mjs}. */
@Component
public class NodeAssemblyValidator implements AssemblyValidator {
    private final NodeScriptRunner runner;
    private final ObjectMapper mapper;

    @Autowired
    public NodeAssemblyValidator(@Value("${app.pipeline.fe-root:}") String feRootSetting,
                                 @Value("${app.pipeline.node-command:node}") String nodeCommand,
                                 @Value("${app.pipeline.gate-timeout-seconds:240}") long timeoutSeconds, ObjectMapper mapper) {
        this(NodeScriptRunner.resolveFeRoot(feRootSetting), nodeCommand, Duration.ofSeconds(Math.max(10, timeoutSeconds)), mapper);
    }

    NodeAssemblyValidator(Path feRoot, String nodeCommand, Duration timeout, ObjectMapper mapper) {
        this.runner = new NodeScriptRunner(feRoot, nodeCommand, timeout, mapper);
        this.mapper = mapper;
    }

    @Override
    public List<String> validate(JsonNode plan, List<Part> parts) {
        ObjectNode input = mapper.createObjectNode();
        input.set("plan", plan);
        ArrayNode list = input.putArray("components");
        for (Part part : parts) list.addObject().put("id", part.id()).put("name", part.name()).put("js", part.js());
        try {
            return NodeDrawObjectValidator.texts(runner.run("validate-assembly.mjs", input).path("problems"));
        } catch (NodeScriptRunner.ScriptFailure failure) {
            return List.of(failure.getMessage());
        }
    }
}
