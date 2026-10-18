package com.neviad.beneviadsystem.infrastructure.ai.config;

import com.neviad.beneviadsystem.infrastructure.ai.AiClient;
import com.neviad.beneviadsystem.infrastructure.ai.AiProviderUnavailableException;
import com.neviad.beneviadsystem.infrastructure.ai.FallbackAiClient;
import com.neviad.beneviadsystem.infrastructure.ai.UnavailableAiClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AiClientConfigTest {
    private final AiClientConfig config = new AiClientConfig();

    @Test
    void createsAnUnavailableClientWhenNoProviderKeyIsConfigured() {
        AiClient client = config.aiClient(
                "", "https://api.deepseek.com", "deepseek-chat",
                "", "https://api.openai.com", "gpt-4o-mini", "medium", "high", 100000, 900L
        );

        assertThat(client).isInstanceOf(UnavailableAiClient.class);
        assertThatThrownBy(() -> client.generate("hello"))
                .isInstanceOf(AiProviderUnavailableException.class);
    }

    @Test
    void createsAFallbackClientWhenAtLeastOneProviderKeyIsConfigured() {
        AiClient client = config.aiClient(
                "deepseek-key", "https://api.deepseek.com", "deepseek-chat",
                "openai-key", "https://api.openai.com", "gpt-4o-mini", "medium", "high", 100000, 900L
        );

        assertThat(client).isInstanceOf(FallbackAiClient.class);
    }

    @Test
    void strictifiesFilesystemToolSchemasAtProviderBoundary() throws Exception {
        var payload = (com.fasterxml.jackson.databind.node.ObjectNode) new ObjectMapper().readTree("""
                {"tools":[{"type":"function","function":{"name":"edit_file","parameters":{"type":"object","properties":{"path":{"type":"string"},"replacement":{"type":"string"}}}}}]}""");

        config.strictifyToolSchemas(payload);

        var function = payload.path("tools").get(0).path("function");
        assertThat(function.path("strict").asBoolean()).isTrue();
        assertThat(function.path("parameters").path("additionalProperties").asBoolean()).isFalse();
        assertThat(function.path("parameters").path("required").get(0).asText()).isEqualTo("path");
        assertThat(function.path("parameters").path("required").get(1).asText()).isEqualTo("replacement");
    }

    @Test
    void strictifiesNestedToolObjectsAndArrayItems() throws Exception {
        var payload = (com.fasterxml.jackson.databind.node.ObjectNode) new ObjectMapper().readTree("""
                {"tools":[{"type":"function","function":{"name":"json_patch","parameters":
                {"type":"object","properties":{"operations":{"type":"array","items":{"type":"object","properties":{"op":{"type":"string"},"value":{"type":"string"}}}}}}}}]}
                """);

        config.strictifyToolSchemas(payload);

        var operation = payload.path("tools").get(0).path("function").path("parameters")
                .path("properties").path("operations").path("items");
        assertThat(operation.path("additionalProperties").asBoolean()).isFalse();
        assertThat(operation.path("required").get(0).asText()).isEqualTo("op");
        assertThat(operation.path("required").get(1).asText()).isEqualTo("value");
    }
}
