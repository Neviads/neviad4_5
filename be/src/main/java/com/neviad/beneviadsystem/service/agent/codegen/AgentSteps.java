package com.neviad.beneviadsystem.service.agent.codegen;

/**
 * The steps of ONE agent run as the frontend shows them: it is the {@link CodeSession.Listener} of the built-in tools and also takes the
 * steps the runner and the agent add themselves (a model call, a check). Display only: a problem in the publisher never stops an agent.
 */
public final class AgentSteps implements CodeSession.Listener {
    private final AgentActivityPublisher publisher;
    private final String runId;
    private final String agent;
    private final String title;

    public AgentSteps(AgentActivityPublisher publisher, String runId, String agent, String title) {
        this.publisher = publisher == null ? AgentActivityPublisher.NONE : publisher;
        this.runId = runId;
        this.agent = agent;
        this.title = title;
    }

    /** A step of the run as a whole ({@code tool} is {@code "agent"}). */
    public void whole(String phase, boolean success, String message) { tool(AgentActivity.WHOLE_RUN, phase, success, message); }

    public void tool(String tool, String phase, boolean success, String message) {
        try {
            publisher.publish(new AgentActivity(runId, agent, title, tool, phase, success, message == null ? "" : message, System.currentTimeMillis()));
        } catch (RuntimeException ignored) {
            // A display problem never stops an agent.
        }
    }

    @Override public void started(String tool) { tool(tool, AgentActivity.STARTED, true, ""); }

    @Override public void finished(String tool, boolean success, String message) { tool(tool, AgentActivity.FINISHED, success, message); }

    @Override public void progress(String tool, String message) { tool(tool, AgentActivity.PROGRESS, true, message); }
}
