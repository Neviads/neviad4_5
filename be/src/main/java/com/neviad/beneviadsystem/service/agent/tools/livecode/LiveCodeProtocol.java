package com.neviad.beneviadsystem.service.agent.tools.livecode;

import java.util.Map;

/**
 * Wire contract between the backend code agents and the frontend's copy of {@code neviadlike_structure} (see {@code fe/lib/code-fs}).
 * The frontend owns the files; every operation is one request/response pair correlated by {@code callId} and scoped to a {@code runId}.
 * The backend validates every path before it sends one.
 */
public final class LiveCodeProtocol {
    public static final String OP_FS_READ = "fsRead";
    public static final String OP_FS_WRITE = "fsWrite";
    public static final String OP_FS_LIST = "fsList";
    public static final String OP_FS_APPEND = "fsAppend";
    public static final String OP_FS_SEARCH = "fsSearch";

    public static final String ERROR_TIMEOUT = "TIMEOUT";
    public static final String ERROR_BRIDGE = "BRIDGE_ERROR";
    public static final String ERROR_INTERRUPTED = "INTERRUPTED";

    private LiveCodeProtocol() { }

    /** Backend -> frontend request. */
    public record Call(String callId, String runId, String op, Map<String, Object> args) { }

    /** Frontend -> backend response. {@code data} carries what the operation returns, such as {@code content} or {@code items}. */
    public record Result(String callId, String runId, boolean ok, Map<String, Object> data, String message) {
        public static Result failure(String callId, String runId, String code, String message) {
            return new Result(callId, runId, false, Map.of(), code + ": " + message);
        }

        public Object get(String key) { return data == null ? null : data.get(key); }
    }
}
