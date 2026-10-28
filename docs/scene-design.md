# Bộ tool phối cảnh chung: thiết kế

## 0. Trạng thái: bản thiết kế, chưa có code
- Chưa có tool cảnh nào trong MCP `neviad-assembly` 0.2.0. Cái đang gọi là "cảnh" chỉ là `SceneSpec` (`environment`, `stage`, `exposure`) gắn vào **một** bản lắp ráp.
- Tài liệu này chốt mô hình cảnh chung cho mọi thang đo (§3–§12) và hợp đồng tham số của 4 tool giai đoạn 1 (§13).
- Việc đầu tiên không phải cảnh mới, mà là sửa lỗi đang thấy ở `/lap-rap-3d`: thanh trượt `xeA (prismatic)` hiện "0.0 mm" với miền ±10 cm (§12.1, §14.4).
- Hướng dẫn agent dùng tool phải viết vào `fe/scripts/assembly-bridge/instructions.mjs`, cùng chỗ với các tool khác; nếu chỉ thêm tool mà không thêm hướng dẫn thì agent sẽ không gọi.

## 1. Vấn đề
Thí nghiệm vật lý trải trên mọi thang đo:
- **nguyên tử:** 10⁻¹⁰ m, femto giây;
- **phòng thí nghiệm:** 1 m, giây;
- **hệ hành tinh:** 10¹¹ m, năm.

Cuối cùng tất cả chỉ là **thực thể, đèn, máy quay và thời gian** trong một renderer 3D. Vì vậy làm được **một bộ tool phối cảnh chung**. Nhưng bộ tool phải **tự quyết những gì hợp với mắt người xem**, thay vì bắt agent tính từng con số.

### Lỗi đang thấy ở `/lap-rap-3d` với hai chiếc sedan
| Thấy gì | Vì sao | Thiếu gì |
|---|---|---|
| Thanh trượt `xeA (prismatic)` ghi **"0.0 mm"**, kéo hết cỡ chỉ được ±10 cm | Trang dùng một miền và đơn vị cố định cho mọi khớp trượt (`[-0.1, 0.1]` m, hiện bằng mm), không biết cảnh là hai chiếc xe trên đường 24 m | Cảnh không có **thang đo**; giao diện không suy đơn vị và miền từ kích thước vật |
| Máy quay chúc từ trên xuống, xe đỏ bị cắt mất nửa, xe xanh nằm xa | Máy quay tự đặt theo khung bao cả cảnh, nhìn theo một hướng cố định | Không có **chủ thể** và **luật bố cục**; agent không nói được "cần thấy hai đầu xe sắp chạm nhau" |
| Không có gì cho biết xe to bao nhiêu, đường dài bao nhiêu | Không có vật tham chiếu, thước tỉ lệ, nhãn | Không có **chú thích tỉ lệ** |
| Nhãn khớp là tên kỹ thuật ("prismatic"), không phải đại lượng thí nghiệm | Giao diện lộ cấu trúc lắp ráp | Cảnh cần **đại lượng cho người xem** (vị trí xe A, km/h), không phải tên khớp |

## 2. Nguyên tắc
1. **Agent nói ý định, tool quyết con số.** Agent khai báo:
   - chủ thể là gì;
   - muốn người xem thấy điều gì ("hai xe lao vào nhau", "Trái Đất quay quanh Mặt Trời", "phân tử khí va vào thành");
   - người xem là ai (học sinh lớp 8, lớp 10…).

   Tool chọn thang đo, đơn vị hiển thị, góc máy, khoảng nhìn, kiểu vẽ, mức phóng đại.
