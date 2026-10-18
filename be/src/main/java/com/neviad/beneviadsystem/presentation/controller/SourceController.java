package com.neviad.beneviadsystem.presentation.controller;

import com.neviad.beneviadsystem.domain.model.SourceFile;
import com.neviad.beneviadsystem.service.SourceLibraryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Source code stored in the database, by collection: {@code template} is the tree of {@code fe/neviadlike_structure} the code agents work on,
 * {@code objects} the drawn objects of {@code /vat-the-mo-phong}. Read-only: {@code fe/scripts/push-source.mjs} writes the table directly.
 */
@RestController
@RequestMapping("/api/v1/source")
@Tag(name = "Source", description = "Source code the agents read")
public class SourceController {
    public record FilesResponse(List<SourceFile> files) { }

    private final SourceLibraryService service;

    public SourceController(SourceLibraryService service) {
        this.service = service;
    }

    /** Every file of the collection with its content ({@code {files: [{path, content}]}}). */
    @GetMapping("/{collection}")
    @Operation(summary = "All files of a collection")
    public FilesResponse files(@PathVariable String collection) {
        return new FilesResponse(service.files(collection));
    }

    @GetMapping("/{collection}/file")
    @Operation(summary = "One file of a collection")
    public ResponseEntity<SourceFile> file(@PathVariable String collection, @RequestParam String path) {
        return ResponseEntity.of(service.file(collection, path));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, Object> badRequest(IllegalArgumentException exception) {
        return Map.of("status", 400, "error", "Bad Request", "message", exception.getMessage());
    }
}
