# Thiết kế: bộ công cụ lắp ráp 3D cho agent

Bản nháp thiết kế cho bước **xây** vật thể 3D: agent chọn bộ phận từ thư viện và nói chúng ghép với nhau thế nào, còn công cụ tính ra vị trí và hướng. Bước **kiểm tra** (chụp ảnh, va chạm, chạy mô phỏng) để sang một giai đoạn sau và chỉ được nhắc tới ở cuối.

## 0. Trạng thái: bản 0.1 đã chạy

Giai đoạn 1–4 ở mục 8 đã có bản đầu. Chỗ nào khác với các mục bên dưới thì theo mục này.

- **Server MCP** `neviad-assembly` (`fe/scripts/assembly-bridge/mcp.mjs`, đã khai báo trong `.mcp.json`). `node fe/scripts/assembly-bridge/mcp.mjs --selftest` dựng máy phát qua chính các handler, so tư thế với đáp số, và thử 5 lỗi cố ý, rồi dựng một xe cỡ thật trượt dọc `ground.x` và kiểm tra bánh ghép lăn đúng nửa vòng khi xe đi πR, kèm `assembly_export`.
- **Lõi** `fe/assembly-kit/`:
  - `core/`: math, types, solve, route, report. Không phụ thuộc three; server đóng gói bằng esbuild.
  - `parts/`: 18 loại bộ phận, gom theo nhóm trong `primitives.ts`, `mechanical.ts`, `electrical.ts`. Danh sách đăng ký ở `parts/index.ts`.
  - `three/`: vật liệu, texture, hình học dùng chung, `build-scene.ts`.
- **Trang** `/lap-rap-3d` (`fe/app/lap-rap-3d`, API `fe/app/api/assembly-bridge`): xem bản lắp ráp, có thanh trượt cho từng khớp, tự chụp ảnh 2×2 (phối cảnh, trước +z, cạnh +x, trên +y) khi `assembly_view` yêu cầu.
- **Tool:** `part_types_list`, `part_type_info`, `assembly_create|list|read|delete`, `part_add|update|remove`, `joint_add|remove`, `route_add|remove`, `assembly_describe`, `assembly_view {pose, focus, region}`, `assembly_export {path}` (ghi JSON vào repo để một route dùng `buildAssembly` + `setPose`).
- **Kiểu ghép:** `onto` và `touch` là một phép (hai mặt áp vào nhau). `fixed` dời theo `shift: [x, y, z]` trong khung điểm neo b. `follow: false` cho tiếp xúc trượt (bộ phận không quay theo khớp của cha).
- **Khớp:** `revolute` và `prismatic`, trục là điểm neo kiểu axis: của bộ phận, `block.axisX|axisY|axisZ` (qua tâm hộp) hoặc `ground.x|y|z` (trục thế giới). Khớp ghép `couple: {joint, ratio}`: giá trị = ratio × khớp dẫn. Bánh (revolute) theo khớp trượt mà bỏ `ratio` thì công cụ tự tính tỉ số lăn không trượt trên mặt ngang, θ/s = d·(a × up)/R, từ bán kính trục bánh. Chưa có `rod`.
- **Cỡ vật:** khối và thanh dài tới 50 m, bo cạnh tới 0,3 m, nên dựng được cả vật cỡ thật như ô tô, không chỉ đồ đặt trên bàn.
- **Dây nối chưa tự tránh vật cản.** Muốn dây đi vòng thì thêm mặt `via` (ví dụ `meter.back`).
- `carbonBrush.standHeight` vẫn là một con số. Agent đọc toạ độ `foot` trong kết quả `part_add` rồi `part_update` cho chạm mặt đế. Sau này nên có kiểu ghép "kéo dài tới mặt" để bỏ bước này.

## 1. Vấn đề

Khi dựng động cơ Stirling và máy phát điện xoay chiều (`fe/app/may-phat-dien-xoay-chieu`, `fe/app/may-phat-dien-babylon`), gần như mọi việc đều do agent làm. Các công cụ đã thử (three.js, Renderoni, Babylon NGE MCP) chỉ là nơi ghi kết quả:

| Việc | Agent làm tốt? |
|---|---|
| Biết máy gồm bộ phận nào, lắp theo thứ tự nào | Tốt |
| Chọn kích thước thật (khung dây 110 × 84 mm, vành trượt Ø34 mm…) | Tốt |
| Viết công thức vật lý, viết code đúng API | Tốt |
| **Quy quan hệ "tì vào", "đồng trục", "xuyên qua" thành toạ độ và góc xoay** | **Hay sai** |

