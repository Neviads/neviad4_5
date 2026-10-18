package com.neviad.beneviadsystem.presentation.controller;

import com.neviad.beneviadsystem.service.agent.InvalidAgentResponseException;
import com.neviad.beneviadsystem.service.agent.impl.LiteSpecAgent;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Turns one short sentence into the drawing requests (title, request, hint) the draw-object code agent takes. */
@RestController
@RequestMapping("/api/v1/lite-spec")
public class LiteSpecController {
    /** {@code runId} (optional): the run the frontend listens to for the library tools the agent calls. */
    public record LiteSpecRequest(@NotBlank @Size(max = 3000) String request, @Size(max = 100) String runId) { }

    private final LiteSpecAgent agent;

    public LiteSpecController(LiteSpecAgent agent) {
        this.agent = agent;
    }

    @PostMapping
    public LiteSpecAgent.LiteOutcome execute(@Valid @RequestBody LiteSpecRequest body) {
        return agent.analyze(body.request().trim(), body.runId());
    }

    @ExceptionHandler(InvalidAgentResponseException.class)
    public ResponseEntity<Map<String, String>> invalid(InvalidAgentResponseException exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", exception.getMessage() == null ? "Yêu cầu không hợp lệ" : exception.getMessage()));
    }
}
