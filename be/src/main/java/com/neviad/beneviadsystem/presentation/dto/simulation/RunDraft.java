package com.neviad.beneviadsystem.presentation.dto.simulation;

/**
 * A live preview of the file the model is writing, published to {@code /topic/agents/simulation/{runId}/draft}
 * while the model is still generating it. It is display-only: nothing here has been checked or saved, and the real
 * file still arrives through the live-code tools. {@code type} is START, DELTA (append {@code text}), ABORT or, only for runs that ask for it, END.
 * {@code path} is the file being written, once the model has said which (empty until then); {@code tool} is the tool whose
 * argument is streaming: {@code write_file} (the whole file) or {@code edit_file} (only the replacement of one piece).
 * {@code title} names the object being drawn when several agents draw at once on one run (empty for the other agents).
 */
public record RunDraft(String runId, String type, String text, int seq, String path, String tool, String title) {
    public static final String START = "START";
    public static final String DELTA = "DELTA";
    public static final String ABORT = "ABORT";
    /** Only when asked for: the file has been completely received, so the preview is over and the real file is about to land. */
    public static final String END = "END";

    public RunDraft(String runId, String type, String text, int seq) { this(runId, type, text, seq, "", "", ""); }

    public RunDraft(String runId, String type, String text, int seq, String path) { this(runId, type, text, seq, path, "", ""); }

    public RunDraft(String runId, String type, String text, int seq, String path, String tool) { this(runId, type, text, seq, path, tool, ""); }
}
