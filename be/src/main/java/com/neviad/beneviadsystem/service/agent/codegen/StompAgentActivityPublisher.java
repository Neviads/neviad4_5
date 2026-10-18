package com.neviad.beneviadsystem.service.agent.codegen;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/** Publishes every step to {@code /topic/agents/activity/{runId}}. */
@Component
public class StompAgentActivityPublisher implements AgentActivityPublisher {
    private static final Logger log = LoggerFactory.getLogger(StompAgentActivityPublisher.class);
    private final SimpMessagingTemplate messaging;

    public StompAgentActivityPublisher(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    @Override
    public void publish(AgentActivity activity) {
        try {
            messaging.convertAndSend(AgentActivity.TOPIC_PREFIX + activity.runId(), activity);
        } catch (RuntimeException exception) {
            log.debug("Không gửi được bước của agent: {}", exception.getMessage());
        }
    }
}
