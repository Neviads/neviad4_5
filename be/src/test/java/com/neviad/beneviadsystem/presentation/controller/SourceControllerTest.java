package com.neviad.beneviadsystem.presentation.controller;

import com.neviad.beneviadsystem.domain.model.SourceFile;
import com.neviad.beneviadsystem.infrastructure.persistence.SourceFileRepository;
import com.neviad.beneviadsystem.service.SourceLibraryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SourceControllerTest {
    private SourceFileRepository repository;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        repository = mock(SourceFileRepository.class);
        mvc = MockMvcBuilders.standaloneSetup(new SourceController(new SourceLibraryService(repository))).build();
    }

    @Test
    void returnsEveryFileOfTheCollection() throws Exception {
        when(repository.findAll("template")).thenReturn(List.of(new SourceFile("README.md", "# x"), new SourceFile("shared/a.ts", "export {};")));

        mvc.perform(get("/api/v1/source/template")).andExpect(status().isOk())
                .andExpect(jsonPath("$.files[1].path").value("shared/a.ts")).andExpect(jsonPath("$.files[1].content").value("export {};"));
    }

    @Test
    void returnsOneFileOrNotFound() throws Exception {
        when(repository.find("template", "shared/a.ts")).thenReturn(Optional.of(new SourceFile("shared/a.ts", "export {};")));
        when(repository.find("template", "shared/b.ts")).thenReturn(Optional.empty());

        mvc.perform(get("/api/v1/source/template/file").param("path", "shared/a.ts")).andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("export {};"));
        mvc.perform(get("/api/v1/source/template/file").param("path", "shared/b.ts")).andExpect(status().isNotFound());
    }

    @Test
    void anUnsafePathOrCollectionIsABadRequest() throws Exception {
        mvc.perform(get("/api/v1/source/template/file").param("path", "../.env")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/source/Bad_Name")).andExpect(status().isBadRequest());
        verify(repository, never()).find(anyString(), anyString());
        verify(repository, never()).findAll(anyString());
    }

    @Test
    void thereIsNoWayToWriteThroughTheApi() throws Exception {
        mvc.perform(put("/api/v1/source/template")).andExpect(status().isMethodNotAllowed());
    }
}
