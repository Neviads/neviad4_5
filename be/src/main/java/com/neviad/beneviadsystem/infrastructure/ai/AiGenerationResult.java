package com.neviad.beneviadsystem.infrastructure.ai;

/** Text and the identity of the provider/model that produced it. */
public record AiGenerationResult(String text, String provider, String model) { }
