package com.neviad.beneviadsystem.service.agent.codegen;

import com.neviad.beneviadsystem.infrastructure.ai.AiClient;
import com.neviad.beneviadsystem.infrastructure.ai.AiRequest;
import com.neviad.beneviadsystem.infrastructure.ai.StructuredOutputSchemaRegistry;
import com.neviad.beneviadsystem.infrastructure.ai.ToolStreamListener;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

/**
 * Runs ONE tool-using agent on a {@link CodeStore} as {@link AgentSpec} describes it. The agent is not told the code of anything: it reads
 * the rest itself with its tools. There is no gate of the runner's own; the work is done when the agent calls {@code finish}, which the
 * {@link CodeSession} decides (and the spec's finish gate, if any), never what the model says. A new round is a new conversation, so it
 * is handed the ledger and the notes of the rounds before it.
 */
public final class AgentRunner {
    private static final Logger log = LoggerFactory.getLogger(AgentRunner.class);
    static final int MAX_ROUNDS = 3;
    private static final int TOOL_CALL_MARGIN = 10;

    /**
     * {@code status} is {@code "finished"} only when the session says so; {@code files} are the files the agent wrote; {@code failures} says,
     * one line per round, why a round of model calls failed (a dropped connection, a provider error), so the caller can show it.
     */
    public record Outcome(String status, int rounds, String summary, String ledger, String notesPath, List<String> files, List<String> failures) {
        public Outcome(String status, int rounds, String summary, String ledger, String notesPath, List<String> files) {
            this(status, rounds, summary, ledger, notesPath, files, List.of());
        }
    }

    private final AiClient aiClient;

    public AgentRunner(AiClient aiClient) {
        this.aiClient = aiClient;
    }

    public Outcome run(AgentSpec spec, CodeStore store) {
        CodeSession session = new CodeSession(store, spec.label(), spec.notesPath(), spec.writable(), spec.mustRead(), spec.limits(), spec.listener(),
                spec.extraTools(), spec.finishGate(), spec.requireNote(), spec.writeGate());
        CodeSession.Limits limits = spec.limits();
        int maxToolCalls = limits.maxReads() + limits.maxWrites() + limits.maxNotes() + TOOL_CALL_MARGIN + spec.extraToolCalls();
        int rounds = 0;
        List<String> failures = new java.util.ArrayList<>();
        for (int round = 0; round < MAX_ROUNDS; round++) {
            rounds = round + 1;
            String user = round == 0 ? spec.task() : continuation(spec, session, store);
            long started = System.nanoTime();
            String turn = "gọi model · lượt " + rounds;
            tell(spec.listener(), l -> l.started(turn));
            try {
                // With a listener the response is streamed, so the frontend can show the file being written instead of a silent wait.
                var call = AiRequest.of(spec.system(), user).withSchema(StructuredOutputSchemaRegistry.CODE_AGENT_RESULT)
                        .withTools(session.callbacks(), maxToolCalls, ToolStreamListener.all(spec.listener() == null ? null : new Progress(spec.listener()), spec.extraStream()))
                        .withReasoningEffort(spec.reasoningEffort());
                aiClient.generate(call);
                tell(spec.listener(), l -> l.finished(turn, true, (System.nanoTime() - started) / 1_000_000_000 + " giây"));
                log.info("CodeAgent {} round {} ended: finished={}, reads={}, writes={}, elapsedMs={}", spec.label(), rounds, session.state().finished(),
                        session.state().reads(), session.state().writes(), (System.nanoTime() - started) / 1_000_000);
            } catch (RuntimeException exception) {
                // A provider hiccup in one round must not lose what the agent already wrote: the next round is handed the ledger.
                String reason = "Lượt " + rounds + " lỗi khi gọi model sau " + (System.nanoTime() - started) / 1_000_000_000 + " giây: " + describe(exception);
                failures.add(reason);
                log.warn("CodeAgent {} round {} failed: {}", spec.label(), rounds, reason);
                tell(spec.listener(), l -> l.finished(turn, false, reason));
            }
            if (session.state().finished()) break;
        }
        CodeSession.State state = session.state();
        return new Outcome(state.finished() ? "finished" : "unfinished", rounds, state.summary(), session.ledger(), spec.notesPath(), session.writtenFiles(), List.copyOf(failures));
    }

