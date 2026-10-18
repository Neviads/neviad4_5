package com.neviad.beneviadsystem.infrastructure.ai.config;

import com.neviad.beneviadsystem.infrastructure.ai.AiClient;
import com.neviad.beneviadsystem.infrastructure.ai.FallbackAiClient;
import com.neviad.beneviadsystem.infrastructure.ai.OpenAiResponsesToolLoop;
import com.neviad.beneviadsystem.infrastructure.ai.UnavailableAiClient;
import com.neviad.beneviadsystem.infrastructure.ai.adapter.DeepSeekAdapter;
import com.neviad.beneviadsystem.infrastructure.ai.adapter.OpenAiAdapter;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Configuration
public class AiClientConfig {
    private static final int MAX_TOKENS = 8_192;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Bean
    @Primary
    AiClient aiClient(
            @Value("${app.ai.deepseek.api-key:}") String deepSeekApiKey,
            @Value("${app.ai.deepseek.base-url:https://api.deepseek.com}") String deepSeekBaseUrl,
            @Value("${app.ai.deepseek.default-model:deepseek-chat}") String deepSeekModel,
            @Value("${app.ai.openai.api-key:}") String openAiApiKey,
            @Value("${app.ai.openai.base-url:https://api.openai.com}") String openAiBaseUrl,
            @Value("${app.ai.openai.default-model:gpt-4o-mini}") String openAiModel,
            @Value("${app.ai.openai.agent.reasoning-effort:medium}") String agentReasoningEffort,
            @Value("${app.ai.openai.agent.code-reasoning-effort:high}") String agentCodeReasoningEffort,
            @Value("${app.ai.openai.agent.max-output-tokens:100000}") int agentMaxOutputTokens,
            @Value("${app.ai.openai.agent.request-timeout-seconds:900}") long agentTimeoutSeconds
    ) {
        List<AiClient> providers = new ArrayList<>();
        if (StringUtils.hasText(openAiApiKey)) {
            // Chat Completions refuses function tools once reasoning is on, so iterative agents use /v1/responses.
            var reasoningLoop = StringUtils.hasText(agentReasoningEffort)
                    ? new OpenAiResponsesToolLoop(openAiBaseUrl, openAiApiKey, agentReasoningEffort,
                            StringUtils.hasText(agentCodeReasoningEffort) ? agentCodeReasoningEffort : agentReasoningEffort,
                            agentMaxOutputTokens, Duration.ofSeconds(agentTimeoutSeconds))
                    : null;
            providers.add(new OpenAiAdapter(createOpenAiModel(openAiApiKey, openAiBaseUrl, openAiModel), openAiModel, reasoningLoop));
        }
        if (StringUtils.hasText(deepSeekApiKey)) {
            providers.add(new DeepSeekAdapter(createDeepSeekModel(deepSeekApiKey, deepSeekBaseUrl, deepSeekModel), deepSeekModel));
        }

        return providers.isEmpty() ? new UnavailableAiClient() : new FallbackAiClient(providers);
    }

    private OpenAiChatModel createDeepSeekModel(String apiKey, String baseUrl, String model) {
        var api = OpenAiApi.builder()
                .baseUrl(baseUrl)
                .apiKey(apiKey)
                .restClientBuilder(RestClient.builder()
                        .requestInterceptor(this::prepareDeepSeekRequest))
                .build();
        return createChatModel(api, model, false);
    }

    private OpenAiChatModel createOpenAiModel(String apiKey, String baseUrl, String model) {
        var api = OpenAiApi.builder()
                .baseUrl(baseUrl)
                .apiKey(apiKey)
                .restClientBuilder(RestClient.builder()
                        .requestInterceptor(this::enforceStrictToolSchemas))
                .build();
        return createChatModel(api, model, true);
    }

    private OpenAiChatModel createChatModel(OpenAiApi api, String model, boolean usesMaxCompletionTokens) {
        var options = OpenAiChatOptions.builder().model(model);
        if (usesMaxCompletionTokens) {
            // GPT-6 Luna accepts custom function tools through Chat Completions only
            // when reasoning is disabled; retain DeepSeek's existing defaults below.
            options.maxCompletionTokens(MAX_TOKENS).reasoningEffort("none");
        } else {
            options.maxTokens(MAX_TOKENS);
        }
        return OpenAiChatModel.builder()
                .openAiApi(api)
                .defaultOptions(options.build())
                .build();
    }

    private ClientHttpResponse enforceStrictToolSchemas(
            HttpRequest request,
            byte[] body,
            ClientHttpRequestExecution execution
    ) throws IOException {
        return rewriteRequest(request, body, execution, false);
    }

    private ClientHttpResponse prepareDeepSeekRequest(
            HttpRequest request,
            byte[] body,
            ClientHttpRequestExecution execution
    ) throws IOException {
        return rewriteRequest(request, body, execution, true);
    }

    private ClientHttpResponse rewriteRequest(
            HttpRequest request,
            byte[] body,
            ClientHttpRequestExecution execution,
            boolean deepSeek
    ) throws IOException {
        if (body.length == 0) {
            return execution.execute(request, body);
        }

        var payload = objectMapper.readTree(body);
        if (!(payload instanceof ObjectNode objectPayload)) {
            return execution.execute(request, body);
        }

        strictifyToolSchemas(objectPayload);
        if (deepSeek) objectPayload.putObject("thinking").put("type", "disabled");
        byte[] updatedBody = objectMapper.writeValueAsBytes(objectPayload);
        request.getHeaders().setContentLength(updatedBody.length);
        return execution.execute(request, updatedBody);
    }

    /**
     * Spring AI 1.0.0 serializes FunctionTool definitions without the OpenAI
     * function-level strict flag. Enforce it at the provider boundary and make
     * object parameters compatible with strict function calling.
     */
    void strictifyToolSchemas(ObjectNode payload) {
        JsonNode tools = payload.get("tools");
        if (tools == null || !tools.isArray()) return;
        for (JsonNode toolNode : tools) {
            if (!(toolNode instanceof ObjectNode tool)) continue;
            if (!(tool.get("function") instanceof ObjectNode function)) continue;
            function.put("strict", true);
            strictifySchema(function.get("parameters"));
        }
    }

    /** Strict function calling applies to nested objects too, including array items and anyOf branches. */
    private void strictifySchema(JsonNode schema) {
        if (!(schema instanceof ObjectNode object)) return;
        if ("object".equals(object.path("type").asText())
                || object.get("properties") instanceof ObjectNode) {
            object.put("additionalProperties", false);
            if (object.get("properties") instanceof ObjectNode properties) {
                ArrayNode required = objectMapper.createArrayNode();
                properties.fieldNames().forEachRemaining(required::add);
                object.set("required", required);
                properties.elements().forEachRemaining(this::strictifySchema);
            }
        }
        if (schema.get("items") != null) strictifySchema(schema.get("items"));
        if (schema.get("additionalItems") != null) strictifySchema(schema.get("additionalItems"));
        for (String branch : List.of("anyOf", "oneOf", "allOf", "prefixItems")) {
            JsonNode branches = schema.get(branch);
            if (branches != null && branches.isArray()) branches.forEach(this::strictifySchema);
        }
    }
}
