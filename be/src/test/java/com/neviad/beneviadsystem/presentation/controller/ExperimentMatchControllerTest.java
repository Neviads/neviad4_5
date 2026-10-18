package com.neviad.beneviadsystem.presentation.controller;

import com.neviad.beneviadsystem.service.agent.InvalidAgentResponseException;
import com.neviad.beneviadsystem.service.agent.impl.ExperimentMatchAgent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ExperimentMatchControllerTest {
    private static final String CATALOG = "[{\"id\":\"con-lac-don\",\"title\":\"Con lắc đơn\",\"domain\":\"Cơ học\",\"grade\":10,\"desc\":\"d\",\"objective\":\"o\"}]";

    private ExperimentMatchAgent agent;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        agent = mock(ExperimentMatchAgent.class);
        mvc = MockMvcBuilders.standaloneSetup(new ExperimentMatchController(agent)).build();
    }

    @Test
    void returnsTheMatchedExperimentsOfTheCatalog() throws Exception {
        when(agent.match(eq("con lắc đơn"), anyList())).thenReturn(new ExperimentMatchAgent.MatchResult(
                List.of(new ExperimentMatchAgent.Match("con-lac-don", "Đúng là con lắc đơn."))));

        mvc.perform(post("/api/v1/experiment-match").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"request\":\"  con lắc đơn \",\"catalog\":" + CATALOG + "}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.matches[0].id").value("con-lac-don"))
                .andExpect(jsonPath("$.matches[0].reason").value("Đúng là con lắc đơn."));
    }

    @Test
    void aRequestWithoutCatalogIsRejectedBeforeTheAgentRuns() throws Exception {
        mvc.perform(post("/api/v1/experiment-match").contentType(MediaType.APPLICATION_JSON).content("{\"request\":\"con lắc\",\"catalog\":[]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void anAgentThatCannotProduceAValidAnswerIsABadRequest() throws Exception {
        when(agent.match(eq("x"), anyList())).thenThrow(new InvalidAgentResponseException("hết lượt", null));

        mvc.perform(post("/api/v1/experiment-match").contentType(MediaType.APPLICATION_JSON).content("{\"request\":\"x\",\"catalog\":" + CATALOG + "}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("hết lượt"));
    }
}
