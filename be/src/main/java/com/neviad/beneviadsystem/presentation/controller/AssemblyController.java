package com.neviad.beneviadsystem.presentation.controller;

import com.neviad.beneviadsystem.service.agent.InvalidAgentResponseException;
import com.neviad.beneviadsystem.service.agent.impl.AssemblyAgent;
import com.neviad.beneviadsystem.service.agent.impl.DrawObjectAgent;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Builds one machine from a drawing request as an assembly of smart parts. */
@RestController
@RequestMapping("/api/v1/assembly")
public class AssemblyController {
    private final AssemblyAgent agent;

    public AssemblyController(AssemblyAgent agent) {
        this.agent = agent;
    }

    /** Takes minutes (a plan, then every part drawn by an agent that reads, writes and checks), so callers must not use a short timeout. */
    @PostMapping
    public AssemblyAgent.AssemblyResult execute(@Valid @RequestBody DrawObjectController.DrawObjectBody body) {
        return agent.assemble(new DrawObjectAgent.DrawObjectRequest(body.title().trim(), body.request().trim(),
                (body.hint() == null ? "" : body.hint().trim()), false, null, body.view()), body.runId());
    }

    @ExceptionHandler(InvalidAgentResponseException.class)
    public ResponseEntity<Map<String, String>> invalid(InvalidAgentResponseException exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", exception.getMessage() == null ? "Yêu cầu không hợp lệ" : exception.getMessage()));
    }
}
