package com.neviad.beneviadsystem.service.agent.codegen;

import com.neviad.beneviadsystem.domain.model.SourceFile;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TemplateCodeStoreTest {
    private final TemplateCodeStore store = new TemplateCodeStore(List.of(
            new SourceFile("shared/b.ts", "b"), new SourceFile("README.md", "# khung"), new SourceFile("shared/a.ts", "a"),
            new SourceFile("shared-extra/c.ts", "c")));

    @Test
    void readsAndListsTheFilesSortedByFolder() {
        assertThat(store.read("README.md")).contains("# khung");
        assertThat(store.read("shared/zzz.ts")).isEmpty();
        assertThat(store.exists("shared/a.ts")).isTrue();
        assertThat(store.list("")).containsExactly("README.md", "shared-extra/c.ts", "shared/a.ts", "shared/b.ts");
        assertThat(store.list("shared")).containsExactly("shared/a.ts", "shared/b.ts");
    }

    @Test
    void refusesUnsafePathsAndAnyWrite() {
        assertThatThrownBy(() -> store.read("../.env")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> store.write("shared/a.ts", "x")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> store.appendNote("_notes/x.md", "x")).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void anOverlayWritesOnTopWithoutTouchingTheTemplate() {
        OverlayCodeStore overlay = new OverlayCodeStore(store);
        overlay.write("shared/a.ts", "mới");

        assertThat(overlay.read("shared/a.ts")).contains("mới\n");
        assertThat(store.read("shared/a.ts")).contains("a");
    }
}
