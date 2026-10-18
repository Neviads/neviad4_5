package com.neviad.beneviadsystem.service.agent.codegen;

import com.neviad.beneviadsystem.domain.model.SourceFile;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;

/**
 * The template tree as stored in the database ({@code SourceLibraryService#templateStore}), held in memory and read-only: put an
 * {@link OverlayCodeStore} on top of it so an agent can write. Same path rules as the disk store ({@link SourceStore#validatePath}).
 */
public final class TemplateCodeStore implements CodeStore {
    private final Map<String, String> files = new TreeMap<>();

    public TemplateCodeStore(List<SourceFile> files) {
        for (SourceFile file : files) this.files.put(file.path(), file.content());
    }

    @Override
    public Optional<String> read(String path) { return Optional.ofNullable(files.get(SourceStore.validatePath(path, false))); }

    @Override
    public void write(String path, String content) { throw new IllegalStateException("template trong DB chỉ đọc: " + path); }

    @Override
    public boolean exists(String path) { return files.containsKey(SourceStore.validatePath(path, false)); }

    @Override
    public List<String> list(String folder) {
        String prefix = folder == null || folder.isBlank() ? "" : (folder.endsWith("/") ? folder : folder + "/");
        return files.keySet().stream().filter(path -> path.startsWith(prefix)).toList();
    }

    @Override
    public void appendNote(String path, String text) { throw new IllegalStateException("template trong DB chỉ đọc: " + path); }

    @Override
    public void checkPath(String path, boolean forWrite) { SourceStore.validatePath(path, forWrite); }
}
