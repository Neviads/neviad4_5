package com.neviad.beneviadsystem.service.agent.codegen;

import com.neviad.beneviadsystem.service.agent.tools.livecode.LiveCodeBridge;
import com.neviad.beneviadsystem.service.agent.tools.livecode.LiveCodeProtocol;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * The tree of {@code neviadlike_structure} as the browser holds it: every operation is one request to the frontend through the
 * {@link LiveCodeBridge}, answered from the copy in IndexedDB. Paths are validated here, with the same rules as the disk store,
 * before anything is sent. A failure of the bridge or of the browser comes back as an {@link IllegalStateException}.
 */
public final class BridgedCodeStore implements CodeStore {
    private static final Duration DEFAULT_TIMEOUT = Duration.ofSeconds(15);

    private final LiveCodeBridge bridge;
    private final String runId;
    private final Duration timeout;

    public BridgedCodeStore(LiveCodeBridge bridge, String runId) { this(bridge, runId, DEFAULT_TIMEOUT); }

    public BridgedCodeStore(LiveCodeBridge bridge, String runId, Duration timeout) {
        this.bridge = bridge;
        this.runId = runId;
        this.timeout = timeout;
    }

    @Override
    public Optional<String> read(String path) {
        Object content = call(LiveCodeProtocol.OP_FS_READ, args("path", SourceStore.validatePath(path, false))).get("content");
        return content instanceof String text ? Optional.of(text) : Optional.empty();
    }

    @Override
    public void write(String path, String content) {
        call(LiveCodeProtocol.OP_FS_WRITE, args("path", SourceStore.validatePath(path, true), "content", content));
    }

    @Override
    public boolean exists(String path) { return read(path).isPresent(); }

    @Override
    public List<String> list(String folder) {
        Object files = call(LiveCodeProtocol.OP_FS_LIST, args("folder", folder == null ? "" : folder.replace('\\', '/'))).get("files");
        List<String> out = new ArrayList<>();
        if (files instanceof List<?> list) for (Object item : list) out.add(String.valueOf(item));
        return out;
    }

    @Override
    public void appendNote(String path, String text) {
        call(LiveCodeProtocol.OP_FS_APPEND, args("path", SourceStore.validateNotePath(path), "text", text));
    }

    @Override
    public void checkPath(String path, boolean forWrite) { SourceStore.validatePath(path, forWrite); }

    /** One request to the browser instead of a read per file. */
    @Override
    public List<String> search(String query, String folder, int max, int maxLineChars) {
        Object matches = call(LiveCodeProtocol.OP_FS_SEARCH, args("query", query, "folder", folder == null ? "" : folder,
                "max", max, "maxLineChars", maxLineChars)).get("matches");
        List<String> out = new ArrayList<>();
        if (matches instanceof List<?> list) for (Object item : list) out.add(String.valueOf(item));
        return out;
    }

    private LiveCodeProtocol.Result call(String op, Map<String, Object> args) {
        LiveCodeProtocol.Result result = bridge.call(runId, op, args, timeout);
        if (!result.ok()) throw new IllegalStateException(result.message() == null || result.message().isBlank() ? "Trình duyệt không trả lời " + op : result.message());
        return result;
    }

    private static Map<String, Object> args(Object... entries) {
        Map<String, Object> out = new LinkedHashMap<>();
        for (int index = 0; index < entries.length; index += 2) out.put((String) entries[index], entries[index + 1]);
        return out;
    }
}
