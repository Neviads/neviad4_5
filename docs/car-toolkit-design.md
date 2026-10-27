# Bộ tool dựng ô tô 3D bằng code

**Mục tiêu:** một chiếc ô tô 3D đẹp, dựng hoàn toàn bằng code. Người dựng là agent; agent chỉ gọi tool. **Viết tool trước, viết agent sau.**

**Tiêu chuẩn chất lượng:** nhìn nhanh mà mắt tự tách được vật thành hình cơ bản (hộp, trụ, cầu) thì chưa đạt.

Tài liệu liên quan:

- `docs/assembly-tool-design.md`: tầng lắp ráp, đã chạy (MCP `neviad-assembly`).
- `docs/che-tao-bang-code.md`: ánh xạ hành động chế tạo ngoài đời sang thao tác code.

## 0. Trạng thái: đã chạy trong MCP `neviad-assembly` (0.2)

Mọi tool ✅ và năm tool khó cho thân vỏ đã có. Chỗ nào khác với các mục dưới thì theo mục này.

- **Tạo hình:**
  - Đã có: `shape_lathe`, `shape_extrude`, `shape_sweep`, `shape_mirror`, `shape_pattern`, `shape_loft`, `shape_boolean`, `shape_round_edges`, `shape_groove`, `shape_split_region`, `anchor_define`.
  - Chưa làm: `shape_shell`, `shape_subdiv`, `part_save_as_type`, `section_report`.
- **Lõi hình khối:**
  - `manifold-3d` (WASM): Node nạp gói npm; trình duyệt nạp bản sao trong `fe/public/wasm`.
  - Boolean và khắc rãnh cần hình kín: lathe từ trục hoặc có `wall`, sweep có `caps`, loft có caps khác `open`.
- **Bo cạnh:** tự viết (`shapes/ops-solid.ts`), không dùng `smoothOut` của manifold (thử rồi, không bo được khối có mặt phẳng) hay Minkowski (đúng nhưng chậm: khoảng 11 giây cho 270 tam giác).
  - Chia mịn đều bằng manifold, rồi theo kiểu "lăn bi": đỉnh trong dải T = r·tan(θ/2) được đưa lên cung tròn bán kính r quanh trục cách hai mặt đúng r.
  - Góc ba mặt thành mảnh cầu. Với khối lồi, lấy ứng viên lún sâu nhất (giao các khối bo).
  - Cạnh thẳng ra đúng cung (selftest kiểm điểm giữa cung). Còn vài cạnh gãy ở chỗ chuyển tiếp góc và mảnh vụn do boolean sinh ra.
- **Loft:**
  - Mỗi mặt cắt được lấy mẫu lại theo độ dài cung từ đỉnh nóc, cùng chiều.
  - Nội suy Catmull-Rom đồng nhất (cùng tham số), nên vòng trung gian phẳng.
  - `symmetric` nhận nửa biên dạng.
- **Khắc rãnh:** đường là giao mặt với mặt phẳng hoặc polyline chiếu lên mặt. Rãnh là chồng ống tròn trừ boolean.
- **Tách vùng:** đường bao phải lồi. Cắt từng tam giác bằng Sutherland–Hodgman, làm dày theo pháp tuyến, khâu viền.
- **Vật liệu, decal, đo, cảnh, render, xuất `.glb`:** như mục 3. Studio dùng HDRI trong `fe/public/hdri`.
- **Chưa có:** bước kiểm tra tự động.

## 1. Nguyên tắc chung

1. **Agent nói "cái gì", tool lo "như thế nào".** Agent đưa ý định, số đo thật và quan hệ; tool sinh hình học. Agent không đặt từng đỉnh lưới.
2. **Khai báo, không ra lệnh tuần tự.** Mỗi vật là một **cây tính năng** (feature tree: danh sách các bước dựng có tên) lưu trong JSON. Sửa một tham số thì dựng lại cả cây. Không có trạng thái ẩn kiểu "đang chọn gì".
3. **Mặc định mang sẵn tay nghề.** Không có cạnh sắc tuyệt đối: mọi hình được bo tối thiểu `minEdgeRadius = 0.5 mm`, trừ khi agent tắt. Mỗi vật liệu đi kèm cách hoàn thiện của nó.
4. **Mọi kết quả trả về bằng số và chữ:** khung bao, điểm neo, cảnh báo. Ảnh chỉ để soát lần cuối.
5. **Lỗi phải nói rõ cách sửa:** tham số ngoài miền, biên dạng tự cắt, boolean ra lưới hở, tên tham chiếu sai.
6. **Đơn vị:** mét và độ. Trục y hướng lên, xe chạy theo +x, bên trái xe là +z. Quy ước giống `neviad-assembly`.