2. **Bên trong luôn dùng SI thật** (mét, giây, kg), để vật lý luôn đúng. **Hiển thị là một lớp riêng:** đơn vị, làm tròn, phóng đại, tỉ lệ thời gian. Lớp này không bao giờ đổi số liệu vật lý.
3. **Phóng đại thì phải khai báo và ghi chú.** Hành tinh to ×1000 hay hạt nhân to ×10⁴ để thấy được là chấp nhận được, miễn cảnh tự ghi trên màn hình. Học sinh không được hiểu sai tỉ lệ thật.
4. **Kiểu vẽ theo mục đích, không bắt mọi thứ phải "thật":**
   - `realistic` cho vật đời thường (xe, máy, dụng cụ);
   - `schematic` cho sơ đồ kiểu sách giáo khoa;
   - `symbolic` cho thứ không nhìn thấy được (nguyên tử, trường, tia).
5. **Tự kiểm khả năng nhìn** như kiểm hình học: chủ thể có lọt khung không, có bị che không, có quá nhỏ không, chữ có đè nhau không.

## 3. Mô hình dữ liệu
```ts
interface SceneDoc {
  id: string;
  title: string;
  intent: { subject: string[]; show: string; audience?: string };  // vd subject ["xeA", "xeB"], show "hai xe va nhau trực diện"
  scale: ScaleProfile;            // tool tự suy, agent ghi đè được
  time: { scale: number; unit: "fs" | "ns" | "ms" | "s" | "min" | "h" | "day" | "year" };   // 1 s xem = scale × unit
  style: "realistic" | "schematic" | "symbolic";
  environment: EnvironmentRef;    // phòng thí nghiệm, đường, chân không, trời sao, lưới…
  entities: Entity[];
  cameras: Camera[];              // có tên; camera đầu tiên là mặc định
  lights?: Light[];               // bỏ trống = theo style và environment
  annotations: Annotation[];
  readouts: Readout[];            // đại lượng hiện cho người xem (vị trí, vận tốc, năng lượng…)
}

interface ScaleProfile {
  /** cỡ đặc trưng của chủ thể (m): suy từ khung bao, vd 4,4 m cho xe, 1e-10 cho nguyên tử, 1,5e11 cho quỹ đạo Trái Đất */
  characteristic: number;
  /** đơn vị hiển thị cho độ dài, vận tốc, thời gian (tự chọn theo characteristic và chuyển động) */
  units: { length: "pm" | "Å" | "nm" | "µm" | "mm" | "cm" | "m" | "km" | "Mm" | "AU" | "ly"; speed: string; time: string };
  /** phóng đại có chủ đích, luôn được ghi chú trên màn hình */
  exaggerate?: { entity: string; quantity: "radius" | "thickness" | "displacement"; factor: number; note: string }[];
}

type Entity =
  | { kind: "assembly"; id: string; ref: string; place: Placement }   // bản lắp ráp có sẵn
  | { kind: "primitive"; id: string; shape: "sphere" | "box" | "cylinder" | "ring" | "arrow"; size: number[]; place: Placement; look: Look }
  | { kind: "instanced"; id: string; count: number; shape: "sphere" | "point"; radius: number; region: Region; look: Look }   // khí, tinh thể, đám sao
  | { kind: "field"; id: string; source: string; show: "arrows" | "lines" | "isosurface"; density: number }
  | { kind: "trail"; id: string; follow: string; length: number };
```
- `Placement` dùng lại các kiểu ghép đã có (`onto`, `touch`, `coaxial`…). Cảnh là một bản lắp ráp ở cấp cao hơn.
- `assembly` dùng lại mọi bản lắp ráp và cụm đã dựng.

## 4. Thang đo và đơn vị: tool tự quyết
### 4.1 `scale_auto`, chạy mỗi khi cảnh đổi
1. **Cỡ đặc trưng L:** khung bao các thực thể trong `intent.subject`, không phải cả cảnh. Đường dài 24 m không được kéo thang đo theo.
2. **Cỡ chuyển động D:** hành trình dự kiến, lấy từ `simulate` hoặc giới hạn khớp. Hai xe chạy khoảng 15 m.
3. **Đơn vị độ dài:** chọn sao cho số hiển thị nằm khoảng 0,1–1000 (theo `max(L, D)`).
   - xe: m;
   - giọt nước, sợi tóc: mm;
   - nguyên tử: Å hoặc pm;
   - Trái Đất – Mặt Trăng: Mm hoặc km;
   - hệ Mặt Trời: AU.
