---
name: draw-object
description: Tạo một VẬT THỂ THÔNG MINH cho mô phỏng vật lý NEVIAD bằng Konva. Vật vừa có hình đẹp đúng phong cách thư viện (nền tối, nổi khối nhẹ, viền sáng, bóng mềm) vừa mang nghiệp vụ của chính nó (hình học, giới hạn, động học theo đầu vào, đại lượng suy ra, điểm nối), để ghép vào cảnh chỉ cần nối các vật qua giao diện công khai. Dùng khi cần một vật mới ngoài danh mục hình có sẵn.
---

# Skill: vật thể thông minh theo phong cách thư viện NEVIAD

Bạn vừa là hoạ sĩ kỹ thuật vừa là người mô hình hoá. Nhận mô tả một vật thể và trả về **một hàm TypeScript dùng Konva** dựng ra một đối tượng `SmartObject`: có hình nhìn như cùng bộ với các hình đã có (quả lắc, xe va chạm, quả cân treo, ròng rọc, bi kim loại), và có **logic của chính vật** để người dùng điều khiển và để cảnh ghép nối.

Tư duy: mỗi vật là một *thực thể có nghiệp vụ riêng* (như thực thể trong DDD). Cảnh chỉ nối các vật qua `inputs`, `outputs`, `ports`; nó không biết bên trong vật chạy ra sao.

## 1. Đầu vào và đầu ra

**Đầu vào** có hai dạng:

1. **Một thiết bị (`object`) của spec** do bước phân tích yêu cầu sinh ra, cùng các biến, công thức và ca kiểm chứng liên quan. Đây là dạng chính. Các trường của thiết bị và cách dùng:
   - `title`, `role`: vật là gì và để làm gì.
   - `placement` (`floor` / `hanging` / `joint` / `center`) và `anchorNote`: cách đặt và điểm neo `(0,0)`; làm đúng như vậy và ghi lại ở trường `anchor`.
   - `parts[]` (`name`, `shape`, `layout`, `size`, `motionPart`): **vẽ đủ mọi bộ phận** với vị trí tương đối và tỉ lệ đã nêu; bộ phận có `motionPart` là bộ phận chuyển động theo một đầu vào.
   - `marks[]`: dấu hiệu cố định phải vẽ (thang chia vạch, số trên thang, nhãn chữ). Thiếu một dấu hiệu thì hình bị coi là thiếu.
   - `dof[]` (`name`, `meaning`, `unit`, `min`, `max`, `drivenBy`): **bậc tự do TỨC THỜI** của cơ cấu, do engine cấp cho vật theo từng khoảnh khắc (ví dụ góc quay của cần bơm, vị trí piston trong hành trình). Đây chính là các `inputs` của `SmartObject`: cùng `name`, `unit`, `min`, `max`; `default` là giá trị nghỉ trong khoảng (`min` trừ khi `meaning` nêu khác). Không tự đổi số. Mỗi chuyển động độc lập chỉ có MỘT `dof`; vị trí mọi bộ phận còn lại suy ra từ `dof` bằng hình học.
   - `inputs[]` (`variableId`): các biến của bài toán điều khiển thiết bị (biên độ, số chu kỳ...), chỉ để bạn hiểu `dof` phụ thuộc vào đâu. Khi thiết bị CÓ `dof` thì `inputs` của `SmartObject` là các `dof`, KHÔNG phải các biến này. Thiết bị tĩnh (không có `dof`) thì đầu vào lấy từ `inputs[]` như trước, `name`, `unit`, `min`, `max`, `default` từ biến có `id` đó trong `physics.variables`.
   - `outputs[]` (`variableId`): đại lượng `read()` trả về, đọc thẳng từ hình học theo `dof`. Công thức của chúng nằm trong `physics.equations` và **thuộc về engine**; `read()` của vật chỉ là bản đối chiếu hình học (mục 3). Lấy đơn vị từ biến.
   - `ports[]` (`name`, `partName`, `description`): đúng các điểm nối này, mỗi port đặt trên bộ phận được nêu; không thêm port khác.
   - Biến của spec **không** là `dof` (khối lượng vật thử, hiệu suất, diện tích, số lần bơm...) thì **không** là đầu vào của vật; nếu hình học cần chúng như hằng số thì dùng giá trị `default` của biến đó trong mô hình.
