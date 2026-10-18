package com.neviad.beneviadsystem.presentation.controller;

import com.neviad.beneviadsystem.presentation.dto.requirement.ClarificationQuestion;
import com.neviad.beneviadsystem.service.agent.InvalidAgentResponseException;
import com.neviad.beneviadsystem.service.agent.impl.LiteSpecAgent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class LiteSpecControllerTest {
    private LiteSpecAgent agent;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        agent = mock(LiteSpecAgent.class);
        mvc = MockMvcBuilders.standaloneSetup(new LiteSpecController(agent)).build();
    }

    @Test
    void returnsTheDrawingRequestsOfTheSentence() throws Exception {
        when(agent.analyze("máy nâng thuỷ lực", "run-1")).thenReturn(new LiteSpecAgent.LiteOutcome(LiteSpecAgent.Status.READY, "Thuỷ lực", null, null, "Tả thực",
                List.of(new LiteSpecAgent.ObjectRequest("lift", "Máy nâng", "mô tả, điểm neo ở đáy", "đầu vào: x. Đầu ra: y. Port: z."))));

        mvc.perform(post("/api/v1/lite-spec").contentType(MediaType.APPLICATION_JSON).content("{\"request\":\"  máy nâng thuỷ lực \",\"runId\":\"run-1\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("READY"))
                .andExpect(jsonPath("$.objects[0].id").value("lift")).andExpect(jsonPath("$.objects[0].hint").value("đầu vào: x. Đầu ra: y. Port: z."))
                .andExpect(jsonPath("$.style").value("Tả thực"));
    }

    @Test
    void returnsTheQuestionWhenTheLookIsStillOpen() throws Exception {
        when(agent.analyze("con lắc", null)).thenReturn(new LiteSpecAgent.LiteOutcome(LiteSpecAgent.Status.NEEDS_CLARIFICATION, "Dao động", null,
                new ClarificationQuestion("Phong cách hình", "Tả thực hay sơ đồ SGK?", List.of("Tả thực", "Sơ đồ SGK")), "", List.of()));

        mvc.perform(post("/api/v1/lite-spec").contentType(MediaType.APPLICATION_JSON).content("{\"request\":\"con lắc\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("NEEDS_CLARIFICATION"))
                .andExpect(jsonPath("$.question.text").value("Tả thực hay sơ đồ SGK?")).andExpect(jsonPath("$.question.suggestions[1]").value("Sơ đồ SGK"));
    }

    @Test
    void aBlankSentenceIsRejectedBeforeTheAgentRuns() throws Exception {
        mvc.perform(post("/api/v1/lite-spec").contentType(MediaType.APPLICATION_JSON).content("{\"request\":\"  \"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void anAgentThatCannotProduceAValidAnswerIsABadRequest() throws Exception {
        when(agent.analyze("x", null)).thenThrow(new InvalidAgentResponseException("hết lượt", null));

        mvc.perform(post("/api/v1/lite-spec").contentType(MediaType.APPLICATION_JSON).content("{\"request\":\"x\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("hết lượt"));
    }
}
