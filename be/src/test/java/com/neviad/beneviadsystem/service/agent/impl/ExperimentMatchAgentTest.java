package com.neviad.beneviadsystem.service.agent.impl;

import com.neviad.beneviadsystem.infrastructure.ai.AiClient;
import com.neviad.beneviadsystem.infrastructure.ai.AiGenerationResult;
import com.neviad.beneviadsystem.infrastructure.ai.StructuredOutputSchemaRegistry;
import com.neviad.beneviadsystem.infrastructure.ai.StructuredOutputSpec;
import com.neviad.beneviadsystem.service.agent.InvalidAgentResponseException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ExperimentMatchAgentTest {
    private static final List<ExperimentMatchAgent.CatalogEntry> CATALOG = List.of(
            new ExperimentMatchAgent.CatalogEntry("con-lac-don", "Con lắc đơn", "Cơ học", 10, "Quả nặng treo dây\ndao động", "Chu kì phụ thuộc chiều dài"),
            new ExperimentMatchAgent.CatalogEntry("con-lac-lo-xo", "Con lắc lò xo", "Cơ học", 11, "Vật gắn lò xo | dao động", "Chu kì theo k và m"),
            new ExperimentMatchAgent.CatalogEntry("roi-tu-do", "Rơi tự do", "Cơ học", 10, "Thả vật rơi", "Gia tốc g"),
            new ExperimentMatchAgent.CatalogEntry("nem-ngang", "Ném ngang", "Cơ học", 10, "Ném vật theo phương ngang", "Quỹ đạo parabol"));

    private static final class Scripted implements AiClient {
        final List<String> replies;
        final List<String> prompts = new ArrayList<>();
        Scripted(String... replies) { this.replies = List.of(replies); }
        @Override public String generate(String prompt) { return generateDetailed(prompt, (StructuredOutputSpec) null).text(); }
        @Override public AiGenerationResult generateDetailed(String prompt, StructuredOutputSpec spec) {
            if (spec != null) assertThat(spec).isEqualTo(StructuredOutputSchemaRegistry.EXPERIMENT_MATCH_RESPONSE);
            prompts.add(prompt);
            return new AiGenerationResult(replies.get(Math.min(prompts.size(), replies.size()) - 1), "test", "test");
        }
    }

    @Test
    void aRequestWordedDifferentlyComesBackAsTheExperimentOfTheLibrary() {
        var scripted = new Scripted("{\"matches\":[{\"id\":\"con-lac-don\",\"reason\":\"Quả nặng treo dây dao động là con lắc đơn.\"}]}");

        var result = new ExperimentMatchAgent(scripted, new ObjectMapper()).match("quả nặng treo dây đung đưa qua lại", CATALOG);

        assertThat(result.matches()).extracting(ExperimentMatchAgent.Match::id).containsExactly("con-lac-don");
        assertThat(result.matches().get(0).reason()).contains("con lắc đơn");
        String prompt = scripted.prompts.get(0);
        assertThat(prompt).contains("con-lac-don | Con lắc đơn | Cơ học | 10 | Quả nặng treo dây dao động | Chu kì phụ thuộc chiều dài")
                .contains("Vật gắn lò xo / dao động");
        assertThat(prompt.indexOf("MỤC LỤC")).isLessThan(prompt.indexOf("quả nặng treo dây đung đưa"));
    }

    @Test
    void nothingInTheLibraryIsAnEmptyList() {
        var result = new ExperimentMatchAgent(new Scripted("{\"matches\":[]}"), new ObjectMapper()).match("bắn neutron vào uranium", CATALOG);

        assertThat(result.matches()).isEmpty();
    }

    @Test
    void anIdOutsideTheCatalogIsSentBackAndTheNextAnswerIsTaken() {
        var scripted = new Scripted("{\"matches\":[{\"id\":\"con-lac\",\"reason\":\"x\"}]}", "{\"matches\":[{\"id\":\"con-lac-don\",\"reason\":\"x\"}]}");

        var result = new ExperimentMatchAgent(scripted, new ObjectMapper()).match("con lắc", CATALOG);

        assertThat(result.matches()).extracting(ExperimentMatchAgent.Match::id).containsExactly("con-lac-don");
        assertThat(scripted.prompts).hasSize(2);
        assertThat(scripted.prompts.get(1)).contains("Lần trước bị từ chối vì: id 'con-lac' không có trong mục lục");
    }

    @Test
    void repeatsAreDroppedAndOnlyTheBestThreeAreKept() {
        var scripted = new Scripted("{\"matches\":[{\"id\":\"roi-tu-do\",\"reason\":\"a\"},{\"id\":\"roi-tu-do\",\"reason\":\"b\"},{\"id\":\"nem-ngang\",\"reason\":\"c\"},"
                + "{\"id\":\"con-lac-don\",\"reason\":\"d\"},{\"id\":\"con-lac-lo-xo\",\"reason\":\"e\"}]}");

        var result = new ExperimentMatchAgent(scripted, new ObjectMapper()).match("vật rơi", CATALOG);

        assertThat(result.matches()).extracting(ExperimentMatchAgent.Match::id).containsExactly("roi-tu-do", "nem-ngang", "con-lac-don");
        assertThat(result.matches().get(0).reason()).isEqualTo("a");
    }

    @Test
    void anAgentThatNeverAnswersRightFailsAfterTheLastAttempt() {
        var scripted = new Scripted("không phải JSON");

        assertThatThrownBy(() -> new ExperimentMatchAgent(scripted, new ObjectMapper()).match("con lắc", CATALOG))
                .isInstanceOf(InvalidAgentResponseException.class);
        assertThat(scripted.prompts).hasSize(ExperimentMatchAgent.MAX_ATTEMPTS);
    }
}
