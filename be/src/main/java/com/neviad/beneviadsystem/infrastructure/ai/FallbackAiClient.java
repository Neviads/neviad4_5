package com.neviad.beneviadsystem.infrastructure.ai;

import java.util.List;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.tool.ToolCallback;

/**
 * Tries configured providers in order. The configuration supplies DeepSeek first,
 * followed by OpenAI.
 */
public final class FallbackAiClient implements AiClient {
    private static final Logger log = LoggerFactory.getLogger(FallbackAiClient.class);
    private final List<AiClient> providers;

    public FallbackAiClient(List<AiClient> providers) {
        this.providers = List.copyOf(providers.stream().filter(Objects::nonNull).toList());
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
        if (providers.isEmpty()) {
            throw new AiProviderUnavailableException("Không có AI provider nào được cấu hình.");
        }

        RuntimeException lastFailure = null;
        for (AiClient provider : providers) {
            try {
                return provider.generateDetailed(prompt, jsonMode);
            } catch (RuntimeException exception) {
                log.warn("AI provider failed; operation=generateDetailed, provider={}, jsonMode={}, error={}",
                        provider.getClass().getSimpleName(), jsonMode, summary(exception), exception);
                lastFailure = exception;
            }
        }

        throw new AiProviderUnavailableException("Không thể kết nối tới dịch vụ AI. Vui lòng thử lại sau.", lastFailure);
    }

    @Override
    public AiGenerationResult generateDetailed(String prompt, StructuredOutputSpec spec) {
        if (providers.isEmpty()) {
            throw new AiProviderUnavailableException("Không có AI provider nào được cấu hình.");
        }
        RuntimeException lastFailure = null;
        for (AiClient provider : providers) {
            try {
                return provider.generateDetailed(prompt, spec);
            } catch (RuntimeException exception) {
                log.warn("AI provider failed; operation=structured, provider={}, schema={}, error={}",
                        provider.getClass().getSimpleName(), spec.name(), summary(exception), exception);
                lastFailure = exception;
            }
        }
        throw new AiProviderUnavailableException("Không provider nào hỗ trợ structured output schema '" + spec.name() + "'.", lastFailure);
    }

    @Override
    public AiGenerationResult generateReasoned(String prompt, StructuredOutputSpec spec) {
        if (providers.isEmpty()) {
            throw new AiProviderUnavailableException("Không có AI provider nào được cấu hình.");
        }
        RuntimeException lastFailure = null;
        for (AiClient provider : providers) {
            try {
                return provider.generateReasoned(prompt, spec);
            } catch (RuntimeException exception) {
                log.warn("AI provider failed; operation=reasoned, provider={}, schema={}, error={}",
                        provider.getClass().getSimpleName(), spec.name(), summary(exception), exception);
                lastFailure = exception;
            }
        }
        throw new AiProviderUnavailableException("Không provider nào xử lý được yêu cầu suy luận '" + spec.name() + "'.", lastFailure);
    }

    @Override
    public AiGenerationResult generateWithTools(String prompt, List<ToolCallback> tools) {
        if (providers.isEmpty()) {
            throw new AiProviderUnavailableException("Không có AI provider nào được cấu hình.");
        }

        RuntimeException lastFailure = null;
        for (AiClient provider : providers) {
            var executed = new AtomicBoolean();
            var trackedTools = tools.stream().map(tool -> new TrackingToolCallback(tool, executed)).map(ToolCallback.class::cast).toList();
            try {
                return provider.generateWithTools(prompt, trackedTools);
            } catch (RuntimeException exception) {
                // Never replay a tool-calling request after a provider has already mutated its workspace.
                log.warn("AI provider failed; operation=generateWithTools, provider={}, toolExecuted={}, error={}",
                        provider.getClass().getSimpleName(), executed.get(), summary(exception), exception);
                if (executed.get()) throw exception;
                lastFailure = exception;
            }
        }

        throw new AiProviderUnavailableException("Không thể gọi AI provider có hỗ trợ tool calling.", lastFailure);
    }

    @Override
    public AiGenerationResult generateWithTools(String prompt, List<ToolCallback> tools, StructuredOutputSpec spec) {
        if (providers.isEmpty()) {
            throw new AiProviderUnavailableException("Không có AI provider nào được cấu hình.");
        }
        RuntimeException lastFailure = null;
        for (AiClient provider : providers) {
            var executed = new AtomicBoolean();
            var trackedTools = tools.stream().map(tool -> new TrackingToolCallback(tool, executed)).map(ToolCallback.class::cast).toList();
            try {
                return provider.generateWithTools(prompt, trackedTools, spec);
            } catch (RuntimeException exception) {
                log.warn("AI provider failed; operation=structured-tools, provider={}, schema={}, toolExecuted={}, error={}",
                        provider.getClass().getSimpleName(), spec.name(), executed.get(), summary(exception), exception);
                if (executed.get()) throw exception;
                lastFailure = exception;
            }
        }
        throw new AiProviderUnavailableException("Không provider nào hỗ trợ structured output schema '" + spec.name() + "' với tools.", lastFailure);
    }

