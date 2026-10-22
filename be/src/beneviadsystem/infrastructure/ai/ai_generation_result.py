from dataclasses import dataclass


@dataclass(frozen=True)
class AiGenerationResult:
    """Text and the identity of the provider/model that produced it."""

    text: str
    provider: str
    model: str
