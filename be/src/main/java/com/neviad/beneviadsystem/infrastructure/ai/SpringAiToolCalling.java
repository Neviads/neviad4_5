package com.neviad.beneviadsystem.infrastructure.ai;

import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.ResponseFormat;
import org.springframework.util.StringUtils;
import org.springframework.ai.model.tool.DefaultToolCallingManager;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.execution.DefaultToolExecutionExceptionProcessor;
import org.springframework.ai.tool.resolution.StaticToolCallbackResolver;
import io.micrometer.observation.ObservationRegistry;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

/** Provider-neutral bounded tool-call loop for Spring AI ChatModel adapters. */
public final class SpringAiToolCalling {
    private static final int MAX_TOOL_CALLS = 4;

    private SpringAiToolCalling() { }

    public static AiGenerationResult generate(ChatModel model, String provider, String modelName,
                                              String prompt, List<ToolCallback> callbacks) {
        return generate(model, provider, modelName, prompt, callbacks, null);
    }

    /** Force exactly one function call and return that function's result. */
    public static AiGenerationResult generateToolOnly(ChatModel model, String provider, String modelName,
                                                      String prompt, List<ToolCallback> callbacks) {
        if (callbacks == null || callbacks.size() != 1) {
            throw new IllegalArgumentException("Tool-only repair requires exactly one tool");
        }
        var captured = new CapturingToolCallback(callbacks.getFirst());
        List<ToolCallback> wrapped = List.of(captured);
        var options = OpenAiChatOptions.builder()
                .toolCallbacks(wrapped)
                .toolChoice(Map.of("type", "function", "function", Map.of("name", callbacks.getFirst().getToolDefinition().name())))
                .parallelToolCalls(false)
                .internalToolExecutionEnabled(false)
                .build();
        var manager = DefaultToolCallingManager.builder()
                .observationRegistry(ObservationRegistry.create())
                .toolCallbackResolver(new StaticToolCallbackResolver(wrapped))
                .toolExecutionExceptionProcessor(DefaultToolExecutionExceptionProcessor.builder().alwaysThrow(true).build())
                .build();
        ChatResponse response = model.call(new Prompt(prompt, options));
        if (response == null || response.getResult() == null || response.getResult().getOutput() == null
                || !response.getResult().getOutput().hasToolCalls()) {
            throw new IllegalStateException(provider + " did not execute the required strict repair tool");
        }
        if (response.getResult().getOutput().getToolCalls().size() != 1) {
            throw new IllegalStateException(provider + " returned more than one repair tool call");
        }
        manager.executeToolCalls(new Prompt(List.of(new UserMessage(prompt)), options), response);
        String output = captured.result.get();
        if (output == null || output.isBlank()) throw new IllegalStateException(provider + " returned an empty repair result");
        return new AiGenerationResult(output, provider, modelName);
    }

    public static AiGenerationResult generate(ChatModel model, String provider, String modelName,
                                              String prompt, List<ToolCallback> callbacks,
                                              StructuredOutputSpec spec) {
        return generate(model, provider, modelName, prompt, callbacks, spec, MAX_TOOL_CALLS);
    }

    /** Same bounded loop with a caller-chosen tool-call budget (for iterative write-run-fix agents). */
    public static AiGenerationResult generate(ChatModel model, String provider, String modelName,
                                              String prompt, List<ToolCallback> callbacks,
                                              StructuredOutputSpec spec, int maxToolCalls) {
        return generate(model, provider, modelName, null, prompt, callbacks, spec, maxToolCalls);
    }

    /** Same loop with an optional {@code system} message in front of the user message. */
    public static AiGenerationResult generate(ChatModel model, String provider, String modelName, String system,
                                              String prompt, List<ToolCallback> callbacks,
                                              StructuredOutputSpec spec, int maxToolCalls) {
        if (maxToolCalls < 1) throw new IllegalArgumentException("maxToolCalls must be positive");
        if (callbacks == null || callbacks.isEmpty()) throw new IllegalArgumentException("At least one tool is required");
        var optionsBuilder = OpenAiChatOptions.builder()
                .toolCallbacks(callbacks)
                .internalToolExecutionEnabled(false);
        if (spec != null) {
            optionsBuilder.responseFormat(ResponseFormat.builder()
                    .type(ResponseFormat.Type.JSON_SCHEMA)
                    .jsonSchema(ResponseFormat.JsonSchema.builder()
                            .name(spec.name()).schema(spec.schema()).strict(spec.strict()).build())
                    .build());
        }
        var options = optionsBuilder.build();
        var manager = DefaultToolCallingManager.builder()
                .observationRegistry(ObservationRegistry.create())
                .toolCallbackResolver(new StaticToolCallbackResolver(callbacks))
                .toolExecutionExceptionProcessor(DefaultToolExecutionExceptionProcessor.builder().alwaysThrow(true).build())
                .build();
        List<Message> history = new ArrayList<>();
        if (system != null && !system.isBlank()) history.add(new SystemMessage(system));
        history.add(new UserMessage(prompt));
        int calls = 0;
        while (true) {
            var currentPrompt = new Prompt(history, options);
            ChatResponse response = model.call(currentPrompt);
            if (response == null || response.getResult() == null || response.getResult().getOutput() == null) {
                throw new AiProviderUnavailableException("AI provider returned an empty tool-call response.");
            }
            var assistant = response.getResult().getOutput();
            if (!assistant.hasToolCalls()) {
                Object refusal = assistant.getMetadata().get("refusal");
                if (refusal != null && StringUtils.hasText(String.valueOf(refusal))) {
                    throw new IllegalStateException(provider + " refused structured output: " + refusal);
                }
                String finishReason = response.getResult().getMetadata().getFinishReason();
                if (finishReason != null && ("length".equalsIgnoreCase(finishReason)
                        || "content_filter".equalsIgnoreCase(finishReason))) {
                    throw new IllegalStateException(provider + " returned incomplete structured output (" + finishReason + ")");
                }
                if (assistant.getText() == null || assistant.getText().isBlank()) {
                    throw new IllegalStateException(provider + " returned an empty structured output");
                }
                return new AiGenerationResult(assistant.getText(), provider, modelName);
            }
            calls += assistant.getToolCalls().size();
            if (calls > maxToolCalls) {
                throw new AiProviderUnavailableException("AI tool-call limit exceeded (" + maxToolCalls + ").");
            }
            var result = manager.executeToolCalls(currentPrompt, response);
            history = new ArrayList<>(result.conversationHistory());
        }
    }

    private static final class CapturingToolCallback implements ToolCallback {
        private final ToolCallback delegate;
        private final AtomicReference<String> result = new AtomicReference<>();

        private CapturingToolCallback(ToolCallback delegate) { this.delegate = delegate; }
        @Override public org.springframework.ai.tool.definition.ToolDefinition getToolDefinition() {
            return delegate.getToolDefinition();
        }
        @Override public String call(String input) {
            String value = delegate.call(input);
            result.set(value);
            return value;
        }
        @Override public String call(String input, org.springframework.ai.chat.model.ToolContext context) {
            String value = delegate.call(input, context);
            result.set(value);
            return value;
        }
    }
}