Các lỗi đã gặp đều thuộc dòng cuối: piston lơ lửng, tay biên cắt qua trục, má cực chồi quá đỉnh nam châm, dây vắt ngang mặt số, lật trục khi đùn khối, sai dấu khi dời khung hình, texture lật 90°. Agent **biết** chổi than phải tì vào đáy vành trượt, nhưng tự tính ra `y = 0,1082` thì dễ sai một dấu hoặc một phép xoay.

## 2. Nguyên tắc

1. **Agent nói theo ý, công cụ lo phần số.** Agent đưa vào: loại bộ phận, kích thước, và quan hệ giữa các bộ phận. Công cụ tính ra ma trận đặt chỗ bằng hình học thuần tuý, không có LLM nào đọc văn bản hay đoán số.
2. **Agent không bao giờ gõ toạ độ hay góc tuyệt đối.** Con số duy nhất về vị trí là khoảng lệch dọc theo một ràng buộc đã nêu (`offset`, `angle`).
3. **Đổi kích thước thì mọi thứ tự đi theo.** Lắp ráp là một đồ thị quan hệ, nên khi tăng đường kính vành trượt, chổi than tự dịch xuống.
4. **Quy ước trục nằm trong công cụ:** y hướng lên, hệ tay phải, mét, radian. Agent không phải nhớ.
5. **Kế thừa thư viện 2D.** `ShapeObject` trong `fe/neviadlike_structure/objects/types.ts` đã có điểm neo (`points`) và bộ phận chuyển động (`parts`). Thiết kế 3D này mở rộng đúng ý đó.

## 3. Khái niệm

### 3.1. Loại bộ phận (part type)

Một loại bộ phận là một module trong thư viện, gồm:

- `type`: tên, ví dụ `slipRing`, `bearingBlock`, `coil`.
- `params`: schema tham số kèm đơn vị, giá trị mặc định và miền hợp lệ.
- `anchors(params)`: trả về các **điểm neo** có tên, tính theo tham số.
- `build(params, materials)`: trả về `THREE.Object3D`, gốc đặt ở khung toạ độ riêng của bộ phận.
- `meta`: mô tả ngắn để agent đọc, kèm ảnh mẫu (tuỳ chọn).

```ts
interface PartType<P> {
  type: string;
  description: string;
  params: ParamSchema<P>;            // { diameter: { unit: "m", default: 0.034, min: 0.005, max: 0.2 } }
  anchors(p: P): Record<string, Anchor>;
  build(p: P, m: MaterialKit): THREE.Object3D;
}
```

### 3.2. Điểm neo (anchor)

Một điểm neo là một **khung toạ độ cục bộ** gắn trên bộ phận:

```ts
interface Anchor {
  kind: "point" | "axis" | "face";
  origin: Vec3;   // vị trí trong khung của bộ phận
  dir: Vec3;      // face: pháp tuyến hướng ra ngoài; axis: chiều trục; point: hướng "đi ra"
  up?: Vec3;      // hướng tham chiếu vuông góc với dir, dùng để khoá phép xoay quanh dir
  extent?: { length?: number; radius?: number; size?: [number, number] };  // để kiểm tra "có vừa không"
}
```

Ví dụ:

| Bộ phận | Điểm neo |
|---|---|
| `slipRing` | `axis` (trục), `surface` (mặt trụ ngoài; kiểu `face`, tham số hoá theo góc) |
| `bearingBlock` | `bore` (trục lỗ), `foot` (mặt đáy) |
| `carbonBrush` | `tip` (đầu tì), `base` (đế) |
| `coil` | `axis` (trục quay, đi qua tâm hai cạnh ngắn), `normal` (pháp tuyến mặt khung), `leadA`, `leadB` |
| `basePlate` | `top` (mặt trên), cùng các điểm lưới đặt tên `top@x,z` |

Điểm neo có thể có **tham số**. Ví dụ `slipRing.surface@bottom` hay `surface@angle=90°` là điểm trên mặt trụ ở góc đó. Ký pháp chung là `id.anchor` hoặc `id.anchor@modifier`.

### 3.3. Bộ phận trong lắp ráp (instance)

```ts
{ id: "ring1", type: "slipRing", params: { diameter: 0.034, width: 0.011 }, material?: "copper" }
```

