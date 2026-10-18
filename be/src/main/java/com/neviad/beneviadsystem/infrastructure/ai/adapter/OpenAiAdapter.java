package com.neviad.beneviadsystem.infrastructure.ai.adapter;

import com.neviad.beneviadsystem.infrastructure.ai.AiClient;
import com.neviad.beneviadsystem.infrastructure.ai.AiGenerationResult;
import com.neviad.beneviadsystem.infrastructure.ai.AiRequest;
import com.neviad.beneviadsystem.infrastructure.ai.OpenAiResponsesToolLoop;
import com.neviad.beneviadsystem.infrastructure.ai.SpringAiToolCalling;
import com.neviad.beneviadsystem.infrastructure.ai.StructuredOutputSchemaRegistry;
import com.neviad.beneviadsystem.infrastructure.ai.StructuredOutputSpec;
import com.neviad.beneviadsystem.infrastructure.ai.ToolStreamListener;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.ResponseFormat;
import org.springframework.util.StringUtils;

import java.util.List;

/**
 * OpenAI-backed implementation of the provider-neutral AI client.
 */
public final class OpenAiAdapter implements AiClient {
    private final ChatModel chatModel;
    private final String model;
    private final OpenAiResponsesToolLoop reasoningLoop;

    public OpenAiAdapter(ChatModel chatModel) {
        this(chatModel, "unknown");
    }

    public OpenAiAdapter(ChatModel chatModel, String model) {
        this(chatModel, model, null);
    }

    /** {@code reasoningLoop} (optional) serves the iterative agents that need reasoning together with tools. */
    public OpenAiAdapter(ChatModel chatModel, String model, OpenAiResponsesToolLoop reasoningLoop) {
        this.chatModel = chatModel;
        this.model = model;
        this.reasoningLoop = reasoningLoop;
    }

    @Override
    public String generate(String prompt) {
        return generateDetailed(prompt, true).text();
    }

    @Override
    public String generateJson(String prompt) {
        return generateDetailed(prompt, true).text();
    }

    @Override
    public AiGenerationResult generateDetailed(String prompt, boolean jsonMode) {
        return jsonMode ? generateDetailed(prompt, StructuredOutputSchemaRegistry.GENERIC)
                : textResponse(prompt);
    }

    @Override
    public AiGenerationResult generateDetailed(String prompt, StructuredOutputSpec spec) {
        var response = chatModel.call(new Prompt(prompt, options(spec)));
        return response("openai", response);
    }

    @Override
    public AiGenerationResult generateWithTools(String prompt, List<ToolCallback> tools) {
        return SpringAiToolCalling.generate(chatModel, "openai", model, prompt, tools, StructuredOutputSchemaRegistry.RUNTIME_MODULE_STATUS);
    }

    @Override
    public AiGenerationResult generateWithTools(String prompt, List<ToolCallback> tools, StructuredOutputSpec spec) {
        if (tools == null || tools.isEmpty()) return generateDetailed(prompt, spec);
        return SpringAiToolCalling.generate(chatModel, "openai", model, prompt, tools, spec);
    }

    @Override
    public AiGenerationResult generateWithTools(String prompt, List<ToolCallback> tools, StructuredOutputSpec spec, int maxToolCalls) {
        if (tools == null || tools.isEmpty()) return generateDetailed(prompt, spec);
        if (reasoningLoop != null) return reasoningLoop.generate(model, prompt, tools, spec, maxToolCalls);
        return SpringAiToolCalling.generate(chatModel, "openai", model, prompt, tools, spec, maxToolCalls);
    }

    @Override
    public AiGenerationResult generateWithTools(String prompt, List<ToolCallback> tools, StructuredOutputSpec spec, int maxToolCalls,
                                                ToolStreamListener listener) {
        if (tools == null || tools.isEmpty()) return generateDetailed(prompt, spec);
        if (reasoningLoop != null) return reasoningLoop.generate(model, prompt, tools, spec, maxToolCalls, listener);
        return SpringAiToolCalling.generate(chatModel, "openai", model, prompt, tools, spec, maxToolCalls);
    }

