package com.neviad.beneviadsystem.infrastructure.ai;

/**
 * Receives a model's tool-call arguments while they are still being generated. Only providers that stream call it;
 * the others run the tools exactly as before and never invoke the listener.
 */
public interface ToolStreamListener {
    /** A function call started. */
    default void onToolCallStarted(String toolName) { }

    /** A raw fragment of the call's JSON arguments, in order. */
    default void onToolArgumentsDelta(String toolName, String jsonFragment) { }

    /** The call's arguments are complete (the tool runs after the whole response has arrived). */
    default void onToolCallFinished(String toolName) { }

    /** The streamed response ended without a usable result; whatever was shown so far should be dropped. */
    default void onStreamAborted() { }

    /** One listener that forwards every event to each non-null listener in order; null when none is given. */
    static ToolStreamListener all(ToolStreamListener... listeners) {
        var list = java.util.Arrays.stream(listeners).filter(java.util.Objects::nonNull).toList();
        if (list.isEmpty()) return null;
        if (list.size() == 1) return list.getFirst();
        return new ToolStreamListener() {
            @Override public void onToolCallStarted(String toolName) { list.forEach(l -> l.onToolCallStarted(toolName)); }
            @Override public void onToolArgumentsDelta(String toolName, String jsonFragment) { list.forEach(l -> l.onToolArgumentsDelta(toolName, jsonFragment)); }
            @Override public void onToolCallFinished(String toolName) { list.forEach(l -> l.onToolCallFinished(toolName)); }
            @Override public void onStreamAborted() { list.forEach(ToolStreamListener::onStreamAborted); }
        };
    }
}