## 2. Mô hình dữ liệu

```ts
// Một hình là một nút trong cây tính năng, có id duy nhất trong bản lắp ráp
interface ShapeNode {
  id: string;
  op: "lathe" | "extrude" | "sweep" | "loft" | "subdiv" | "mirror" | "boolean" | "roundEdges"
    | "shell" | "groove" | "splitRegion" | "pattern";
  params: Record<string, unknown>;
  inputs?: string[];      // id các hình đầu vào (boolean, mirror, shell…)
  material?: string;      // id vật liệu hoặc tên preset
  regions?: Record<string, RegionRef>; // vùng có tên trên mặt, để gán vật liệu hoặc tách
}

// Đường 2D: điểm, kèm bo góc tuỳ chọn (r) hoặc cung, dùng chung cho lathe, extrude, sweep, loft
type Path2D = { pts: [number, number][]; round?: number[]; closed?: boolean };
```

- Một hình trở thành **bộ phận** khi được `part_add` vào bản lắp ráp với `type: "shape:<id>"`.
- Từ đó nó dùng toàn bộ ràng buộc, khớp và dây của `neviad-assembly`.
- Hình học dựng ở Node: `manifold-3d` cho boolean, phần còn lại tự viết bằng toán lưới. Cùng đoạn code đó chạy trong trình duyệt để render.

---

## 3. Danh sách tool

### A. Tạo hình

#### 1. `shape_lathe`
Xoay một biên dạng quanh trục y.

| Input | Ý nghĩa |
|---|---|
| `profile: Path2D` | Các điểm `[r, y]`. Nếu có `wall` thì chỉ là mặt ngoài |
| `wall?` | Độ dày thành. Tool tự sinh mặt trong và mép bo nối hai mặt |
| `lip?: "round" \| "flat" \| "rolled"` | Kiểu miệng |
| `segments?` | Số đoạn quanh trục, mặc định tự chọn theo bán kính |
| `angle?` | Quay một phần, như nửa ống |

**Trả về:** khung bao. Điểm neo tự sinh: `axis`, `bottom`, `top`, `rim`, và `surface@…`.

**Dùng cho:** lốp (mặt cắt lốp theo thông số 205/55 R16), la-zăng, đèn tròn, ống xả, núm.

#### 2. `shape_extrude`
Đùn một đường bao 2D theo pháp tuyến.

| Input | Ý nghĩa |
|---|---|
| `outline: Path2D` | Đường bao kín, hoặc kèm `holes` |
| `depth` | Chiều dày đùn |
| `edgeRadius` | Bo hai mép trên và dưới |
| `taper?` | Thu nhỏ dần theo chiều đùn |
| `plane?: "xy" \| "xz" \| "yz"` | Mặt phẳng vẽ |

**Trả về:** khung bao. Điểm neo: `front`, `back`, mặt bên theo từng đoạn của đường bao, `center`.

**Dùng cho:** ba-đờ-sốc (cản), ốp, tay nắm cửa, biển số, giá gương.

#### 3. `shape_sweep`
Cho một mặt cắt chạy dọc một đường 3D.

| Input | Ý nghĩa |
|---|---|
| `section: Path2D` | Mặt cắt |
| `path` | Polyline 3D, Bezier, hoặc `onSurface: {shape, curve}`: đường nằm trên mặt một hình khác |
| `twist?`, `scale?` | Xoắn và thu nhỏ dọc đường |
| `caps?` | Bịt hai đầu, có bo |

**Trả về:** chiều dài, điểm neo `start` và `end` (có hướng).

**Dùng cho:** gioăng cao su quanh kính, viền chrome, cần gạt mưa, ống phanh, dây.

#### 4. `shape_loft` ⭐
Nối mượt nhiều mặt cắt ngang thành một mặt liền. Đây là tool dựng **thân xe**.

| Input | Ý nghĩa |
|---|---|
| `sections: {x, profile: Path2D}[]` | Mặt cắt ngang (trong mặt phẳng yz) đặt tại các vị trí x dọc xe |
| `spine?` | Đường xương sống nếu thân không thẳng |
| `continuity: "G1" \| "G2"` | Độ mượt: G1 liền tiếp tuyến, G2 liền cả độ cong |
| `caps: "round" \| "flat" \| "open"` | Cách đóng hai đầu |
| `samePointCount` | Tool tự lấy mẫu lại để mọi mặt cắt có cùng số điểm và tương ứng nhau |

**Trả về:** khung bao, và bảng kích thước tại từng mặt cắt (rộng, cao) để agent so với số đo thật.

