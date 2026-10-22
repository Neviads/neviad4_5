"""The OpenAPI contract of the backend: FastAPI writes it from the typed routes, served where springdoc served it before."""

TITLE = "NEVIAD Physics API"
DESCRIPTION = "Backend API for the NEVIAD Physics teaching workspace"
VERSION = "0.1.0"
OPENAPI_URL = "/v3/api-docs"
SWAGGER_UI_URL = "/swagger-ui/index.html"
REDOC_URL = "/redoc"
TAGS = [
    {"name": "Health", "description": "Service health endpoints"},
    {"name": "Agents", "description": "AI agents of the lite flow: experiment match, lite spec, scenario, draw object, assembly, code layers"},
    {"name": "Source", "description": "Source code the agents read"},
    {"name": "Code tools (debug)", "description": "Development-only access to the code agent tools; enabled by APP_LIVECODE_DEBUG"},
]


def main(argv: list[str] | None = None) -> None:
    """Writes the OpenAPI document to the given file (or stdout): ``python -m beneviadsystem.config.openapi_config openapi.json``. It builds
    the application without starting it, so no database or AI key is needed; the debug endpoints are left out."""
    import json
    import sys

    from beneviadsystem.config.settings import Settings
    from beneviadsystem.main import create_app

    args = sys.argv[1:] if argv is None else argv
    document = json.dumps(create_app(Settings(_env_file=None, app_livecode_debug=False)).openapi(), ensure_ascii=False, indent=2) + "\n"
    if args:
        with open(args[0], "w", encoding="utf-8") as out:
            out.write(document)
    else:
        sys.stdout.write(document)


if __name__ == "__main__":
    main()
