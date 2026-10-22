class InvalidAgentResponseError(RuntimeError):
    """An agent could not get a valid answer from the model within its attempts (or a request is invalid for the agent)."""
