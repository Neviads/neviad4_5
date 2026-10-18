package com.neviad.beneviadsystem.infrastructure.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.tool.ToolCallback;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Bounded tool-call loop over OpenAI's {@code /v1/responses} endpoint. Chat Completions rejects function tools
 * whenever reasoning is on, so agents that need reasoning plus tools go through here. With no tools it is a single
 * reasoning call that returns the structured text.
 */
public final class OpenAiResponsesToolLoop {
    private static final Logger log = LoggerFactory.getLogger(OpenAiResponsesToolLoop.class);
    /** Scene screenshots hold small text (labels), so they are sent at full detail. */
    private static final String IMAGE_DETAIL = "high";
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();
    private final ObjectMapper mapper = new ObjectMapper();
    private final String baseUrl;
    private final String apiKey;
    private final String reasoningEffort;
    private final String toolReasoningEffort;
    private final int maxOutputTokens;
    private final Duration requestTimeout;

    public OpenAiResponsesToolLoop(String baseUrl, String apiKey, String reasoningEffort,
                                   int maxOutputTokens, Duration requestTimeout) {
        this(baseUrl, apiKey, reasoningEffort, reasoningEffort, maxOutputTokens, requestTimeout);
    }

    /** {@code reasoningEffort} serves calls without tools (analysis); {@code toolReasoningEffort} serves tool-using calls (coding). */
    public OpenAiResponsesToolLoop(String baseUrl, String apiKey, String reasoningEffort, String toolReasoningEffort,
                                   int maxOutputTokens, Duration requestTimeout) {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.apiKey = apiKey;
        this.reasoningEffort = reasoningEffort;
        this.toolReasoningEffort = toolReasoningEffort;
        this.maxOutputTokens = maxOutputTokens;
        this.requestTimeout = requestTimeout;
    }

    public AiGenerationResult generate(String model, String prompt, List<ToolCallback> callbacks,
                                       StructuredOutputSpec spec, int maxToolCalls) {
        return generate(model, prompt, callbacks, spec, maxToolCalls, null);
    }

    /** With a {@code listener} the response is streamed so tool arguments can be shown while they are generated. */
    public AiGenerationResult generate(String model, String prompt, List<ToolCallback> callbacks,
                                       StructuredOutputSpec spec, int maxToolCalls, ToolStreamListener listener) {
        return generate(model, null, prompt, callbacks, spec, maxToolCalls, listener);
    }

    /**
     * {@code system} (optional) is sent as the Responses API {@code instructions} on EVERY request of the loop, because
     * instructions are not inherited through {@code previous_response_id}.
     */
    public AiGenerationResult generate(String model, String system, String prompt, List<ToolCallback> callbacks,
                                       StructuredOutputSpec spec, int maxToolCalls, ToolStreamListener listener) {
        return generate(model, system, prompt, callbacks, spec, maxToolCalls, listener, null);
    }

    /** {@code effortOverride} (null = the loop's own setting) replaces the reasoning effort of a call that has tools. */
    public AiGenerationResult generate(String model, String system, String prompt, List<ToolCallback> callbacks,
                                       StructuredOutputSpec spec, int maxToolCalls, ToolStreamListener listener, String effortOverride) {
        return generate(model, system, prompt, List.of(), callbacks, spec, maxToolCalls, listener, effortOverride);
    }