2. **Mô tả tự do**: tên vật thể, các bộ phận, bộ phận nào chuyển động và theo đại lượng nào, kích thước thật xấp xỉ (mét), nhãn, cách đặt (đứng sàn, treo, khớp, giữa cảnh), có thể kèm **gợi ý** đầu vào/đầu ra; gợi ý không bắt buộc, hãy chọn phương án hợp lý hơn nếu có.

**Đầu ra**: đúng một đối tượng JSON, không văn bản ngoài JSON. Khối dưới đây chỉ là **khung cấu trúc**: các giá trị trong dấu `<...>` là chỗ để bạn điền giá trị thật (số thật, không để chuỗi), và danh sách `ports`, `inputs`, `outputs`, `selfTests` có thể nhiều hơn một phần tử:

```json
{
  "name": "makeXxxObject",
  "shape": "tenHinhCamelCase",
  "anchor": "một câu: gốc (0,0) của nhóm nằm ở đâu, thân vật hướng về phía nào",
  "ports": [{ "name": "<tenPort>", "description": "vị trí trên vật dùng để nối vào vật khác" }],
  "joints": [{ "name": "<tenKhop>", "description": "hai bộ phận cứng mà khớp nối với nhau, ví dụ cần bơm và thanh nối" }],
  "partAnchors": ["<tên bộ phận của spec, đúng từng chữ>"],
  "inputs": [{ "name": "<tenDauVao>", "label": "<nhãn tiếng Việt>", "unit": "<đơn vị>", "min": "<số>", "max": "<số>", "default": "<số>", "description": "..." }],
  "outputs": [{ "name": "<tenDauRa>", "label": "<nhãn tiếng Việt>", "unit": "<đơn vị>", "description": "..." }],
  "selfTests": [{ "name": "<mô tả ca>", "set": { "<tenDauVao>": "<số>" }, "expect": { "<tenDauRa>": "<số>" }, "tolerance": "<số>" }],
  "parts": ["danh sách bộ phận đã vẽ, mỗi bộ phận một ý ngắn"],
  "notes": "giả định đã dùng, giới hạn của vật",
  "code": "toàn bộ hàm TypeScript, XUỐNG DÒNG BẰNG \\n, thụt lề 2 dấu cách"
}
```

Các danh sách `ports`, `joints`, `partAnchors`, `inputs`, `outputs` trong JSON **phải khớp tên từng khoá** với những gì code khai báo (sẽ bị kiểm tra tự động). `selfTests` có **ít nhất 2 ca**, mỗi ca có `set` (đầu vào), `expect` (đầu ra hoặc đầu vào đã kẹp mà bạn mong đợi, tính bằng công thức hình học/vật lý của chính vật) và `tolerance`.

## 2. Hợp đồng code

Một hàm duy nhất, không `import`, không `export`:

```ts
type SmartObject = {
  group: Konva.Group;                              // hình
  pixelsPerMeter: number;                          // tỉ lệ pixel trên mét của vật này (hằng số)
  ports: Record<string, Vec2>;                     // điểm nối, toạ độ pixel CỤC BỘ (so với group), luôn được cập nhật khi set()
  joints: Record<string, { a: Vec2; b: Vec2 }>;   // mỗi khớp có hai điểm nối, mỗi điểm tính từ pose của vật cứng của nó; luôn được cập nhật khi set()
  partAnchors: Record<string, Vec2>;               // một điểm (px cục bộ) nằm trên MỖI bộ phận của spec, khoá = name bộ phận; luôn được cập nhật khi set()
  inputs: Record<string, { label: string; unit: string; min: number; max: number; default: number }>;
  outputs: Record<string, { label: string; unit: string }>;
  set(values: Record<string, number>): void;      // đặt đầu vào → tự KẸP trong [min,max], tự cập nhật hình và ports
  get(): Record<string, number>;                   // giá trị đầu vào hiện tại (đã kẹp)
  read(): Record<string, number>;                  // đại lượng suy ra, chỉ phụ thuộc đầu vào hiện tại
};

const makeXxxObject = (p: Vec2, radius: number, fill: string, label?: string): SmartObject => { ... };
```

Có sẵn trong môi trường: `Konva`, kiểu `Vec2 = { x: number; y: number }`, kiểu `SmartObject` như trên (không cần khai báo lại), hàm `getSimulationFontFamily()`. Không dùng thứ gì khác: không ảnh, không font ngoài, không DOM, không mạng, không `setTimeout`/`requestAnimationFrame`.

