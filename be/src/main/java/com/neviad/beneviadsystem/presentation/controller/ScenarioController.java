package com.neviad.beneviadsystem.presentation.controller;

import com.neviad.beneviadsystem.service.agent.InvalidAgentResponseException;
import com.neviad.beneviadsystem.service.agent.impl.LiteSpecAgent;
import com.neviad.beneviadsystem.service.agent.impl.ScenarioAgent;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
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

/** Writes the prose scenario of an experiment from the teacher's sentence and its drawn objects. */
@RestController
@RequestMapping("/api/v1/scenario")
public class ScenarioController {
    public record ScenarioBody(@NotBlank @Size(max = 3000) String request,
                               @NotEmpty @Size(max = 4) List<@Valid ObjectBody> objects) { }

    public record ObjectBody(@NotBlank @Pattern(regexp = "[A-Za-z][A-Za-z0-9_]{0,39}") String id, @NotBlank @Size(max = 200) String title,
                             @NotBlank @Size(max = 4000) String request, @Size(max = 2000) String hint,
                             @Size(max = 20) List<LiteSpecAgent.FramePart> frame) { }

    private final ScenarioAgent agent;

    public ScenarioController(ScenarioAgent agent) {
        this.agent = agent;
    }

    @PostMapping
    public ScenarioAgent.Scenario execute(@Valid @RequestBody ScenarioBody body) {
        List<ScenarioAgent.ObjectInfo> objects = body.objects().stream()
                .map(o -> new ScenarioAgent.ObjectInfo(o.id(), o.title().trim(), o.request().trim(), (o.hint() == null ? "" : o.hint().trim()), o.frame()))
                .toList();
        return agent.scenario(body.request().trim(), objects);
    }

    @ExceptionHandler(InvalidAgentResponseException.class)
    public ResponseEntity<Map<String, String>> invalid(InvalidAgentResponseException exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", exception.getMessage() == null ? "Yêu cầu không hợp lệ" : exception.getMessage()));
    }
}