Mỗi instance có đúng **một ràng buộc đặt chỗ** nối nó với một bộ phận đã được đặt trước, hoặc với `ground` (gốc thế giới). Như vậy lắp ráp là một **cây**, nên bộ giải chỉ cần đi từ gốc ra, không phải giải hệ ràng buộc tổng quát.

### 3.4. Ràng buộc đặt chỗ (mate)

| `kind` | Ý nghĩa | Bậc tự do còn lại (khoá bằng tham số phụ) |
|---|---|---|
| `touch` | Hai mặt áp vào nhau: trùng gốc, `dir` ngược chiều | xoay quanh pháp tuyến (`angle`), trượt trên mặt (`slide: [u, v]`) |
| `coaxial` | Hai trục trùng nhau, cùng chiều (`flip` để ngược chiều) | dời dọc trục (`offset`), xoay quanh trục (`angle`) |
| `through` | Trục của A đi xuyên qua lỗ B (như `coaxial`, kèm kiểm tra bán kính) | như `coaxial` |
| `onto` | Đặt điểm của A lên mặt của B (vật đứng trên đế) | vị trí trên mặt (`at`), xoay quanh pháp tuyến |
| `offset` | Như `touch` nhưng cách một khoảng theo pháp tuyến | như `touch` |
| `fixed` | Dùng chung khung với B, cộng thêm một phép dời cục bộ (lối thoát cuối cùng) | không còn |

Cách tính (ví dụ `touch`): gọi khung neo của A là `F_a`, khung neo của B trong thế giới là `W·F_b`. Ta cần tư thế `X` của A sao cho

`X · F_a = W · F_b · Flip · R_n(angle) · T(slide, offset)`

trong đó `Flip` quay 180° quanh `up` để hai `dir` ngược nhau. Suy ra `X = W · F_b · Flip · R_n · T · F_a⁻¹`. Mọi `kind` khác đều là biến thể của công thức này, nên bộ giải chỉ khoảng vài trăm dòng và chạy như nhau mọi lần.

### 3.5. Khớp (joint)

Khớp khai báo những gì được phép **chuyển động** sau khi đã lắp. Khớp không phải là ràng buộc đặt chỗ.

| `kind` | Tham số | Ví dụ |
|---|---|---|
| `revolute` | điểm neo trục, giới hạn góc | rô-to quay trong gối đỡ |
| `prismatic` | điểm neo trục, hành trình | piston trong xi lanh |
| `gear` | hai khớp `revolute`, tỉ số | puli và dây đai |
| `rod` | hai đầu nối hai điểm neo trên hai bộ phận | tay biên giữa chốt khuỷu và piston |

Một khớp gắn với một **cụm con** (bộ phận cùng mọi thứ lắp vào nó). Ví dụ khớp `revolute` của rô-to kéo theo khung dây, vành trượt và tay quay. Các khớp `rod` được giải bằng công thức hình học đóng (cơ cấu tay quay – thanh truyền), nên engine chỉ cần điều khiển một góc.

Engine vật lý (trong `engines/`, theo luồng một chiều sẵn có) chỉ báo giá trị của khớp, ví dụ `metrics.joints.rotor = θ`. Lớp hiển thị đặt tư thế theo giá trị đó. Bộ phận không tự tính vật lý.

### 3.6. Dây nối và ống (route)

Dây điện, ống dẫn khí và dây đai là **đường đi giữa hai điểm neo**, không phải bộ phận đặt chỗ:

```json
{ "route": "w1", "from": "brush1.terminal", "to": "postRed.top", "via": [{ "on": "base.top" }], "radius": 0.0016, "material": "wireRed" }
```

Công cụ tự sinh đường cong: đi ra theo `dir` của điểm neo đầu, nằm sát mặt `via` nếu có, rồi đi vào theo `dir` của điểm neo cuối. Điều này loại bỏ lỗi "dây vắt ngang mặt số" mà không cần agent tính điểm trung gian.

## 4. Định dạng lắp ráp (JSON)

Đây là nguồn duy nhất của một vật thể lắp ráp. Agent ghi file này qua các tool, và người cũng đọc và sửa được trực tiếp.