4. **Đơn vị vận tốc:** theo đời thường của chủ thể (xe: km/h; con lắc: m/s; hành tinh: km/s; phân tử khí: m/s). Có bảng theo loại chủ thể, agent ghi đè được.
5. **Thang thời gian:** chọn sao cho hiện tượng chính diễn ra trong 3–15 giây xem.
   - va chạm xe: 1×, hoặc 0,25× cho chậm;
   - một vòng quỹ đạo Trái Đất: 1 năm thành 10 giây xem;
   - dao động phân tử: femto giây thành giây.
6. **Miền của thanh trượt và đồ thị:** suy từ D và đơn vị. Khớp `xeA` sẽ trượt khoảng ±12 m (theo chiều dài đường), hiện bằng m, không còn ±10 cm hiện bằng mm.

Kết quả ghi vào `scene.scale` và báo lại cho agent:
```
Thang đo: chủ thể xeA + xeB, cỡ đặc trưng 4,4 m, chuyển động ~15 m
→ độ dài m, vận tốc km/h, thời gian s (1×); thanh trượt xeA −12…12 m
```

### 4.2 Nhiều thang trong một cảnh
- Ví dụ: xi-lanh tính bằng cm, phân tử khí bên trong bằng nm.
- Mỗi nhóm thực thể có thang riêng, đặt trong một **ô phóng to** (inset) có khung, nhãn "×10⁶" và đường nối tới vị trí trong cảnh lớn.
- Tool `inset_add {region, magnify}` sinh máy quay phụ và khung vẽ.

### 4.3 Phóng đại
- **`exaggerate {entity, quantity, factor}`:** tool đề xuất khi thực thể chiếm dưới khoảng 4 px trên màn hình ở góc máy mặc định. Ví dụ hành tinh ở thang AU.
- **Ghi chú tự sinh** ở góc màn hình: "Bán kính hành tinh phóng to 1000 lần; khoảng cách đúng tỉ lệ".
- Phóng đại **chỉ ảnh hưởng hiển thị.** Va chạm và vật lý dùng kích thước thật; nếu cần thì dùng kích thước phóng đại, nhưng phải khai báo riêng.

## 5. Bố cục và máy quay: tool tự quyết
### 5.1 `camera_auto {intent}`
**Đầu vào:** chủ thể, kiểu hiện tượng (`approach`: hai vật tiến lại; `orbit`: quay quanh; `fall`: rơi; `oscillate`: dao động; `flow`: dòng chảy; `detail`: một bộ phận), vùng màn hình bị giao diện che (bảng điều khiển, thanh trượt).

**Luật:**
| Luật | Áp dụng |
|---|---|
| Chủ thể chiếm 50–75% khung theo chiều quan trọng | Hai xe: khoảng cách giữa hai xe cộng thân xe vừa khung ngang |
| Hướng chuyển động chính song song mặt phẳng ảnh | Va chạm trên đường: nhìn ngang hoặc 3/4 thấp, không nhìn từ trên xuống thẳng trục đường |
| Không cắt chủ thể ở mọi thời điểm của hiện tượng | Dùng quỹ đạo dự kiến từ `simulate`: lấy khung bao trên cả quá trình, không chỉ lúc đầu |
| Tránh vùng giao diện che | Lệch tâm sao cho chủ thể nằm trong vùng an toàn |
| Đường chân trời và mặt đất ở 1/3 dưới, không nghiêng | Cảnh có mặt đất |
| Góc nhìn ngang mắt cho vật đời thường, góc xa cao cho hệ lớn | Xe: cao 1,2–3 m; hệ hành tinh: nghiêng 20–30° so với mặt quỹ đạo |
| Trường nhìn 30–45°; vật nhỏ thì đến gần, không dùng tele quá hẹp | Tránh méo và cảm giác "mô hình đồ chơi" |