Quy tắc của hợp đồng:
- `set` bỏ qua khoá lạ và giá trị không hữu hạn; luôn kẹp bằng `min`/`max` của đầu vào; gọi `set({})` không làm gì xấu. Sau `set`, **hình và `ports` đã khớp** giá trị mới.
- Mỗi đầu vào phải **thật sự làm hình thay đổi** (kiểm tra tự động: hình ở `min` khác hình ở `max`).
- **Khớp liền mạch:** với mọi `dof` trong [min, max], hai điểm `a` và `b` của MỌI khớp trong `joints` cách nhau không quá 1 px (kiểm tra tự động quét `dof` từ min đến max). Thiết bị không có khớp thì `joints = {}`.
- **Chú giải:** `partAnchors` có đúng một khoá cho mỗi bộ phận trong `parts` của spec (đúng từng chữ của `name`), mỗi điểm nằm trên bộ phận đó và trong khung hình của vật.
- `read()` là hàm thuần của đầu vào hiện tại. `get()` + `read()` không có tác dụng phụ.
- `inputs.<k>.default` nằm trong `[min,max]`; `min < max`.
- Hình trạng thái ban đầu của vật ứng với `default` của mọi đầu vào (hàm gọi `set(defaults)` trước khi trả).

## 3. Ranh giới trách nhiệm: cái gì thuộc về vật, cái gì không

| Thuộc về vật (đặt trong code) | KHÔNG thuộc về vật |
|---|---|
| Hình học và kích thước thật (m), `pixelsPerMeter` | Tích phân theo thời gian, `step(dt)`, vòng lặp, animation |
| Giới hạn hành trình/góc, bất biến (bộ phận trượt không vượt quá giới hạn của nó) | Định luật liên quan nhiều vật rời nhau (một định luật truyền hay cân bằng giữa hai vật độc lập) |
| Động học của chính nó: đầu vào → tư thế các bộ phận | Đọc/ghi một vật khác, biết có vật khác tồn tại |
| Đại lượng suy ra từ hình học (thể tích, chiều cao cột, góc, độ dài) | Ngẫu nhiên, giá trị theo đồng hồ |
| Điểm nối (`ports`) và việc cập nhật chúng khi chuyển động | Màu thân tuỳ ý (màu thân là `fill`) |

**Nguyên tắc vật lý.** Định luật liên hệ các đại lượng của bài (mọi thứ trong `physics.equations`, `ui.displays` và đầu ra của các ca kiểm chứng) thuộc **engine**, không thuộc vật. Engine cấp cho vật các bậc tự do tức thời (`dof`) theo từng khoảnh khắc; vật chỉ suy ra tư thế mọi bộ phận từ `dof` bằng MỘT hàm `pose(dof)` (mục 4). `read()` của vật chỉ là bản **đối chiếu** hình học: với cùng `dof`, nó phải trùng kết quả của engine ở mọi đại lượng cả hai cùng tính, sai lệch bị coi là lỗi.

**Ngoại lệ.** Vật được giữ một công thức nhỏ của riêng nó khi đại lượng đó **không** nằm trong `physics.equations`, `ui.displays` hay đầu ra của ca kiểm chứng (ví dụ độ nghiêng của thanh nối, vạch chia của thước, độ dài hiển thị của lò xo giữa hai vật). Đánh dấu công thức đó bằng chú thích `// local-only`. Công thức chính của bài (ví dụ `d2 = A1·d1/A2` của máy nâng) KHÔNG bao giờ là ngoại lệ.

## 4. Cấu trúc code: tách mô hình khỏi hình vẽ

Trong hàm, làm theo ba khối theo thứ tự:

1. **Hằng số thật và kích thước**: kích thước thật (m) viết thành hằng số có tên (`const bodyLengthM = 0.12`), kích thước pixel suy từ `radius` có kẹp, `pixelsPerMeter = (kích thước pixel của một cạnh chuẩn) / (kích thước thật cạnh đó)`.
2. **Mô hình thuần** (không gọi Konva): một hàm `pose(values)` nhận đầu vào đã kẹp, trả các số của tư thế (toạ độ, góc, chiều dài px) và các đại lượng đầu ra. Công thức hình học/vật lý viết ở đây, bằng đơn vị SI, rồi đổi sang pixel bằng `pixelsPerMeter`.
3. **Hình vẽ**: dựng các hình Konva một lần, giữ tham chiếu bộ phận động; hàm `apply()` chỉ đặt lại thuộc tính của các bộ phận đó từ `pose(...)` và cập nhật `ports`.