```json
{
  "id": "may-phat-dien-xoay-chieu",
  "units": "m",
  "parts": [
    { "id": "base",  "type": "basePlate",      "params": { "size": [0.58, 0.024, 0.28] }, "place": { "kind": "onto", "a": "base.bottom", "b": "ground.top" } },
    { "id": "mag",   "type": "horseshoeMagnet","params": { "poleRadius": 0.058, "poleArc": 92, "length": 0.088 }, "place": { "kind": "onto", "a": "mag.bottom", "b": "base.top", "at": [0, 0] } },
    { "id": "brgL",  "type": "bearingBlock",   "params": { "boreDiameter": 0.012, "centerHeight": 0.135 }, "place": { "kind": "onto", "a": "brgL.foot", "b": "base.top", "at": [-0.098, 0] } },
    { "id": "brgR",  "type": "bearingBlock",   "params": { "boreDiameter": 0.012, "centerHeight": 0.135 }, "place": { "kind": "onto", "a": "brgR.foot", "b": "base.top", "at": [0.098, 0] } },
    { "id": "shaft", "type": "shaft",          "params": { "diameter": 0.012, "length": 0.42 }, "place": { "kind": "through", "a": "shaft.axis", "b": "brgL.bore", "offset": 0.012 } },
    { "id": "coil",  "type": "coil",           "params": { "length": 0.11, "width": 0.084, "turns": 200, "bundle": 0.013 }, "place": { "kind": "coaxial", "a": "coil.axis", "b": "shaft.axis", "offset": 0.0 } },
    { "id": "ring1", "type": "slipRing",       "params": { "diameter": 0.034, "width": 0.011 }, "place": { "kind": "coaxial", "a": "ring1.axis", "b": "shaft.axis", "offset": 0.128 } },
    { "id": "brush1","type": "carbonBrush",    "params": { "size": [0.008, 0.02, 0.0105] }, "place": { "kind": "touch", "a": "brush1.tip", "b": "ring1.surface@bottom" } }
  ],
  "joints": [
    { "id": "rotor", "kind": "revolute", "axis": "shaft.axis", "moves": ["shaft"] }
  ],
  "routes": [
    { "id": "w1", "from": "brush1.terminal", "to": "postRed.top", "via": [{ "on": "base.top" }], "radius": 0.0016, "material": "wireRed" }
  ]
}
```

Ghi chú:
- `moves: ["shaft"]` kéo theo cả cụm con lắp vào `shaft` (khung dây, vành trượt, tay quay).
- Vị trí trên mặt đế (`at`) là toạ độ 2D **trên mặt đó**, không phải toạ độ thế giới. Đây là chỗ duy nhất agent đưa con số về vị trí, và nó gắn với một mặt có tên.

## 5. Tool MCP (giai đoạn xây)

Đặt tên theo kiểu `neviad-code` / `neviad-draw` sẵn có, server mới là `neviad-assembly`.

| Tool | Vào | Ra |
|---|---|---|
| `part_types_list` | `category?` | Danh sách loại bộ phận và mô tả một dòng |
| `part_type_info` | `type` | Schema tham số, danh sách điểm neo (kind, ý nghĩa), ảnh mẫu |
| `assembly_create` | `id`, `title` | Lắp ráp rỗng có sẵn `ground` |
| `part_add` | `id`, `type`, `params`, `place` | Tư thế đã giải, bbox thế giới, và các điểm neo của bộ phận ở toạ độ thế giới |
| `part_update` | `id`, `params?`, `place?` | Như trên; các bộ phận phụ thuộc được đặt lại |
| `part_remove` | `id` | Danh sách bộ phận mồ côi (nếu có) |
| `joint_add` | `id`, `kind`, … | Cụm con mà khớp kéo theo |
| `route_add` | `id`, `from`, `to`, `via?`, `radius`, `material` | Chiều dài đường đi |
| `assembly_describe` | `id` | Cây lắp ráp dạng chữ: ai gắn vào ai, bằng ràng buộc gì |
| `assembly_export` | `id`, `format: "json" \| "three-module"` | File JSON (mục 4) hoặc module TS dựng sẵn cảnh |

Nguyên tắc trả lỗi để agent tự sửa được:
- Điểm neo không tồn tại → trả về danh sách điểm neo hợp lệ của bộ phận đó.
- Kiểu ràng buộc không hợp với kiểu điểm neo (ví dụ `coaxial` với một `face`) → nói rõ cần hai `axis`.
- Bộ phận đặt vào một bộ phận chưa có → báo thứ tự cần thêm.
- `through` mà trục to hơn lỗ → báo hai đường kính.
- Tham số ngoài miền hợp lệ → báo miền.