**Đầu ra:** máy quay có tên `main`, kèm lý do (để agent và người xem hiểu), và các máy quay phụ gợi ý (`side`: nhìn ngang để đo; `follow:<id>`: bám vật; `closeup:<id>`).

### 5.2 Máy quay theo thời gian
- `camera_add {name, mode: fixed | follow | orbit | track, target, offset, fov}`.
- `camera_cut {at: event | time, to}`: chuyển máy theo sự kiện. Ví dụ "khi xeA chạm xeB thì chuyển `closeup`".
- Mặc định của cảnh va chạm: `main` đứng yên đủ rộng; tuỳ chọn `follow` giữa hai xe.

## 6. Kiểu vẽ, môi trường, ánh sáng
| `style` | Vật liệu | Nền | Đèn | Chữ, chú thích |
|---|---|---|---|---|
| `realistic` | PBR, preset hiện có | HDRI, phòng, đường | Studio hoặc HDRI, bóng mềm | Ít, nhỏ |
| `schematic` | Màu phẳng có viền, đổ bóng nhẹ | Trắng hoặc lưới | Đèn đều, không loá | Nhiều, nhãn mũi tên |
| `symbolic` | Màu quy ước (CPK cho nguyên tử, đỏ/xanh cho điện tích) | Tối hoặc chân không | Phát sáng nhẹ | Ký hiệu, đơn vị |

- **Môi trường dựng sẵn, có điểm neo:** `lab-room` (bàn, tường, kệ), `road` (đường có làn, vạch), `classroom`, `space` (trời sao, không mặt đất), `void-grid` (lưới cho sơ đồ), `table-top`.
  - Môi trường **tự co theo thang đo**: đường dài theo hành trình xe; bàn vừa vật.
- **Đèn:** mặc định theo kiểu vẽ. `light_add` khi cần nhấn mạnh, ví dụ đèn chiếu vào điểm va chạm.

## 7. Chú thích và đại lượng cho người xem
| Tool | Làm gì |
|---|---|
| `annotation_add {kind, target, …}` | `label` (tên vật), `arrow` (vectơ vận tốc, lực, gắn vào vật; độ dài theo giá trị, có thang), `dimension` (thước đo giữa hai điểm neo), `scale_bar` (thước tỉ lệ ở góc), `note` (ghi chú phóng đại, tỉ lệ thời gian) |
| `readout_add {name, quantity, unit?, format?}` | Đại lượng hiện trên bảng: `velocity(xeA).x`, `momentum(all).x`, `energy.kinetic`, `distance(xeA, xeB)`; đơn vị theo `scale` |
| `control_add {name, binds, range?}` | Thanh trượt cho người xem, gắn vào thông số: khối lượng, vận tốc đầu, e, μ. Nhãn bằng tên thí nghiệm ("Khối lượng xe A"), miền và đơn vị tự suy, không lộ "prismatic" |

Thanh trượt khớp kiểu kỹ thuật như hiện nay chỉ dành cho chế độ dựng của agent, không hiện cho học sinh.

## 8. Kiểm tra khả năng nhìn
`check_view {camera?, at?: thời điểm | sự kiện}` chạy hình học, không cần render ảnh:
| Kiểm tra | Báo |
|---|---|
| Chủ thể trong khung | "xeA ra khỏi khung lúc t = 1,4 s (sau va chạm)" |
| Kích thước trên màn hình | "phanTuKhi cao 0,8 px: quá nhỏ, cần ô phóng to hoặc phóng đại" |
| Bị che | "xeB bị bảng điều khiển che 35%" (dùng vùng an toàn của giao diện) |
| Chữ và mũi tên đè nhau | "nhãn xeA và vectơ vận tốc chồng nhau" |
| Đơn vị và số | "thanh trượt xeA: miền 0,2 m so với hành trình 15 m" (đúng lỗi trong ảnh hiện tại) |
| Phóng đại chưa ghi chú | "hanhTinh phóng to ×1000 nhưng chưa có note" |

