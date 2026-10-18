package com.neviad.beneviadsystem.infrastructure.ai;

import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.function.FunctionToolCallback;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AiRequestTest {
    record Echo(String text) { }

    /** Records which overload a default {@code generate(AiRequest)} reached and with which prompt. */
    private static final class Probe implements AiClient {
        final List<String> calls = new ArrayList<>();
        @Override public String generate(String prompt) { calls.add("generate:" + prompt); return prompt; }
        @Override public AiGenerationResult generateDetailed(String prompt, boolean jsonMode) {
            calls.add("detailed-json:" + prompt);
            return new AiGenerationResult("x", "p", "m");
        }
        @Override public AiGenerationResult generateDetailed(String prompt, StructuredOutputSpec spec) {
            calls.add("detailed-schema:" + prompt);
            return new AiGenerationResult("x", "p", "m");
        }
        @Override public AiGenerationResult generateReasoned(String prompt, StructuredOutputSpec spec) {
            calls.add("reasoned:" + prompt);
            return new AiGenerationResult("x", "p", "m");
        }
        @Override public AiGenerationResult generateWithTools(String prompt, List<ToolCallback> tools, StructuredOutputSpec spec, int maxToolCalls) {
            calls.add("tools-budget:" + maxToolCalls + ":" + prompt);
            return new AiGenerationResult("x", "p", "m");
        }
    }

    private static ToolCallback tool() {
        Function<Echo, String> fn = in -> in.text();
        return FunctionToolCallback.builder("echo", fn).description("echo").inputType(Echo.class).build();
    }

    @Test
    void theReasoningEffortSurvivesTheOtherWithMethodsAndBlankMeansTheProviderOwn() {
        var request = AiRequest.of("S", "U").withReasoningEffort(" medium ").withSchema(StructuredOutputSchemaRegistry.GENERIC).withTools(List.of(), 3, null);

        assertThat(request.reasoningEffort()).isEqualTo("medium");
        assertThat(request.withReasoningEffort(" ").reasoningEffort()).isNull();
    }

    @Test
    void aRequestWithoutASystemPromptReachesTheOldOverloadUnchanged() {
        var probe = new Probe();

        probe.generate(new AiRequest(null, "hello", List.of(), StructuredOutputSchemaRegistry.GENERIC, 0, null, false, null));

        assertThat(probe.calls).containsExactly("detailed-schema:hello");
    }

    @Test
    void theDefaultFoldsTheSystemPromptInFrontOfTheUserTextForProvidersWithoutASystemRole() {
        var probe = new Probe();

        probe.generate(AiRequest.of("SYSTEM", "USER"));

        assertThat(probe.calls).containsExactly("detailed-json:SYSTEM\n\nUSER");
    }

    @Test
    void reasoningAndToolBudgetsPickTheMatchingOverload() {
        var probe = new Probe();

        probe.generate(AiRequest.of("S", "U").withSchema(StructuredOutputSchemaRegistry.GENERIC).withReasoning());
        probe.generate(AiRequest.of("S", "U").withSchema(StructuredOutputSchemaRegistry.GENERIC).withTools(List.of(tool()), 7, null));

        assertThat(probe.calls).containsExactly("reasoned:S\n\nU", "tools-budget:7:S\n\nU");
    }

    @Test
    void picturesSurviveEveryWithMethodSoTheFallbackClientKeepsThem() {
        var picture = new ToolImageSource.Image("tư thế nghỉ", "data:image/png;base64,AAAA");

        var request = AiRequest.of("S", "U").withImages(List.of(picture)).withSchema(StructuredOutputSchemaRegistry.GENERIC).withReasoning()
                .withReasoningEffort("high").withTools(List.of(), 0, null);

        assertThat(request.hasImages()).isTrue();
        assertThat(request.images()).containsExactly(picture);
        assertThat(AiRequest.of("S", "U").hasImages()).isFalse();
    }

    @Test
    void aProviderWithoutPicturesRefusesThemRatherThanAnswerAboutAPictureItNeverSaw() {
        var probe = new Probe();
        var request = AiRequest.of("S", "U").withImages(List.of(new ToolImageSource.Image("x", "data:image/png;base64,AAAA")));

        assertThatThrownBy(() -> probe.generate(request)).isInstanceOf(UnsupportedOperationException.class);
        assertThat(probe.calls).isEmpty();
    }

    @Test
    void theUserMessageIsRequiredAndABlankSystemPromptCountsAsNone() {
        assertThatThrownBy(() -> AiRequest.of("S", " ")).isInstanceOf(IllegalArgumentException.class);
        assertThat(AiRequest.of("  ", "U").hasSystem()).isFalse();
        assertThat(AiRequest.of(null, "U").flattenedPrompt()).isEqualTo("U");
    }
}
