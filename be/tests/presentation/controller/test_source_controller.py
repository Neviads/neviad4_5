from beneviadsystem.domain.model.source_file import SourceFile
from beneviadsystem.infrastructure.persistence.source_file_repository import SourceFileRepository
from beneviadsystem.service.source_library_service import SourceLibraryService


class Repository(SourceFileRepository):
    def __init__(self):
        super().__init__(None)
        self.calls = []

    def find_all(self, collection):
        self.calls.append(("all", collection))
        return [SourceFile("README.md", "# x"), SourceFile("shared/a.ts", "export {};")] if collection == "template" else []

    def find(self, collection, path):
        self.calls.append(("one", collection, path))
        return SourceFile("shared/a.ts", "export {};") if (collection, path) == ("template", "shared/a.ts") else None


def client(client_for, repository):
    return client_for(source_library_service=SourceLibraryService(repository))


def test_returns_every_file_of_the_collection(client_for):
    response = client(client_for, Repository()).get("/api/v1/source/template")

    assert response.status_code == 200
    assert response.json()["files"][1] == {"path": "shared/a.ts", "content": "export {};"}


def test_returns_one_file_or_not_found(client_for):
    api = client(client_for, Repository())

    assert api.get("/api/v1/source/template/file", params={"path": "shared/a.ts"}).json()["content"] == "export {};"
    assert api.get("/api/v1/source/template/file", params={"path": "shared/b.ts"}).status_code == 404


def test_an_unsafe_path_or_collection_is_a_bad_request(client_for):
    repository = Repository()
    api = client(client_for, repository)

    unsafe = api.get("/api/v1/source/template/file", params={"path": "../.env"})
    assert unsafe.status_code == 400
    assert unsafe.json()["error"] == "Bad Request" and unsafe.json()["status"] == 400
    assert api.get("/api/v1/source/Bad_Name").status_code == 400
    assert repository.calls == []


def test_there_is_no_way_to_write_through_the_api(client_for):
    assert client(client_for, Repository()).put("/api/v1/source/template").status_code == 405