Có thêm `check_glance` (đã thiết kế ở tài liệu khác) cho phần "trông có thật không" khi `style: realistic`.

## 9. Danh sách tool
| Nhóm | Tool |
|---|---|
| Cảnh | `scene_create {title, intent, style?, environment?}`, `scene_read`, `scene_describe` |
| Thực thể | `entity_add {kind, …}`, `entity_update`, `entity_remove` (assembly, primitive, instanced, field, trail) |
| Thang đo, thời gian | `scale_auto` (tự chạy), `scale_set` (ghi đè), `time_set {scale, unit}`, `exaggerate {entity, quantity, factor}`, `inset_add {region, magnify}` |
| Máy quay, đèn | `camera_auto {intent}`, `camera_add`, `camera_cut`, `light_add` |
| Người xem | `annotation_add`, `readout_add`, `control_add` |
| Chuyển động | `behavior_bind {entity, solver: rigid \| nbody \| particles \| analytic, params}`: dùng bộ giải XPBD đã có cho vật rắn; thêm hấp dẫn N vật, hạt, quỹ đạo giải tích |
| Kiểm tra, xem | `check_view`, `scene_view {camera, at}`, `scene_render` (ảnh chất lượng cao) |
| Xuất | `scene_export {path}`: một trang chung tự dựng giao diện từ cảnh (máy quay, chú thích, đại lượng, thanh trượt). Agent không viết code trang |

## 10. Ví dụ, cùng một cách khai báo
### Hai xe va chạm
```
scene_create {intent: {subject: [xeA, xeB], show: "va chạm trực diện", audience: "lớp 10"}, style: realistic, environment: road}
entity_add assembly xeA / xeB, behavior_bind rigid
→ scale_auto: m, km/h, s (1×); thanh trượt vị trí ±12 m
→ camera_auto approach: 3/4 thấp bên trái, cao 2 m, thấy cả hai xe suốt quá trình; né bảng điều khiển bên phải
annotation_add arrow velocity(xeA), velocity(xeB); scale_bar
readout_add velocity(xeA).x km/h, momentum(all).x
control_add "Khối lượng xe A" → body xeA mass, 600–3000 kg
check_view → ổn
```
### Hệ Mặt Trời thu nhỏ
```
scene_create {intent: {subject: [traiDat, matTrang], show: "Mặt Trăng quay quanh Trái Đất"}, style: schematic, environment: space}
entity_add primitive sphere (bán kính thật), behavior_bind nbody
→ scale_auto: Mm, km/s; thời gian 1 ngày = 1 s xem
→ check_view: Mặt Trăng 2 px → exaggerate radius ×20 kèm note
camera_auto orbit: nghiêng 25° so với mặt quỹ đạo; trail matTrang
```
### Khí trong xi-lanh
```
style: symbolic, entity_add assembly xiLanh + instanced 5000 phân tử (nm)
→ scale_auto: hai thang (cm, nm) → inset_add vùng sát piston ×10⁶
behavior_bind particles (va chạm đàn hồi, nhiệt độ T)
readout_add pressure(xiLanh), temperature
```

## 11. Dùng lại code hiện có
| Phần | Có sẵn | Thêm |
|---|---|---|
| Renderer, vật liệu, HDRI, nền | `assembly-kit/three` (`stage.ts`, `presets.ts`, `render.ts`) | Kiểu vẽ `schematic`, `symbolic`; môi trường tự co theo thang đo |
| Lắp ráp và vật | Bản lắp ráp, cụm, lưới nướng sẵn | Thực thể `primitive`, `instanced` (instancing three), `field`, `trail` |
| Vật lý | Bộ giải XPBD, `simulate` | Bộ giải N vật, hạt, quỹ đạo giải tích; hành trình dự kiến cho `camera_auto` và `scale_auto` |
| Độ chính xác lớn và nhỏ | — | Gốc trôi theo máy quay, depth buffer logarit (`WebGLRenderer({ logarithmicDepthBuffer: true })`) |
| Trang | `/lap-rap-3d` (xem, chạy vật lý) | Trang cảnh chung: đọc `SceneDoc`, dựng máy quay, chú thích, đại lượng, thanh trượt cho người xem |

