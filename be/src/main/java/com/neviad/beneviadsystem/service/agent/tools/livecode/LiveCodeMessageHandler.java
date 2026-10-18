package com.neviad.beneviadsystem.service.agent.tools.livecode;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;

/** Receives tool results from the frontend editor. Must stay non-blocking: it only completes a future. */
@Controller
public class LiveCodeMessageHandler {
    private final StompLiveCodeBridge bridge;

    public LiveCodeMessageHandler(StompLiveCodeBridge bridge) {
        this.bridge = bridge;
    }

    @MessageMapping("/agents/livecode/result")
    public void result(LiveCodeProtocol.Result result) {
        bridge.complete(result);
    }
}
