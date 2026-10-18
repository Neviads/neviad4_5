package com.neviad.beneviadsystem.service.agent.codegen;


import java.util.ArrayList;
import java.util.List;

/**
 * The layers a code agent writes, in the order they depend on each other. Each one has a prompt of its own, the files it may write,
 * and the files it must have read before it writes (the framework's own samples, and what the layers before it left behind).
 */
public enum CodeLayer {
    ENGINE("engine", "ENGINE (vật lý thuần)", "prompts/codeagent/engine.md"),
    RENDERER("renderer", "RENDERER (cảnh vẽ)", "prompts/codeagent/renderer.md"),
    EXPERIMENT("experiment", "EXPERIMENT (trang thí nghiệm và preset)", "prompts/codeagent/experiment.md");

    /** The sample of the engine layer in the framework. */
    static final List<String> ENGINE_TEMPLATES = List.of("engines/template-experiment/engine.ts");

    private final String label;
    private final String title;
    private final String promptResource;

    CodeLayer(String label, String title, String promptResource) {
        this.label = label;
        this.title = title;
        this.promptResource = promptResource;
    }

    /** Short name, used in the URL, the notes and the ledger. */
    public String label() { return label; }

    String title() { return title; }

    String promptResource() { return promptResource; }

    /** The layer named in a URL; an IllegalArgumentException when there is none by that name. */
    public static CodeLayer parse(String name) {
        for (CodeLayer layer : values()) if (layer.label.equals(name)) return layer;
        throw new IllegalArgumentException("Tầng phải là engine, renderer hoặc experiment: " + name);
    }

    /** Whether an earlier layer has already written files for this experiment (so the task points at its notes). */
    boolean hasEarlierLayers() { return this != ENGINE; }

    /** The files this layer may write. The experiment layer also edits the two files that register a preset. */
    List<String> writable(ExperimentNames names, List<String> objectFiles) {
        return switch (this) {
            case ENGINE -> names.engineFiles();
            case RENDERER -> {
                // The drawn objects are drafts: the renderer sees them next to the engine and the scenario, so it may revise them.
                List<String> files = new ArrayList<>(names.rendererFiles());
                files.addAll(objectFiles);
                yield files;
            }
            case EXPERIMENT -> {
                List<String> files = new ArrayList<>(names.experimentFiles());
                files.add("presets/types.ts");
                files.add("presets/index.ts");
                yield files;
            }
        };
    }

    /** The files to read before writing; the caller keeps only those that exist, so a sample missing from the copy cannot block the layer. */
    List<String> mustRead(ExperimentNames names, List<String> objectFiles) {
        String slug = names.slug();
        String notes = SourceStore.NOTES_DIR + slug + ".md";
        return switch (this) {
            case ENGINE -> {
                List<String> files = new ArrayList<>(List.of("README.md"));
                files.addAll(ENGINE_TEMPLATES);
                yield files;
            }
            case RENDERER -> {
                List<String> files = new ArrayList<>(List.of("README.md", "renderers/template-experiment/view-constants.ts",
                        "renderers/template-experiment/template-experiment-scene.tsx",
                        "shared/view-transform.ts", "shared/object-pose.ts", "shared/draw-items.ts", "objects/types.ts",
                        names.engineFile(), notes));
                files.addAll(objectFiles);
                yield files;
            }
            case EXPERIMENT -> List.of("README.md", "experiments/TemplateExperiment.tsx", "presets/template-experiment.ts", "presets/types.ts",
                    "presets/index.ts", "shared/param-panel.tsx", names.engineFile(), "renderers/" + slug + "/" + slug + "-scene.tsx", notes);
        };
    }
}