## 12. Thứ tự làm
1. **`SceneDoc`, thực thể `assembly`, `scale_auto`, đơn vị hiển thị, miền thanh trượt.** Sửa ngay lỗi "mm" và "±10 cm" trong ảnh.
2. **`camera_auto` có hành trình dự kiến, vùng an toàn của giao diện, `check_view`.** Sửa lỗi máy quay cắt xe.
3. **`annotation_add`, `readout_add`, `control_add`, `scene_export` cùng trang cảnh chung.** Agent không phải viết code trang thí nghiệm.
4. **Kiểu vẽ `schematic` và `symbolic`, môi trường dựng sẵn.**
5. **`primitive`, `instanced`, `field`, `trail`; bộ giải N vật và hạt; gốc trôi, depth logarit; `exaggerate`, `inset_add`.** Mở sang nguyên tử và hành tinh.

## 13. Hợp đồng tool giai đoạn 1
Bốn tool này đủ để sửa lỗi trong ảnh và dựng được cảnh va chạm hai xe. Tên và tham số theo lối đang dùng trong `mcp.mjs`: snake_case, tham số phẳng, id là chuỗi.

### 13.1 `scene_create`
```
scene_create {
  id?: string,                  // bỏ trống thì tự đặt, như assembly_create
  title: string,
  intent: { subject: string[], show: string, audience?: string },
  style?: "realistic" | "schematic" | "symbolic",     // mặc định realistic
  environment?: EnvironmentRef,
  units?: { length?: string },  // hiếm khi cần; mặc định để scale_auto chọn
  time_scale?: number
}
→ { scene: SceneDoc, scale: ScaleProfile, warnings: Warning[] }
```
Tạo xong thì **chạy `scale_auto` ngay**, không để agent tự gọi. Trả về một dòng tóm tắt đúng như §4.1 để agent đọc được tool đã chọn gì.

### 13.2 `entity_add`
```
entity_add {
  scene: string,
  kind: "assembly" | "primitive" | "instanced" | "field" | "trail",
  id: string,
  ref?: string,                 // kind=assembly: id bản lắp ráp
  place?: Placement,            // dùng lại Placement sẵn có, không có kiểu mới
  shape?: "sphere" | "box" | "cylinder" | "ring" | "arrow",
  size?: number[],
  look?: Look
}
→ { entity, bounds: Bounds, scaleChanged: boolean, scale?: ScaleProfile }
```
- `assembly` là **tham chiếu**, không sao chép. Sửa bản gốc thì cảnh đổi theo, đúng cơ chế bridge đang có.
- Thêm/bớt thực thể làm `scale_auto` chạy lại; trả `scaleChanged` để agent biết đơn vị vừa đổi.

### 13.3 `scale_auto`
```
scale_auto { scene: string, subject?: string[] }
→ ScaleProfile {
  characteristic: 4.4,                                  // m
  motion: 15,                                           // m
  units: { length: "m", speed: "km/h", time: "s" },
  ranges: { "xeA": [-12, 12], "xeB": [-12, 12] },
  timeScale: 1,
  notes: [],
  reasons: {
    length: "chủ thể 4,4 m, hành trình 15 m",
    speed: "xe đời thường",
    time: "va chạm khoảng 2,5 s"
  }
}
```
Ba đầu vào, không có đầu vào thứ tư:
1. **Khung bao `subject`** — không lấy cả cảnh, nếu không đường 24 m sẽ kéo thang đo.
2. **Hành trình** — lấy từ `simulate` (nếu có `behavior`) hoặc giới hạn khớp.
3. **Ngưỡng hiển thị** — số trong khoảng 0,1–1000.

`reasons` là bắt buộc: agent cần giải thích được với người dùng, không phải đoán tại sao tool chọn mét hay Å.