    @Override
    public AiGenerationResult generateWithTools(String prompt, List<ToolCallback> tools, StructuredOutputSpec spec, int maxToolCalls) {
        if (providers.isEmpty()) {
            throw new AiProviderUnavailableException("Không có AI provider nào được cấu hình.");
        }
        RuntimeException lastFailure = null;
        for (AiClient provider : providers) {
            var executed = new AtomicBoolean();
            var trackedTools = tools.stream().map(tool -> new TrackingToolCallback(tool, executed)).map(ToolCallback.class::cast).toList();
            try {
                return provider.generateWithTools(prompt, trackedTools, spec, maxToolCalls);
            } catch (RuntimeException exception) {
                log.warn("AI provider failed; operation=structured-tools-budget, provider={}, schema={}, toolExecuted={}, error={}",
                        provider.getClass().getSimpleName(), spec.name(), executed.get(), summary(exception), exception);
                if (executed.get()) throw exception;
                lastFailure = exception;
            }
        }
        throw new AiProviderUnavailableException("Không provider nào hỗ trợ tool calling với schema '" + spec.name() + "'.", lastFailure);
    }

    @Override
    public AiGenerationResult generateWithTools(String prompt, List<ToolCallback> tools, StructuredOutputSpec spec, int maxToolCalls,
                                                ToolStreamListener listener) {
        if (providers.isEmpty()) {
            throw new AiProviderUnavailableException("Không có AI provider nào được cấu hình.");
        }
        RuntimeException lastFailure = null;
        for (AiClient provider : providers) {
            var executed = new AtomicBoolean();
            var trackedTools = tools.stream().map(tool -> new TrackingToolCallback(tool, executed)).map(ToolCallback.class::cast).toList();
            try {
                return provider.generateWithTools(prompt, trackedTools, spec, maxToolCalls, listener);
            } catch (RuntimeException exception) {
                log.warn("AI provider failed; operation=structured-tools-stream, provider={}, schema={}, toolExecuted={}, error={}",
                        provider.getClass().getSimpleName(), spec.name(), executed.get(), summary(exception), exception);
                if (executed.get()) throw exception;
                lastFailure = exception;
            }
        }
        throw new AiProviderUnavailableException("Không provider nào hỗ trợ tool calling với schema '" + spec.name() + "'.", lastFailure);
    }

    @Override
    public AiGenerationResult generate(AiRequest request) {
        if (providers.isEmpty()) {
            throw new AiProviderUnavailableException("Không có AI provider nào được cấu hình.");
        }
        RuntimeException lastFailure = null;
        for (AiClient provider : providers) {
            var executed = new AtomicBoolean();
            var trackedTools = request.tools().stream().map(tool -> new TrackingToolCallback(tool, executed)).map(ToolCallback.class::cast).toList();
            try {
                return provider.generate(request.withTools(trackedTools, request.maxToolCalls(), request.listener()));
            } catch (RuntimeException exception) {
                log.warn("AI provider failed; operation=request, provider={}, system={}, toolExecuted={}, error={}",
                        provider.getClass().getSimpleName(), request.hasSystem(), executed.get(), summary(exception), exception);
                if (executed.get()) throw exception;
                lastFailure = exception;
            }
        }
        throw new AiProviderUnavailableException("Không thể gọi AI provider với yêu cầu này.", lastFailure);
    }

    @Override
    public AiGenerationResult generateToolOnly(String prompt, List<ToolCallback> tools) {
        if (providers.isEmpty()) {
            throw new AiProviderUnavailableException("Không có AI provider nào được cấu hình.");
        }
        RuntimeException lastFailure = null;
        for (AiClient provider : providers) {
            var executed = new AtomicBoolean();
            var trackedTools = tools.stream().map(tool -> new TrackingToolCallback(tool, executed)).map(ToolCallback.class::cast).toList();
            try {
                return provider.generateToolOnly(prompt, trackedTools);
            } catch (RuntimeException exception) {
                log.warn("AI provider failed; operation=tool-only, provider={}, toolExecuted={}, error={}",
                        provider.getClass().getSimpleName(), executed.get(), summary(exception), exception);
                if (executed.get()) throw exception;
                lastFailure = exception;
            }
        }
        throw new AiProviderUnavailableException("Không provider nào hỗ trợ strict tool calling.", lastFailure);
    }

    private String summary(Throwable failure) {
        Throwable root = failure;
        while (root.getCause() != null) root = root.getCause();
        String message = root.getMessage();
        return root.getClass().getSimpleName() + (message == null || message.isBlank() ? "" : ": " + message);
    }

    private record TrackingToolCallback(ToolCallback delegate, AtomicBoolean executed) implements ToolCallback, ToolImageSource {
        /** Passes pictures attached by the wrapped tool through, so tracking does not hide them from the provider. */
        @Override public java.util.List<Image> takeImages() {
            return delegate instanceof ToolImageSource source ? source.takeImages() : java.util.List.of();
        }
        @Override public org.springframework.ai.tool.definition.ToolDefinition getToolDefinition() { return delegate.getToolDefinition(); }
        @Override public String call(String input) { executed.set(true); return delegate.call(input); }
        @Override public String call(String input, org.springframework.ai.chat.model.ToolContext context) {
            executed.set(true);
            return delegate.call(input, context);
        }
    }
}
