package com.neviad.beneviadsystem.service.agent.impl;

import com.neviad.beneviadsystem.infrastructure.ai.ToolImageSource;
import com.fasterxml.jackson.databind.JsonNode;

import java.util.List;

/** The check of one draw-object answer: it compiles, runs and draws something, and shows the figure it drew. */
public interface DrawObjectValidator {
    /**
     * {@code js} is the compiled code, only set when there are no problems; {@code meta} is what the code itself declares ({@code name}, and
     * {@code inputs}, {@code outputs}, {@code ports} when it has any), or null; a crash of the checker is a problem, never a pass.
     * {@code images} are pictures of the figure as built (at rest, and with every moving part at its maximum) so the drawer can SEE what it
     * drew; empty when the code did not run. They never decide the result.
     */
    record Validation(List<String> problems, List<String> report, String js, JsonNode meta, List<ToolImageSource.Image> images) {
        public Validation {
            images = images == null ? List.of() : List.copyOf(images);
        }

        public Validation(List<String> problems, List<String> report, String js, JsonNode meta) { this(problems, report, js, meta, List.of()); }

        public Validation(List<String> problems, List<String> report, String js) { this(problems, report, js, null, List.of()); }
    }

    Validation validate(JsonNode answer);
}
