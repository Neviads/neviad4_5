from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

_SLUG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
MAX_SLUG = 40


@dataclass(frozen=True)
class ExperimentNames:
    """Every name and path of one generated experiment, derived from its slug, so the code agents, the engine smoke test and the frontend
    registry agree on them."""

    MAX_SLUG = MAX_SLUG

    slug: str
    pascal: str
    camel: str
    snake: str

    @classmethod
    def of(cls, slug: str | None) -> ExperimentNames:
        if slug is None or not 3 <= len(slug) <= MAX_SLUG or not _SLUG.match(slug):
            raise ValueError(f"slug phải gồm chữ thường, số và dấu gạch ngang, dài 3 đến {MAX_SLUG} ký tự: {slug}")
        pascal = "".join(word[0].upper() + word[1:] for word in slug.split("-"))
        # A TypeScript identifier cannot start with a digit.
        if pascal[0].isdigit():
            pascal = "E" + pascal
        return cls(slug, pascal, pascal[0].lower() + pascal[1:], slug.upper().replace("-", "_"))

    @staticmethod
    def slugify(title: str | None) -> str:
        """A slug from a Vietnamese title: no accents, lower case, hyphens, at most :data:`MAX_SLUG` characters."""
        text = (title or "").replace("đ", "d").replace("Đ", "D")
        text = "".join(c for c in unicodedata.normalize("NFD", text) if not unicodedata.category(c).startswith("M")).lower()
        text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
        if len(text) > MAX_SLUG:
            text = text[:MAX_SLUG].rstrip("-")
        return "thi-nghiem" if len(text) < 3 else text

    def engine_files(self) -> list[str]:
        return [self.engine_file()]

    def engine_file(self) -> str:
        """The whole engine of the experiment: types, constants, state machine and physics in one file."""
        return f"engines/{self.slug}/engine.ts"

    def renderer_files(self) -> list[str]:
        return [f"renderers/{self.slug}/view-constants.ts", f"renderers/{self.slug}/{self.slug}-scene.tsx"]

    def experiment_files(self) -> list[str]:
        return [f"experiments/{self.pascal}Experiment.tsx", f"presets/{self.slug}.ts"]