### 13.4 `camera_auto`
```
camera_auto {
  scene: string,
  mode?: "approach" | "orbit" | "fall" | "oscillate" | "flow" | "detail",
  safe_area?: { left: number, right: number, top: number, bottom: number },  // tỉ lệ khung
  aspect?: number
}
→ { camera: { name: "main", position: number[], target: number[], fov: number, near: number, far: number },
    reason: string,
    extras: Camera[] }
```
- `near`/`far` suy từ `characteristic` và `motion`. Nếu `far/near > 1e5` thì bật depth logarit (§11).
- `safe_area` mặc định ước theo giao diện hiện tại của `/lap-rap-3d` (bảng khớp dưới trái rộng 288 px, hộp "Vật lý" dưới phải): khoảng 0,18 trái và 0,12 phải/dưới. Con số này phải lấy từ chính trang, không hard-code trong tool.
- `extras` gợi ý `side` (nhìn ngang để đo), `follow:<id>`, `closeup:<id>`.

## 14. Chỗ nối vào code hiện có
| Nơi | Việc phải làm |
|---|---|
| `fe/scripts/assembly-bridge/mcp.mjs` | Thêm 4 tool vào mảng khai báo `TOOLS` (khoảng 111 KB, khai báo và xử lý nằm cùng file) |
| `fe/scripts/assembly-bridge/instructions.mjs` | Thêm mục hướng dẫn: khi nào gọi `scene_create` thay vì `assembly_create` |
| `fe/assembly-kit/core/types.ts` | Thêm `SceneDoc`, `ScaleProfile`, `Entity` cạnh `AssemblyDoc` (dòng 198) |
| `fe/assembly-kit/three/presets.ts`, `stage.ts` | Môi trường co theo thang đo; thêm `schematic`/`symbolic` |
| `fe/assembly-kit/three/build-scene.ts` | Dựng thêm `primitive`, `instanced`, `field`, `trail` |
| `fe/.assembly-bridge/state.json` | Thêm nhánh `scenes` để trang chỉ poll một chỗ (xem §17.1) |
| `fe/app/api/assembly-bridge/route.ts` | Trả thêm cảnh khi `?scene=<id>` nếu tách file |
| `fe/app/lap-rap-3d/Studio.tsx` dòng 408, 412 | Chỗ sinh ra lỗi "0.0 mm" — thay bằng lớp hiển thị (§14.4) |
| `fe/assembly-kit/physics/solver.ts` | `simulate` trả thêm đường đi dự kiến cho `camera_auto` và `scale_auto` |

### 14.1 Dùng lại `SceneSpec`, đừng tạo kiểu thứ hai
`SceneSpec` (dòng 178) đã có `environment`, `stage`, `exposure` và đang được nhúng trong `AssemblyDoc.scene`. `SceneDoc.environment` nên **mở rộng `SceneSpec`**, không định nghĩa lại. `AssemblyDoc.scene` giữ nguyên nghĩa cũ: cảnh cục bộ của một bản lắp ráp. Hai thứ khác cấp, đừng gộp.

### 14.2 `simulate` trả thêm đường đi
`camera_auto` cần khung bao trên **cả quá trình**, không chỉ lúc đầu. Thêm vào kết quả `simulate`:
```ts
predictedPath: { t: number, bounds: Bounds }[]   // mẫu thưa, ~30 mốc
```
Nếu chưa có thì `camera_auto` chỉnh theo khung bao tĩnh và nới 30% — chấp nhận được cho bản 1, nhưng phải ghi rõ trong `reason`.

### 14.3 Đơn vị của thanh trượt không nằm trong tool
Tool trả `ranges` và `units`; **trang** quyết định hiển thị. Nếu nhét chuỗi "mm" vào tool thì mỗi lần đổi giao diện lại phải sửa MCP.