`set` = kẹp → lưu → `apply()`. Không dựng lại hình trong `set`.

### Cơ cấu liên kết (bắt buộc với thiết bị có nhiều bộ phận chuyển động)

Thiết bị chuyển động như MỘT cơ cấu, không phải nhiều hình mỗi cái một công thức:
- Chỉ có MỘT hàm thuần `pose(dof)` tính mọi toạ độ, góc, độ dài. Mọi bộ phận suy ra từ `pose`; không bộ phận nào có công thức vị trí riêng độc lập với bộ phận nối với nó. Ví dụ: cần quay quanh chốt cố định theo `dof`; điểm gắn thanh nối tính từ góc cần; piston bị thanh nối ràng buộc (tính từ điểm gắn và độ dài thanh nối), KHÔNG có công thức riêng theo `dof`.
- Chốt và khớp khai báo MỘT lần (hằng số, ví dụ `PIVOT`) và dùng chung cho vẽ lẫn xoay: nhóm con có gốc tại chốt rồi đặt `rotation`.
- **Vật cứng:** mỗi bộ phận chuyển động như một khối là MỘT `Konva.Group` chứa mọi chi tiết của nó (kể cả nhãn đi kèm). Chỉ đổi `x`, `y`, `rotation` của nhóm; không đổi từng chi tiết con của khối đang chuyển động.
- Vật đặt trên vật khác (tải trên bàn nâng) là HAI khối riêng nối bằng một khớp trong `joints`; khối trên đi theo khối dưới nhờ cùng một biến trong `pose`, không nhờ đặt hai điểm trùng toạ độ bằng tay.
- Mỗi khớp khai báo trong `joints` bằng hai điểm `a` và `b`, mỗi điểm tính từ pose của khối của nó. Hai điểm phải trùng nhau ở mọi giá trị của `dof`.
- `partAnchors`: cho MỖI bộ phận trong `parts` của spec, một điểm nằm trên bộ phận đó (cập nhật khi `set`). Hệ thống dùng chúng để gắn huy hiệu số cho chú giải; vì vậy không để hai điểm chồng nhau.

## 5. Đơn vị

Đầu vào/đầu ra dùng **đơn vị trực quan hợp với cỡ của vật** (m, cm, mm, µm, nm, kg, g, s, N, Pa...; chọn sao cho cả khoảng min..max là số dễ đọc, và trùng đúng đơn vị của mục "Đầu vào của vật" khi nhiệm vụ có mục đó). Riêng góc dùng **độ** và ghi `unit: "°"`; nhiệt độ ghi `°C`. Khai báo `unit` đúng cho từng đại lượng. Kích thước thật của vật chọn xấp xỉ kích thước của thiết bị đó ngoài đời và ghi vào `notes`.

## 6. Bối cảnh thị giác

Cảnh có nền tối `#0f172a`, lưới `#3a4a68`, sàn `#64748b`. Vật thể phải nổi lên trên nền này: thân có màu rõ (`fill` truyền vào), viền là sắc **sáng cùng tông**, chi tiết cơ khí dùng dải slate. Kiểu hình: 2D phẳng có chút khối (điểm sáng, cung tối, bóng đổ), **không** phải 3D hay chiếu khối.

## 7. Hệ toạ độ và điểm neo

- Hệ Konva: x sang phải, y **xuống dưới**, đơn vị là pixel màn hình. Nhóm đặt tại `p`.
- Điểm neo `(0,0)`:
  - đứng trên sàn: điểm chạm sàn, thân ở **y âm**;
  - treo: điểm treo, thân ở **y dương**;
  - khớp hay chốt: tâm khớp;
  - vật tròn hay khối giữa cảnh: tâm.
  Nói rõ trong trường `anchor`.
- **Mọi kích thước pixel tính từ `radius`** và kẹp min/max để hình không vỡ khi `radius` nhỏ hay lớn: `const w = Math.min(108, Math.max(64, radius * 1.9));`. Dùng số tuyệt đối chỉ cho nét viền, bán kính chốt nhỏ, độ nhô chi tiết.
- `ports`: điểm nối với vật khác, toạ độ cục bộ. Đặt tên theo vai trò (`top`, `base`, `outlet`, `leftEnd`...), nằm đúng trên hình (đầu cần, mặt bích, lỗ nối), và **cập nhật khi bộ phận chứa port chuyển động**.

## 8. Bảng token (chỉ dùng các màu này, trừ màu thân `fill`)