    private static void tell(CodeSession.Listener listener, java.util.function.Consumer<CodeSession.Listener> what) {
        if (listener == null) return;
        try {
            what.accept(listener);
        } catch (RuntimeException ignored) {
            // A display problem never stops an agent.
        }
    }

    /** Turns the streamed tool arguments into a few progress lines: which file is being written and how many characters so far. */
    static final class Progress implements ToolStreamListener {
        private static final long EVERY_MS = 1500;
        private static final java.util.regex.Pattern PATH = java.util.regex.Pattern.compile("\"path\"\\s*:\\s*\"([^\"]+)\"");
        private final CodeSession.Listener listener;
        private String tool = "";
        private final StringBuilder head = new StringBuilder();
        private int chars;
        private long lastTold;

        Progress(CodeSession.Listener listener) { this.listener = listener; }

        @Override public void onToolCallStarted(String toolName) {
            tool = toolName;
            head.setLength(0);
            chars = 0;
            lastTold = System.currentTimeMillis();
            tell(listener, l -> l.progress(toolName, "model bắt đầu viết"));
        }

        @Override public void onToolArgumentsDelta(String toolName, String fragment) {
            chars += fragment.length();
            if (head.length() < 300) head.append(fragment, 0, Math.min(fragment.length(), 300 - head.length()));
            long now = System.currentTimeMillis();
            if (now - lastTold < EVERY_MS) return;
            lastTold = now;
            tell(listener, l -> l.progress(toolName, summary()));
        }

        @Override public void onToolCallFinished(String toolName) {
            tell(listener, l -> l.progress(toolName, summary() + " (đã nhận đủ)"));
        }

        @Override public void onStreamAborted() {
            tell(listener, l -> l.progress(tool.isEmpty() ? "model" : tool, "luồng bị ngắt, bỏ phần đang viết"));
        }

        private String summary() {
            var m = PATH.matcher(head);
            return (m.find() ? m.group(1) + " · " : "") + chars + " ký tự";
        }
    }

    private static String describe(Throwable failure) {
        StringBuilder out = new StringBuilder();
        for (Throwable t = failure; t != null && out.length() < 400; t = t.getCause() == t ? null : t.getCause()) {
            if (!out.isEmpty()) out.append(" <- ");
            out.append(t.getClass().getSimpleName());
            if (t.getMessage() != null && !t.getMessage().isBlank()) out.append(": ").append(t.getMessage());
        }
        return out.toString();
    }

    /** The task again, plus what the backend itself saw the previous rounds do. */
    private static String continuation(AgentSpec spec, CodeSession session, CodeStore store) {
        StringBuilder out = new StringBuilder(spec.task()).append("\n\n# Trạng thái hiện tại (do hệ thống đo, không phải do bạn tự nhận)\n");
        out.append("Bạn đang ở một lượt làm việc mới và KHÔNG nhớ lượt trước; các file đã ghi vẫn còn nguyên trong bản sao. Bạn CHƯA gọi `finish`.\n\n");
        out.append(session.ledger()).append("\n");
        String notes = "";
        try {
            notes = store.read(spec.notesPath()).orElse("");
        } catch (RuntimeException ignored) {
            // The notes are a help, not a requirement of the round.
        }
        if (!notes.isBlank()) out.append("## Ghi chú hiện có trong ").append(spec.notesPath()).append("\n").append(notes).append("\n");
        out.append(spec.continuationHint());
        return out.toString();
    }
}
