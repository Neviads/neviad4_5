package com.neviad.beneviadsystem.service.agent.codegen;

import com.neviad.beneviadsystem.service.agent.tools.livecode.LiveCodeBridge;
import com.neviad.beneviadsystem.service.agent.tools.livecode.LiveCodeProtocol;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/** A browser in memory: answers the file operations of the code agent from a map, and remembers every operation it was asked. */
public final class FakeBrowserBridge implements LiveCodeBridge {
    public final Map<String, String> files = new TreeMap<>();
    public final List<String> ops = new ArrayList<>();
    public boolean down;
    /** How many appends still succeed; the next one after that fails (the browser went away while a note was being written). */
    public int appendsBeforeFailure = Integer.MAX_VALUE;

    @Override
    public LiveCodeProtocol.Result call(String runId, String op, Map<String, Object> args, Duration timeout) {
        ops.add(op);
        if (down) return LiveCodeProtocol.Result.failure("c", runId, LiveCodeProtocol.ERROR_BRIDGE, "chưa có phiên live code");
        return switch (op) {
            case LiveCodeProtocol.OP_FS_READ -> {
                String content = files.get((String) args.get("path"));
                yield ok(runId, content == null ? Map.of() : Map.of("content", content));
            }
            case LiveCodeProtocol.OP_FS_WRITE -> {
                files.put((String) args.get("path"), (String) args.get("content"));
                yield ok(runId, Map.of());
            }
            case LiveCodeProtocol.OP_FS_LIST -> {
                String folder = (String) args.get("folder");
                String prefix = folder == null || folder.isBlank() ? "" : folder + "/";
                yield ok(runId, Map.of("files", files.keySet().stream().filter(path -> path.startsWith(prefix)).toList()));
            }
            case LiveCodeProtocol.OP_FS_APPEND -> {
                if (appendsBeforeFailure-- <= 0) yield LiveCodeProtocol.Result.failure("c", runId, LiveCodeProtocol.ERROR_BRIDGE, "mất kết nối khi ghi ghi chú");
                files.merge((String) args.get("path"), args.get("text") + "\n", String::concat);
                yield ok(runId, Map.of());
            }
            case LiveCodeProtocol.OP_FS_SEARCH -> {
                String needle = ((String) args.get("query")).toLowerCase();
                int max = (Integer) args.get("max");
                String folder = (String) args.get("folder");
                String prefix = folder == null || folder.isBlank() ? "" : folder + "/";
                List<String> matches = new ArrayList<>();
                search:
                for (var file : files.entrySet()) {
                    if (!file.getKey().startsWith(prefix)) continue;
                    int number = 0;
                    for (String line : file.getValue().lines().toList()) {
                        number++;
                        if (!line.toLowerCase().contains(needle)) continue;
                        if (matches.size() >= max) { matches.add(CodeStore.SearchRules.CUT_MARK); break search; }
                        matches.add(file.getKey() + ":" + number + ": " + line.strip());
                    }
                }
                yield ok(runId, Map.of("matches", matches));
            }
            default -> LiveCodeProtocol.Result.failure("c", runId, "UNKNOWN_OP", op);
        };
    }

    private static LiveCodeProtocol.Result ok(String runId, Map<String, Object> data) {
        return new LiveCodeProtocol.Result("c", runId, true, data, null);
    }
}
