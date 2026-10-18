package com.neviad.beneviadsystem.infrastructure.ai;

import org.springframework.ai.tool.ToolCallback;

import java.util.List;

/**
 * One model call described as data, so a caller can give the model a SYSTEM prompt of its own without the shared
 * {@link AiClient} bean holding any per-agent state. {@code system} is optional (null keeps the old single user
 * message); {@code schema}, {@code tools}, {@code maxToolCalls} (0 = provider default) and {@code listener} are optional too.
 * {@code reasoned} asks for the provider's deepest reasoning on a call without tools. {@code reasoningEffort} (null = the provider's own
 * setting) lowers or raises the reasoning of a call WITH tools, for agents whose turns must finish before a gateway cuts a silent request.
 * {@code images} are pictures sent with the user message (for example a figure to judge); a provider that cannot show pictures to its
 * model must refuse such a request rather than drop them, so the model never answers about a picture it did not see.
 */
public record AiRequest(String system, String user, List<ToolCallback> tools, StructuredOutputSpec schema,
                        int maxToolCalls, ToolStreamListener listener, boolean reasoned, String reasoningEffort,
                        List<ToolImageSource.Image> images) {

    public AiRequest {
        if (user == null || user.isBlank()) throw new IllegalArgumentException("user message is required");
        if (maxToolCalls < 0) throw new IllegalArgumentException("maxToolCalls must not be negative");
        tools = tools == null ? List.of() : List.copyOf(tools);
        images = images == null ? List.of() : List.copyOf(images);
    }

    public AiRequest(String system, String user, List<ToolCallback> tools, StructuredOutputSpec schema,
                     int maxToolCalls, ToolStreamListener listener, boolean reasoned, String reasoningEffort) {
        this(system, user, tools, schema, maxToolCalls, listener, reasoned, reasoningEffort, List.of());
    }

    /** A call with a system prompt and one user message, no tools and no schema. */
    public static AiRequest of(String system, String user) {
        return new AiRequest(system, user, List.of(), null, 0, null, false, null, List.of());
    }

    public AiRequest withSchema(StructuredOutputSpec spec) {
        return new AiRequest(system, user, tools, spec, maxToolCalls, listener, reasoned, reasoningEffort, images);
    }

    public AiRequest withTools(List<ToolCallback> callbacks, int budget, ToolStreamListener streamListener) {
        return new AiRequest(system, user, callbacks, schema, budget, streamListener, reasoned, reasoningEffort, images);
    }

    public AiRequest withReasoning() {
        return new AiRequest(system, user, tools, schema, maxToolCalls, listener, true, reasoningEffort, images);
    }

    /** {@code effort} is {@code low}, {@code medium}, {@code high}...; blank means the provider's own setting. */
    public AiRequest withReasoningEffort(String effort) {
        return new AiRequest(system, user, tools, schema, maxToolCalls, listener, reasoned, effort == null || effort.isBlank() ? null : effort.trim(), images);
    }

    /** Pictures sent with the user message, in order, each preceded by its label. */
    public AiRequest withImages(List<ToolImageSource.Image> pictures) {
        return new AiRequest(system, user, tools, schema, maxToolCalls, listener, reasoned, reasoningEffort, pictures);
    }

    public boolean hasSystem() { return system != null && !system.isBlank(); }

    public boolean hasTools() { return !tools.isEmpty(); }

    public boolean hasImages() { return !images.isEmpty(); }

    /** System and user text as one string, for providers or fakes that have no system role. */
    public String flattenedPrompt() {
        return hasSystem() ? system + "\n\n" + user : user;
    }
}
