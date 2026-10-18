package com.neviad.beneviadsystem.service;

import com.neviad.beneviadsystem.domain.model.SourceFile;
import com.neviad.beneviadsystem.infrastructure.persistence.SourceFileRepository;
import com.neviad.beneviadsystem.service.agent.codegen.TemplateCodeStore;
import com.neviad.beneviadsystem.service.agent.codegen.SourceStore;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Source code kept in the database, grouped in collections ({@code template} = the tree of {@code fe/neviadlike_structure}). Read-only here:
 * {@code fe/scripts/push-source.mjs} loads the table. Paths follow the rules of the agent's file tree ({@link SourceStore#validatePath}); a bad
 * collection or path is an IllegalArgumentException.
 */
@Service
public class SourceLibraryService {
    /** The collection the code agents work on: the tree of {@code fe/neviadlike_structure}, loaded by {@code npm --prefix fe run push:template}. */
    public static final String TEMPLATE = "template";
    private static final Pattern COLLECTION = Pattern.compile("^[a-z0-9-]{1,40}$");

    private final SourceFileRepository repository;

    public SourceLibraryService(SourceFileRepository repository) { this.repository = repository; }

    public List<SourceFile> files(String collection) { return repository.findAll(checkCollection(collection)); }

    /** The template as it is in the database now, read-only; an IllegalStateException when it has not been loaded. */
    public TemplateCodeStore templateStore() {
        List<SourceFile> files = files(TEMPLATE);
        if (files.isEmpty()) throw new IllegalStateException("Template chưa có trong DB: chạy npm --prefix fe run push:template.");
        return new TemplateCodeStore(files);
    }

    public Optional<SourceFile> file(String collection, String path) {
        return repository.find(checkCollection(collection), SourceStore.validatePath(path, false));
    }

    private static String checkCollection(String collection) {
        if (collection == null || !COLLECTION.matcher(collection).matches()) throw new IllegalArgumentException("collection không hợp lệ: " + collection);
        return collection;
    }
}
