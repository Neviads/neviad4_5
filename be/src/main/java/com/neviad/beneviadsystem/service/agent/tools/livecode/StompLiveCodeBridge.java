package com.neviad.beneviadsystem.service.agent.tools.livecode;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/** STOMP request/response bridge: publishes a call to the run's topic and waits for the matching result. */
@Service
public class StompLiveCodeBridge implements LiveCodeBridge {
    public static final String TOPIC_PREFIX = "/topic/agents/livecode/";
    private static final Logger log = LoggerFactory.getLogger(StompLiveCodeBridge.class);

    private record Pending(String runId, CompletableFuture<LiveCodeProtocol.Result> future) { }

    private final SimpMessagingTemplate messagingTemplate;
    private final Map<String, Pending> pending = new ConcurrentHashMap<>();

    public StompLiveCodeBridge(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @Override
    public LiveCodeProtocol.Result call(String runId, String op, Map<String, Object> args, Duration timeout) {
        String callId = UUID.randomUUID().toString();
        var future = new CompletableFuture<LiveCodeProtocol.Result>();
        pending.put(callId, new Pending(runId, future));
        try {
            messagingTemplate.convertAndSend(TOPIC_PREFIX + runId,
                    new LiveCodeProtocol.Call(callId, runId, op, args == null ? Map.of() : args));
            return future.get(timeout.toMillis(), TimeUnit.MILLISECONDS);
        } catch (TimeoutException exception) {
            return LiveCodeProtocol.Result.failure(callId, runId, LiveCodeProtocol.ERROR_TIMEOUT,
                    "the editor did not answer '" + op + "' within " + timeout.toSeconds() + "s; it may be closed or disconnected");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return LiveCodeProtocol.Result.failure(callId, runId, LiveCodeProtocol.ERROR_INTERRUPTED, "the call was interrupted");
        } catch (ExecutionException | RuntimeException exception) {
            log.warn("Live code call failed: runId={}, op={}, error={}", runId, op, exception.toString());
            return LiveCodeProtocol.Result.failure(callId, runId, LiveCodeProtocol.ERROR_BRIDGE, "could not reach the editor");
        } finally {
            pending.remove(callId);
        }
    }

    /**
     * Called by the message handler. A result is accepted only for a pending call of the same run,
     * so one tab cannot answer another run's calls. Returns false when nothing matched.
     */
    public boolean complete(LiveCodeProtocol.Result result) {
        if (result == null || result.callId() == null) return false;
        Pending entry = pending.get(result.callId());
        if (entry == null || entry.runId() == null || !entry.runId().equals(result.runId())) return false;
        return entry.future().complete(result);
    }

    int pendingCount() { return pending.size(); }
}