**Cảnh báo:** báo khi hai mặt cắt kề nhau đổi dáng quá gắt, hoặc khi mặt tự cắt.

#### 5. `shape_mirror`
Đối xứng qua một mặt phẳng, mặc định z = 0, và hàn đường nối giữa.

| Input | Ý nghĩa |
|---|---|
| `input` | Hình cần đối xứng |
| `plane?` | Mặt phẳng đối xứng |
| `weld?` | Hàn đường nối, mặc định `true` |

Agent chỉ cần mô tả **nửa xe**.

#### 6. `shape_boolean`
Cộng, trừ hoặc giao các hình bằng `manifold-3d`.

| Input | Ý nghĩa |
|---|---|
| `op: "union" \| "subtract" \| "intersect"` | Phép toán |
| `target` | Hình bị tác động |
| `tools[]` | Các hình dùng để cộng, trừ hoặc giao |
| `roundNewEdges?` | Bo luôn các cạnh mới sinh ra |

**Trả về:** số mặt, lưới có kín không, các cạnh mới đặt tên `<id>.cut.<n>` để dùng ở tool 7.

**Dùng cho:** khoét hốc bánh, ô kính, hốc đèn, lỗ lưới tản nhiệt.

#### 7. `shape_round_edges` ⭐
Bo cạnh sau khi dựng.

| Input | Ý nghĩa |
|---|---|
| `input` | Hình cần bo |
| `select` | `{angleOver: deg}` (mọi cạnh gãy quá ngưỡng), hoặc `{edges: [...]}` (cạnh có tên) |
| `radius` | Bán kính bo |
| `profile?: "round" \| "chamfer"` | Bo tròn hay vát |

**Cách làm:**
- Bo theo góc trên lưới: chèn vòng cạnh rồi làm mượt cục bộ.
- Khi cần chuyển tiếp mềm giữa hai khối: dựng bằng hàm khoảng cách (SDF) với hợp mềm (smooth union), rồi marching cubes cục bộ.

#### 8. `shape_shell`
Biến khối đặc thành vỏ có độ dày.

| Input | Ý nghĩa |
|---|---|
| `input` | Hình gốc |
| `thickness` | Độ dày vỏ |
| `openFaces?` | Mặt nào để hở |
| `side: "in" \| "out"` | Dày vào trong hay ra ngoài |

**Dùng cho:** tôn thân xe (thấy được độ dày ở mép hốc bánh và khe cửa), vỏ gương.

#### 9. `shape_groove` ⭐
Khắc rãnh dọc một đường nằm trên mặt.

| Input | Ý nghĩa |
|---|---|
| `input` | Hình bị khắc |
| `curve` | Đường trên mặt: giao của mặt với một mặt phẳng, hoặc polyline chiếu lên mặt |
| `width`, `depth` | Mặc định khe cửa xe 3,5 mm × 6 mm |
| `edgeRadius` | Bo mép rãnh |

**Trả về:** độ dài khe. Có thể tách hai bên khe thành hai vùng (`regions`).

**Dùng cho:** khe cửa, khe nắp capo, khe cốp, khe nắp bình xăng. Đây là chi tiết nhỏ nhưng là dấu hiệu "xe thật" mạnh nhất.

#### 10. `shape_split_region`
Tách một vùng của mặt thành hình riêng, giữ đúng độ cong của mặt gốc.

| Input | Ý nghĩa |
|---|---|
| `input` | Hình gốc |
| `boundary` | Đường bao vùng trên mặt |
| `offset?` | Dời vùng theo pháp tuyến: âm để thụt vào, như kính lùi so với tôn |
| `thickness?` | Độ dày của hình tách ra |

**Dùng cho:** kính chắn gió và kính cửa ôm đúng thân xe, ốp nhựa đen ở gầm và vòm bánh.

#### 11. `shape_pattern`
Lặp một hình.

| Input | Ý nghĩa |
|---|---|
| `input` | Hình gốc |
| `kind: "linear" \| "radial" \| "onSurface"` | Lặp theo đường thẳng, vòng tròn, hoặc trên mặt |
| `count`, `step` hoặc `angle` | Số lần và khoảng cách |
| `merge?` | Gộp các bản sao vào hình gốc bằng boolean |

**Dùng cho:** nan la-zăng (radial 5 nan rồi union), gai lốp, lỗ lưới tản nhiệt, ốc bánh.

#### 12. `shape_subdiv`
Lưới thô cộng làm mượt Catmull-Clark.

