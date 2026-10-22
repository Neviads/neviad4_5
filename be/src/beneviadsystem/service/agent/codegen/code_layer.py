from __future__ import annotations

from enum import Enum

from .experiment_names import ExperimentNames
from .source_store import NOTES_DIR

#: The sample of the engine layer in the framework.
ENGINE_TEMPLATES = ["engines/template-experiment/engine.ts"]


class CodeLayer(Enum):
    """The layers a code agent writes, in the order they depend on each other. Each has a prompt of its own, the files it may write, and
    the files it must have read before it writes (the framework's samples, and what the layers before it left behind)."""

    ENGINE = ("engine", "ENGINE (vật lý thuần)", "prompts/codeagent/engine.md")
    RENDERER = ("renderer", "RENDERER (cảnh vẽ)", "prompts/codeagent/renderer.md")
    EXPERIMENT = ("experiment", "EXPERIMENT (trang thí nghiệm và preset)", "prompts/codeagent/experiment.md")

    @property
    def label(self) -> str:
        """Short name, used in the URL, the notes and the ledger."""
        return self.value[0]

    @property
    def title(self) -> str:
        return self.value[1]

    @property
    def prompt_resource(self) -> str:
        return self.value[2]

    @classmethod
    def parse(cls, name: str | None) -> CodeLayer:
        """The layer named in a URL; ``ValueError`` when there is none by that name."""
        for layer in cls:
            if layer.label == name:
                return layer
        raise ValueError(f"Tầng phải là engine, renderer hoặc experiment: {name}")

    def has_earlier_layers(self) -> bool:
        """Whether an earlier layer has already written files for this experiment (so the task points at its notes)."""
        return self is not CodeLayer.ENGINE

    def writable(self, names: ExperimentNames, object_files: list[str]) -> list[str]:
        """The files this layer may write. The renderer may revise the drawn objects; the experiment layer also edits the two files that
        register a preset."""
        if self is CodeLayer.ENGINE:
            return names.engine_files()
        if self is CodeLayer.RENDERER:
            return names.renderer_files() + list(object_files)
        return names.experiment_files() + ["presets/types.ts", "presets/index.ts"]

    def must_read(self, names: ExperimentNames, object_files: list[str]) -> list[str]:
        """The files to read before writing; the caller keeps only those that exist, so a sample missing from the copy cannot block the layer."""
        slug = names.slug
        notes = f"{NOTES_DIR}{slug}.md"
        if self is CodeLayer.ENGINE:
            return ["README.md", *ENGINE_TEMPLATES]
        if self is CodeLayer.RENDERER:
            return ["README.md", "renderers/template-experiment/view-constants.ts", "renderers/template-experiment/template-experiment-scene.tsx",
                    "shared/view-transform.ts", "shared/object-pose.ts", "shared/draw-items.ts", "objects/types.ts", names.engine_file(), notes,
                    *object_files]
        return ["README.md", "experiments/TemplateExperiment.tsx", "presets/template-experiment.ts", "presets/types.ts", "presets/index.ts",
                "shared/param-panel.tsx", names.engine_file(), f"renderers/{slug}/{slug}-scene.tsx", notes]