    /**
     * {@code images} (may be empty) go with the user message, each preceded by a line with its label, at full detail: for example a figure
     * a judge must look at. Tool results can carry pictures too, through {@link ToolImageSource}.
     */
    public AiGenerationResult generate(String model, String system, String prompt, List<ToolImageSource.Image> images, List<ToolCallback> callbacks,
                                       StructuredOutputSpec spec, int maxToolCalls, ToolStreamListener listener, String effortOverride) {
        if (maxToolCalls < 1) throw new IllegalArgumentException("maxToolCalls must be positive");
        if (callbacks == null) callbacks = List.of();
        Map<String, ToolCallback> byName = callbacks.stream().collect(
                Collectors.toMap(c -> c.getToolDefinition().name(), Function.identity()));
        ArrayNode tools = toolsNode(callbacks);
        String previousId = null;
        ObjectNode first = mapper.createObjectNode().put("role", "user");
        if (images == null || images.isEmpty()) first.put("content", prompt);
        else {
            ArrayNode parts = first.putArray("content");
            parts.addObject().put("type", "input_text").put("text", prompt);
            for (ToolImageSource.Image image : images) {
                parts.addObject().put("type", "input_text").put("text", "Ảnh: " + image.label());
                parts.addObject().put("type", "input_image").put("image_url", image.dataUrl()).put("detail", IMAGE_DETAIL);
            }
        }
        JsonNode input = mapper.createArrayNode().add(first);
        int calls = 0;
        while (true) {
            JsonNode response;
            try {
                response = listener == null ? post(requestBody(model, system, input, tools, spec, previousId, effortOverride))
                        : postStreaming(requestBody(model, system, input, tools, spec, previousId, effortOverride).put("stream", true), listener);
            } catch (RuntimeException failure) {
                if (listener != null) listener.onStreamAborted();
                throw failure;
            }
            String status = response.path("status").asText();
            if ("failed".equals(status)) {
                if (listener != null) listener.onStreamAborted();
                throw new AiProviderUnavailableException("openai response failed: " + response.path("error").path("message").asText());
            }
            if ("incomplete".equals(status)) {
                if (listener != null) listener.onStreamAborted();
                throw new IllegalStateException("openai returned incomplete output ("
                        + response.path("incomplete_details").path("reason").asText("unknown") + ")");
            }
            previousId = response.path("id").asText();
            JsonNode usage = response.path("usage");
            if (!usage.isMissingNode()) {
                log.info("Responses call usage: model={}, inputTokens={}, outputTokens={}, reasoningTokens={}", model,
                        usage.path("input_tokens").asInt(-1), usage.path("output_tokens").asInt(-1),
                        usage.path("output_tokens_details").path("reasoning_tokens").asInt(-1));
            }
            ArrayNode outputs = mapper.createArrayNode();
            StringBuilder text = new StringBuilder();
            for (JsonNode item : response.path("output")) {
                String type = item.path("type").asText();
                if ("function_call".equals(type)) {
                    calls++;
                    if (calls > maxToolCalls) {
                        throw new AiProviderUnavailableException("AI tool-call limit exceeded (" + maxToolCalls + ").");
                    }
                    ObjectNode callOutput = mapper.createObjectNode().put("type", "function_call_output")
                            .put("call_id", item.path("call_id").asText());
                    callOutput.set("output", toolOutput(byName, item.path("name").asText(), item.path("arguments").asText("{}")));
                    outputs.add(callOutput);
                } else if ("message".equals(type)) {
                    for (JsonNode part : item.path("content")) {
                        if ("refusal".equals(part.path("type").asText())) {
                            throw new IllegalStateException("openai refused structured output: " + part.path("refusal").asText());
                        }
                        if ("output_text".equals(part.path("type").asText())) text.append(part.path("text").asText());
                    }
                }
            }
            if (outputs.isEmpty()) {
                if (text.toString().isBlank()) throw new IllegalStateException("openai returned an empty structured output");
                return new AiGenerationResult(text.toString(), "openai", model);
            }
            input = outputs;
        }
    }

    /**
     * The result of one tool call. Plain text normally; when the tool attached pictures (see {@link ToolImageSource})
     * it is a list of content parts: the text, then each picture preceded by a line saying what it shows.
     */
    private JsonNode toolOutput(Map<String, ToolCallback> byName, String name, String arguments) {
        String text = execute(byName, name, arguments);
        ToolCallback callback = byName.get(name);
        List<ToolImageSource.Image> images = callback instanceof ToolImageSource source ? source.takeImages() : List.of();
        if (images == null || images.isEmpty()) return mapper.getNodeFactory().textNode(text);
        ArrayNode parts = mapper.createArrayNode();
        parts.addObject().put("type", "input_text").put("text", text);
        for (ToolImageSource.Image image : images) {
            parts.addObject().put("type", "input_text").put("text", "Ảnh chụp: " + image.label());
            parts.addObject().put("type", "input_image").put("image_url", image.dataUrl()).put("detail", IMAGE_DETAIL);
        }
        log.info("Tool {} returned {} picture(s) to the model", name, images.size());
        return parts;
    }

    private String execute(Map<String, ToolCallback> byName, String name, String arguments) {
        ToolCallback callback = byName.get(name);
        if (callback == null) return "{\"success\":false,\"message\":\"Unknown tool " + name + "\"}";
        try {
            return callback.call(arguments);
        } catch (RuntimeException e) {
            return "{\"success\":false,\"message\":\"Tool failed: " + String.valueOf(e.getMessage()).replace("\\", " ").replace("\"", "'") + "\"}";
        }
    }

    private ArrayNode toolsNode(List<ToolCallback> callbacks) {
        ArrayNode tools = mapper.createArrayNode();
        for (ToolCallback callback : callbacks) {
            var definition = callback.getToolDefinition();
            ObjectNode tool = tools.addObject();
            tool.put("type", "function").put("name", definition.name())
                    .put("description", definition.description()).put("strict", true);
            try {
                JsonNode schema = mapper.readTree(definition.inputSchema());
                StrictToolSchemas.strictify(schema);
                tool.set("parameters", schema);
            } catch (IOException e) {
                throw new IllegalStateException("Invalid tool schema for " + definition.name(), e);
            }
        }
        return tools;
    }

