from dataclasses import dataclass


@dataclass(frozen=True)
class ApplicationHealth:
    status: str
    service: str
