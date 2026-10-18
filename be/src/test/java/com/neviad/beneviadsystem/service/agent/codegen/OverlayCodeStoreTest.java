package com.neviad.beneviadsystem.service.agent.codegen;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** A run without the browser reads the tree on disk and never writes to it. */
class OverlayCodeStoreTest {
    @TempDir
    Path root;
    private OverlayCodeStore store;

    @BeforeEach
    void setUp() throws Exception {
        Files.createDirectories(root.resolve("objects"));
        Files.writeString(root.resolve("objects/types.ts"), "export type Vec2 = { x: number; y: number };\n");
        Files.createDirectories(root.resolve("_notes"));
        Files.writeString(root.resolve("_notes/run.md"), "trước\n");
        store = new OverlayCodeStore(new SourceStore(root));
    }

    @Test
    void readsTheTreeOnDiskAndKeepsWhatTheAgentWritesInMemoryOnly() throws Exception {
        assertThat(store.read("objects/types.ts")).contains("export type Vec2 = { x: number; y: number };\n");

        store.write("_drawn/kinh-hien-vi.ts", "const makeMicroscope = () => 1;");

        assertThat(store.read("_drawn/kinh-hien-vi.ts")).contains("const makeMicroscope = () => 1;\n");
        assertThat(store.exists("_drawn/kinh-hien-vi.ts")).isTrue();
        assertThat(Files.exists(root.resolve("_drawn"))).isFalse();
    }

    @Test
    void aWrittenFileHidesTheSameFileOnDiskWithoutChangingIt() throws Exception {
        store.write("objects/types.ts", "export type Vec2 = [number, number];");

        assertThat(store.read("objects/types.ts")).contains("export type Vec2 = [number, number];\n");
        assertThat(Files.readString(root.resolve("objects/types.ts"))).isEqualTo("export type Vec2 = { x: number; y: number };\n");
    }

    @Test
    void theListingHasTheFilesOnDiskAndTheWrittenOnesOnce() {
        store.write("objects/new.ts", "x");
        store.write("objects/types.ts", "y");
        store.write("_drawn/a.ts", "z");

        assertThat(store.list("objects")).containsExactly("objects/new.ts", "objects/types.ts");
        assertThat(store.list("")).contains("_drawn/a.ts", "_notes/run.md", "objects/new.ts", "objects/types.ts");
    }

    @Test
    void notesAreAddedToTheEndOfTheNoteOnDiskInMemory() throws Exception {
        store.appendNote("_notes/run.md", "sau");
        store.appendNote("_notes/run.md", "nữa");

        assertThat(store.read("_notes/run.md")).contains("trước\nsau\nnữa\n");
        assertThat(Files.readString(root.resolve("_notes/run.md"))).isEqualTo("trước\n");
    }

    @Test
    void thePathRulesAreTheSameAsOnDisk() {
        assertThatThrownBy(() -> store.write("../escape.ts", "x")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> store.write("objects/x.js", "x")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> store.appendNote("objects/x.md", "x")).isInstanceOf(IllegalArgumentException.class);
    }
}
