from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class Image:
    """``data_url`` is a complete ``data:image/...;base64,...`` URL; ``label`` says what the picture shows."""

    label: str
    data_url: str


class ToolImageSource(ABC):
    """A tool callback that can attach pictures to its latest result, for example screenshots of a check that just ran. Providers that
    can show images to the model read them with :meth:`take_images` right after the call; the others never call it."""

    @abstractmethod
    def take_images(self) -> list[Image]:
        """Returns the pictures attached to the last result and forgets them, so a picture is never shown twice."""
