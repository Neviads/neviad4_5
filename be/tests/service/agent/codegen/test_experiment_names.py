import pytest

from beneviadsystem.service.agent.codegen.experiment_names import ExperimentNames


def test_every_name_and_path_is_derived_from_the_slug():
    names = ExperimentNames.of("may-nang-thuy-luc")

    assert names.pascal == "MayNangThuyLuc"
    assert names.camel == "mayNangThuyLuc"
    assert names.snake == "MAY_NANG_THUY_LUC"
    assert names.engine_files() == ["engines/may-nang-thuy-luc/engine.ts"]
    assert names.renderer_files() == ["renderers/may-nang-thuy-luc/view-constants.ts", "renderers/may-nang-thuy-luc/may-nang-thuy-luc-scene.tsx"]
    assert names.experiment_files() == ["experiments/MayNangThuyLucExperiment.tsx", "presets/may-nang-thuy-luc.ts"]


def test_a_slug_starting_with_a_digit_still_gives_a_valid_identifier():
    assert ExperimentNames.of("3d-lever").pascal == "E3dLever"


@pytest.mark.parametrize("bad", [None, "ab", "Has-Upper", "a_b_c", "../etc", "-lead", "trail-", "double--dash", "x" * 41])
def test_unsafe_slugs_are_rejected(bad):
    with pytest.raises(ValueError):
        ExperimentNames.of(bad)


def test_a_vietnamese_title_becomes_an_ascii_slug():
    assert ExperimentNames.slugify("Máy nâng thuỷ lực") == "may-nang-thuy-luc"
    assert ExperimentNames.slugify("Đòn bẩy loại 1!") == "don-bay-loai-1"
    assert ExperimentNames.slugify("???") == "thi-nghiem"
    assert len(ExperimentNames.slugify("a" * 80)) <= ExperimentNames.MAX_SLUG