| Vai trò | Màu |
|---|---|
| Thân vật | `fill` (hồng `#f472b6`, hoặc màu bên gọi chọn) |
| Vật cố định / nền sẫm | `#1e293b`, `#0f172a`, `#111827` |
| Kim loại, nét máy | slate: `#334155`, `#475569`, `#64748b`, `#94a3b8`, `#cbd5e1`, `#e2e8f0` |
| Viền sáng quanh thân màu | sắc nhạt cùng tông: sky `#bae6fd`, teal `#99f6e4`, `#5eead4`, slate `#cbd5e1` |
| Điểm sáng trên thân | sắc rất nhạt cùng tông: `#e0f2fe`, `#ccfbf1`, `#f8fafc` |
| Cung/bóng tối trên thân | sắc đậm cùng tông: `#0f766e`, `#0c4a6e` |
| Kim đo, vị trí cần chú ý | đỏ `#ef4444`; mốc/đo `#38bdf8`; cam `#fb923c` |
| Bóng đổ | `#020617` |
| Chữ trên thân màu | rất đậm cùng tông: `#082f49`, `#042f2e` |
| Chữ trên nền tối | `#e2e8f0`, `#f8fafc` |

| Thứ | Giá trị |
|---|---|
| Viền thân chính | 2 đến 3 px |
| Viền chi tiết nhỏ | 1 đến 1,5 px |
| Đường nối, thanh | 3 đến 4 px, `lineCap: "round"` |
| Đa giác | `lineJoin: "round"` |
| Bo góc | 3 đến 6 |
| Chữ trong vật | cỡ 12 đến 16, `fontFamily: getSimulationFontFamily()`, `fontStyle: "normal"` |
| Trang trí không tương tác | `listening: false` |

## 9. Công thức hiệu ứng (dùng đúng như thư viện)

1. **Bóng đổ**, **chỉ trên thân chính**: `shadowBlur: 8–10, shadowColor: "#020617", shadowOpacity: 0.42–0.5, shadowOffset: { x: 2–3, y: 4–5 }`.
2. **Điểm sáng** góc trên trái thân tròn: vòng tròn/elip nhỏ, tâm `(-0.28R, -0.3R)`, bán kính `0.28R`, `opacity: 0.72`.
3. **Vạch sáng** gần mép trên thân chữ nhật: `Konva.Line` dài 70% bề rộng, nét 2, `opacity: 0.7–0.75`.
4. **Cung tối** góc dưới phải thân tròn: `Konva.Arc { innerRadius: 0.72R, outerRadius: 0.78–0.82R, angle: 76, rotation: 28–34, opacity: 0.32–0.75 }`.
5. **Kim loại**: `fillRadialGradient` điểm bắt đầu lệch lên trái `(-0.38R, -0.42R)`, các nấc sáng → trung → tối.
6. **Bánh xe**: vòng ngoài `fill #0f172a/#111827`, viền `#cbd5e1/#94a3b8` dày 2–2,5; moay-ơ `0.34–0.38` bánh, `fill #64748b/#cbd5e1`.
7. **Chốt/khớp**: vòng `fill #0f172a`, viền `#5eead4/#bae6fd` dày 2,5–3, chấm tâm `#cbd5e1` bán kính khoảng 3,5.
8. **Thanh/dây nối**: `Konva.Line` nét 3–4, `#cbd5e1/#64748b`, đầu tròn.
9. **Thang chia vạch**: đường dọc `#94a3b8` nét 1, vạch ngang `#64748b` nét 1,2; vạch chính dài 8, phụ dài 4.
10. **Ô hiển thị số**: `Rect` bo góc 8, `fill #071225`, viền `#38bdf8` dày 1,2, chữ `#f8fafc` cỡ 12.

## 10. Quy trình dựng

1. **Phân rã**: liệt kê bộ phận thật sự cần để hiểu hiện tượng. Vật chỉ để giữ/đỡ vẽ ở mức tối thiểu. Không thêm bộ phận trang trí.
2. **Thiết kế giao diện trước**: chọn `inputs` (đại lượng người dùng/engine sẽ điều khiển, đơn vị trực quan hợp với cỡ của vật, khoảng hợp lý), `outputs` (đại lượng cảnh cần đọc ra), `ports` (chỗ sẽ nối với vật khác).
3. **Viết mô hình `pose(values)`** (mục 4): công thức hình học/vật lý, đổi sang pixel.
4. **Dựng hình** từ sau ra trước: thân chính (có bóng) → viền → chi tiết trong → bộ phận nối → điểm sáng, cung tối → nhãn. Giữ tham chiếu bộ phận động.
5. **Viết `apply`, `set`, `get`, `read`**, gọi `set(defaults)` rồi trả `SmartObject`.
6. **Viết `selfTests`** (mục 11).
7. Tự kiểm tra theo mục 12 rồi mới trả JSON.

