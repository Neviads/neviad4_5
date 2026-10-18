package com.neviad.beneviadsystem.service.agent.codegen;

/** Where the steps of an agent go. An implementation must not throw: a display problem never stops an agent. */
@FunctionalInterface
public interface AgentActivityPublisher {
    AgentActivityPublisher NONE = activity -> { };

    void publish(AgentActivity activity);
}
