package com.neviad.beneviadsystem.service;

import com.neviad.beneviadsystem.domain.model.ApplicationHealth;
import org.springframework.stereotype.Service;

@Service
public class HealthService {

    public ApplicationHealth getHealth() {
        return new ApplicationHealth("UP", "be-neviad-system");
    }
}
