package com.neviad.beneviadsystem.infrastructure.ai;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UnavailableAiClientTest {

    @Test
    void explainsHowToConfigureAnAiProvider() {
        assertThatThrownBy(() -> new UnavailableAiClient().generate("hello"))
                .isInstanceOf(AiProviderUnavailableException.class)
                .hasMessageContaining("APP_AI_DEEPSEEK_API_KEY");
    }
}