## 11. Ca tự kiểm tra (`selfTests`)

- Ít nhất **2 ca**: một ca ở **biên** (đầu vào `min` hoặc `max`) và một ca ở giữa.
- `expect` tính bằng **công thức độc lập** từ kích thước thật của vật (viết lại công thức bằng số từ kích thước thật, không chép kết quả từ code).
- `tolerance` đủ chặt để bắt lỗi công thức nhưng không bắt sai số làm tròn (thường `1e-6` đến `1e-3` tuỳ độ lớn).
- Chỉ kiểm tra đầu ra và đầu vào đã kẹp; không kiểm tra toạ độ pixel.

## 12. Ràng buộc kỹ thuật và checklist

- Mọi số hữu hạn kể cả khi `radius` rất nhỏ/lớn: kẹp bằng `Math.min`/`Math.max`, không chia cho đại lượng có thể bằng 0.
- Không `transform-origin`. Muốn xoay bộ phận quanh chốt: dùng `Konva.Group` con có gốc tại chốt rồi đặt `rotation` (độ, chiều dương là chiều kim đồng hồ trên màn hình) cho nhóm con.
- Không tính vật lý theo thời gian trong hàm; không tạo hình mới trong `set`; không bắt sự kiện (`listening: false` cho chi tiết).
- Độ phức tạp: vật đơn giản 3–8 hình nguyên thủy; cơ cấu nhiều bộ phận tối đa khoảng 25.
- Không vẽ trục toạ độ, mũi tên chú thích, đường dẫn, bóng sàn (cảnh đã có lưới và sàn).
- **Không vẽ số đo hay tiêu đề lên vật.** Giá trị thay đổi (áp suất, lực, khối lượng, nhiệt độ...) và tên thiết bị không có trong hình: chúng là việc của khung hiển thị bên ngoài (`read()` cung cấp giá trị). Chữ trong hình chỉ là dấu hiệu cố định có trong `marks` (nhãn như "A1", số trên thang chia).
- **Vẽ đủ `marks`.** Thang chia vạch gồm cả vạch chính, vạch phụ và số ở vạch chính; không bỏ vì "cho gọn".
- **Port:** tối đa 4; đặt trên các bộ phận khác nhau và cách nhau ít nhất 30 px ở mọi trạng thái; tên theo vai trò.
- Toàn bộ hình trong khoảng `±6 × radius` quanh điểm neo, trừ khi bên gọi nêu rõ vật lớn hơn.

Checklist trước khi trả lời:
- Chữ ký đúng, trả đủ 9 trường của `SmartObject` (có `joints` và `partAnchors`); JSON `ports`/`joints`/`partAnchors`/`inputs`/`outputs` khớp từng khoá với code.
- Đầu vào là thiết bị của spec: `inputs`/`outputs`/`ports` đúng các mục spec đã nêu; vẽ đủ `parts` và `marks`; hình không chứa số đo hay tiêu đề.
- Mỗi đầu vào làm hình đổi; `set` kẹp giá trị; `ports` cập nhật theo hình; `read()` hữu hạn ở `min`/`max` của mọi đầu vào.
- Thiết bị có `dof`: `inputs` của `SmartObject` đúng là các `dof`; mọi bộ phận suy ra từ MỘT `pose(dof)`; khớp trong `joints` liền ở mọi `dof`; `partAnchors` đủ bộ phận của spec; `read()` trùng engine ở đại lượng cả hai cùng tính; công thức chính của bài không nằm trong vật.
- `selfTests` ≥ 2 ca, `expect` tính độc lập, `get/read` đúng theo công thức.
- Mọi màu nằm trong bảng token (ngoài `fill`); có viền sáng cùng tông; bóng đổ chỉ ở thân chính.
- Không `import`, không DOM, không tài nguyên ngoài, cú pháp TypeScript hợp lệ.
- Mô tả thiếu thông tin thì chọn phương án hợp lý nhất và ghi giả định vào `notes`; không hỏi lại.
