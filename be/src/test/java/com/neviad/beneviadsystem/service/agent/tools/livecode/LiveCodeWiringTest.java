package com.neviad.beneviadsystem.service.agent.tools.livecode;

import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/** Verifies the Spring wiring of the bridge without booting the whole app. */
class LiveCodeWiringTest {

    @Configuration
    @Import({StompLiveCodeBridge.class, LiveCodeMessageHandler.class})
    static class TestConfig {
        @Bean SimpMessagingTemplate messagingTemplate() { return mock(SimpMessagingTemplate.class); }
    }

    @Test
    void theBridgeAndItsMessageHandlerWire() {
        try (var context = new AnnotationConfigApplicationContext()) {
            context.register(TestConfig.class);
            context.refresh();

            assertThat(context.getBean(LiveCodeBridge.class)).isInstanceOf(StompLiveCodeBridge.class);
            assertThat(context.getBean(LiveCodeMessageHandler.class)).isNotNull();
        }
    }
}