    @Override
    public AiGenerationResult generateReasoned(String prompt, StructuredOutputSpec spec) {
        if (reasoningLoop == null) return generateDetailed(prompt, spec);
        return reasoningLoop.generate(model, prompt, List.of(), spec, 1);
    }

    /** A request with a system prompt reaches the model as a real system/instructions message; without one the old paths run. */
    @Override
    public AiGenerationResult generate(AiRequest request) {
        if (!request.hasSystem()) return AiClient.super.generate(request);
        StructuredOutputSpec spec = request.schema() != null ? request.schema() : StructuredOutputSchemaRegistry.GENERIC;
        if (request.hasImages()) {
            // Pictures in the user message need the Responses API; without it, refuse rather than drop them.
            if (reasoningLoop == null) throw new UnsupportedOperationException("OpenAI provider chưa bật Responses API nên không gửi được ảnh.");
            int budget = request.hasTools() ? (request.maxToolCalls() > 0 ? request.maxToolCalls() : 4) : 1;
            return reasoningLoop.generate(model, request.system(), request.user(), request.images(), request.tools(), spec, budget, request.listener(), request.reasoningEffort());
        }
        if (request.hasTools()) {
            int budget = request.maxToolCalls() > 0 ? request.maxToolCalls() : 4;
            if (reasoningLoop != null) return reasoningLoop.generate(model, request.system(), request.user(), request.tools(), request.schema(), budget, request.listener(), request.reasoningEffort());
            return SpringAiToolCalling.generate(chatModel, "openai", model, request.system(), request.user(), request.tools(), request.schema(), budget);
        }
        if (request.reasoned() && reasoningLoop != null) {
            return reasoningLoop.generate(model, request.system(), request.user(), List.of(), spec, 1, null);
        }
        var prompt = new Prompt(List.of(new SystemMessage(request.system()), new UserMessage(request.user())), options(spec));
        return response("openai", chatModel.call(prompt));
    }

    @Override
    public AiGenerationResult generateToolOnly(String prompt, List<ToolCallback> tools) {
        return SpringAiToolCalling.generateToolOnly(chatModel, "openai", model, prompt, tools);
    }

    private AiGenerationResult textResponse(String prompt) {
        var response = chatModel.call(new Prompt(prompt));
        return response("openai", response);
    }

    private OpenAiChatOptions options(StructuredOutputSpec spec) {
        var schema = ResponseFormat.JsonSchema.builder()
                .name(spec.name())
                .schema(spec.schema())
                .strict(spec.strict())
                .build();
        return OpenAiChatOptions.builder()
                .responseFormat(ResponseFormat.builder()
                        .type(ResponseFormat.Type.JSON_SCHEMA)
                        .jsonSchema(schema)
                        .build())
                .build();
    }

    private AiGenerationResult response(String provider, org.springframework.ai.chat.model.ChatResponse response) {
        if (response == null || response.getResult() == null || response.getResult().getOutput() == null) {
            throw new IllegalStateException(provider + " returned an empty structured response");
        }
        var output = response.getResult().getOutput();
        Object refusal = output.getMetadata().get("refusal");
        if (refusal != null && StringUtils.hasText(String.valueOf(refusal))) {
            throw new IllegalStateException(provider + " refused structured output: " + refusal);
        }
        String finishReason = response.getResult().getMetadata().getFinishReason();
        if (finishReason != null && ("length".equalsIgnoreCase(finishReason) || "content_filter".equalsIgnoreCase(finishReason))) {
            throw new IllegalStateException(provider + " returned incomplete structured output (" + finishReason + ")");
        }
        if (output.getText() == null || output.getText().isBlank()) {
            throw new IllegalStateException(provider + " returned an empty structured output");
        }
        return new AiGenerationResult(output.getText(), provider, model);
    }
}
