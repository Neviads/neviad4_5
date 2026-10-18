package com.neviad.beneviadsystem.service.agent.codegen;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SourceStoreTest {
    @TempDir Path root;

    @Test
    void writesAndReadsBackWithUnixLineEndings() {
        var store = new SourceStore(root);

        store.write("engines/x/physics.ts", "a\r\nb");

        assertThat(store.exists("engines/x/physics.ts")).isTrue();
        assertThat(store.read("engines/x/physics.ts")).contains("a\nb\n");
        assertThat(store.read("engines/x/missing.ts")).isEmpty();
    }

    @Test
    void pathsCannotLeaveTheRootOrUseUnsafeCharacters() {
        var store = new SourceStore(root);

        for (String bad : new String[]{"../secret.ts", "a/../../b.ts", "/etc/passwd.ts", "C:/x.ts", "a b.ts", "a//b.ts", "", "x\u0000.ts"}) {
            assertThatThrownBy(() -> store.resolve(bad, true)).as(bad).isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test
    void onlyTypeScriptCanBeWrittenWhileTheReadmeAndJsonCanBeRead() {
        var store = new SourceStore(root);

        assertThatThrownBy(() -> store.write("engines/x/run.sh", "x")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> store.write("README.md", "x")).isInstanceOf(IllegalArgumentException.class);
        assertThat(store.resolve("README.md", false)).isEqualTo(root.toAbsolutePath().normalize().resolve("README.md"));
    }

    @Test
    void listsEveryFileSortedAndNothingForAnUnknownFolder() {
        var store = new SourceStore(root);
        store.write("b/two.ts", "2");
        store.write("a/one.ts", "1");

        assertThat(store.list("")).containsExactly("a/one.ts", "b/two.ts");
        assertThat(store.list("a")).containsExactly("a/one.ts");
        assertThat(store.list("nope")).isEmpty();
        assertThat(store.list("../..")).isEmpty();
    }

    @Test
    void notesOnlyGrowAndOnlyLiveUnderTheNotesFolder() {
        var store = new SourceStore(root);

        store.appendNote("_notes/run.md", "## engine\nđã đặt biến v1");
        store.appendNote("_notes/run.md", "## renderer\nđã nối v1");

        assertThat(store.read("_notes/run.md").orElseThrow()).contains("đã đặt biến v1", "đã nối v1");
        assertThatThrownBy(() -> store.appendNote("engines/x/notes.md", "x")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> store.appendNote("_notes/sub/run.md", "x")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> store.appendNote("_notes/run.ts", "x")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> store.appendNote("_notes/../run.md", "x")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> store.appendNote("_notes/run.md", "  ")).isInstanceOf(IllegalArgumentException.class);
    }
}
