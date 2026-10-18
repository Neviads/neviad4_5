package com.neviad.beneviadsystem.service.agent.codegen;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ExperimentNamesTest {

    @Test
    void everyNameAndPathIsDerivedFromTheSlug() {
        var names = ExperimentNames.of("may-nang-thuy-luc");

        assertThat(names.pascal()).isEqualTo("MayNangThuyLuc");
        assertThat(names.camel()).isEqualTo("mayNangThuyLuc");
        assertThat(names.snake()).isEqualTo("MAY_NANG_THUY_LUC");
        assertThat(names.engineFiles()).containsExactly("engines/may-nang-thuy-luc/engine.ts");
        assertThat(names.rendererFiles()).containsExactly("renderers/may-nang-thuy-luc/view-constants.ts", "renderers/may-nang-thuy-luc/may-nang-thuy-luc-scene.tsx");
        assertThat(names.experimentFiles()).containsExactly("experiments/MayNangThuyLucExperiment.tsx", "presets/may-nang-thuy-luc.ts");
    }

    @Test
    void aSlugStartingWithADigitStillGivesAValidIdentifier() {
        assertThat(ExperimentNames.of("3d-lever").pascal()).isEqualTo("E3dLever");
    }

    @Test
    void unsafeSlugsAreRejected() {
        for (String bad : new String[]{null, "ab", "Has-Upper", "a_b_c", "../etc", "-lead", "trail-", "double--dash", "x".repeat(41)}) {
            assertThatThrownBy(() -> ExperimentNames.of(bad)).as(String.valueOf(bad)).isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test
    void aVietnameseTitleBecomesAnAsciiSlug() {
        assertThat(ExperimentNames.slugify("Máy nâng thuỷ lực")).isEqualTo("may-nang-thuy-luc");
        assertThat(ExperimentNames.slugify("Đòn bẩy loại 1!")).isEqualTo("don-bay-loai-1");
        assertThat(ExperimentNames.slugify("???")).isEqualTo("thi-nghiem");
        assertThat(ExperimentNames.slugify("a".repeat(80))).hasSizeLessThanOrEqualTo(ExperimentNames.MAX_SLUG);
    }
}
