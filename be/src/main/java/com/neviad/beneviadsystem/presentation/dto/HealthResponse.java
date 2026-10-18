package com.neviad.beneviadsystem.presentation.dto;

import com.neviad.beneviadsystem.domain.model.ApplicationHealth;

public record HealthResponse(String status, String service) {

    public static HealthResponse from(ApplicationHealth health) {
        return new HealthResponse(health.status(), health.service());
    }
}
