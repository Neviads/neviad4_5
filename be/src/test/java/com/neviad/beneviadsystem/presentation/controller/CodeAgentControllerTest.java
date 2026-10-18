package com.neviad.beneviadsystem.presentation.controller;

import com.neviad.beneviadsystem.service.agent.codegen.CodeAgentService;
import com.neviad.beneviadsystem.service.agent.codegen.CodeLayer;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CodeAgentControllerTest {
    private static final String BODY = """
            {"runId":"run-1","slug":"va-cham","request":" 2 ô tô đâm nhau ",
             "scenario":{"summary":"Hai xe va chạm.","formulas":["p = m·v"],"phases":[{"name":"Tiến lại","description":"Hai xe chạy vào nhau"}],
                         "layout":"Xe 1 bên trái.","adjustable":null,"observable":["vị trí"],"assumptions":null,
                         "objectGeometry":[{"objectId":"leftCar","width":2,"height":1.3,"anchor":"tâm đáy","points":null,"parts":null}]},
             "objects":[{"id":"leftCar","title":"Ô tô trái","file":"objects/va-cham-1.ts","functionName":"makeLeftCar","notes":null}]}
            """;
    private CodeAgentService service;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        service = mock(CodeAgentService.class);
        mvc = MockMvcBuilders.standaloneSetup(new CodeAgentController(service)).build();
    }

    private org.springframework.test.web.servlet.ResultActions send(String body) throws Exception {
        return mvc.perform(post("/api/v1/codeagent/engine").contentType(MediaType.APPLICATION_JSON).content(body));
    }

    @Test
    void runsTheEngineAgentAndFillsInTheListsTheBrowserLeftOut() throws Exception {
        when(service.run(any(), any())).thenReturn(new CodeAgentService.Result("finished", 1, "xong", "sổ cái", "_notes/va-cham.md", List.of("engines/va-cham/physics.ts")));

        send(BODY).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("finished")).andExpect(jsonPath("$.files[0]").value("engines/va-cham/physics.ts"));

        var captor = ArgumentCaptor.forClass(CodeAgentService.Request.class);
        verify(service).run(eq(CodeLayer.ENGINE), captor.capture());
        assertThat(captor.getValue().request()).isEqualTo("2 ô tô đâm nhau");
        assertThat(captor.getValue().scenario().adjustable()).isEmpty();
        assertThat(captor.getValue().scenario().assumptions()).isEmpty();
        assertThat(captor.getValue().objects().getFirst().file()).isEqualTo("objects/va-cham-1.ts");
        assertThat(captor.getValue().scenario().objectGeometry().getFirst().width()).isEqualTo(2.0);
        assertThat(captor.getValue().scenario().objectGeometry().getFirst().parts()).isEmpty();
    }

    @Test
    void refusesARequestThatCouldNotRunBeforeCallingTheAgent() throws Exception {
        send(BODY.replace("run-1", "run 1!")).andExpect(status().isBadRequest());
        send(BODY.replace("\"summary\":\"Hai xe va chạm.\"", "\"summary\":\"\"")).andExpect(status().isBadRequest());
        send(BODY.replace("objects/va-cham-1.ts", "engines/evil.ts")).andExpect(status().isBadRequest());
        send(BODY.replace("\"id\":\"leftCar\"", "\"id\":\"../x\"")).andExpect(status().isBadRequest());
        send(BODY.substring(0, BODY.indexOf("\"objects\"")) + "\"objects\":[]}").andExpect(status().isBadRequest());

        verify(service, never()).run(any(), any());
    }

    @Test
    void theLayerInTheUrlDecidesWhichAgentRunsAndAnUnknownLayerIsABadRequest() throws Exception {
        when(service.run(any(), any())).thenReturn(new CodeAgentService.Result("finished", 1, "xong", "sổ cái", "_notes/va-cham.md", List.of()));

        for (String layer : List.of("renderer", "experiment")) {
            mvc.perform(post("/api/v1/codeagent/" + layer).contentType(MediaType.APPLICATION_JSON).content(BODY)).andExpect(status().isOk());
        }
        verify(service).run(eq(CodeLayer.RENDERER), any());
        verify(service).run(eq(CodeLayer.EXPERIMENT), any());

        mvc.perform(post("/api/v1/codeagent/physics").contentType(MediaType.APPLICATION_JSON).content(BODY)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("engine, renderer hoặc experiment")));
    }

    @Test
    void aSlugThatIsNotValidComesBackAsABadRequest() throws Exception {
        when(service.run(any(), any())).thenThrow(new IllegalArgumentException("slug phải gồm chữ thường"));

        send(BODY).andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("slug phải gồm chữ thường"));
    }
}
