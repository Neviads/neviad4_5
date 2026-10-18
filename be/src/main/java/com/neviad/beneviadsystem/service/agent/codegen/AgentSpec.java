package com.neviad.beneviadsystem.service.agent.codegen;

import com.neviad.beneviadsystem.infrastructure.ai.ToolStreamListener;
import org.springframework.ai.tool.ToolCallback;

import java.util.List;
import java.util.Set;

/**
 * Everything an outside caller supplies for one run of {@link AgentRunner}: what the agent is told, which files it may write and must
 * read first, and optionally tools and a finish condition of its own. The runner knows nothing about experiments, layers or objects.
 *
 * @param system           the system prompt
 * @param task             the first user message of the first round
 * @param label            name shown in the ledger, the notes and the log
 * @param notesPath        {@code _notes/<name>.md}, shared by every round of the run
 * @param writable         the only files the agent may write
 * @param mustRead         files that must have been read before the first write
 * @param limits           call budgets of the built-in tools
 * @param continuationHint last sentence of the task handed to a later round (what to do with what is already written)
 * @param extraTools       tools added to the seven built-in ones (their calls are not counted by {@code limits})
 * @param extraToolCalls   how many calls of {@code extraTools} the model may make in all, added to the model's tool-call budget
 * @param finishGate       an extra reason to refuse {@code finish}, or {@code null} for none
 * @param listener         told of every built-in tool call as it starts and ends, or {@code null}; it must not throw
 * @param requireNote      whether {@code finish} needs at least one {@code append_note} first
 * @param reasoningEffort  reasoning effort of every model turn of this run ({@code low}, {@code medium}, {@code high}), or {@code null} for the provider's own
 * @param extraStream      also told of the streamed arguments of every model tool call (for example to show a file as it is written), or {@code null}
 * @param writeGate        an extra reason to refuse a write, or {@code null} for none
 */
public record AgentSpec(String system, String task, String label, String notesPath, Set<String> writable, Set<String> mustRead,
                        CodeSession.Limits limits, String continuationHint, List<ToolCallback> extraTools, int extraToolCalls,
                        CodeSession.FinishGate finishGate, CodeSession.Listener listener, boolean requireNote, String reasoningEffort,
                        ToolStreamListener extraStream, CodeSession.WriteGate writeGate) {
    static final String DEFAULT_CONTINUATION_HINT = "Hãy đọc lại các file đã ghi để biết chúng đang ra sao, sửa chỗ còn thiếu hoặc sai bằng `edit_file`, ghi chú nếu chưa, rồi `finish`.";

    public AgentSpec(String system, String task, String label, String notesPath, Set<String> writable, Set<String> mustRead,
                     CodeSession.Limits limits, String continuationHint, List<ToolCallback> extraTools, int extraToolCalls,
                     CodeSession.FinishGate finishGate, CodeSession.Listener listener, boolean requireNote) {
        this(system, task, label, notesPath, writable, mustRead, limits, continuationHint, extraTools, extraToolCalls, finishGate, listener, requireNote, null, null);
    }

    public AgentSpec(String system, String task, String label, String notesPath, Set<String> writable, Set<String> mustRead,
                     CodeSession.Limits limits, String continuationHint, List<ToolCallback> extraTools, int extraToolCalls,
                     CodeSession.FinishGate finishGate, CodeSession.Listener listener, boolean requireNote, String reasoningEffort) {
        this(system, task, label, notesPath, writable, mustRead, limits, continuationHint, extraTools, extraToolCalls, finishGate, listener, requireNote, reasoningEffort, null);
    }

    public AgentSpec(String system, String task, String label, String notesPath, Set<String> writable, Set<String> mustRead,
                     CodeSession.Limits limits, String continuationHint, List<ToolCallback> extraTools, int extraToolCalls,
                     CodeSession.FinishGate finishGate, CodeSession.Listener listener, boolean requireNote, String reasoningEffort,
                     ToolStreamListener extraStream) {
        this(system, task, label, notesPath, writable, mustRead, limits, continuationHint, extraTools, extraToolCalls, finishGate, listener, requireNote, reasoningEffort,
                extraStream, null);
    }

    public AgentSpec {
        limits = limits == null ? CodeSession.Limits.defaults() : limits;
        continuationHint = continuationHint == null || continuationHint.isBlank() ? DEFAULT_CONTINUATION_HINT : continuationHint;
        extraTools = extraTools == null ? List.of() : List.copyOf(extraTools);
        extraToolCalls = Math.max(0, extraToolCalls);
        writable = Set.copyOf(writable);
        mustRead = Set.copyOf(mustRead);
    }

    /** A spec with the default limits and no extra tools, finish condition or continuation wording. */
    public static AgentSpec of(String system, String task, String label, String notesPath, Set<String> writable, Set<String> mustRead) {
        return new AgentSpec(system, task, label, notesPath, writable, mustRead, null, null, null, 0, null, null, true);
    }
}
