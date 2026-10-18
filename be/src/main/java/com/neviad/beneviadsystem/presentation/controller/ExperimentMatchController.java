package com.neviad.beneviadsystem.presentation.controller;

import com.neviad.beneviadsystem.service.agent.InvalidAgentResponseException;
import com.neviad.beneviadsystem.service.agent.impl.ExperimentMatchAgent;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** Which ready-made experiments of the library (catalog sent by the frontend) the teacher's request already is, before anything is built. */
@RestController
@RequestMapping("/api/v1/experiment-match")
public class ExperimentMatchController {
    public record MatchRequest(@NotBlank @Size(max = 3000) String request,
                               @NotEmpty @Size(max = 200) List<ExperimentMatchAgent.CatalogEntry> catalog) { }

    private final ExperimentMatchAgent agent;

    public ExperimentMatchController(ExperimentMatchAgent agent) {
        this.agent = agent;
    }

    @PostMapping
    public ExperimentMatchAgent.MatchResult execute(@Valid @RequestBody MatchRequest body) {
        return agent.match(body.request().trim(), body.catalog());
    }

    @ExceptionHandler(InvalidAgentResponseException.class)
    public ResponseEntity<Map<String, String>> invalid(InvalidAgentResponseException exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", exception.getMessage() == null ? "Yêu cầu không hợp lệ" : exception.getMessage()));
    }
}
