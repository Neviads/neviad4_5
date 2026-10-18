package com.neviad.beneviadsystem.infrastructure.ai;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FallbackAiClientTest {

    @Test
    void returnsThePrimaryProviderResponseWhenItSucceeds() {
        AtomicInteger fallbackCalls = new AtomicInteger();
        AiClient primary = prompt -> "primary response";
        AiClient fallback = prompt -> {
            fallbackCalls.incrementAndGet();
            return "fallback response";
        };

        String response = new FallbackAiClient(List.of(primary, fallback)).generate("hello");

        assertThat(response).isEqualTo("primary response");
        assertThat(fallbackCalls).hasValue(0);
    }

    @Test
    void usesTheNextProviderWhenThePrimaryProviderFails() {
        AiClient primary = prompt -> {
            throw new IllegalStateException("DeepSeek unavailable");
        };
        AiClient fallback = prompt -> "OpenAI response";

        String response = new FallbackAiClient(List.of(primary, fallback)).generate("hello");

        assertThat(response).isEqualTo("OpenAI response");
    }

    @Test
    void reportsAnErrorWhenEveryProviderFails() {
        AiClient unavailable = prompt -> {
            throw new IllegalStateException("provider unavailable");
        };

        assertThatThrownBy(() -> new FallbackAiClient(List.of(unavailable)).generate("hello"))
                .isInstanceOf(AiProviderUnavailableException.class)
                .hasCauseInstanceOf(IllegalStateException.class);
    }

    /** A provider that records the request it receives, to check what reaches it. */
    private static final class Recording implements AiClient {
        AiRequest seen;
        boolean fail;
        @Override public String generate(String prompt) { return prompt; }
        @Override public AiGenerationResult generate(AiRequest request) {
            seen = request;
            if (fail) throw new IllegalStateException("down");
            return new AiGenerationResult("ok", "fake", "m");
        }
    }

    @Test
    void forwardsTheSystemPromptOfARequestToTheProvider() {
        var provider = new Recording();

        var result = new FallbackAiClient(List.of(provider)).generate(AiRequest.of("SYSTEM", "USER"));

        assertThat(result.text()).isEqualTo("ok");
        assertThat(provider.seen.system()).isEqualTo("SYSTEM");
        assertThat(provider.seen.user()).isEqualTo("USER");
    }

    @Test
    void movesToTheNextProviderForARequestWhenNoToolRanYet() {
        var broken = new Recording();
        broken.fail = true;
        var healthy = new Recording();

        var result = new FallbackAiClient(List.of(broken, healthy)).generate(AiRequest.of("SYSTEM", "USER"));

        assertThat(result.text()).isEqualTo("ok");
        assertThat(healthy.seen.system()).isEqualTo("SYSTEM");
    }
}
