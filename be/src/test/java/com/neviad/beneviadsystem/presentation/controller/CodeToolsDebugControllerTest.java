package com.neviad.beneviadsystem.presentation.controller;

import com.neviad.beneviadsystem.domain.model.SourceFile;
import com.neviad.beneviadsystem.infrastructure.persistence.SourceFileRepository;
import com.neviad.beneviadsystem.service.SourceLibraryService;
import com.neviad.beneviadsystem.service.agent.codegen.FakeBrowserBridge;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CodeToolsDebugControllerTest {
    private MockMvc mvc;
    private FakeBrowserBridge browser;

    @BeforeEach
    void setUp() {
        SourceFileRepository repository = mock(SourceFileRepository.class);
        when(repository.findAll(SourceLibraryService.TEMPLATE)).thenReturn(List.of(new SourceFile("README.md", "khung\nmẫu\n")));
        browser = new FakeBrowserBridge();
        mvc = MockMvcBuilders.standaloneSetup(new CodeToolsDebugController(new SourceLibraryService(repository), browser)).build();
    }

    private org.springframework.test.web.servlet.ResultActions tool(String run, String tool, String json) throws Exception {
        return mvc.perform(post("/api/v1/codetools/debug/" + run + "/" + tool).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    @Test
    void callsAToolOfTheSessionAndKeepsTheSessionBetweenCalls() throws Exception {
        tool("r1", "read_file", "{\"path\":\"README.md\",\"offset\":0,\"limit\":0}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true)).andExpect(jsonPath("$.content").value("khung\nmẫu"));

        mvc.perform(get("/api/v1/codetools/debug/r1/state")).andExpect(status().isOk())
                .andExpect(jsonPath("$.state.reads").value(1)).andExpect(jsonPath("$.ledger").value(org.hamcrest.Matchers.containsString("Đã đọc: README.md")))
                .andExpect(jsonPath("$.writable[0]").value("_playground/r1/physics.ts")).andExpect(jsonPath("$.mustRead[0]").value("README.md"));
    }

    @Test
    void writingWaitsForTheReadAndStaysInsideThePlayground() throws Exception {
        String write = "{\"path\":\"_playground/r2/physics.ts\",\"content\":\"export const a = 1;\"}";

        tool("r2", "write_file", write).andExpect(jsonPath("$.success").value(false)).andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("MUST_READ_FIRST")));
        tool("r2", "read_file", "{\"path\":\"README.md\",\"offset\":0,\"limit\":0}").andExpect(jsonPath("$.success").value(true));
        tool("r2", "write_file", write).andExpect(jsonPath("$.success").value(true));
        tool("r2", "write_file", "{\"path\":\"engines/x/physics.ts\",\"content\":\"x\"}").andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("PATH_NOT_ALLOWED")));

        tool("r2", "read_file", "{\"path\":\"_playground/r2/physics.ts\",\"offset\":0,\"limit\":0}")
                .andExpect(jsonPath("$.success").value(true)).andExpect(jsonPath("$.content").value("export const a = 1;"));
    }

    @Test
    void anUnknownToolListsTheKnownOnesAndABadRunIdIsRefused() throws Exception {
        tool("r3", "nope", "{}").andExpect(status().isNotFound()).andExpect(jsonPath("$.tools[0]").value("read_file")).andExpect(jsonPath("$.tools[6]").value("finish"));
        tool("bad.id", "read_file", "{}").andExpect(status().isBadRequest());
    }

    @Test
    void optionsCannotMoveTheWritableFilesOutOfThePlayground() throws Exception {
        mvc.perform(put("/api/v1/codetools/debug/r4/options").contentType(MediaType.APPLICATION_JSON).content("{\"writable\":[\"engines/x/physics.ts\"]}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/v1/codetools/debug/r4/options").contentType(MediaType.APPLICATION_JSON).content("{\"writable\":[\"_playground/r4/a.ts\"],\"mustRead\":[]}"))
                .andExpect(status().isOk());

        tool("r4", "write_file", "{\"path\":\"_playground/r4/a.ts\",\"content\":\"ok\"}").andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void resetForgetsWhatTheRunWroteAndNoted() throws Exception {
        tool("r5", "read_file", "{\"path\":\"README.md\",\"offset\":0,\"limit\":0}");
        tool("r5", "write_file", "{\"path\":\"_playground/r5/types.ts\",\"content\":\"export type T = 1;\"}").andExpect(jsonPath("$.success").value(true));
        tool("r5", "append_note", "{\"text\":\"một ghi chú\"}").andExpect(jsonPath("$.success").value(true));

        mvc.perform(delete("/api/v1/codetools/debug/r5")).andExpect(status().isOk()).andExpect(jsonPath("$.reset").value(true)).andExpect(jsonPath("$.store").value("db"));

        mvc.perform(get("/api/v1/codetools/debug/r5/state")).andExpect(jsonPath("$.state.writes").value(0));
        tool("r5", "read_file", "{\"path\":\"_playground/r5/types.ts\",\"offset\":0,\"limit\":0}").andExpect(jsonPath("$.success").value(false));
        tool("r5", "read_file", "{\"path\":\"_notes/playground-r5.md\",\"offset\":0,\"limit\":0}").andExpect(jsonPath("$.success").value(false));
    }

    private org.springframework.test.web.servlet.ResultActions chrome(String run, String tool, String json) throws Exception {
        return mvc.perform(post("/api/v1/codetools/debug/" + run + "/" + tool + "?store=chrome").contentType(MediaType.APPLICATION_JSON).content(json));
    }

    @Test
    void theChromeStoreWorksOnTheBrowserCopyAndLeavesTheDbStoreAlone() throws Exception {
        browser.files.put("README.md", "bản sao trong Chrome");

        chrome("c1", "read_file", "{\"path\":\"README.md\",\"offset\":0,\"limit\":0}")
                .andExpect(jsonPath("$.success").value(true)).andExpect(jsonPath("$.content").value("bản sao trong Chrome"));
        chrome("c1", "write_file", "{\"path\":\"_playground/c1/physics.ts\",\"content\":\"export const a = 1;\"}").andExpect(jsonPath("$.success").value(true));

        assertThat(browser.files).containsEntry("_playground/c1/physics.ts", "export const a = 1;");
        mvc.perform(get("/api/v1/codetools/debug/c1/state?store=chrome")).andExpect(jsonPath("$.state.writes").value(1));
        mvc.perform(get("/api/v1/codetools/debug/c1/state")).andExpect(jsonPath("$.state.writes").value(0));
        tool("c1", "read_file", "{\"path\":\"_playground/c1/physics.ts\",\"offset\":0,\"limit\":0}").andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void aChromeCallWithoutABrowserSessionFailsAsAToolResult() throws Exception {
        browser.down = true;

        chrome("c2", "read_file", "{\"path\":\"README.md\",\"offset\":0,\"limit\":0}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("chưa có phiên live code")));
    }

    @Test
    void anUnknownStoreIsRefused() throws Exception {
        mvc.perform(post("/api/v1/codetools/debug/c3/read_file?store=disk").contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isBadRequest());
        mvc.perform(delete("/api/v1/codetools/debug/c3?store=chrome")).andExpect(status().isOk()).andExpect(jsonPath("$.store").value("chrome"));
    }
}
