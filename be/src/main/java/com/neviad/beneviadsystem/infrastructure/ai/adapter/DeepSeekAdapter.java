package com.neviad.beneviadsystem.infrastructure.ai.adapter;

import com.neviad.beneviadsystem.infrastructure.ai.AiClient;
import com.neviad.beneviadsystem.infrastructure.ai.AiGenerationResult;
import com.neviad.beneviadsystem.infrastructure.ai.AiRequest;
import com.neviad.beneviadsystem.infrastructure.ai.SpringAiToolCalling;
import com.neviad.beneviadsystem.infrastructure.ai.StructuredOutputSchemaRegistry;
import com.neviad.beneviadsystem.infrastructure.ai.StructuredOutputSpec;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.util.StringUtils;

import java.util.List;

/**
 * DeepSeek exposes an OpenAI-compatible chat-completions API, so it uses the
 * same Spring AI ChatModel abstraction as OpenAI.
 */
public final class DeepSeekAdapter implements AiClient {
    private final ChatModel chatModel;
    private final String model;

    public DeepSeekAdapter(ChatModel chatModel) {
        this(chatModel, "unknown");
    }

    public DeepSeekAdapter(ChatModel chatModel, String model) {
        this.chatModel = chatModel;
        this.model = model;
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
        return textResponse(jsonOnlyPrompt(prompt, spec));
    }

    @Override
    public AiGenerationResult generateWithTools(String prompt, List<ToolCallback> tools) {
        return SpringAiToolCalling.generate(chatModel, "deepseek", model,
                jsonOnlyPrompt(prompt, StructuredOutputSchemaRegistry.RUNTIME_MODULE_STATUS), tools);
    }

    @Override
    public AiGenerationResult generateWithTools(String prompt, List<ToolCallback> tools, StructuredOutputSpec spec) {
        if (tools == null || tools.isEmpty()) return generateDetailed(prompt, spec);
        return SpringAiToolCalling.generate(chatModel, "deepseek", model, jsonOnlyPrompt(prompt, spec), tools);
    }

    @Override
    public AiGenerationResult generateWithTools(String prompt, List<ToolCallback> tools, StructuredOutputSpec spec, int maxToolCalls) {
        if (tools == null || tools.isEmpty()) return generateDetailed(prompt, spec);
        return SpringAiToolCalling.generate(chatModel, "deepseek", model, jsonOnlyPrompt(prompt, spec), tools, null, maxToolCalls);
    }

    /** A request with a system prompt reaches the model as a real system message; without one the old paths run. */
    @Override
    public AiGenerationResult generate(AiRequest request) {
        // The DeepSeek chat API takes text only: refuse a picture so the fallback client moves on to a provider that can show it.
        if (request.hasImages()) throw new UnsupportedOperationException("DeepSeek không nhận ảnh trong yêu cầu.");
        if (!request.hasSystem()) return AiClient.super.generate(request);
        StructuredOutputSpec spec = request.schema() != null ? request.schema() : StructuredOutputSchemaRegistry.GENERIC;
        String user = jsonOnlyPrompt(request.user(), spec);
        if (request.hasTools()) {
            int budget = request.maxToolCalls() > 0 ? request.maxToolCalls() : 4;
            return SpringAiToolCalling.generate(chatModel, "deepseek", model, request.system(), user, request.tools(), null, budget);
        }
        var prompt = new Prompt(List.of(new SystemMessage(request.system()), new UserMessage(user)));
        return response("deepseek", chatModel.call(prompt));
    }

    @Override
    public AiGenerationResult generateToolOnly(String prompt, List<ToolCallback> tools) {
        return SpringAiToolCalling.generateToolOnly(chatModel, "deepseek", model, prompt, tools);
    }

    private AiGenerationResult textResponse(String prompt) {
        var response = chatModel.call(new Prompt(prompt));
        return response("deepseek", response);
    }

    private String jsonOnlyPrompt(String prompt, StructuredOutputSpec spec) {
        return prompt + "\nReturn exactly one JSON object matching the required contract. Do not use markdown fences or add prose.";
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
