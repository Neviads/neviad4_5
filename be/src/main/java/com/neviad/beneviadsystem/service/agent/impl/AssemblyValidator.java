package com.neviad.beneviadsystem.service.agent.impl;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.List;

/** The deterministic check of an assembled machine: the parts attach by their ports and move when the machine input changes. */
public interface AssemblyValidator {
    /** {@code js} is the compiled code of one part, {@code name} its drawing function. */
    record Part(String id, String name, String js) { }

    /** Empty means the assembly passed; a crash of the checker is a problem, never a pass. */
    List<String> validate(JsonNode plan, List<Part> parts);
}
