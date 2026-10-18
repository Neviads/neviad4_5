package com.neviad.beneviadsystem.presentation.controller;

import com.neviad.beneviadsystem.service.agent.InvalidAgentResponseException;
import com.neviad.beneviadsystem.service.agent.impl.ScenarioAgent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ScenarioControllerTest {
    private static final String BODY = """
            {"request":" máy nâng thuỷ lực ","objects":[{"id":"pump","title":"Máy nâng","request":"mô tả","hint":"Đầu ra: y. Port: z.","inputs":null,"outputs":null}]}
            """;
    private ScenarioAgent agent;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        agent = mock(ScenarioAgent.class);
        mvc = MockMvcBuilders.standaloneSetup(new ScenarioController(agent)).build();
    }

    @Test
    void returnsTheScenarioAndPassesTheObjectsOn() throws Exception {
        when(agent.scenario(eq("máy nâng thuỷ lực"), any())).thenReturn(new ScenarioAgent.Scenario("tóm tắt", List.of("F = pA"),
                List.of(new ScenarioAgent.Phase("Ấn", "mô tả")), "bố cục", List.of(), List.of(), List.of(),
                List.of(new ScenarioAgent.ObjectGeometry("pump", 0.6, 0.8, "tâm đáy", List.of(),
                        List.of(new ScenarioAgent.MovingPart("lever", "rotate", "", 0.0, 25.0, "cần bơm"))))));

        mvc.perform(post("/api/v1/scenario").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isOk()).andExpect(jsonPath("$.formulas[0]").value("F = pA")).andExpect(jsonPath("$.phases[0].name").value("Ấn")).andExpect(jsonPath("$.objectGeometry[0].parts[0].name").value("lever"));

        @SuppressWarnings("unchecked") ArgumentCaptor<List<ScenarioAgent.ObjectInfo>> captor = ArgumentCaptor.forClass(List.class);
        verify(agent).scenario(eq("máy nâng thuỷ lực"), captor.capture());
        assertThat(captor.getValue().getFirst().id()).isEqualTo("pump");
        assertThat(captor.getValue().getFirst().title()).isEqualTo("Máy nâng");
    }

    @Test
    void aRequestWithoutObjectsIsRejected() throws Exception {
        mvc.perform(post("/api/v1/scenario").contentType(MediaType.APPLICATION_JSON).content("{\"request\":\"x\",\"objects\":[]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void anAgentThatCannotWriteAValidScenarioIsABadRequest() throws Exception {
        when(agent.scenario(any(), any())).thenThrow(new InvalidAgentResponseException("hết lượt", null));

        mvc.perform(post("/api/v1/scenario").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("hết lượt"));
    }
}
