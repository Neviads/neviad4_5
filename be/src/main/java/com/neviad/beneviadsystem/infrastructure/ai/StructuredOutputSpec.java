package com.neviad.beneviadsystem.infrastructure.ai;

import java.util.Map;
import java.util.Objects;

/**
 * Provider-neutral description of an OpenAI-compatible strict structured output.
 * The schema is kept as a JSON-compatible map so it can be sent unchanged by
 * OpenAI and OpenAI-compatible providers such as DeepSeek.
 */
public record StructuredOutputSpec(String name, Map<String, Object> schema, boolean strict) {
    public StructuredOutputSpec(String name, Map<String, Object> schema) {
        this(name, schema, true);
    }

    public StructuredOutputSpec {
        if (name == null || name.isBlank()) throw new IllegalArgumentException("Structured output name is required");
        Objects.requireNonNull(schema, "Structured output schema is required");
        schema = Map.copyOf(schema);
    }

    public static StructuredOutputSpec strict(String name, Map<String, Object> schema) {
        return new StructuredOutputSpec(name, schema, true);
    }
}
