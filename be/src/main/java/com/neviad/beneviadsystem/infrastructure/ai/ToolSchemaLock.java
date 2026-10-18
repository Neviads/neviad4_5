package com.neviad.beneviadsystem.infrastructure.ai;

import java.util.function.Supplier;

/**
 * Building a tool callback makes Spring AI generate the JSON schema of its input type with a generator it shares between all threads, and the first time
 * two threads meet the same type that fails with "Conflicting property-based creators ... (1 arg)". Agents that run at once each build their tools, so every
 * build goes through this one lock: the tools of one agent are built together, and the next agent finds the schema already made.
 */
public final class ToolSchemaLock {
    private static final Object LOCK = new Object();

    private ToolSchemaLock() { }

    public static <T> T build(Supplier<T> builder) {
        synchronized (LOCK) {
            return builder.get();
        }
    }
}
