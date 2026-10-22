"""A model that is a script calling the real tool callbacks: each model round runs the next script (the last one repeats)."""
from __future__ import annotations

from collections.abc import Callable

from beneviadsystem.infrastructure.ai.ai_client import AiClient
from beneviadsystem.infrastructure.ai.ai_generation_result import AiGenerationResult

DONE = '{"status":"PASSED","summary":"xong"}'


class ScriptedModel(AiClient):
    def __init__(self, *rounds: Callable):
        self.rounds = list(rounds)
        self.prompts: list[str] = []
        self.budgets: list[int] = []
        self.listeners: list = []

    def generate(self, prompt):
        raise NotImplementedError

    def generate_with_tools(self, prompt, tools, spec=None, max_tool_calls=0, listener=None):
        self.prompts.append(prompt)
        self.budgets.append(max_tool_calls)
        self.listeners.append(listener)
        answer = self.rounds[min(len(self.prompts), len(self.rounds)) - 1](tools)
        return AiGenerationResult(answer if isinstance(answer, str) else DONE, "test", "test")
