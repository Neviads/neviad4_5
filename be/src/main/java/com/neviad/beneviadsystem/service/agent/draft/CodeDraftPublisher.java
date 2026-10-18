package com.neviad.beneviadsystem.service.agent.draft;

import com.neviad.beneviadsystem.presentation.dto.simulation.RunDraft;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.function.Consumer;

/**
 * Sends {@link RunDraft} events to {@code /topic/agents/simulation/{runId}/draft}, the topic the frontend's
 * {@code useLiveCode} already listens to for the run. A failed send is dropped: a preview never stops an agent.
 */
@Component
public class CodeDraftPublisher {
    private static final Logger log = LoggerFactory.getLogger(CodeDraftPublisher.class);
    private final SimpMessagingTemplate messaging;

    public CodeDraftPublisher(SimpMessagingTemplate messaging) { this.messaging = messaging; }

    public static String topic(String runId) { return "/topic/agents/simulation/" + runId + "/draft"; }

    public void publish(RunDraft draft) {
        try {
            messaging.convertAndSend(topic(draft.runId()), draft);
        } catch (RuntimeException failure) {
            log.debug("Could not publish code draft: runId={}, error={}", draft.runId(), failure.getMessage());
        }
    }

    /** A streamer for one run whose events go straight to the run's draft topic, ending each file with END (code agents write into the browser copy, which has no store event). */
    public CodeDraftStreamer streamer(String runId) { return new CodeDraftStreamer(runId, this::publish, CodeDraftStreamer.CODE_AGENT_TOOLS, true); }

    /** Same, but every event carries {@code title}: for agents that draw one object each while others draw on the same run. */
    public CodeDraftStreamer streamer(String runId, String title) { return new CodeDraftStreamer(runId, this::publish, CodeDraftStreamer.CODE_AGENT_TOOLS, true, title); }

    /** Same, for an agent that may write only {@code path}: the path is on every event from the start. */
    public CodeDraftStreamer streamer(String runId, String title, String path) { return new CodeDraftStreamer(runId, this::publish, CodeDraftStreamer.CODE_AGENT_TOOLS, true, title, path); }

    public Consumer<RunDraft> sink() { return this::publish; }
}
