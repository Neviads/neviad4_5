from beneviadsystem.domain.model.source_file import SourceFile
from beneviadsystem.infrastructure.persistence.source_file_repository import SourceFileRepository
from beneviadsystem.service.object_library_service import OTHER_TOPIC, ObjectLibraryService
from beneviadsystem.service.source_library_service import SourceLibraryService

CATALOG = """# Danh mục

## 1. Giá đỡ và đồ gá

| Vật | Dùng ở | Bộ phận chuyển động | Điểm neo | Ưu tiên | Tham khảo |
|---|---|---|---|---|---|
| Giá thí nghiệm | bài treo | — | đáy | P1 | |

## 2. Dụng cụ đo (đo lường)

| Vật | Dùng ở | Bộ phận chuyển động | Điểm neo | Ưu tiên | Tham khảo |
|---|---|---|---|---|---|
| Lực kế | bài lực | kim | điểm treo | P1 | |
"""


def object_file(catalog: str, title: str) -> str:
    return ('/* OBJECT-META\n{"catalog":"' + catalog + '","title":"' + title + '","anchor":"điểm treo","size":{"width":0.1,"height":0.3},'
            '"parts":[{"name":"needle","label":"Kim chỉ","motion":"rotate","min":-10,"max":10}],"points":[{"name":"hook"}],'
            '"useWhen":["treo vật nặng vào móc"],"avoidWhen":["cần cân điện tử có số đọc"]}\n*/\nfunction makeThing() {}\n')


class MemoryRepository(SourceFileRepository):
    """The repository over files held in memory, as the database would hold them."""

    def __init__(self, objects: dict[str, str], catalog: str | None):
        super().__init__(None)
        self.objects, self.catalog = objects, catalog

    def find_all(self, collection):
        return [SourceFile(p, c) for p, c in self.objects.items()] if collection == "objects" else []

    def find(self, collection, path):
        if collection == "catalog":
            return None if self.catalog is None else SourceFile(path, self.catalog)
        content = self.objects.get(path)
        return None if content is None else SourceFile(path, content)


def library(objects: dict[str, str], catalog: str | None) -> ObjectLibraryService:
    return ObjectLibraryService(SourceLibraryService(MemoryRepository(objects, catalog)))


LIBRARY = library({"luc-ke.ts": object_file("Lực kế", "Lực kế lò xo có kim chỉ"), "gia.ts": object_file("Giá thí nghiệm", "Giá chữ L"),
                   "la.ts": object_file("Vật không có trong danh mục", "Vật lạ")}, CATALOG)


def test_an_object_takes_the_topic_of_its_catalogue_row_and_one_without_a_row_is_other():
    summary = LIBRARY.find("luc-ke.ts")
    assert summary.topic == 2
    assert summary.topic_title == "Dụng cụ đo"
    assert [p.name for p in summary.parts] == ["needle"]
    assert summary.points == ["hook"]
    assert summary.width == 0.1
    assert summary.use_when == ["treo vật nặng vào móc"]
    assert summary.avoid_when == ["cần cân điện tử có số đọc"]
    assert LIBRARY.find("gia.ts").topic == 1
    assert LIBRARY.find("la.ts").topic == OTHER_TOPIC


def test_the_index_has_a_heading_per_topic_in_catalogue_order_and_one_line_per_object_without_avoid_when():
    assert LIBRARY.index() == (
        "## Giá đỡ và đồ gá\n"
        "- gia.ts | Giá thí nghiệm | Giá chữ L | Dùng khi: treo vật nặng vào móc\n"
        "\n## Dụng cụ đo\n"
        "- luc-ke.ts | Lực kế | Lực kế lò xo có kim chỉ | Dùng khi: treo vật nặng vào móc\n"
        "\n## Khác\n"
        "- la.ts | Vật không có trong danh mục | Vật lạ | Dùng khi: treo vật nặng vào móc\n")
    assert library({}, CATALOG).index() == ""


def test_without_the_catalogue_every_object_is_in_other_and_a_file_without_meta_is_skipped():
    bare = library({"a.ts": object_file("Lực kế", "x"), "b.ts": "function makeB() {}"}, None)

    assert bare.find("a.ts").topic == OTHER_TOPIC
    assert bare.find("b.ts") is None
    assert bare.available()
    assert not library({}, CATALOG).available()
