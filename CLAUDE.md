# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

NEVIAD Physics: a tool that turns a physics-experiment request into an interactive 2D simulation. AI agents (backend) draw the objects, write a scenario, and generate engine/renderer/experiment code that runs in the browser. UI text, prompts, and docs are mostly Vietnamese.

Monorepo with no git repo at the root and an empty root `package.json`:
- `be/` — Python 3.11+, FastAPI (OpenAPI/Swagger), Pydantic, conda env `neviad-be` (`be/environment.yml`), PostgreSQL (Supabase) with Flyway-compatible migrations.
- `fe/` — Next.js 16 / React 19 / TypeScript, Konva, Matter.js, Three.js.
- `scripts/` — `start.sh` / `start.ps1` launch both services. `setup.sh` is a stale leftover from another project (Python/uvicorn); ignore it.

## Commands

Config is read from the root `.env` (copy `.env.example`; needs `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` for Supabase, plus AI keys). Never commit `.env`. Ports are set only there (`APP_PORT` backend, `NEXT_PORT` frontend); empty `APP_CORS_ALLOWED_ORIGINS`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL` are derived from them (`fe/next.config.ts` loads the root `.env`).

```
scripts/start.ps1 [-SkipBe] [-SkipFe]     # Windows; scripts/start.sh on Linux. Loads .env, checks ports 8080/3000 and DB reachability, starts both.
                                          # Needs only Python 3.11+ and Node 22: without conda it creates be/.venv and installs the backend there
conda env create -f be/environment.yml   # optional dev env `neviad-be` (backend editable + pytest/ruff); the start scripts prefer it when present
cd be && ruff check src tests && pytest   # backend lint + tests (CI), run inside the neviad-be env
cd be && pytest tests/service/agent/codegen/test_agent_runner.py              # one test file
cd be && pytest tests/service/agent/codegen/test_agent_runner.py::test_name   # one test
cd be && python -m beneviadsystem         # backend only, port 8080 (health: /api/health, Swagger: /swagger-ui/index.html, OpenAPI: /v3/api-docs)
cd be && neviad-openapi openapi.json      # export the OpenAPI contract without a server or DB
npm --prefix fe ci && npm --prefix fe run lint && npm --prefix fe run build   # frontend CI steps
npm --prefix fe run dev                   # frontend dev, port 3000
```

There is no frontend test runner. Tests are backend-only (pytest), CI = backend `ruff` + `pytest` (in the conda env) + frontend `lint` and `build`. Some backend tests skip themselves without their tools: the Node gates and the `@stomp/stompjs` compatibility test need `npm --prefix fe ci`; the DB tests start a throwaway PostgreSQL and need `initdb`/`pg_ctl` (`conda install -n neviad-be -c conda-forge postgresql`).

`fe` scripts that load files into the DB (write to PostgreSQL directly; start the backend once first so its migrations create the tables):
- `npm --prefix fe run push:template` — `fe/neviadlike_structure` → `template_file` table
- `npm --prefix fe run push:objects` — `fe/object-library` → `source_file` (collection `objects`)
- `npm --prefix fe run push:catalog` — `docs/object-catalog.md` → `source_file` (collection `catalog`)

## Architecture

### Backend (`be/src/beneviadsystem`, tests in `be/tests` with the same layout)
Layers: `presentation` (one FastAPI `APIRouter` per controller, DTOs, `global_exception_handler`) → `service` → `infrastructure` (AI, persistence, messaging); plus `config` (`settings` reads the env vars, `container` builds the object graph like the old Spring context; tests pass replacements by name, e.g. `Container(settings, scenario_agent=fake)`). One class per `snake_case.py` module, class names unchanged from the Java version. JSON on the wire stays camelCase (`CamelModel` in `domain/model/base.py`).
- `infrastructure/ai`: provider-agnostic `AiClient` with OpenAI and DeepSeek adapters (over `ChatCompletionsModel`, plain httpx), wrapped by `FallbackAiClient` (`UnavailableAiClient` when no key). Tools are `ToolCallback`s (`FunctionToolCallback` over a pydantic input model). Tool-using agent calls go through `OpenAiResponsesToolLoop` (`/v1/responses`); `StructuredOutputSchemaRegistry`/`StrictToolSchemas`/`ToolSchemaLock` manage strict JSON schemas. Reasoning effort and timeouts come from `APP_AI_OPENAI_AGENT_*` (`config/settings.py`).
- `service/agent/impl`: single-purpose agents — `ExperimentMatchAgent`, `LiteSpecAgent`, `ScenarioAgent`, `DrawObjectAgent` (+ judge/validator), `AssemblyAgent` (+ planner/validator). The `Node*` validators shell out to `fe/scripts/validate-*.mjs` (`APP_PIPELINE_*` settings), so the backend needs `node` and the `fe/` tree on disk.
- `service/agent/codegen`: `CodeAgentService` runs a code agent per layer (`CodeLayer`: engine / renderer / experiment) via `AgentRunner` against a `CodeStore`. The store is the **browser's** copy of the `neviadlike_structure` tree, reached over STOMP/WebSocket (`infrastructure/messaging/stomp_broker.py`, a small STOMP 1.2 broker at `/ws` compatible with `@stomp/stompjs`) through `service/agent/tools/livecode` (`LiveCodeBridge`); `TemplateCodeStore`/`OverlayCodeStore`/`SourceStore` serve the template and library from the DB. Prompts live in `src/beneviadsystem/resources/prompts/{codeagent,drawobject}` and the draw skill in `resources/skills/draw-object`.
- DB schema via `resources/db/migration`, applied at start-up by `FlywayMigrator` (writes Flyway's own `flyway_schema_history`, so databases migrated by the old Java backend stay valid). `CodeToolsDebugController` (`APP_LIVECODE_DEBUG`) and the headless draw-object endpoint are dev-only flags, off by default.

### Frontend (`fe/`)
- `app/` routes (Vietnamese slugs): `mo-phong-vat-ly` (simulations), `vat-the-mo-phong` (object library), `sandbox`, `wireframe/*`, `free-style-html-create` and `ve-may-khong-duoc-thi-ve-tay` (the two MCP-bridged studios, below). `app/api/code-bridge` and `app/api/draw-bridge` are their HTTP endpoints.
- `neviadlike_structure/` is the **template tree that the code agents edit** and also the reference architecture for a new experiment; read its `README.md` before touching it. Strict one-way flow: `experiments → renderers → engines`, `renderers → objects → palette`, `presets → engines` (types only). Engines are pure physics in meters (no React/canvas); only `shared/view-transform.ts` converts world↔view; objects only draw (Konva) and never compute physics, engine reports their pose via `metrics.objects`; transient swarms go through `metrics.items`/`drawItems`.
- `object-library/` — one drawn object per file (Vietnamese filenames), following the `ShapeObject` contract in `neviadlike_structure/objects/types.ts` (`(p, ppm, fill, label) => {group, parts, points}`). `docs/object-catalog.md` is the wishlist of objects to draw.
- `scripts/` Node tooling: `validate-draw-object.mjs`/`validate-assembly.mjs` (used by the backend gates), `preview-object-library.mjs`, `push-source.mjs`, and the two MCP servers.

### MCP bridges (`.mcp.json`)
Two stdio MCP servers expose the browser studios to Claude: `neviad-code` (`fe/scripts/code-bridge`) and `neviad-draw` (`fe/scripts/draw-bridge`). They read/write state (e.g. `fe/.code-bridge/state.json`) that the running Next.js pages poll. Each server's own tool instructions describe the workflow (read requests → write → view screenshot → iterate); the draw-object skill/prompt files define object-drawing conventions.