### 14.4 Sửa ngay `Studio.tsx`
```tsx
// Trước (dòng 408, 412)
const [lo, hi] = j.limits ?? (j.kind === "revolute" ? [-180, 180] : [-0.1, 0.1]);
<span>{j.kind === "revolute" ? `${v.toFixed(0)}°` : `${(v * 1000).toFixed(1)} mm`}</span>

// Sau
const span = scene.scale.motion;                        // hành trình thật, mét
const [lo, hi] = j.limits ?? (j.kind === "revolute" ? [-180, 180] : [-span, span]);
<span>{j.kind === "revolute" ? `${v.toFixed(0)}°` : formatLength(v, scene.scale.units.length)}</span>
```
`formatLength(0, "m")` → "0 m"; `formatLength(12, "m")` → "12 m"; `formatLength(0.05, "m")` → "5 cm" nếu đơn vị của cảnh là cm. Bước trượt lấy theo bước "đẹp" (§15), không chia 360 như hiện nay.

## 15. Định dạng số
| Lớp | Quy tắc |
|---|---|
| `SceneDoc`, `state.json`, tham số tool | Số thật SI, dấu chấm thập phân, **không** làm tròn, **không** kèm đơn vị |
| Giao diện | `Intl.NumberFormat("vi-VN")`: dấu phẩy thập phân, dấu chấm ngăn nghìn |
| Chọn đơn vị | Số hiển thị rơi vào 0,1–1000; ưu tiên đơn vị quen (m cho vật cỡ người, km/h cho xe, Å cho nguyên tử) |
| Bước thanh trượt | 1–2–5 × 10ⁿ theo đơn vị đang hiển thị |
| Khoá đơn vị | Một cảnh dùng **một** đơn vị độ dài cho mọi thanh trượt, không đổi khi máy quay di chuyển |
| Ghi chú phóng đại | Luôn hiện trên màn hình, không giấu sau tooltip |

Ảnh hiện tại đang không nhất quán: thanh trượt ghi "0.0 mm" (dấu chấm) trong khi ô tốc độ ghi "0,25×" (dấu phẩy). Chốt một lối là vi-VN.

## 16. Tiêu chí nghiệm thu
| # | Kiểm | Đạt khi |
|---|---|---|
| 1 | Thanh trượt khớp trượt | Hiện "0 m", miền ±12 m cho hai xe trên đường 24 m — không còn "0.0 mm" và ±10 cm |
| 2 | Đơn vị trong một cảnh | Mọi độ dài cùng đơn vị, cùng lối viết số |
| 3 | Máy quay | Cả hai xe nằm trong khung suốt từ t = 0 tới lúc va chạm |
| 4 | Không bị che | `check_view` không báo chủ thể bị bảng điều khiển che |
| 5 | Thang lạ | Cảnh nguyên tử/hành tinh tự sinh `exaggerate` + note; `check_view` báo nếu thiếu note |
| 6 | Agent không viết code trang | `scene_export` ra trang chạy được mà không sửa `.tsx` |

## 17. Câu hỏi mở
1. **Cảnh lưu ở đâu:** thêm nhánh `scenes` vào `state.json` (một chỗ poll, nhưng file to dần) hay `scenes/<id>.json` + `?scene=<id>`?
2. **`scale_auto` có cho ghi đè bằng số tuyệt đối không?** Chỉ cho chọn đơn vị thì an toàn hơn; cho ghi đè số thì dễ phá tính đúng của vật lý.
3. **Nhiều thang trong một cảnh:** một canvas với hai camera (scissor) hay canvas riêng cho ô phóng to?
4. **`scene_export`:** route động đọc JSON, hay sinh file tĩnh? Ảnh hưởng trực tiếp tới mục tiêu "agent không viết code".
5. **`SceneDoc` có version và undo** như bản lắp ráp không, hay chỉ ghi đè?
6. **Ngưỡng bố cục** (50–75% khung, 4 px) cố định hay đổi theo `audience`?
7. **`scene_set` cũ:** gộp vào `SceneDoc.environment` rồi bỏ, hay giữ song song cho bản lắp ráp đơn lẻ?