| Input | Ý nghĩa |
|---|---|
| `cage` | Đỉnh và mặt của lưới thô, hoặc một hình có sẵn làm lồng |
| `creases` | Cạnh giữ sắc, kèm độ sắc từ 0 đến 1 |
| `levels` | Số lần làm mượt |

Đây là cách thay thế `shape_loft` khi mặt quá phức tạp, như vùng giao giữa cột A, nắp capo và chắn bùn.

### B. Vật liệu và hoàn thiện

#### 13. `material_preset`
Trả về danh sách preset kèm tham số chỉnh được. Mỗi preset là một `MeshPhysicalMaterial` cấu hình sẵn:

| Preset | Cấu hình chính |
|---|---|
| `carPaint` | Màu nền, vảy kim loại (normal map nhiễu và `metalness` cục bộ), `clearcoat` 1, `clearcoatRoughness` 0,03 |
| `chrome` | `metalness` 1, `roughness` 0,05 |
| `brushedAluminium` | Có `anisotropy` (phản chiếu kéo dài theo hướng chải) |
| `tireRubber` | Nhám, có `sheen`, đen ngả xám |
| `glassTinted` | `transmission`, `ior` 1,52, `attenuationColor` |
| `lampLens` | Kính trong có vân lăng kính, đi với tấm phản quang chrome bên trong |
| `plasticTextured` | Nhựa nhám, vân sần dạng normal map |
| `emissiveLight` | Đèn phát sáng có cường độ (dùng cho bloom) |
| `asphalt` | Mặt đường nhựa |

#### 14. `material_assign`
Gán vật liệu cho một bộ phận, hoặc cho một vùng (`regions`) của bộ phận.

| Input | Ý nghĩa |
|---|---|
| `target` | Bộ phận hoặc vùng (`part.region`) |
| `preset` | Tên preset |
| `overrides?` | Ghi đè tham số, ví dụ `{color: "#b3121a"}` |

#### 15. `texture_procedural`
Sinh texture bằng code (canvas hoặc shader), trả id để gắn vào vật liệu.

| Input | Ý nghĩa |
|---|---|
| `kind` | `noise`, `flakes`, `tread` (gai lốp dạng normal map theo chu vi), `grain`, `scratches`, `prismLens` |
| `scale`, `seed`, `strength` | Tỉ lệ, hạt giống ngẫu nhiên, cường độ |

#### 16. `decal_add`
Chiếu một hình 2D (chữ, logo, biển số) lên mặt bộ phận.

| Input | Ý nghĩa |
|---|---|
| `target` | Bộ phận |
| `at` | Điểm neo hoặc toạ độ trên mặt |
| `size`, `angle` | Kích thước, góc xoay |
| `content` | `{text, font, color}` hoặc SVG nội tuyến |
| `mode: "print" \| "emboss" \| "engrave"` | In phẳng, nổi, hay khắc chìm |

**Dùng cho:** chữ trên hông lốp, logo, biển số, vạch trên kính.

### C. Lắp ráp (mở rộng `neviad-assembly`)

#### 17. `part_add`, `joint_add`, `couple`
Đã có. Thêm `type: "shape:<id>"` để đưa hình tự dựng vào lắp ráp.

#### 18. `anchor_define`
Đặt điểm neo có tên trên một hình tự dựng.

| Input | Ý nghĩa |
|---|---|
| `shape` | Hình |
| `name` | Tên điểm neo |
| `kind: "point" \| "axis" \| "face"` | Loại điểm neo |
| `from` | Tâm vòm hốc bánh (tự tìm từ cạnh boolean), tâm một vùng, toạ độ, hoặc giao của mặt với một tia |

**Ví dụ:** `body.wheelFL` (trục bánh trước trái), `body.mirrorL`, `body.doorHingeL`.

#### 19. `part_save_as_type`
Lưu một cụm đã dựng thành loại bộ phận mới, có tham số và điểm neo công khai.

| Input | Ý nghĩa |
|---|---|
| `assembly` | Bản lắp ráp nguồn |
| `name` | Tên loại mới |
| `exposeParams` | Tham số cho chỉnh khi dùng lại |
| `exposeAnchors` | Điểm neo công khai |

**Ví dụ:** dựng `wheel` (lốp, la-zăng, ốc, đĩa phanh) một lần rồi gắn vào 4 chỗ.

### D. Đo bằng số

Phục vụ bước dựng, không phải bước kiểm tra.

#### 20. `measure`
Đo và trả về số.

| Input | Trả về |
|---|---|
| `bounds` của bộ phận hoặc cả xe | Dài, rộng, cao |
| `distance(a, b)` | Khoảng cách giữa hai điểm neo |
| `gap(a, b)` | Khe hở nhỏ nhất giữa hai bộ phận |
| `clearance` | Độ cao gầm |
| `wheelbase`, `track` | Chiều dài cơ sở, vết bánh |

