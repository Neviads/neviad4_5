package com.neviad.beneviadsystem.service.agent.impl;

import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Builds a machine as an assembly: {@link AssemblyPlanner} splits it into parts, {@link DrawObjectAgent} draws every part on its own
 * (in parallel, each through its own gate), then the assembly gate checks that the parts attach by their ports and that the machine moves.
 * The answer is "ok" only when every part and the assembly passed; a failed part still comes back so it can be looked at.
 */
@Service
public class AssemblyAgent {
    private static final Logger log = LoggerFactory.getLogger(AssemblyAgent.class);

    /** One drawn part; {@code object} has the same shape the gallery draws. */
    public record PartResult(String id, DrawObjectAgent.DrawObjectResult object) { }

    public record AssemblyResult(String status, String title, JsonNode plan, List<PartResult> parts, List<String> problems) { }

    private final AssemblyPlanner planner;
    private final DrawObjectAgent drawer;
    private final AssemblyValidator validator;
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    public AssemblyAgent(AssemblyPlanner planner, DrawObjectAgent drawer, AssemblyValidator validator) {
        this.planner = planner;
        this.drawer = drawer;
        this.validator = validator;
    }

    /** {@code runId} is the live code session of the browser whose copy of the tree every part is drawn on. */
    public AssemblyResult assemble(DrawObjectAgent.DrawObjectRequest machine, String runId) {
        JsonNode plan = planner.plan(machine);
        List<CompletableFuture<PartResult>> futures = new ArrayList<>();
        for (JsonNode c : plan.path("components")) {
            DrawObjectAgent.DrawObjectRequest part = new DrawObjectAgent.DrawObjectRequest(
                    c.path("title").asText(), c.path("request").asText(), c.path("hint").asText(), !c.path("moving").asBoolean(), null, machine.view());
            String id = c.path("id").asText();
            futures.add(CompletableFuture.supplyAsync(() -> new PartResult(id, drawer.generate(part, runId)), executor));
        }
        List<PartResult> parts = futures.stream().map(CompletableFuture::join).toList();

        List<String> problems = new ArrayList<>();
        for (PartResult p : parts) {
            if (!"ok".equals(p.object().status())) for (String problem : p.object().problems()) problems.add("Bộ phận " + p.id() + ": " + problem);
        }
        if (problems.isEmpty()) {
            problems.addAll(validator.validate(plan, parts.stream()
                    .map(p -> new AssemblyValidator.Part(p.id(), p.object().name(), p.object().js())).toList()));
        }
        log.info("AssemblyAgent: parts={}, problems={}", parts.size(), problems.size());
        return new AssemblyResult(problems.isEmpty() ? "ok" : "failed", machine.title(), plan, parts, problems);
    }
}
