package com.neviad.beneviadsystem.infrastructure.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.function.FunctionToolCallback;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OpenAiResponsesToolLoopTest {
    record Echo(String text) { }

    private final ObjectMapper mapper = new ObjectMapper();
    private final List<JsonNode> requests = new CopyOnWriteArrayList<>();
    private final List<String> replies = new ArrayList<>();
    private HttpServer server;
    private OpenAiResponsesToolLoop loop;

    @BeforeEach
    void start() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1/responses", exchange -> {
            requests.add(mapper.readTree(exchange.getRequestBody().readAllBytes()));
            byte[] body = replies.get(requests.size() - 1).getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
        loop = new OpenAiResponsesToolLoop("http://127.0.0.1:" + server.getAddress().getPort(), "k", "high", 5000, Duration.ofSeconds(5));
    }

    @AfterEach
    void stop() { server.stop(0); }

    private ToolCallback echoTool() {
        Function<Echo, String> fn = in -> "{\"echo\":\"" + in.text() + "\"}";
        return FunctionToolCallback.builder("echo", fn).description("echo").inputType(Echo.class).build();
    }

    private static String call(String id, String callId) {
        return "{\"id\":\"" + id + "\",\"status\":\"completed\",\"output\":[{\"type\":\"function_call\",\"name\":\"echo\","
                + "\"call_id\":\"" + callId + "\",\"arguments\":\"{\\\"text\\\":\\\"hi\\\"}\"}]}";
    }

    private static String message(String id, String text) {
        return "{\"id\":\"" + id + "\",\"status\":\"completed\",\"output\":[{\"type\":\"message\",\"content\":"
                + "[{\"type\":\"output_text\",\"text\":\"" + text + "\"}]}]}";
    }

    @Test
    void runsToolsThenReturnsTheFinalTextWithReasoningOn() {
        replies.add(call("r1", "c1"));
        replies.add(message("r2", "done"));

        var result = loop.generate("m", "go", List.of(echoTool()), null, 5);

        assertThat(result.text()).isEqualTo("done");
        assertThat(requests.get(0).at("/reasoning/effort").asText()).isEqualTo("high");
        assertThat(requests.get(0).at("/max_output_tokens").asInt()).isEqualTo(5000);
        assertThat(requests.get(0).at("/tools/0/strict").asBoolean()).isTrue();
        assertThat(requests.get(0).at("/tools/0/parameters/additionalProperties").asBoolean(true)).isFalse();
        assertThat(requests.get(1).at("/previous_response_id").asText()).isEqualTo("r1");
        assertThat(requests.get(1).at("/input/0/type").asText()).isEqualTo("function_call_output");
        assertThat(requests.get(1).at("/input/0/output").asText()).contains("hi");
    }

    private static String sse(String type, String json) {
        return "event: " + type + "\ndata: " + json + "\n\n";
    }

    @Test
    void streamingForwardsArgumentFragmentsThenRunsTheToolFromTheFinalResponse() {
        String finalCall = call("r1", "c1");
        replies.add(sse("response.created", "{\"type\":\"response.created\"}")
                + sse("response.output_item.added", "{\"type\":\"response.output_item.added\",\"item\":{\"type\":\"function_call\",\"id\":\"i1\",\"name\":\"echo\"}}")
                + sse("response.function_call_arguments.delta", "{\"type\":\"response.function_call_arguments.delta\",\"item_id\":\"i1\",\"delta\":\"{\\\"text\\\":\\\"h\"}")
                + sse("response.function_call_arguments.delta", "{\"type\":\"response.function_call_arguments.delta\",\"item_id\":\"i1\",\"delta\":\"i\\\"}\"}")
                + sse("response.output_item.done", "{\"type\":\"response.output_item.done\",\"item\":{\"type\":\"function_call\",\"id\":\"i1\",\"name\":\"echo\"}}")
                + sse("response.completed", "{\"type\":\"response.completed\",\"response\":" + finalCall + "}"));
        replies.add(sse("response.completed", "{\"type\":\"response.completed\",\"response\":" + message("r2", "done") + "}"));
        var events = new ArrayList<String>();
        var listener = new ToolStreamListener() {
            @Override public void onToolCallStarted(String toolName) { events.add("start:" + toolName); }
            @Override public void onToolArgumentsDelta(String toolName, String fragment) { events.add("delta:" + fragment); }
            @Override public void onToolCallFinished(String toolName) { events.add("end:" + toolName); }
            @Override public void onStreamAborted() { events.add("abort"); }
        };

        var result = loop.generate("m", "go", List.of(echoTool()), null, 5, listener);

        assertThat(result.text()).isEqualTo("done");
        assertThat(requests.get(0).at("/stream").asBoolean()).isTrue();
        assertThat(events).containsExactly("start:echo", "delta:{\"text\":\"h", "delta:i\"}", "end:echo");
        assertThat(requests.get(1).at("/input/0/output").asText()).contains("hi");
    }

    @Test
    void aStreamThatEndsWithoutAFinalResponseAbortsTheListener() {
        replies.add(sse("response.created", "{\"type\":\"response.created\"}"));
        var events = new ArrayList<String>();
        var listener = new ToolStreamListener() {
            @Override public void onStreamAborted() { events.add("abort"); }
        };

        assertThatThrownBy(() -> loop.generate("m", "go", List.of(echoTool()), null, 3, listener))
                .isInstanceOf(AiProviderUnavailableException.class).hasMessageContaining("final response");
        assertThat(events).containsExactly("abort");
    }

    /** An echo tool that also attaches one picture to its result, the way run_checks attaches screenshots. */
    private record PictureTool(ToolCallback delegate) implements ToolCallback, ToolImageSource {
        @Override public org.springframework.ai.tool.definition.ToolDefinition getToolDefinition() { return delegate.getToolDefinition(); }
        @Override public String call(String input) { return delegate.call(input); }
        @Override public String call(String input, org.springframework.ai.chat.model.ToolContext context) { return delegate.call(input, context); }
        @Override public List<Image> takeImages() { return List.of(new Image("cảnh đang chạy", "data:image/jpeg;base64,AAAA")); }
    }

    @Test
    void aToolResultWithPicturesIsSentAsTextPlusInputImageParts() {
        replies.add(call("r1", "c1"));
        replies.add(message("r2", "done"));

        var result = loop.generate("m", "go", List.of(new PictureTool(echoTool())), null, 5);

        assertThat(result.text()).isEqualTo("done");
        var output = requests.get(1).at("/input/0/output");
        assertThat(output.isArray()).isTrue();
        assertThat(output.get(0).path("type").asText()).isEqualTo("input_text");
        assertThat(output.get(0).path("text").asText()).contains("hi");
        assertThat(output.get(1).path("text").asText()).contains("cảnh đang chạy");
        assertThat(output.get(2).path("type").asText()).isEqualTo("input_image");
        assertThat(output.get(2).path("image_url").asText()).isEqualTo("data:image/jpeg;base64,AAAA");
        assertThat(output.get(2).path("detail").asText()).isEqualTo("high");
    }

    @Test
    void picturesOfTheRequestGoWithTheUserMessageAsLabelledInputImages() {
        replies.add(message("r1", "{\\\"value\\\":\\\"ok\\\"}"));

        var result = loop.generate("m", "giám khảo", "chấm hình này", List.of(new ToolImageSource.Image("tư thế nghỉ", "data:image/png;base64,BBBB")),
                List.of(), StructuredOutputSchemaRegistry.GENERIC, 1, null, null);

        assertThat(result.text()).contains("ok");
        var first = requests.getFirst();
        assertThat(first.path("instructions").asText()).isEqualTo("giám khảo");
        var content = first.at("/input/0/content");
        assertThat(content.isArray()).isTrue();
        assertThat(content.get(0).path("text").asText()).isEqualTo("chấm hình này");
        assertThat(content.get(1).path("text").asText()).isEqualTo("Ảnh: tư thế nghỉ");
        assertThat(content.get(2).path("type").asText()).isEqualTo("input_image");
        assertThat(content.get(2).path("image_url").asText()).isEqualTo("data:image/png;base64,BBBB");
        assertThat(content.get(2).path("detail").asText()).isEqualTo("high");
    }

    @Test
    void withoutPicturesTheUserMessageStaysPlainText() {
        replies.add(message("r1", "done"));

        loop.generate("m", "go", List.of(echoTool()), null, 5);

        assertThat(requests.getFirst().at("/input/0/content").isTextual()).isTrue();
    }

    @Test
    void aToolWithoutPicturesStillReturnsPlainText() {
        replies.add(call("r1", "c1"));
        replies.add(message("r2", "done"));

        loop.generate("m", "go", List.of(echoTool()), null, 5);

        assertThat(requests.get(1).at("/input/0/output").isTextual()).isTrue();
    }

    @Test
    void stopsWhenTheToolBudgetIsExceeded() {
        replies.add(call("r1", "c1"));
        replies.add(call("r2", "c2"));

        assertThatThrownBy(() -> loop.generate("m", "go", List.of(echoTool()), null, 1))
                .isInstanceOf(AiProviderUnavailableException.class).hasMessageContaining("limit");
    }

    @Test
    void anEffortOverrideReplacesTheToolEffortOnEveryTurnOfTheLoop() {
        replies.add(call("r1", "c1"));
        replies.add(message("r2", "done"));

        loop.generate("m", "SYS", "go", List.of(echoTool()), null, 5, null, "medium");

        assertThat(requests).hasSize(2).allSatisfy(request -> assertThat(request.at("/reasoning/effort").asText()).isEqualTo("medium"));
    }

    @Test
    void anIncompleteResponseIsAnErrorNotASuccess() {
        replies.add("{\"id\":\"r1\",\"status\":\"incomplete\",\"incomplete_details\":{\"reason\":\"max_output_tokens\"},\"output\":[]}");

        assertThatThrownBy(() -> loop.generate("m", "go", List.of(echoTool()), null, 3))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("max_output_tokens");
    }

    @Test
    void withNoToolsItIsOneReasoningCallThatOmitsTheToolFields() {
        replies.add(message("r1", "{}"));

        var result = loop.generate("m", "go", List.of(), null, 1);

        assertThat(result.text()).isEqualTo("{}");
        assertThat(requests.getFirst().has("tools")).isFalse();
        assertThat(requests.getFirst().has("parallel_tool_calls")).isFalse();
        assertThat(requests.getFirst().at("/reasoning/effort").asText()).isEqualTo("high");
    }

    @Test
    void sendsTheStrictFinalSchemaAsTextFormat() {
        replies.add(message("r1", "{}"));
        var spec = StructuredOutputSpec.strict("final", Map.of("type", "object", "properties", Map.of(), "required", List.of(), "additionalProperties", false));

        loop.generate("m", "go", List.of(echoTool()), spec, 3);

        assertThat(requests.get(0).at("/text/format/type").asText()).isEqualTo("json_schema");
        assertThat(requests.get(0).at("/text/format/name").asText()).isEqualTo("final");
    }

    @Test
    void sendsTheSystemPromptAsInstructionsOnEveryRequestOfTheLoop() {
        replies.add(call("r1", "c1"));
        replies.add(message("r2", "done"));

        var result = loop.generate("m", "Bạn là EngineAgent.", "go", List.of(echoTool()), null, 5, null);

        assertThat(result.text()).isEqualTo("done");
        // Instructions are not inherited through previous_response_id, so both requests must carry them.
        assertThat(requests.get(0).at("/instructions").asText()).isEqualTo("Bạn là EngineAgent.");
        assertThat(requests.get(1).at("/instructions").asText()).isEqualTo("Bạn là EngineAgent.");
        assertThat(requests.get(0).at("/input/0/role").asText()).isEqualTo("user");
        assertThat(requests.get(0).at("/input/0/content").asText()).isEqualTo("go");
    }

    @Test
    void sendsNoInstructionsFieldWhenThereIsNoSystemPrompt() {
        replies.add(message("r1", "done"));

        loop.generate("m", "go", List.of(), null, 1);

        assertThat(requests.get(0).has("instructions")).isFalse();
    }
}