    private ObjectNode requestBody(String model, String instructions, JsonNode input, ArrayNode tools, StructuredOutputSpec spec, String previousId, String effortOverride) {
        ObjectNode body = mapper.createObjectNode();
        body.put("model", model);
        if (instructions != null && !instructions.isBlank()) body.put("instructions", instructions);
        body.set("input", input);
        if (!tools.isEmpty()) {
            body.set("tools", tools);
            body.put("parallel_tool_calls", false);
        }
        body.put("max_output_tokens", maxOutputTokens);
        body.putObject("reasoning").put("effort", tools.isEmpty() ? reasoningEffort : effortOverride != null ? effortOverride : toolReasoningEffort);
        if (previousId != null) body.put("previous_response_id", previousId);
        if (spec != null) {
            ObjectNode format = body.putObject("text").putObject("format");
            format.put("type", "json_schema").put("name", spec.name()).put("strict", spec.strict());
            format.set("schema", mapper.valueToTree(spec.schema()));
        }
        return body;
    }

    /**
     * Streams the response as server-sent events, forwards function-call argument fragments to the listener and
     * returns the final response object (the one carried by the terminal event), shaped like a non-streamed reply.
     */
    private JsonNode postStreaming(ObjectNode body, ToolStreamListener listener) {
        try {
            var request = HttpRequest.newBuilder(URI.create(baseUrl + "/v1/responses"))
                    .timeout(requestTimeout)
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .header("Accept", "text/event-stream")
                    .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                    .build();
            var response = http.send(request, HttpResponse.BodyHandlers.ofLines());
            if (response.statusCode() / 100 != 2) {
                String text = response.body().collect(Collectors.joining("\n"));
                String message = text;
                try { message = mapper.readTree(text).path("error").path("message").asText(text); } catch (IOException ignored) { }
                throw new AiProviderUnavailableException("openai responses error " + response.statusCode() + ": " + message);
            }
            Map<String, String> toolNames = new java.util.HashMap<>();
            JsonNode finalResponse = null;
            var lines = response.body().iterator();
            while (lines.hasNext()) {
                String line = lines.next();
                if (!line.startsWith("data:")) continue;
                String data = line.substring(5).trim();
                if (data.isEmpty() || "[DONE]".equals(data)) continue;
                JsonNode event = mapper.readTree(data);
                switch (event.path("type").asText()) {
                    case "response.output_item.added" -> {
                        JsonNode item = event.path("item");
                        if ("function_call".equals(item.path("type").asText())) {
                            toolNames.put(item.path("id").asText(), item.path("name").asText());
                            listener.onToolCallStarted(item.path("name").asText());
                        }
                    }
                    case "response.function_call_arguments.delta" -> {
                        String name = toolNames.get(event.path("item_id").asText());
                        if (name != null) listener.onToolArgumentsDelta(name, event.path("delta").asText());
                    }
                    case "response.output_item.done" -> {
                        JsonNode item = event.path("item");
                        if ("function_call".equals(item.path("type").asText())) {
                            String name = toolNames.get(item.path("id").asText());
                            listener.onToolCallFinished(name != null ? name : item.path("name").asText());
                        }
                    }
                    case "response.completed", "response.incomplete", "response.failed" -> finalResponse = event.path("response");
                    case "error" -> throw new AiProviderUnavailableException("openai stream error: " + event.path("message").asText(data));
                    default -> { }
                }
            }
            if (finalResponse == null || finalResponse.isMissingNode()) {
                throw new AiProviderUnavailableException("openai stream ended without a final response");
            }
            return finalResponse;
        } catch (IOException e) {
            throw new AiProviderUnavailableException("openai responses stream failed: " + describe(e), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AiProviderUnavailableException("openai responses call interrupted");
        } catch (java.io.UncheckedIOException e) {
            throw new AiProviderUnavailableException("openai responses stream failed: " + e.getMessage());
        }
    }

    /** The exception and its causes by class and message, so a dropped connection is not reported as "null". */
    static String describe(Throwable failure) {
        StringBuilder out = new StringBuilder();
        for (Throwable t = failure; t != null && out.length() < 400; t = t.getCause() == t ? null : t.getCause()) {
            if (!out.isEmpty()) out.append(" <- ");
            out.append(t.getClass().getSimpleName());
            if (t.getMessage() != null && !t.getMessage().isBlank()) out.append(": ").append(t.getMessage());
        }
        return out.toString();
    }

    private JsonNode post(ObjectNode body) {
        try {
            var request = HttpRequest.newBuilder(URI.create(baseUrl + "/v1/responses"))
                    .timeout(requestTimeout)
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                    .build();
            var response = http.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode json = mapper.readTree(response.body());
            if (response.statusCode() / 100 != 2) {
                throw new AiProviderUnavailableException("openai responses error " + response.statusCode() + ": "
                        + json.path("error").path("message").asText(response.body()));
            }
            return json;
        } catch (IOException e) {
            throw new AiProviderUnavailableException("openai responses call failed: " + describe(e), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AiProviderUnavailableException("openai responses call interrupted");
        }
    }
}
