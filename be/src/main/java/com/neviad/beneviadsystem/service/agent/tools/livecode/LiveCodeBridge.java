package com.neviad.beneviadsystem.service.agent.tools.livecode;

import java.time.Duration;
import java.util.Map;

/** Executes one tool operation against the frontend that owns the generated source. */
public interface LiveCodeBridge {
    /**
     * Blocks until the frontend answers or the timeout elapses. Never throws for transport
     * problems: they come back as a failed {@link LiveCodeProtocol.Result} so the model can see them.
     */
    LiveCodeProtocol.Result call(String runId, String op, Map<String, Object> args, Duration timeout);
}
