package com.neviad.beneviadsystem.service.agent.draft;

import com.neviad.beneviadsystem.infrastructure.ai.JsonStringFieldStream;
import com.neviad.beneviadsystem.infrastructure.ai.ToolStreamListener;
import com.neviad.beneviadsystem.presentation.dto.simulation.RunDraft;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.function.Consumer;

/**
 * Shows code while the model is still writing it: pulls one string argument out of the streamed arguments of a tool
 * ({@code content} of {@code write_file}: the whole file; {@code replacement} of {@code edit_file}: only the new piece)
 * and publishes it in small batches as {@link RunDraft} events that carry the tool and the file path. Display only; the
 * real file still goes through the tools and the checks. Pass it as the {@link ToolStreamListener} of a streamed model call.
 */
public final class CodeDraftStreamer implements ToolStreamListener {
    public static final Set<String> WRITE_FILE = Set.of("write_file");
    /** What a code agent writes: a whole file, or the replacement of one piece of a file. */
    public static final Map<String, String> CODE_AGENT_TOOLS = Map.of("write_file", "content", "edit_file", "replacement");
    private static final long FLUSH_NANOS = 150_000_000L;
    private final String runId;
    private final Consumer<RunDraft> out;
    /** Tool name to the argument that holds the code. */
    private final Map<String, String> fields;
    private final boolean announceEnd;
    private final String title;
    private final String fixedPath;
    private final StringBuilder pending = new StringBuilder();
    private JsonStringFieldStream content;
    private JsonStringFieldStream pathField;
    private String tool = "";
    private String path = "";
    private int seq;
    private long lastFlush;

    /** Streams the {@code content} argument of {@code write_file} calls. */
    public CodeDraftStreamer(String runId, Consumer<RunDraft> out) {
        this(runId, out, WRITE_FILE, false);
    }

    /** Streams the {@code content} argument of the given tools. */
    public CodeDraftStreamer(String runId, Consumer<RunDraft> out, Set<String> tools) {
        this(runId, out, tools, false);
    }

    /** {@code announceEnd}: also publish END when a call is fully received, for runs whose files do not arrive as a store event. */
    public CodeDraftStreamer(String runId, Consumer<RunDraft> out, Set<String> tools, boolean announceEnd) {
        this(runId, out, contentOf(tools), announceEnd);
    }

    /** Streams, for each tool in {@code fields}, the argument it names. */
    public CodeDraftStreamer(String runId, Consumer<RunDraft> out, Map<String, String> fields, boolean announceEnd) {
        this(runId, out, fields, announceEnd, "");
    }

    /** {@code title}: the object this agent draws, put on every event so that agents drawing at once on one run can be told apart. */
    public CodeDraftStreamer(String runId, Consumer<RunDraft> out, Map<String, String> fields, boolean announceEnd, String title) {
        this(runId, out, fields, announceEnd, title, "");
    }

    /**
     * {@code fixedPath}: the one file this agent may write, when the caller knows it. It is then on every event from the start, whatever order the
     * model writes its arguments in (a model may write the code before the path, so the path is otherwise only known once the call is complete).
     */
    public CodeDraftStreamer(String runId, Consumer<RunDraft> out, Map<String, String> fields, boolean announceEnd, String title, String fixedPath) {
        this.runId = runId;
        this.fixedPath = fixedPath == null ? "" : fixedPath;
        this.title = title == null ? "" : title;
        this.out = out;
        this.fields = Map.copyOf(fields);
        this.announceEnd = announceEnd;
    }

    private static Map<String, String> contentOf(Set<String> tools) {
        Map<String, String> fields = new HashMap<>();
        tools.forEach(tool -> fields.put(tool, "content"));
        return fields;
    }

    @Override
    public void onToolCallStarted(String toolName) {
        if (!fields.containsKey(toolName)) return;
        tool = toolName;
        content = new JsonStringFieldStream(fields.get(toolName));
        pathField = new JsonStringFieldStream("path");
        path = "";
        pending.setLength(0);
        lastFlush = System.nanoTime();
        out.accept(new RunDraft(runId, RunDraft.START, "", seq++, shownPath(), tool, title));
    }

    @Override
    public void onToolArgumentsDelta(String toolName, String jsonFragment) {
        if (content == null || !tool.equals(toolName)) return;
        if (!pathField.finished()) path += pathField.feed(jsonFragment);
        pending.append(content.feed(jsonFragment));
        if (System.nanoTime() - lastFlush >= FLUSH_NANOS) flush();
    }

    @Override
    public void onToolCallFinished(String toolName) {
        if (content == null || !tool.equals(toolName)) return;
        flush();
        content = null;
        if (announceEnd) out.accept(new RunDraft(runId, RunDraft.END, "", seq++, shownPath(), tool, title));
    }

    @Override
    public void onStreamAborted() {
        if (content == null) return;
        content = null;
        pending.setLength(0);
        out.accept(new RunDraft(runId, RunDraft.ABORT, "", seq++, shownPath(), tool, title));
    }

    /** The file being written: the fixed one, else the path the model has written in full (never a half-written one, which would name a file that does not exist). */
    private String shownPath() {
        if (!fixedPath.isEmpty()) return fixedPath;
        return pathField != null && pathField.finished() ? path : "";
    }

    private void flush() {
        lastFlush = System.nanoTime();
        if (pending.isEmpty()) return;
        out.accept(new RunDraft(runId, RunDraft.DELTA, pending.toString(), seq++, shownPath(), tool, title));
        pending.setLength(0);
    }
}
