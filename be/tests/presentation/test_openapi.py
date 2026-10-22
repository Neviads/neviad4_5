"""The API contract the frontend (and any other client) builds on: an OpenAPI 3 document with every endpoint and typed bodies."""

PATHS = {"/api/health": {"get"}, "/api/v1/experiment-match": {"post"}, "/api/v1/lite-spec": {"post"}, "/api/v1/scenario": {"post"},
         "/api/v1/draw-object": {"post"}, "/api/v1/draw-object/headless": {"post"}, "/api/v1/assembly": {"post"},
         "/api/v1/codeagent/{layer}": {"post"}, "/api/v1/source/{collection}": {"get"}, "/api/v1/source/{collection}/file": {"get"}}


def test_the_document_lists_every_endpoint_with_typed_camel_case_bodies(client_for):
    document = client_for().get("/v3/api-docs").json()

    assert document["openapi"].startswith("3.")
    assert document["info"]["title"] == "NEVIAD Physics API"
    for path, methods in PATHS.items():
        assert methods <= set(document["paths"][path]), path
    schemas = document["components"]["schemas"]
    assert "objectGeometry" in schemas["Scenario"]["properties"]
    assert "runId" in schemas["DrawObjectBody"]["properties"]
    assert "selfTestReport" in schemas["DrawObjectResult"]["properties"]


def test_the_swagger_ui_is_where_it_always_was(client_for):
    page = client_for().get("/swagger-ui/index.html")

    assert page.status_code == 200
    assert "swagger-ui" in page.text.lower()


def test_the_debug_endpoints_are_documented_only_when_enabled(client_for):
    assert not any(p.startswith("/api/v1/codetools") for p in client_for().get("/v3/api-docs").json()["paths"])
    assert any(p.startswith("/api/v1/codetools") for p in client_for({"app_livecode_debug": True}).get("/v3/api-docs").json()["paths"])


def test_the_contract_can_be_exported_without_a_server_or_a_database(tmp_path, monkeypatch):
    import json

    from beneviadsystem.config import openapi_config

    monkeypatch.setenv("DB_URL", "")
    target = tmp_path / "openapi.json"
    openapi_config.main([str(target)])

    document = json.loads(target.read_text(encoding="utf-8"))
    assert set(PATHS) <= set(document["paths"])
