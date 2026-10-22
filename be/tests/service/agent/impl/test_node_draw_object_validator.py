import pytest

from beneviadsystem.service.agent.impl.node_draw_object_validator import NodeDrawObjectValidator
from beneviadsystem.service.agent.impl.node_script_runner import NodeScriptRunner


@pytest.fixture
def fe_root():
    fe = NodeScriptRunner.resolve_fe_root("")
    if not ((fe / "scripts/validate-draw-object.mjs").is_file() and (fe / "node_modules/typescript").is_dir()):
        pytest.skip("cần fe/ với node_modules để chạy script kiểm tra")
    return fe


@pytest.fixture
def validator(fe_root):
    return NodeDrawObjectValidator(fe_root, "node", 120)


def test_an_answer_without_code_is_rejected_by_the_real_script(validator):
    result = validator.validate({})

    assert any("Chưa có code" in p for p in result.problems)
    assert result.js is None


def test_a_plain_drawing_that_runs_passes_with_no_contract_and_declares_nothing(validator):
    code = ("const makeBox = (p: Vec2, radius: number, fill: string) => { const group = new Konva.Group({ x: p.x, y: p.y }); "
            "group.add(new Konva.Rect({ width: 10, height: 10, fill })); return { group }; };")

    result = validator.validate({"code": code})

    assert result.problems == []
    assert "makeBox" in result.js
    assert result.meta["name"] == "makeBox"
    assert not result.meta.get("inputs")


def test_the_moving_parts_and_points_of_a_shape_are_reported_back_and_the_geometry_is_measured(validator):
    code = ("const makeLift = (p: Vec2, ppm: number, fill: string) => { const group = new Konva.Group({ x: p.x, y: p.y });"
            " group.add(new Konva.Rect({ x: -0.25 * ppm, y: -0.8 * ppm, width: 0.5 * ppm, height: 0.8 * ppm, fill }));"
            " const piston = new Konva.Group({ x: 0.1 * ppm, y: -0.6 * ppm }); piston.add(new Konva.Rect({ x: -0.05 * ppm, y: 0, width: 0.1 * ppm, height: 0.04 * ppm })); group.add(piston);"
            " return { group, parts: { piston: { node: piston, motion: 'slide', axis: 'up', min: 0, max: 0.05 } }, points: { top: { x: 0.1 * ppm, y: -0.6 * ppm } } }; };")
    geometry = {"width": 0.5, "height": 0.8, "anchor": "tâm đáy", "points": [{"name": "top", "description": ""}],
                "parts": [{"name": "piston", "motion": "slide", "axis": "up", "min": 0, "max": 0.05}]}

    result = validator.validate({"code": code, "geometry": geometry})

    assert result.problems == []
    assert result.meta["size"]["width"] == 0.5
    assert result.meta["moving"][0]["name"] == "piston"
    assert result.meta["points"][0]["name"] == "top"

    too_small = validator.validate({"code": code, "geometry": {**geometry, "width": 1.0}})
    assert any("Kích thước phải là 1" in p for p in too_small.problems)


def test_code_that_throws_or_cannot_escape_is_a_problem_never_a_pass(validator):
    thrown = validator.validate({"code": "const makeX = () => { throw new Error('hỏng'); };"})
    escape = validator.validate({"code": "const makeX = () => getSimulationFontFamily.constructor('return 1')();"})

    assert any("Chạy hàm vẽ bị lỗi" in p for p in thrown.problems)
    assert thrown.js is None
    assert any("bị cấm" in p for p in escape.problems)
    assert escape.js is None


def test_a_missing_node_is_a_problem_never_a_pass(fe_root):
    result = NodeDrawObjectValidator(fe_root, "node-khong-ton-tai", 10).validate({})

    assert result.problems
    assert result.js is None


def test_a_missing_script_is_a_problem_never_a_pass(tmp_path):
    result = NodeDrawObjectValidator(tmp_path, "node", 10).validate({})

    assert any("Không thấy script kiểm tra" in p for p in result.problems)


def test_pictures_are_kept_only_when_they_are_png_data_urls_of_a_bounded_size():
    images = NodeDrawObjectValidator.images([{"label": "nghỉ", "dataUrl": "data:image/png;base64,AAAA"}, {"label": "x", "dataUrl": "http://evil"},
                                             {"dataUrl": "data:image/png;base64,BBBB"}, {"label": "y", "dataUrl": "data:image/png;base64,CCCC"}])

    assert [(i.label, i.data_url) for i in images] == [("nghỉ", "data:image/png;base64,AAAA"), ("vật", "data:image/png;base64,BBBB")]
