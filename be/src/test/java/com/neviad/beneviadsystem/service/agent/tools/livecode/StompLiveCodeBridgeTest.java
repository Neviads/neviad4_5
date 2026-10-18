package com.neviad.beneviadsystem.service.agent.tools.livecode;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Duration;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class StompLiveCodeBridgeTest {

    @Test
    void completesTheMatchingCallAndPublishesToTheRunTopic() {
        var template = mock(SimpMessagingTemplate.class);
        var bridge = new StompLiveCodeBridge(template);
        doAnswer(invocation -> {
            var call = (LiveCodeProtocol.Call) invocation.getArgument(1);
            new Thread(() -> bridge.complete(new LiveCodeProtocol.Result(call.callId(), call.runId(), true,
                    Map.of("content", "export const x = 1;"), "ok"))).start();
            return null;
        }).when(template).convertAndSend(eq("/topic/agents/livecode/run-1"), any(Object.class));

        var result = bridge.call("run-1", LiveCodeProtocol.OP_FS_READ, Map.of("path", "engines/x/engine.ts"), Duration.ofSeconds(2));

        assertThat(result.ok()).isTrue();
        assertThat(result.get("content")).isEqualTo("export const x = 1;");
        var sent = ArgumentCaptor.forClass(Object.class);
        verify(template).convertAndSend(eq("/topic/agents/livecode/run-1"), sent.capture());
        assertThat(((LiveCodeProtocol.Call) sent.getValue()).op()).isEqualTo("fsRead");
        assertThat(bridge.pendingCount()).isZero();
    }

    @Test
    void ignoresAResultFromADifferentRun() {
        var template = mock(SimpMessagingTemplate.class);
        var bridge = new StompLiveCodeBridge(template);
        var spoofAccepted = new boolean[]{true};
        doAnswer(invocation -> {
            var call = (LiveCodeProtocol.Call) invocation.getArgument(1);
            spoofAccepted[0] = bridge.complete(new LiveCodeProtocol.Result(call.callId(), "another-run", true, Map.of(), "spoof"));
            return null;
        }).when(template).convertAndSend(eq("/topic/agents/livecode/run-1"), any(Object.class));

        var result = bridge.call("run-1", LiveCodeProtocol.OP_FS_READ, Map.of(), Duration.ofMillis(200));

        assertThat(spoofAccepted[0]).isFalse();
        assertThat(result.ok()).isFalse();
        assertThat(result.message()).startsWith(LiveCodeProtocol.ERROR_TIMEOUT);
    }

    @Test
    void timesOutAsAFailedResultAndCleansUp() {
        var bridge = new StompLiveCodeBridge(mock(SimpMessagingTemplate.class));

        var result = bridge.call("run-1", LiveCodeProtocol.OP_FS_LIST, Map.of(), Duration.ofMillis(100));

        assertThat(result.ok()).isFalse();
        assertThat(result.message()).startsWith(LiveCodeProtocol.ERROR_TIMEOUT);
        assertThat(bridge.pendingCount()).isZero();
    }

    @Test
    void reportsTransportErrorsInsteadOfThrowing() {
        var template = mock(SimpMessagingTemplate.class);
        doThrow(new IllegalStateException("broker down")).when(template).convertAndSend(any(String.class), any(Object.class));
        var bridge = new StompLiveCodeBridge(template);

        var result = bridge.call("run-1", LiveCodeProtocol.OP_FS_READ, Map.of(), Duration.ofSeconds(1));

        assertThat(result.ok()).isFalse();
        assertThat(result.message()).startsWith(LiveCodeProtocol.ERROR_BRIDGE);
        assertThat(bridge.pendingCount()).isZero();
    }

    @Test
    void unknownOrMalformedResultsAreRejected() {
        var bridge = new StompLiveCodeBridge(mock(SimpMessagingTemplate.class));

        assertThat(bridge.complete(null)).isFalse();
        assertThat(bridge.complete(new LiveCodeProtocol.Result(null, "run-1", true, Map.of(), null))).isFalse();
        assertThat(bridge.complete(new LiveCodeProtocol.Result("nope", "run-1", true, Map.of(), null))).isFalse();
    }

    @Test
    void messageHandlerHandsResultsToTheBridge() {
        var template = mock(SimpMessagingTemplate.class);
        var bridge = new StompLiveCodeBridge(template);
        var handler = new LiveCodeMessageHandler(bridge);
        doAnswer(invocation -> {
            var call = (LiveCodeProtocol.Call) invocation.getArgument(1);
            new Thread(() -> handler.result(new LiveCodeProtocol.Result(call.callId(), call.runId(), true, Map.of("path", "engines/x/engine.ts"), "ok"))).start();
            return null;
        }).when(template).convertAndSend(any(String.class), any(Object.class));

        var result = bridge.call("run-9", LiveCodeProtocol.OP_FS_WRITE, Map.of("path", "engines/x/engine.ts", "content", "x"), Duration.ofSeconds(2));

        assertThat(result.ok()).isTrue();
        assertThat(result.get("path")).isEqualTo("engines/x/engine.ts");
    }
}