## 6. Thư viện bộ phận ban đầu

Rút từ hai máy đã dựng. Hầu hết đã có hình học sẵn trong `generator-model.ts`, chỉ cần tách ra và gắn điểm neo.

| Nhóm | Loại bộ phận |
|---|---|
| Đế và giá | `basePlate`, `bearingBlock`, `post`, `bracket` |
| Truyền động | `shaft`, `collar`, `crank`, `crankWeb`, `crankPin`, `flywheel`, `pulley`, `conRod` |
| Điện từ | `horseshoeMagnet`, `poleShoe`, `coil`, `slipRing`, `commutator`, `carbonBrush`, `brushHolder` |
| Mạch ngoài | `bindingPost`, `lampSocket`, `bulb`, `analogMeter`, `toggleSwitch` |
| Nhiệt | `alcoholLamp`, `flame`, `glassTube`, `cylinder`, `piston`, `displacer` |
| Dụng cụ thí nghiệm | `beaker`, `flask`, `testTube`, `stand`, `clamp` (khớp với `docs/object-catalog.md`) |

Mỗi loại kèm: tham số có đơn vị, giá trị mặc định lấy theo kích thước thật, điểm neo, và mã vật liệu theo bộ `MaterialKit` dùng chung (gỗ, nhôm, thép, đồng, đồng thau, bakelite, thuỷ tinh…).

## 7. Vị trí trong repo

```
fe/
  assembly-kit/
    core/          anchor.ts, solve.ts (giải ràng buộc), joints.ts, route.ts, materials.ts
    parts/         một file một loại bộ phận (giống object-library cho 2D)
    loader.ts      đọc JSON lắp ráp → THREE.Group, trả về tay cầm của các khớp
  scripts/
    assembly-bridge/   server MCP `neviad-assembly` (stdio), theo mẫu code-bridge / draw-bridge
  app/
    lap-rap-3d/        studio xem lắp ráp đang dựng (trang poll state như hai studio sẵn có)
```

Phần lõi (`core/`, `parts/`) không phụ thuộc React, nên server MCP trong Node gọi được trực tiếp để giải và trả kết quả mà không cần trình duyệt.

## 8. Lộ trình

| Giai đoạn | Nội dung | Xong khi |
|---|---|---|
| **1. Lõi** | `Anchor`, bộ giải `touch` / `coaxial` / `through` / `onto` / `fixed`, loader JSON | Dựng lại máy phát từ JSON, không có toạ độ thế giới nào gõ tay |
| **2. Thư viện** | Tách khoảng 15 bộ phận từ máy phát và động cơ Stirling | Hai máy dựng lại hoàn toàn bằng `part_add` |
| **3. Khớp và dây** | `revolute`, `prismatic`, `rod`, `route` | Động cơ Stirling chạy bằng một góc duy nhất do engine đưa ra |
| **4. Server MCP và studio** | `neviad-assembly` cùng trang `/lap-rap-3d` | Agent dựng một máy mới (ví dụ máy phát một chiều có cổ góp) chỉ qua tool |
| 5. Kiểm tra (sau) | `view` (chụp nhiều góc, nhiều thời điểm), `check` (va chạm, lơ lửng, quét chuyển động của khớp) | Ngoài phạm vi tài liệu này |

## 9. Ngoài phạm vi

- Giải hệ ràng buộc tổng quát (vòng kín, ràng buộc thừa). Lắp ráp chỉ là cây; vòng kín cơ cấu đi qua khớp `rod` với công thức đóng.
- Sửa từng đỉnh hay điêu khắc. Bộ phận mới thì viết thêm vào thư viện.
- Sinh mesh bằng AI (Hunyuan, TRELLIS). Có thể dùng làm loại bộ phận "tĩnh" sau này, nhưng không có điểm neo.

## 10. Câu hỏi mở

1. Điểm neo trên mặt cong (`surface@angle`): tham số hoá theo góc, hay cho cả `@bottom` / `@top` / `@front` theo trục thế giới?
2. Bộ phận có biến thể hình dạng (nam châm móng ngựa hay nam châm thẳng): tách thành hai loại, hay một loại kèm tham số `shape`?
3. Studio `/lap-rap-3d` dùng three.js như phần còn lại của `fe`, hay cần xuất cả sang Babylon?
4. Engine báo giá trị khớp qua `metrics.joints` có cần đổi hợp đồng trong `neviadlike_structure`, hay để riêng cho 3D?
