package com.neviad.beneviadsystem.presentation.controller;

import com.neviad.beneviadsystem.presentation.dto.HealthResponse;
import com.neviad.beneviadsystem.service.HealthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
@Tag(name = "Health", description = "Service health endpoints")
public class HealthController {

    private final HealthService healthService;

    public HealthController(HealthService healthService) {
        this.healthService = healthService;
    }

    @GetMapping
    @Operation(summary = "Get application health")
    public HealthResponse health() {
        return HealthResponse.from(healthService.getHealth());
    }
}
