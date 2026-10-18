package com.neviad.beneviadsystem.service.agent.codegen;

/**
 * One step of an agent that the frontend may show while the agent works (it is display only; what counts is decided by the session).
 *
 * @param agent   which agent run (several can share one {@code runId}, e.g. the parts of an assembly)
 * @param title   what that run is making, for the label
 * @param tool    the tool, or {@code "agent"} for the run as a whole
 * @param phase   {@code STARTED}, {@code FINISHED}, or {@code PROGRESS} (the agent is still generating, e.g. a file being written: shown while it lasts)
 * @param success whether a {@code FINISHED} step went well
 * @param message a short account of the step (an error, or what was written)
 */
public record AgentActivity(String runId, String agent, String title, String tool, String phase, boolean success, String message, long at) {
    public static final String STARTED = "STARTED";
    public static final String FINISHED = "FINISHED";
    public static final String PROGRESS = "PROGRESS";
    public static final String WHOLE_RUN = "agent";
    public static final String TOPIC_PREFIX = "/topic/agents/activity/";
}
