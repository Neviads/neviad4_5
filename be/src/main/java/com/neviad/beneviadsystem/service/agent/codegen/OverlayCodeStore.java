package com.neviad.beneviadsystem.service.agent.codegen;


import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeSet;
import java.util.concurrent.ConcurrentHashMap;

/**
 * A copy of the tree that lives only for one run: it reads a base tree (the template from the database, {@link TemplateCodeStore}, or a
 * {@link SourceStore} on disk) and keeps every write (and note) in memory on top of it, so an agent can be run without the browser and
 * without leaving files behind. The path rules are the disk store's own ({@link SourceStore#validatePath}, {@link SourceStore#validateNotePath}).
 */
public final class OverlayCodeStore implements CodeStore {
    private final CodeStore base;
    private final Map<String, String> written = new ConcurrentHashMap<>();

    public OverlayCodeStore(CodeStore base) {
        this.base = base;
    }

    @Override
    public Optional<String> read(String path) {
        String clean = SourceStore.validatePath(path, false);
        String own = written.get(clean);
        return own != null ? Optional.of(own) : base.read(clean);
    }

    @Override
    public void write(String path, String content) {
        written.put(SourceStore.validatePath(path, true), content.endsWith("\n") ? content : content + "\n");
    }

    @Override
    public boolean exists(String path) {
        String clean = SourceStore.validatePath(path, false);
        return written.containsKey(clean) || base.exists(clean);
    }

    @Override
    public List<String> list(String folder) {
        String prefix = folder == null || folder.isBlank() ? "" : (folder.endsWith("/") ? folder : folder + "/");
        TreeSet<String> files = new TreeSet<>(base.list(folder));
        for (String path : written.keySet()) if (path.startsWith(prefix)) files.add(path);
        return List.copyOf(files);
    }

    @Override
    public void appendNote(String path, String text) {
        String clean = SourceStore.validateNotePath(path);
        if (text == null || text.isBlank()) throw new IllegalArgumentException("nội dung ghi chú trống");
        String line = text.endsWith("\n") ? text : text + "\n";
        written.merge(clean, base.read(clean).orElse("") + line, (old, ignored) -> old + line);
    }

    @Override
    public void checkPath(String path, boolean forWrite) {
        SourceStore.validatePath(path, forWrite);
    }
}
