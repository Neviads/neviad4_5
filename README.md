# NEVIAD Physics

Công cụ biến yêu cầu của giáo viên vật lý ("mô phỏng con lắc đơn…") thành một thí nghiệm mô phỏng 2D chạy được trên trình duyệt. Các agent AI ở backend lần lượt tách yêu cầu thành vật, viết kịch bản, vẽ vật, rồi sinh code engine / renderer / experiment. Code do agent viết nằm trong bản sao `neviadlike_structure` của trình duyệt.

- `be/` — Python 3.12, FastAPI (OpenAPI 3.1 + Swagger UI), Pydantic, môi trường conda `neviad-be`, PostgreSQL (Supabase) với migration tương thích Flyway, STOMP qua WebSocket.
- `fe/` — Next.js 16, React 19, TypeScript, Konva, Matter.js, Three.js.
- `docs/object-catalog.md` — danh mục vật thể cần vẽ cho kho vật thể.
- `scripts/` — `start.ps1` / `start.sh` chạy cả hai dịch vụ.

## Mục lục

1. [Chạy dự án](#1-chạy-dự-án)
2. [Luồng tổng thể và các bước agent đi](#2-luồng-tổng-thể-và-các-bước-agent-đi)
3. [Cấu trúc agent](#3-cấu-trúc-agent)
4. [Cấu trúc Backend](#4-cấu-trúc-backend)
5. [Cấu trúc Frontend](#5-cấu-trúc-frontend)
6. [Cơ sở dữ liệu](#6-cơ-sở-dữ-liệu)
7. [Câu lệnh tương tác với DB](#7-câu-lệnh-tương-tác-với-db)
8. [Cầu nối MCP](#8-cầu-nối-mcp)

---

## 1. Chạy dự án

Sao chép `.env.example` thành `.env` ở thư mục gốc và điền giá trị. Không commit `.env`.

| Biến | Ý nghĩa |
|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | Supabase session pooler (URL dạng JDBC `jdbc:postgresql://…` như các script `fe/` đọc, hoặc `postgresql://…`) |
| `APP_PORT` (8080), `NEXT_PORT` (3000) | cổng backend và frontend; chỉ đặt ở đây, `scripts/start.*`, backend và Next.js cùng đọc |
| `APP_CORS_ALLOWED_ORIGINS` | origin được phép; để trống = `http://localhost:NEXT_PORT` |
| `APP_AI_OPENAI_API_KEY`, `_BASE_URL`, `_DEFAULT_MODEL` | provider chính |
| `APP_AI_DEEPSEEK_API_KEY`, `_BASE_URL`, `_DEFAULT_MODEL` | provider dự phòng |
| `APP_AUTH_*`, `APP_R2_*` | chỗ giữ chỗ cho module đăng nhập và lưu trữ R2 (chưa dùng) |
| `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL` | địa chỉ backend cho frontend; để trống = `http://localhost:APP_PORT` và `ws://localhost:APP_PORT/ws` (`fe/next.config.ts` đọc `.env` gốc) |

```
scripts/start.ps1 [-SkipBe] [-SkipFe]      # Windows
scripts/start.sh  [--skip-be] [--skip-fe]  # Linux
```

Script nạp `.env`, kiểm tra cổng 8080 / 3000 và khả năng kết nối DB, rồi khởi động backend và frontend.

Máy mới chỉ cần cài **Python 3.12 trở lên** (Windows: bản cài của python.org, tích "Add python.exe to PATH"; Ubuntu/Debian: `sudo apt install python3 python3-venv`) và **Node.js 22**, tạo `.env`, rồi chạy script. Không cần Anaconda: lần đầu script tự tạo môi trường ảo `be/.venv`, cài backend vào đó, và chỉ cài lại khi `be/pyproject.toml` đổi.

Script chọn Python của backend theo thứ tự: biến `NEVIAD_PYTHON` (nếu đặt), môi trường conda `neviad-be` (nếu có), rồi `be/.venv`.

Lập trình viên muốn dùng conda thì tạo môi trường một lần (cài cả công cụ test):

```
conda env create -f be/environment.yml          # cập nhật sau này: conda env update -f be/environment.yml
conda activate neviad-be
```

Chạy riêng từng phần:

```
cd be && python -m beneviadsystem               # http://localhost:8080  (health: /api/health, Swagger UI: /swagger-ui/index.html, OpenAPI: /v3/api-docs, ReDoc: /redoc)
npm --prefix fe ci && npm --prefix fe run dev   # http://localhost:3000
```

Kiểm tra (giống CI):

```
cd be && ruff check src tests && pytest                            # lint + toàn bộ test backend
cd be && pytest tests/service/agent/codegen/test_agent_runner.py   # một file
cd be && pytest -k "ledger"                                        # các test có tên khớp
npm --prefix fe run lint && npm --prefix fe run build
```

Một số test dùng công cụ ngoài và tự bỏ qua (skip) khi thiếu: cổng kiểm tra Node và test tương thích `@stomp/stompjs` cần `npm --prefix fe ci`; test cơ sở dữ liệu tự dựng một cụm PostgreSQL tạm, cần `initdb`/`pg_ctl` (`conda install -n neviad-be -c conda-forge postgresql`). Frontend chưa có test runner; test chỉ có ở backend.

Hợp đồng API (OpenAPI 3.1) xuất ra file để frontend hay nhóm khác sinh client: `cd be && neviad-openapi openapi.json` (không cần DB hay khoá AI).

---

## 2. Luồng tổng thể và các bước agent đi

Luồng chính do hook `fe/components/lite/useLitePipeline.ts` điều phối ở trang chủ `/`. Giữa các bước có hai điểm dừng để giáo viên duyệt (duyệt kịch bản, nhận thí nghiệm).

```
Giáo viên gõ yêu cầu
   │
   ▼
[1] ExperimentMatchAgent   POST /api/v1/experiment-match
   │   Yêu cầu đã có trong thư viện /mo-phong-vat-ly chưa? (tối đa 3 kết quả khớp theo nghĩa)
   │   Có → mở thí nghiệm sẵn có. Không → đi tiếp.
   ▼
[2] LiteSpecAgent          POST /api/v1/lite-spec
   │   Tách thành tối đa 4 yêu cầu vẽ (một yêu cầu cho mỗi vật cần hình riêng). Có thể hỏi lại giáo viên
   │   về kiểu hình (phong cách, tỉ lệ, góc nhìn, bố cục), mỗi lần một câu. Có tool tra kho vật.
   ▼
[3] ScenarioAgent          POST /api/v1/scenario
   │   Viết kịch bản bằng văn xuôi: công thức, các pha theo thời gian, bố cục, đại lượng chỉnh/quan sát,
   │   và objectGeometry (kích thước mét, điểm neo, điểm có tên, bộ phận chuyển động) — nguồn hình học duy nhất.
   │   ── điểm dừng 1: giáo viên duyệt kịch bản ──
   ▼
[4] DrawObjectAgent × N    POST /api/v1/draw-object      (các vật vẽ song song, mỗi lần mất vài phút)
   │   describe_real_object → write_file / edit_file → check_object → judge → finish
   ▼
[5] CodeAgentService       POST /api/v1/codeagent/{layer}   lần lượt engine → renderer → experiment
   │   Mỗi tầng là một agent dùng tool, đọc/ghi vào bản sao neviadlike_structure của trình duyệt.
   ▼
Mở thí nghiệm (trang chi tiết ghép renderer + toolbar + panel)
   ── điểm dừng 2: giáo viên nhận thí nghiệm ──
```

### 2.1. Các bước bên trong một agent vẽ vật (`DrawObjectAgent`)

1. Mở phiên với `CodeStore` là bản sao của trình duyệt. Agent được đưa yêu cầu, hình học từ kịch bản (`objectGeometry`), góc nhìn và phong cách.
2. **`describe_real_object`**: agent phải tả vật thật trước. Cổng ghi chỉ mở sau khi có mô tả được chấp nhận; ghi code trước đó bị từ chối.
3. **`write_file` / `edit_file`**: ghi một file `_drawn/<stem>.ts`, là một hàm Konva.
4. **`check_object`**: chạy thử code qua `fe/scripts/validate-draw-object.mjs` (Node). Trả kết quả và ảnh chụp vật ở trạng thái nghỉ và khi mỗi bộ phận chuyển động ở biên. Tối đa 12 lần kiểm tra (`MAX_CHECKS`).
5. **Giám khảo (`DrawObjectJudge`)**: bước `criteria` chốt tiêu chí hình dạng (tỉ lệ, đặc điểm, quy tắc góc nhìn) trước khi có ảnh nào. Sau đó bước `judge` chỉ đọc yêu cầu, tiêu chí và ảnh, không đọc code. Đạt hay không do code quyết định (`decide`), không do lời giám khảo.
6. **`finish`** chỉ qua khi lần `check_object` gần nhất đạt trên đúng bản file hiện tại, và giám khảo đã cho qua. Giám khảo được từ chối `finish` một số lần giới hạn (`MAX_JUDGINGS`); quá số đó thì vật được nhận kèm cảnh báo để một vật không chặn cả thí nghiệm.

### 2.2. Các bước bên trong một agent tầng code (`AgentRunner` + `CodeSession`)

1. `CodeAgentService` chọn tầng (`CodeLayer`: `engine` → `renderer` → `experiment`), nạp prompt `prompts/codeagent/<layer>.md`, dựng `AgentSpec` (file được ghi, file bắt buộc đọc trước).
2. Agent tự đọc thứ nó cần bằng `read_file`, `list_files`, `search`. Nó không được ghi trước khi đọc xong các file bắt buộc (mẫu của framework, và ghi chú tầng trước để lại).
3. Ghi bằng `write_file` / `edit_file`, chỉ vào các file được giao. Ghi nhớ cho tầng sau bằng `append_note`.
4. `finish` cần ít nhất một ghi chú của chính agent; khi xong, sổ cái (ledger) của hệ thống được nối vào file ghi chú.
5. Mỗi nhóm tool có hạn mức (mặc định: 60 lần đọc/liệt kê/tìm, 30 lần ghi/sửa, 20 ghi chú). Hết hạn mức thì model nhận `TOOL_BUDGET_EXCEEDED` chứ không bị ném lỗi.
6. Một lượt (round) mới là một cuộc hội thoại mới, được đưa sổ cái và ghi chú của các lượt trước. Tối đa `MAX_ROUNDS = 3`.
7. Trạng thái `finished` chỉ do `CodeSession` quyết định, không phải do lời model nói.

### 2.3. Agent lắp máy (`AssemblyAgent`)

Chia một cỗ máy thành các bộ phận rồi lắp lại. Gọi qua `POST /api/v1/assembly`.

1. `AssemblyPlanner` tách máy thành 2–6 bộ phận, mô tả cách nối cổng-với-cổng, một đầu vào của máy, biểu thức điều khiển cho từng bộ phận chuyển động. Bộ phận không tự chuyển động (khung, ống, bệ) được đánh dấu tĩnh. Biểu thức được lọc bằng whitelist ký tự an toàn.
2. `DrawObjectAgent` vẽ từng bộ phận song song, mỗi bộ phận đi qua cổng riêng.
3. Cổng lắp ráp (`NodeAssemblyValidator` → `fe/scripts/validate-assembly.mjs`) kiểm tra các bộ phận khớp theo cổng và máy chuyển động được.
4. Kết quả `ok` chỉ khi mọi bộ phận và cả cụm đều đạt; bộ phận lỗi vẫn được trả về để xem.

### 2.4. Hiển thị tiến trình

Agent đẩy từng bước ra WebSocket (chỉ để hiển thị, lỗi ở đây không bao giờ dừng agent):

| Topic STOMP | Nội dung |
|---|---|
| `/topic/agents/activity/{runId}` | từng bước agent (`AgentActivity`: tool, phase STARTED/FINISHED/PROGRESS, success, message) |
| `/topic/agents/simulation/{runId}/draft` | bản xem trước file model đang viết (`RunDraft`: START/DELTA/ABORT/END) |
| `/topic/agents/livecode/{runId}` | cầu nối file backend ↔ trình duyệt (xem mục 3.3) |

---

## 3. Cấu trúc agent

### 3.1. Danh sách agent

| Agent | Vị trí (`be/.../service/agent`) | Endpoint | Việc |
|---|---|---|---|
| `ExperimentMatchAgent` | `impl/` | `POST /api/v1/experiment-match` | đối chiếu yêu cầu với thư viện thí nghiệm có sẵn |
| `LiteSpecAgent` | `impl/` | `POST /api/v1/lite-spec` | tách yêu cầu thành các yêu cầu vẽ vật, hỏi lại giáo viên khi cần |
| `ScenarioAgent` | `impl/` | `POST /api/v1/scenario` | kịch bản + hình học vật |
| `DrawObjectAgent` | `impl/` | `POST /api/v1/draw-object` | vẽ MỘT vật (Konva) |
| `DrawObjectJudge` / `ModelDrawObjectJudge` | `impl/` | (nội bộ) | chấm hình qua ảnh |
| `AssemblyPlanner`, `AssemblyAgent` | `impl/` | `POST /api/v1/assembly` | chia và lắp máy |
| `CodeAgentService` | `codegen/` | `POST /api/v1/codeagent/{layer}` | sinh code engine / renderer / experiment |

Các agent chỉ phân tích (`ExperimentMatch`, `LiteSpec`, `Scenario`, `AssemblyPlanner`) gọi model theo schema JSON chặt, thử lại tối đa `MAX_ATTEMPTS = 3`. Các agent dùng tool (`DrawObject`, `CodeAgent`) chạy vòng lặp tool qua `AiClient`.

### 3.2. Các khối dùng chung

- `infrastructure/ai`
  - `AiClient`: giao diện không phụ thuộc nhà cung cấp. `OpenAiAdapter` và `DeepSeekAdapter` cài đặt (cả hai đi qua `ChatCompletionsModel` + `ChatCompletionsToolCalling`, thay cho Spring AI); `FallbackAiClient` bọc ngoài để chuyển nhà cung cấp; `UnavailableAiClient` dùng khi không có khoá.
  - `OpenAiResponsesToolLoop`: vòng lặp tool qua `/v1/responses`, giữ được reasoning khi có tool. Mức reasoning và thời gian chờ nằm ở các biến `APP_AI_OPENAI_AGENT_*` (`config/settings.py`).
  - `StructuredOutputSchemaRegistry`, `StrictToolSchemas`, `ToolSchemaLock`: quản lý JSON schema chặt cho đầu ra và tool.
  - `JsonStringFieldStream` + `ToolStreamListener`: tách chuỗi đang sinh dở để phát bản nháp (`CodeDraftStreamer`).
  - `ToolImageSource`: cho tool đưa ảnh lại cho model (dùng ở `check_object`).
- `service/agent/codegen`
  - `AgentRunner`: chạy MỘT agent dùng tool theo `AgentSpec`, nhiều lượt, cấp sổ cái.
  - `CodeSession`: bộ tool có hạn mức và các cổng (`read_file`, `list_files`, `search`, `write_file`, `edit_file`, `append_note`, `finish`).
  - `AgentSteps` + `AgentActivityPublisher` (`StompAgentActivityPublisher`): phát bước ra STOMP.
  - `ExperimentNames`: tên file/ký hiệu suy ra từ slug của thí nghiệm.
- `service/agent/tools/objects/ObjectLibraryTools`: tool chỉ đọc cho agent xem tóm tắt vật theo `id` (kích thước, bộ phận chuyển động, điểm, `useWhen`, `avoidWhen`), tối đa 10 id mỗi lần, không bao giờ trả mã nguồn.

### 3.3. Kho mã (`CodeStore`) — nơi agent đọc ghi file

Agent không ghi vào ổ đĩa của server. Nó làm việc trên một `CodeStore` có các cài đặt:

| Cài đặt | Dùng khi |
|---|---|
| `BridgedCodeStore` | đọc/ghi qua WebSocket vào bản sao `neviadlike_structure` mà **trình duyệt** giữ (mặc định khi chạy thật) |
| `TemplateCodeStore` | đọc cây template từ bảng `template_file` |
| `SourceStore` | đọc bộ sưu tập từ bảng `source_file` (có kiểm tra đường dẫn) |
| `OverlayCodeStore` | lớp ghi phủ lên một kho gốc, giữ file ghi trong bộ nhớ (dùng cho chế độ headless) |

Giao thức cầu nối (`LiveCodeProtocol`): backend gửi `Call{callId, runId, op, args}` tới `/topic/agents/livecode/{runId}`, trình duyệt trả `Result{callId, runId, ok, data, message}`. Các `op`: `fsRead`, `fsWrite`, `fsList`, `fsAppend`, `fsSearch`. Mọi đường dẫn được backend kiểm tra trước khi gửi. Lỗi cầu nối: `TIMEOUT`, `BRIDGE_ERROR`, `INTERRUPTED`. Phía trình duyệt xử lý ở `fe/lib/code-fs/handler.ts` và `fe/lib/live-code/bridge.ts`.

### 3.4. Prompt và skill

- `be/src/beneviadsystem/resources/prompts/codeagent/{engine,renderer,experiment}.md` — prompt cho từng tầng code.
- `be/src/beneviadsystem/resources/prompts/drawobject/{agent,judge,judge-criteria}.md` — prompt cho agent vẽ và giám khảo.
- `be/src/beneviadsystem/resources/skills/draw-object/` — skill vẽ vật (`SKILL.md`, `README.md`).
- Prompt của `ExperimentMatch`, `LiteSpec`, `Scenario`, `AssemblyPlanner` nằm ngay trong module của từng agent (hằng `INSTRUCTIONS`).

### 3.5. Hợp đồng vật thể

Mỗi vật là hàm Konva `(p, ppm, fill, label) => { group, parts, points }` (kiểu `ShapeObject` trong `fe/neviadlike_structure/objects/types.ts`). Mọi độ dài = mét × `ppm`. Vật chỉ vẽ, không tính vật lý. Engine báo tư thế qua `metrics.objects[<id>] = { x, y, parts, visible? }`; những thứ sinh hàng loạt hoặc thoáng qua đi qua `metrics.items`.

---

## 4. Cấu trúc Backend

Gốc package: `be/src/beneviadsystem` (gói Python `beneviadsystem`; mỗi class một module `snake_case.py`, tên class giữ nguyên, ví dụ `CodeSession` ở `service/agent/codegen/code_session.py`). Test ở `be/tests/`, cùng cấu trúc thư mục.

```
main.py              create_app() dựng ứng dụng FastAPI; `python -m beneviadsystem` chạy uvicorn
presentation/        tầng web
  controller/        assembly_controller, code_agent_controller, draw_object_controller, experiment_match_controller,
                     health_controller, lite_spec_controller, scenario_controller, source_controller,
                     code_tools_debug_controller (chỉ dev); mỗi file một APIRouter
  advice/            global_exception_handler (400 / 502 / 503 / 500)
  dto/               health_response, requests (giới hạn của body), errors, requirement/, simulation/run_draft
service/             nghiệp vụ
  agent/impl/        các agent (mục 3.1), node_script_runner, node_*_validator, math_expression
  agent/codegen/     code_agent_service, agent_runner, code_session, các *_code_store, agent_activity*
  agent/draft/       code_draft_streamer, code_draft_publisher (bản nháp đang viết)
  agent/tools/       livecode/ (cầu nối trình duyệt), objects/ (object_library_tools)
  health_service, object_library_service, source_library_service, text_format, json_fields
infrastructure/
  ai/                AiClient + adapter + tool loop + schema (mục 3.2)
  persistence/       database (pool psycopg), source_file_repository (chỉ đọc), migrations (FlywayMigrator)
  messaging/         stomp_broker + stomp_frame (STOMP 1.2 tại /ws), messaging_template
  security/ storage/ mới có chỗ giữ chỗ, chưa cài đặt
domain/model/        application_health, source_file, base (CamelModel: tên Python trong code, camelCase trên dây)
domain/exception/    IllegalStateError
config/              settings (biến môi trường), container (đồ thị đối tượng), cors_config, openapi_config,
                     security_config, websocket_config, resources
resources/
  db/migration/            V1..V3 (SQL, áp dụng theo kiểu Flyway)
  prompts/, skills/        prompt và skill
```

Mọi body JSON giữ đúng tên trường camelCase như trước (frontend không phải sửa). `Container` dựng mỗi service một lần khi cần; test thay một phần bằng cách truyền vào theo tên, ví dụ `Container(settings, scenario_agent=fake)`. Endpoint của agent chạy trên thread pool (256 luồng) vì mỗi yêu cầu có thể chờ model và trình duyệt vài phút.

### API REST

| Endpoint | Việc |
|---|---|
| `GET /api/health` | kiểm tra sống |
| `GET /v3/api-docs`, `/swagger-ui/index.html`, `/redoc` | hợp đồng OpenAPI 3.1 và giao diện xem/thử |
| `POST /api/v1/experiment-match` | khớp thí nghiệm có sẵn |
| `POST /api/v1/lite-spec` | tách thành yêu cầu vẽ |
| `POST /api/v1/scenario` | kịch bản |
| `POST /api/v1/draw-object` | vẽ một vật |
| `POST /api/v1/draw-object/headless` | vẽ vật không cần trình duyệt, gọi model thật; tắt mặc định (`APP_DRAW_OBJECT_HEADLESS_ENABLED`) |
| `POST /api/v1/assembly` | lắp máy |
| `POST /api/v1/codeagent/{layer}` | `engine` / `renderer` / `experiment` |
| `GET /api/v1/source/{collection}` | liệt kê file của bộ sưu tập |
| `GET /api/v1/source/{collection}/file?path=…` | đọc một file |
| `POST·GET·PUT·DELETE /api/v1/codetools/debug/{runId}/…` | tool debug, không xác thực; chỉ bật khi `APP_LIVECODE_DEBUG=true` ở máy cục bộ |

WebSocket: endpoint `/ws` (STOMP 1.2, subprotocol `v12.stomp`, không heartbeat), broker `/topic`, tiền tố ứng dụng `/app`. Chỉ các origin trong `APP_CORS_ALLOWED_ORIGINS` được mở socket. Lỗi trả về: `{"error": …}` cho lỗi riêng của agent (400), `{status, error, message}` cho lỗi chung.

### Cổng kiểm tra bằng Node

`NodeDrawObjectValidator` và `NodeAssemblyValidator` chạy `fe/scripts/validate-draw-object.mjs` / `validate-assembly.mjs` qua `NodeScriptRunner` (JSON vào stdin, dòng JSON cuối của stdout là kết quả). Vì vậy máy chạy backend cần có `node` và cây `fe/` trên đĩa. Cấu hình: `APP_PIPELINE_FE_ROOT` (rỗng: `fe` hoặc `../fe` tính từ thư mục chạy, rồi `fe/` của repo), `APP_PIPELINE_NODE_COMMAND`, `APP_PIPELINE_GATE_TIMEOUT_SECONDS`.

---

## 5. Cấu trúc Frontend

```
fe/
  app/                       route Next.js (slug tiếng Việt)
    page.tsx, NeviadlikeHome.tsx     trang chủ: luồng tạo thí nghiệm bằng agent
    mo-phong-vat-ly/                 thư viện thí nghiệm có sẵn (+ [presetId])
    vat-the-mo-phong/                kho vật thể đã vẽ
    sandbox/                         chạy thử thí nghiệm bằng Sandpack (+ [id])
    free-style-html-create/          xưởng tạo vật bằng code (MCP neviad-code)
    ve-may-khong-duoc-thi-ve-tay/    bảng vẽ tay (MCP neviad-draw)
    dinh-luat-2-newton/, maynangthuyluc/   trang thí nghiệm riêng
    wireframe/*                      wireframe giao diện
    api/code-bridge, api/draw-bridge endpoint HTTP cho hai cầu nối MCP
  neviadlike_structure/      cây mẫu mà code agent sửa (xem README bên trong)
    presets/ engines/ renderers/ experiments/ objects/ shared/ _playground/
  object-library/            mỗi vật một file (tên tiếng Việt), theo hợp đồng ShapeObject
  components/
    lite/                    LiteWorkspace, useLitePipeline (điều phối luồng agent), Stage, Tabs
    live-code/               xem/sửa file agent đang ghi (useLiveCode, CodeFilesView, SourceEditor)
    workspace/               Chat, AgentSteps, StepProgress, Result, Landing
    draw-object-skill/, object-catalog/, sandbox/, code-fs/, simulations/, layout/
  lib/
    agents.ts                StompClient, kiểu AgentActivity / RunDraft, tên topic
    lite/                    api.ts (gọi REST backend), code-agents.ts, experiment-catalog.ts
    code-fs/                 kho file trong trình duyệt: store, handler (cầu nối), template, loader, runtime, engine-smoke
    live-code/               bridge.ts, draft.ts
    code-bridge/, draw-bridge/   kiểu và chụp ảnh cho hai cầu nối MCP
    assembly/assemble.ts     lắp máy theo kế hoạch
    sandbox/                 dựng dự án Sandpack
    library.ts, object-library.ts, object-catalog.ts, classroom.ts, auth/
  scripts/                   công cụ Node (mục 7 và 8)
```

### Luồng phụ thuộc trong `neviadlike_structure`

```
experiments ──> renderers ──> engines
     │              └──> objects ──> (palette, Konva)
     └──────────────┴──> shared
presets ──> engines (chỉ kiểu)
```

- Engine là vật lý thuần theo mét, không React hay canvas.
- Chỉ `shared/view-transform.ts` đổi toạ độ world ↔ view; renderer không tự viết công thức đổi.
- Hệ toạ độ world: gốc O, Ox sang phải, Oy lên trên. View: pixel logic, gốc trên-trái, y hướng xuống.

---

## 6. Cơ sở dữ liệu

PostgreSQL trên Supabase. Khi khởi động, backend chạy các migration (`FlywayMigrator`, `infrastructure/persistence/migrations.py`) và ghi vào đúng bảng `flyway_schema_history` của Flyway (checksum CRC32 như Flyway), nên DB đã migrate bằng bản Java vẫn hợp lệ. Schema đã có bảng mà chưa có lịch sử thì được baseline ở version 1 (như `baseline-on-migrate`). Đặt `FLYWAY_ENABLED=false` để tắt. Migration nằm ở `be/src/beneviadsystem/resources/db/migration`.

| Migration | Nội dung |
|---|---|
| `V1__baseline.sql` | chỗ giữ chỗ (`SELECT 1`) |
| `V2__source_file.sql` | tạo `source_file` |
| `V3__template_file.sql` | tạo `template_file` |

### `source_file`

Mã nguồn mà agent đọc, mỗi dòng một file, nhóm theo bộ sưu tập.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `collection` | TEXT NOT NULL | `objects` (vật đã vẽ), `catalog` (danh mục), … |
| `path` | TEXT NOT NULL | đường dẫn tương đối, vd `bom-tay.ts` |
| `content` | TEXT NOT NULL | nội dung file |
| `updated_at` | TIMESTAMPTZ NOT NULL DEFAULT now() | |

Khoá chính `(collection, path)`. Các dòng có `collection = 'template'` là bản cũ, không còn được đọc.

### `template_file`

Cây `fe/neviadlike_structure` mà code agent làm việc.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `path` | TEXT PRIMARY KEY | vd `engines/template-experiment/engine.ts` |
| `content` | TEXT NOT NULL | |
| `updated_at` | TIMESTAMPTZ NOT NULL DEFAULT now() | |

### Ai đọc, ai ghi

- **Ghi:** chỉ `fe/scripts/push-source.mjs`, ghi trực tiếp vào PostgreSQL. Backend không ghi bảng nào.
- **Đọc:** `SourceFileRepository` (psycopg, câu lệnh không prepare để chạy được sau pooler): collection `template` đọc từ `template_file`, các collection khác đọc từ `source_file`. Từ đó phục vụ `SourceController`, `SourceLibraryService`, `ObjectLibraryService` và các `CodeStore`.
- Một vật trong `objects` được nối với nhóm chủ đề của nó qua tên `catalog` trong khối OBJECT-META của file; vật không khớp nhóm nào vào nhóm `OTHER_TOPIC` (0). Các nhóm chủ đề lấy từ các mục đánh số trong `docs/object-catalog.md` (collection `catalog`).

---

## 7. Câu lệnh tương tác với DB

### 7.1. Nạp dữ liệu (ghi vào DB)

Chạy từ gốc repo. Cần backend đã chạy ít nhất một lần để migration tạo bảng. Script đọc `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` từ môi trường hoặc từ `.env` ở gốc repo.

```
npm --prefix fe run push:template    # fe/neviadlike_structure → bảng template_file
npm --prefix fe run push:objects     # fe/object-library       → source_file, collection "objects"
npm --prefix fe run push:catalog     # docs/object-catalog.md  → source_file, collection "catalog"
```

Dạng đầy đủ, kèm tuỳ chọn nạp đúng một file (đối số thứ ba là tên file):

```
cd fe
node scripts/push-source.mjs <collection> <thư-mục-trong-fe> [tên-file-duy-nhất]
node scripts/push-source.mjs objects object-library bom-tay.ts
```

Quy tắc của script: bộ sưu tập trở thành đúng các file đọc được lần này; chỉ lấy `.ts` / `.tsx` / `.md` / `.json`; bỏ thư mục bắt đầu bằng `_` và file `.d.ts`; đường dẫn chỉ gồm chữ, số, `_ . / -` và không có `..`; tên collection khớp `^[a-z0-9-]{1,40}$`. Xuống dòng được chuẩn hoá về `\n`.

### 7.2. Đọc qua backend (REST)

```
curl http://localhost:8080/api/health
curl http://localhost:8080/api/v1/source/template                          # danh sách file của cây template
curl http://localhost:8080/api/v1/source/objects                           # danh sách vật đã nạp
curl "http://localhost:8080/api/v1/source/objects/file?path=bom-tay.ts"    # nội dung một file
```

### 7.3. Truy vấn SQL trực tiếp

Dùng `psql` hoặc SQL editor của Supabase với thông tin kết nối trong `.env`. Một số câu hay dùng:

```sql
-- Mỗi bộ sưu tập có bao nhiêu file
SELECT collection, count(*) AS files, max(updated_at) AS last_push
FROM source_file GROUP BY collection ORDER BY collection;

-- Danh sách file của cây template
SELECT path, length(content) AS chars, updated_at FROM template_file ORDER BY path;

-- Xem nội dung một file
SELECT content FROM source_file WHERE collection = 'objects' AND path = 'bom-tay.ts';
SELECT content FROM template_file WHERE path = 'engines/template-experiment/engine.ts';

-- Tìm file có chứa một chuỗi
SELECT collection, path FROM source_file WHERE content ILIKE '%piston%';

-- Xoá một file / cả bộ sưu tập (không hoàn lại được; nạp lại bằng push:*)
DELETE FROM source_file WHERE collection = 'objects' AND path = 'bom-tay.ts';
DELETE FROM source_file WHERE collection = 'objects';

-- Dọn bản template cũ không còn được đọc
DELETE FROM source_file WHERE collection = 'template';

-- Lịch sử migration (bảng của Flyway, backend Python vẫn ghi vào đây)
SELECT installed_rank, version, description, success FROM flyway_schema_history ORDER BY installed_rank;
```

### 7.4. Migration

Thêm file mới `be/src/beneviadsystem/resources/db/migration/V4__<mô_tả>.sql`; backend tự chạy khi khởi động, mỗi file trong một transaction. Không sửa file migration đã chạy.

### 7.5. Lưu ý kết nối Supabase

`DB_URL` dùng session pooler, có `sslmode=require&prepareThreshold=0` (xem `.env.example`); backend bỏ các tham số chỉ JDBC hiểu (`prepareThreshold`) khi chuyển sang URL của libpq. `scripts/start.*` kiểm tra TCP tới host/cổng trong `DB_URL` trước khi chạy backend.

---

## 8. Cầu nối MCP

`.mcp.json` khai báo hai MCP server (stdio) để Claude làm việc cùng các trang studio đang mở trên trình duyệt:

| Server | Mã | Trang | Việc |
|---|---|---|---|
| `neviad-code` | `fe/scripts/code-bridge/` | `/free-style-html-create` | đọc yêu cầu người dùng gõ, viết vật thành một tài liệu HTML tự đủ (SVG hoặc canvas 960×640), xem ảnh chụp do trình duyệt chụp lại, sửa cho tới khi giống thật. Công cụ: `requests_list`, `request_update`, `object_write`, `object_read`, `object_view`, `objects_list` |
| `neviad-draw` | `fe/scripts/draw-bridge/` | `/ve-may-khong-duoc-thi-ve-tay` | vẽ bằng bút trên bảng 1200×800. Công cụ: `pen_draw`, `pen_undo`, `board_view`, `board_info`, `board_clear` |

Trạng thái được ghi vào file (vd `fe/.code-bridge/state.json`) và các trang Next.js đang mở đọc lại qua `app/api/code-bridge` và `app/api/draw-bridge`. Chúng độc lập với luồng agent của backend ở mục 2.

Các script Node khác trong `fe/scripts`: `preview-object-library.mjs` (xem trước kho vật), `validate-draw-object.mjs`, `validate-assembly.mjs` (cổng kiểm tra backend gọi), `push-source.mjs` (nạp DB), thư viện dùng chung ở `lib/`.
