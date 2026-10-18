package com.neviad.beneviadsystem.infrastructure.ai;

import org.springframework.ai.tool.ToolCallback;

import java.util.List;

/**
 * Provider-neutral boundary. Structured JSON is the safe default; callers needing prose must
 * explicitly request {@code generateDetailed(prompt, false)}.
 */
public interface AiClient {

    /** Generate a constrained JSON object by default. */
    String generate(String prompt);

    /** Generate using a provider-native strict JSON Schema response format. */
    default String generate(String prompt, StructuredOutputSpec spec) {
        return generateDetailed(prompt, spec).text();
    }

    /** Generate a response with provider metadata when the adapter can supply it. */
    default AiGenerationResult generateDetailed(String prompt, boolean jsonMode) {
        return new AiGenerationResult(jsonMode ? generateJson(prompt) : generate(prompt), "unknown", "unknown");
    }

    /** Generate a response constrained by the supplied strict schema. */
    default AiGenerationResult generateDetailed(String prompt, StructuredOutputSpec spec) {
        return generateDetailed(prompt, true);
    }

    /** Generate a JSON object when the configured provider supports constrained output. */
    default String generateJson(String prompt) { return generate(prompt); }

    /** Generate a response while allowing request-scoped tools to be called. */
    default AiGenerationResult generateWithTools(String prompt, List<ToolCallback> tools) {
        // Keeps local/test providers usable. Production adapters override this method and execute
        // the callbacks in a bounded model/tool conversation.
        return generateDetailed(prompt, true);
    }

    /** Generate with request-scoped tools and a strict final response schema. */
    default AiGenerationResult generateWithTools(String prompt, List<ToolCallback> tools,
                                                 StructuredOutputSpec spec) {
        return generateWithTools(prompt, tools);
    }

    /**
     * Generate with request-scoped tools, a strict final schema and an explicit tool-call budget.
     * Providers that cannot honour the budget fall back to their own default limit.
     */
    default AiGenerationResult generateWithTools(String prompt, List<ToolCallback> tools,
                                                 StructuredOutputSpec spec, int maxToolCalls) {
        return generateWithTools(prompt, tools, spec);
    }

    /**
     * Like the budgeted overload, but a streaming provider also reports tool arguments to {@code listener} while the
     * model is still writing them. Providers that cannot stream ignore the listener.
     */
    default AiGenerationResult generateWithTools(String prompt, List<ToolCallback> tools,
                                                 StructuredOutputSpec spec, int maxToolCalls, ToolStreamListener listener) {
        return generateWithTools(prompt, tools, spec, maxToolCalls);
    }

    /**
     * One structured call with the provider's deepest reasoning enabled, for agents that think before answering
     * (no tools). Providers without such a mode fall back to the ordinary structured call.
     */
    default AiGenerationResult generateReasoned(String prompt, StructuredOutputSpec spec) {
        return generateDetailed(prompt, spec);
    }

    /**
     * One call described by an {@link AiRequest}. Providers with a real system role override this and send
     * {@code system} as such. This default (used by fakes and providers without one) keeps every existing path: it
     * folds the system text in front of the user text and routes to the matching overload above.
     */
    default AiGenerationResult generate(AiRequest request) {
        // These overloads carry text only: refuse pictures rather than drop them, so the model never answers about a picture it did not see.
        if (request.hasImages()) throw new UnsupportedOperationException("Provider này không gửi được ảnh cho model.");
        String prompt = request.flattenedPrompt();
        if (request.hasTools()) {
            if (request.schema() == null) return generateWithTools(prompt, request.tools());
            if (request.maxToolCalls() <= 0) return generateWithTools(prompt, request.tools(), request.schema());
            if (request.listener() == null) return generateWithTools(prompt, request.tools(), request.schema(), request.maxToolCalls());
            return generateWithTools(prompt, request.tools(), request.schema(), request.maxToolCalls(), request.listener());
        }
        if (request.schema() == null) return generateDetailed(prompt, true);
        return request.reasoned() ? generateReasoned(prompt, request.schema()) : generateDetailed(prompt, request.schema());
    }

    /**
     * Execute a tool-only request. Providers must make the requested function call and return
     * the tool result; this is intentionally separate from structured response generation.
     */
    default AiGenerationResult generateToolOnly(String prompt, List<ToolCallback> tools) {
        throw new AiProviderUnavailableException("Provider does not support strict tool-only calls.");
    }
}