So sánh với `spec` agent khai báo, ví dụ `{length: 4.3, wheelbase: 2.6}`, và trả về chênh lệch.

#### 21. `section_report`
Cắt hình bằng một mặt phẳng.

| Input | Trả về |
|---|---|
| `target`, `plane` (vd `{axis: "x", at: 1.0}`) | Đường cắt dạng polyline số, cùng rộng và cao |
| `svg?` | Kèm SVG đường cắt (tuỳ chọn) |

Agent soát dáng loft bằng số, không cần ảnh 3D.

### E. Cảnh và render

#### 22. `scene_environment`
Chọn HDRI: `studio`, `street`, `overcast`, `sunset`. Chỉnh cường độ và góc xoay. HDRI nhúng sẵn trong repo (Poly Haven, CC0).

#### 23. `scene_stage`
Chọn nền: `studioCyc` (phông cong liền sàn), `road`, `glossyFloor`. Có bóng tiếp xúc mềm dưới bánh.

#### 24. `render_view`
Render một góc nhìn chất lượng cao.

| Input | Ý nghĩa |
|---|---|
| `camera` | `threeQuarterFront`, `side`, `rear`, `top`, `detail:{part}` |
| `size` | Kích thước ảnh |
| `quality: "preview" \| "final"` | `final` bật AO, bloom cho đèn, khử răng cưa cao |

**Trả về:** ảnh PNG. Cơ chế giống `assembly_view`: trang trình duyệt render rồi gửi ảnh về.

#### 25. `export`
Xuất xe để dùng ở nơi khác.

| Input | Ý nghĩa |
|---|---|
| `format: "glb" \| "json"` | `json` là cây tính năng cộng lắp ráp, để route dựng lại; `glb` để dùng ngoài |
| `path` | Đường dẫn trong repo |

---

## 4. Thứ tự làm

### Giai đoạn 1: bánh xe đẹp
Bài thử nhỏ, chứng minh được cả chuỗi tool.

**Tool:** 1 `lathe`, 3 `sweep`, 6 `boolean`, 7 `round_edges`, 11 `pattern`, 13–15 vật liệu, 22–24 cảnh và render.

**Kết quả:** bánh 205/55 R16 gồm lốp có gai và chữ hông lốp, la-zăng 5 nan có bo, ốc bánh, đĩa phanh. Đặt trên phông studio, HDRI, bóng tiếp xúc.

### Giai đoạn 2: thân xe
**Tool:** 4 `loft`, 5 `mirror`, 8 `shell`, 9 `groove`, 10 `split_region`, 18 `anchor_define`, 20–21 đo.

**Kết quả:** thân sedan loft từ 6–8 mặt cắt, khoét hốc bánh và bo mép, có khe cửa và khe capo, kính tách từ thân, ốp nhựa gầm. Bốn bánh từ giai đoạn 1 gắn vào đúng `wheelXX`.

### Giai đoạn 3: hoàn chỉnh
**Tool:** 2 `extrude`, 16 `decal`, 19 `save_as_type`, 12 `subdiv` (nếu loft chưa đủ), 25 `export`.

**Kết quả:** đèn có chao và phản quang, gương, tay nắm, cần gạt, lưới tản nhiệt, biển số, logo. Bánh lăn theo khớp, cửa mở được. Xuất cho route `/va-cham-hai-xe` thay hai xe hộp hiện tại.

## 5. Rủi ro và cách xử lý

| Tool | Rủi ro | Hướng xử lý |
|---|---|---|
| `shape_loft` | Mặt cắt không tương ứng điểm nên mặt bị xoắn; dáng gãy giữa các mặt cắt | Lấy mẫu lại theo độ dài cung; nội suy spline G2 dọc x; báo lỗi khi tự cắt |
| `shape_round_edges` sau boolean | Bo cạnh tổng quát trên lưới rất khó | Bo theo góc trên lưới cho cạnh đơn giản; SDF smooth union cục bộ cho chỗ giao; hoặc `boolean` với `roundNewEdges` dùng dao đã bo sẵn |
| `shape_groove`, `split_region` | Đường trên mặt cong khó định nghĩa và khó cắt sạch | Định nghĩa đường bằng giao của mặt với mặt phẳng hoặc chiếu polyline; cắt bằng boolean với dải sweep mỏng |
| Hiệu năng | Lưới dày làm render và dựng lại chậm | Dựng lại có cache theo nút trong cây tính năng; mức chi tiết riêng cho xem trước và cho render cuối |
