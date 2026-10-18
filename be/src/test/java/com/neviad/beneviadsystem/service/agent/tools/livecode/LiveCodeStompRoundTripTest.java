package com.neviad.beneviadsystem.service.agent.tools.livecode;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Real embedded server + a Java STOMP client acting as the browser's copy of the tree. Covers the JSON wire contract, the
 * destination names and, above all, large replies: a browser answering fsRead sends the whole file in one WebSocket message,
 * and the server must not close the socket for it.
 */
@SpringBootTest(classes = LiveCodeTestApp.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class LiveCodeStompRoundTripTest {
    private static final String PATH = "engines/x/engine.ts";

    @LocalServerPort int port;
    @Autowired StompLiveCodeBridge bridge;

    private WebSocketStompClient client;
    private StompSession session;
    /** The browser's files, and the operations it was asked to do. */
    private final Map<String, String> files = new ConcurrentHashMap<>();
    private final List<String> ops = new ArrayList<>();

    @BeforeEach
    void connect() throws Exception {
        client = new WebSocketStompClient(new StandardWebSocketClient());
        client.setMessageConverter(new MappingJackson2MessageConverter());
        client.setInboundMessageSizeLimit(2 * 1024 * 1024);
        session = client.connectAsync("ws://localhost:" + port + "/ws", new StompSessionHandlerAdapter() { }).get(10, TimeUnit.SECONDS);
    }

    @AfterEach
    void disconnect() {
        if (session != null && session.isConnected()) session.disconnect();
        client.stop();
    }

    private LiveCodeProtocol.Result answer(LiveCodeProtocol.Call call) {
        synchronized (ops) { ops.add(call.op()); }
        String path = String.valueOf(call.args().get("path"));
        return switch (call.op()) {
            case LiveCodeProtocol.OP_FS_READ -> files.containsKey(path)
                    ? new LiveCodeProtocol.Result(call.callId(), call.runId(), true, Map.of("content", files.get(path)), null)
                    : LiveCodeProtocol.Result.failure(call.callId(), call.runId(), "NOT_FOUND", path);
            case LiveCodeProtocol.OP_FS_WRITE -> {
                files.put(path, String.valueOf(call.args().get("content")));
                yield new LiveCodeProtocol.Result(call.callId(), call.runId(), true, Map.of("path", path), null);
            }
            default -> LiveCodeProtocol.Result.failure(call.callId(), call.runId(), "UNKNOWN_OP", call.op());
        };
    }

    /** Subscribes like the frontend bridge does and answers every call from the in-memory files. */
    private void startBrowser(String runId) {
        session.subscribe(StompLiveCodeBridge.TOPIC_PREFIX + runId, new StompFrameHandler() {
            @Override public Type getPayloadType(StompHeaders headers) { return LiveCodeProtocol.Call.class; }
            @Override public void handleFrame(StompHeaders headers, Object payload) {
                session.send("/app/agents/livecode/result", answer((LiveCodeProtocol.Call) payload));
            }
        });
        // The simple broker gives no subscription receipt, so probe until the browser answers (anything but TIMEOUT).
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
        while (true) {
            var probe = bridge.call(runId, LiveCodeProtocol.OP_FS_READ, Map.of("path", PATH), Duration.ofMillis(300));
            if (probe.message() == null || !probe.message().startsWith(LiveCodeProtocol.ERROR_TIMEOUT)) break;
            assertThat(System.nanoTime()).as("browser subscription did not become active").isLessThan(deadline);
        }
        synchronized (ops) { ops.clear(); }
    }

    @Test
    void writeAndReadTravelOverRealStomp() {
        startBrowser("rt-1");
        String source = "export const vậnTốc = 1;";

        var written = bridge.call("rt-1", LiveCodeProtocol.OP_FS_WRITE, Map.of("path", PATH, "content", source), Duration.ofSeconds(5));
        var read = bridge.call("rt-1", LiveCodeProtocol.OP_FS_READ, Map.of("path", PATH), Duration.ofSeconds(5));

        assertThat(written.ok()).as(String.valueOf(written.message())).isTrue();
        assertThat(read.get("content")).isEqualTo(source);
        assertThat(bridge.pendingCount()).isZero();
    }

    @Test
    void aReplyAboveTwentyKilobytesDoesNotCloseTheSocket() {
        startBrowser("rt-large");
        // Multi-byte text like a real Vietnamese source file. The browser already holds it, so only the reply
        // (browser -> backend, one WebSocket message of ~120 KB) is large; that is the direction a browser uses for fsRead.
        String source = "/*" + "đ".repeat(60_000) + "*/";
        files.put(PATH, source);

        var read = bridge.call("rt-large", LiveCodeProtocol.OP_FS_READ, Map.of("path", PATH), Duration.ofSeconds(5));

        assertThat(read.ok()).as(String.valueOf(read.message())).isTrue();
        assertThat(String.valueOf(read.get("content"))).hasSize(source.length());
        assertThat(session.isConnected()).as("the STOMP socket must stay open").isTrue();
    }

    @Test
    void aRunWithNoBrowserConnectedFailsFastAsTimeoutNotAHang() {
        var read = bridge.call("rt-nobody", LiveCodeProtocol.OP_FS_READ, Map.of("path", PATH), Duration.ofMillis(300));

        assertThat(read.ok()).isFalse();
        assertThat(read.message()).startsWith(LiveCodeProtocol.ERROR_TIMEOUT);
    }

    @Test
    void anotherRunsBrowserCannotAnswerMyCalls() {
        startBrowser("rt-a");

        var read = bridge.call("rt-b", LiveCodeProtocol.OP_FS_READ, Map.of("path", PATH), Duration.ofMillis(500));

        assertThat(read.ok()).isFalse();
        synchronized (ops) { assertThat(ops).isEmpty(); }
    }
}
