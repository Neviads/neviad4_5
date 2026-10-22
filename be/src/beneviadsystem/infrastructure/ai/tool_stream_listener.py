from __future__ import annotations


class ToolStreamListener:
    """Receives a model's tool-call arguments while they are still being generated. Only providers that stream call it."""

    def on_tool_call_started(self, tool_name: str) -> None:
        """A function call started."""

    def on_tool_arguments_delta(self, tool_name: str, json_fragment: str) -> None:
        """A raw fragment of the call's JSON arguments, in order."""

    def on_tool_call_finished(self, tool_name: str) -> None:
        """The call's arguments are complete (the tool runs after the whole response has arrived)."""

    def on_stream_aborted(self) -> None:
        """The streamed response ended without a usable result; whatever was shown so far should be dropped."""

    @staticmethod
    def all(*listeners: ToolStreamListener | None) -> ToolStreamListener | None:
        """One listener that forwards every event to each non-null listener in order; None when none is given."""
        present = [listener for listener in listeners if listener is not None]
        if not present:
            return None
        if len(present) == 1:
            return present[0]
        return _Composite(present)


class _Composite(ToolStreamListener):
    def __init__(self, listeners: list[ToolStreamListener]):
        self._listeners = listeners

    def on_tool_call_started(self, tool_name):
        for listener in self._listeners:
            listener.on_tool_call_started(tool_name)

    def on_tool_arguments_delta(self, tool_name, json_fragment):
        for listener in self._listeners:
            listener.on_tool_arguments_delta(tool_name, json_fragment)

    def on_tool_call_finished(self, tool_name):
        for listener in self._listeners:
            listener.on_tool_call_finished(tool_name)

    def on_stream_aborted(self):
        for listener in self._listeners:
            listener.on_stream_aborted()
