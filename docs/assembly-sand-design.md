# Mài phẳng bề mặt — "giấy ráp" (`shape_sand`): thiết kế

## 0. Trạng thái: ĐÃ CÓ trong kit và đã gọi được qua MCP (M1–M4)

`shape_sand` ở `fe/assembly-kit/shapes/sand.ts`, đăng ký trong `shapes/build.ts` (`OPS`, 1–2 input,
kế thừa điểm neo), `core/types.ts` (`ShapeOp`), `fe/scripts/assembly-bridge/mcp.mjs` (schema +
handler) và `instructions.mjs`. Kiểm bằng số: `fe/scripts/assembly-bridge/sand-selftest.mjs`
(7 ca, đạt hết). Chạy thật: `fe/scripts/assembly-bridge/mai-ong.mjs` → bản `ong-gio-mai`.

**Bản 2 (đang dùng) — sửa một lỗi nền của bản 1.** Bản 1 dời đỉnh về trung bình hàng xóm (Taubin).
Đo trên ống thật: đỉnh dời trung bình 0,39 mm nhưng **thành phần pháp tuyến chỉ 0,009 mm** — 98 %
độ dời là **trượt dọc theo mặt**, nên hình không đổi một chút nào dù báo cáo "gợn giảm 57 %". Con số
đó chỉ đo độ đều của lưới, không phải hình. Bản 2:

- **Chỉ đẩy theo pháp tuyến** — trượt dọc mặt không làm đổi hình nên bỏ hẳn.
- Dời bao nhiêu thì **khớp mặt bậc 2 cục bộ** quanh đỉnh rồi lấy hiệu số, thay vì lấy trung bình hàng
  xóm: trên mặt trụ bán kính ρ, trung bình hàng xóm nằm lọt vào trong ρ ≈ R²/(4ρ) → mỗi lượt bóp
  nhỏ ống. Mặt bậc 2 khớp **đúng** mặt trụ nên phần ống tròn đứng yên, chỉ chỗ gợn bị bào.
- Hàng xóm lệch pháp tuyến quá 45° bị loại khỏi phép khớp (không vắt qua cạnh gãy). Không có lọc
  này thì ở gần mép hộp/tấm, phép khớp "nhìn" sang mặt bên kia và bóp mép: hộp 100³ bị bo mép 0,5 mm.
  Có lọc rồi: hộp 100³ dời **đúng 0,000 mm**.

Cài đặt khác bản đề xuất đầu ở mấy chỗ, ghi lại cho đúng:

| Đề xuất đầu | Cài thật | Vì sao |
|---|---|---|
| `region: "near:<id hình>"` | `region: near | keep | all` + `tools: [hình]` | op chỉ nhận hình qua `inputs`, giống `bevel`/`weld`; nhét id vào chuỗi thì phải parse, không thêm được gì |
| "gọi 5 lần cũng không trôi" nhờ kẹp | đúng, nhưng phải **mang vị trí gốc theo lưới** (thuộc tính `sandOrigin` trên geometry) | kẹp theo vị trí *đầu vào của lần gọi* thì 5 lần sẽ trôi 5 × limit; mang gốc theo thì tổng vẫn ≤ limit (ca 5 kiểm đúng điều này) |
| `strength` → `N = 4 + 60 × strength` | `N = round(1 + 5 × strength)` | khớp mặt bậc 2 hội tụ nhanh (mỗi lượt đã lấy cả vùng bán kính `radius`); 0,6 → 4 lượt là đủ. `passes` ghi đè được |
| độ gợn = RMS(pᵢ − trung bình hàng xóm) | **bỏ hẳn khỏi báo cáo** | bản 1 đo nhầm thành phần trượt dọc mặt. Báo cáo giờ ghi độ dời **theo pháp tuyến** (trung vị / p95 / sâu nhất) và số đỉnh dời quá 0,1 × limit — đo đúng thứ mắt thấy |
| bán kính mài lấy theo cạnh trung vị | **phân vị 25 % của cạnh** (`short`) | lưới boolean/parametric có cạnh dài gấp 10 lần cạnh ngắn (trụ 128 đoạn: cạnh vòng 2,9 mm, cạnh dọc 30 mm); lấy trung vị thì bán kính phóng lên 90 mm và ăn cả hình |
| `limit` chặn ở 4 % kích thước nhỏ nhất | 25 % | 4 % chặn oan tấm dày 2 mm muốn mài 0,5 mm |

**Số đo thật trên bộ ống gió** (`ong-gio-han`, lưới boolean cạnh trung vị 2,36 mm, 298 888 tam giác,
bán kính mài 20 mm, trần 1 mm, 4 lượt):

| | giá trị |
|---|---|
| dời theo pháp tuyến: trung vị | 0,035 mm |
| dời theo pháp tuyến: p95 | 0,93 mm |
| dời sâu nhất | 1,00 mm (chạm trần) |
| số đỉnh dời > 0,1 mm | 4 200 / 143 000 (≈ 3 %) |
| thể tích | 0,00378445 → 0,00377723 m³ (−0,19 %) |

Tức là **97 % bề mặt ống đứng yên**, chỉ ~4 000 đỉnh ở chỗ gợn/sóng bị bào. Trước bản 2, cùng tham
số này cho ảnh **giống hệt** bản chưa mài.

Bài học giữ nguyên: **trần phải lớn hơn độ lệch của lưới thì mài mới có tác dụng** — lưới boolean
lệch cỡ 0,2–0,5 mm nên `limit` "auto" (5 % cạnh lưới = 0,12 mm) quá nhỏ. Còn một bài học mới:
**bán kính mài phải cỡ bước sóng của gợn**; sóng 10–20 mm mà mài với bán kính 4 mm thì phép khớp
"đi theo" sóng và không bào được gì (bản thử bán kính 7 mm: p95 chỉ 0,13 mm).


Tài liệu liên quan:
- `docs/assembly-bevel-design.md`: `shape_bevel` (đã làm) — nguồn sinh ra phần lớn gợn cần mài.
- `docs/assembly-weld-design.md`: `shape_weld` / `part_weld`.
- `docs/assembly-tool-design.md`: lõi lắp ráp (hình, điểm neo, khớp).

---

## 1. Vấn đề

Trên bộ ống gió thật (Ø120, thành 8 mm, đoạn chéo 42°, 3 ống đâm vào nhau):

| Hiện tượng (thấy trên màn hình) | Nguyên nhân | Tool hiện có xử lý được? |
|---|---|---|
| Quanh mối nối trên có **vòng gợn đồng tâm**, bước sóng cỡ 1–2 cạnh lưới (4 mm), mặt ống ngay ngoài dải thì phẳng | Đỉnh ở **mép dải đắp bị ghim**: trọng số `smoothstep(1 − d/r)` về 0 đúng tại `r`, nên đỉnh sát mép không được dời, còn đỉnh trong thì dời 7 mm → thành bậc | Không |
| Mật độ đỉnh dọc mối không đều → gờ **dày chỗ này mỏng chỗ kia** | `refineToLength(4 mm)` chia lưới theo cạnh dài, không theo độ cong; lưới ra hình tam giác so le | Không |
| Bề mặt vẫn thấy **vệt loang ô vuông** dù hình học nhẵn | Lưới sau boolean còn **mảnh dẹt**: đo trên kết quả bevel 109 454 tam giác có **1 273 cạnh gãy > 30°** (phần lớn là mảnh vụn, diện tích ≈ 0) → pháp tuyến bị tách nét lộn xộn | Không |
| Không dọn được **mảnh vụn** do boolean để lại | Chưa có op dọn lưới | Không |

Ba thứ trên đều là **sai số bề mặt cỡ dưới 1 mm** trên một hình đúng cỡ 0,5 m. Cần đúng một việc:
**bào đi lớp gợn mỏng, không đổi dáng.** Đó là "giấy ráp".

Nguyên tắc: **giấy ráp không sửa được hình sai** — nó chỉ xoá sai số nhỏ hơn một ngưỡng cho trước.
Nếu chỗ nối thiếu vật liệu thì mài chỉ làm nó nhẵn hơn, không thành mối nối đẹp.

---

## 2. Các cách đã cân nhắc

| Cách | Làm gì | Vì sao chọn / không chọn |
|---|---|---|
| **Gọi `relax` toàn lưới, không chặn** | Chạy Taubin khắp vật | Bẹt cả vật: bo tròn miệng ống, teo cung đắp, mất cạnh cần sắc |
| **Taubin thuần (không chặn), nhiều lượt** | Giữ thể tích nên không teo tổng | Vẫn làm mềm thứ cần giữ; không có trần nên mài 200 lượt là méo hình |
| **Laplacian rồi chiếu lại về mặt gốc** | Giữ đúng hình ban đầu | Gợn **nằm trong** mặt gốc nên chiếu lại là trả gợn về — vô dụng đúng ca này |
| **Taubin + chặn độ dời từng đỉnh** | Mài lớp mỏng, trần `limit` | Đã làm bản 1 rồi **bỏ**: 98 % độ dời là trượt dọc mặt nên hình không đổi (§0). Ý "có trần" thì giữ |
| **Khớp mặt bậc 2 cục bộ, chỉ đẩy theo pháp tuyến** (chọn) | Mỗi đỉnh dời về mặt khớp với hàng xóm, đúng phương pháp tuyến | Trên mặt trụ/phẳng đều thì mặt khớp trùng mặt thật → đứng yên; chỉ chỗ gợn mới dời. Không bóp hình, không trượt lưới |
| **Nới rộng / đổi trọng số trong `bevel`** | Sửa tận gốc chỗ sinh gợn | Đúng, nhưng chỉ cứu được bevel; boolean, weld, sweep vẫn cần. Làm **sau** khi có sand |
| **Subdivision (Catmull-Clark) + decimate** | Chia mịn rồi giảm | Đổi topology, nặng, không kiểm soát được "chỉ mài" |
| **Voxel remesh + smooth** | Voxel hoá rồi nặn mượt | Liền thật nhưng mất chi tiết sắc, nặng |

Tham chiếu ngoài: Blender có **Smooth modifier** (factor × iterations) và **Corrective Smooth**
(trung bình có trọng số, giữ hình dạng lớn). Cả hai vẫn là làm mượt **đỉnh**, không phân biệt đang
trượt dọc mặt hay đẩy ra/vào — đúng cái bẫy của bản 1. `shape_sand` bản 2 làm theo kiểu **khớp mặt
cục bộ** (như "shrinkwrap lên một bản sao đã làm mượt", nhưng khớp bậc 2 nên giữ đúng mặt trụ) và có
thêm **trần dời tuyệt đối**.

---

## 3. Một tầng hay hai tầng

```
shape_sand (tầng thấp)  — nhận id HÌNH, trả về một hình mới
   ├─ hàn đỉnh, dựng danh sách hàng xóm (theo bán kính, bỏ hàng xóm vắt qua cạnh gãy)
   ├─ xác định vùng mài (cả vật / quanh một hình khác)
   ├─ khoá đỉnh trên cạnh sắc hơn `lock`  (miệng ống, mép 90°)
   ├─ khớp mặt bậc 2 quanh mỗi đỉnh, chỉ đẩy theo pháp tuyến, mỗi lượt kẹp |p − p₀| ≤ limit
   └─ kiểm tra kín + báo độ dời pháp tuyến, thể tích trước/sau
```

Mốc này **chỉ một tầng**. `part_sand` (nhận id bộ phận) để sau — cùng kiểu `shape_weld` →
`part_weld`, `shape_bevel` → (chưa có) `part_bevel`.

Lý do `shape_sand` phải là tầng hình: nó cần chạy được **trước** bước khoét lòng (mép lỗ còn sắc
tuyệt đối), và cần chạy được **sau** boolean mà không đụng tới bộ phận/khớp.

---

## 4. API

```jsonc
shape_sand {
  assembly: "ong-gio-han",
  id:       "ongSach",
  input:    "ongHanSach",     // bắt buộc — hình cần mài
  strength: 0.5,              // 0..1 → số lượt khớp mặt (mặc định 0,5 = 4 lượt)
  limit:    "auto",           // m | "auto" = 5 % cạnh lưới trung vị, chặn 0,05–0,5 mm
  radius:   "auto",           // bán kính "miếng giấy ráp" (m); "auto" = max(3 × limit, 4 × cạnh ngắn)
  passes:   null,             // ghi đè số lượt (1..200)
  region:   "all",            // "all" | "near" | "keep"  (near/keep cần tools: [hình kia])
  tools:    ["hình"],         // bắt buộc khi region = near/keep
  reach:    "auto",           // bán kính vùng, mặc định max(6 × limit, 3 × cạnh trung vị)
  lock:     30,               // độ: cạnh gãy hơn mức này thì hai đỉnh của nó KHÔNG mài
  maxTriangles: 400000
}
```

### 4.1 Tham số

| Tham số | Kiểu | Mặc định | Nghĩa |
|---|---|---|---|
| `input` | id hình | — | hình cần mài (bất kỳ, không cần kín) |
| `strength` | 0..1 | `0.5` | độ mài. Số lượt `N = round(1 + 5 × strength)`, chặn 1–200 (0,5 → 4) |
| `limit` | m \| `"auto"` | `"auto"` | **trần dời tuyệt đối** của mỗi đỉnh so với vị trí ban đầu. `"auto"` = 5 % cạnh trung vị, chặn 0,05–0,5 mm. Lưới 4 mm → 0,2 mm — **quá nhỏ cho lưới boolean**, xem §0 |
| `radius` | m \| `"auto"` | `"auto"` | bán kính vùng khớp mặt: gợn **ngắn hơn** cỡ này thì bị bào, sóng dài hơn thì giữ. Mặc định `max(3 × limit, 4 × cạnh ngắn)` với "cạnh ngắn" = phân vị 25 % độ dài cạnh. Muốn bào sóng 10–20 mm thì phải truyền tay (0,015–0,02) |
| `passes` | 1..200 | `null` | ghi đè `strength` khi cần chỉnh tay sau khi đã đo |
| `region` | chuỗi | `"all"` | `all` = cả hình; `near` = chỉ đỉnh cách hình trong `tools` < `reach`; `keep` = mọi nơi **trừ** gần hình đó |
| `tools` | [id hình] | `[]` | hình dùng làm vùng; bắt buộc khi `region` khác `all` |
| `reach` | m \| `"auto"` | `"auto"` | bán kính vùng, chỉ dùng với `near`/`keep`. `"auto"` = `max(6 × limit, 3 × cạnh trung vị)` |
| `lock` | 0..180 | `30` | cạnh gãy hơn `lock` → hai đỉnh của cạnh đó bị khoá, **không dời**. Bảo vệ miệng ống, mép khoét, cạnh hộp. Đồng thời quyết định góc lọc hàng xóm: `min(80, max(45, lock))` |
| `maxTriangles` | số nguyên | `400000` | lưới dày hơn thì cảnh báo và vẫn chạy (mài không đổi số tam giác) |

### 4.2 `limit` — trần dời, không phải tổng quãng đường

Sau **mỗi lượt** khớp mặt, với mỗi đỉnh:

```
d = p − p₀            (p₀ = vị trí TRƯỚC khi mài, không đổi suốt quá trình)
if |d| > limit:  p = p₀ + d × (limit / |d|)
```

Nghĩa là đỉnh bị nhốt trong **quả cầu bán kính `limit`** quanh chỗ nó đứng: mài 1 lượt hay 200
lượt, nó **không trôi thêm**.

Gọi op nhiều lần liên tiếp: lưới ra mang theo vị trí gốc (`sandOrigin`), lần mài sau vẫn kẹp theo
**cùng gốc đó**, nên 5 lần liên tiếp vẫn ≤ `limit` tổng (ca 5 của selftest kiểm đúng điều này).
Nếu hình đã bị `offset`/`rotate` ở giữa chuỗi thì gốc cũ bị bỏ (kiểm tra lệch quá 20 × limit) và
lần mài đó tính gốc mới — đúng, vì hệ toạ độ đã đổi.

### 4.3 `reach` với `near` / `keep`

- `near` + `tools: [hình]`: chỉ mài những đỉnh **gần hình kia** — dùng khi vừa `bevel`/`weld` xong
  một mối và chỉ muốn mài đúng chỗ đó, không đụng phần còn lại của vật.
- `keep` + `tools: [hình]`: mài mọi nơi **trừ** gần hình kia — dùng khi muốn mài cả vật nhưng chừa
  vùng quanh một chi tiết (ví dụ chừa mặt lắp ghép).
- Trọng số ở biên vùng giảm dần theo `smoothstep` trên một dải rộng `reach`, không cắt phựt — cắt
  phựt thì chính biên vùng lại sinh ra một gờ mới, đúng lỗi đang có ở `bevel`.
- Đỉnh cách hình kia ≥ `reach` có trọng số **đúng 0** → không dời một phân tử (ca 6 kiểm: 0 đỉnh).
- `"auto"` cho `reach` = `max(6 × limit, 3 × cạnh trung vị)`. Với lưới 4 mm, limit 0,2 mm → 12 mm.

### 4.4 `lock` — bảo vệ cạnh sắc

Đỉnh nào là đầu mút của cạnh có góc gãy > `lock` thì `w = 0` (không dời). Mặc định 30°:
- miệng ống sau khi khoét, mép mặt phẳng, cạnh hộp — vẫn sắc;
- cung đắp của `bevel` (góc gãy < 30°) — vẫn được mài, đúng ý.

Muốn mài cả cạnh sắc thì đặt `lock: 180`.

---

## 5. Thuật toán

1. **Lưới hoá**: hàn đỉnh theo vị trí (1e-7 m) → `M` (vị trí + tam giác) + bảng ánh xạ
   `map[i]` từ đỉnh gốc sang đỉnh đã hàn (để trả lại đúng thứ tự cho lưới có index, giữ UV).
2. **Hàng xóm**: `neighborsWithin(pos, nrm, radius, góc lọc)` — lưới đều theo ô, mỗi đỉnh lấy các
   đỉnh cách ≤ `radius` **và** có pháp tuyến lệch ≤ `min(80, max(45, lock))` độ. Lấy mẫu thưa còn
   ≤ 64 điểm (khớp 6 ẩn số, 64 điểm là quá đủ).
3. **Vùng**: `w[i] = 1` với `all`; với `near`/`keep` tính khoảng cách tới hình kia bằng
   `triGrid` + `meshDistances` (đã có trong `weld.ts`), rồi `w = smoothstep((reach − d) / reach)`.
4. **Khoá**: quét cạnh, so hai pháp tuyến mặt → góc gãy > `lock` thì khoá hai đỉnh đầu mút, `w = 0`.
5. **Khớp mặt bậc 2, chỉ đẩy theo pháp tuyến**: mỗi lượt, tính lại pháp tuyến đỉnh; với từng đỉnh
   chưa khoá, dựng khung (t₁, t₂, n) tại đỉnh rồi khớp
   `z = a + b·u + c·v + d·u² + e·uv + f·v²` (u, v, z chuẩn hoá theo `radius`) bằng bình phương nhỏ
   nhất trên các hàng xóm ở bước 2. `a` = đỉnh đang cao/thấp hơn mặt khớp bao nhiêu → dời
   `p += 0,8 · a · w · n`, mỗi lượt không quá `limit`, rồi kẹp §4.2. Dừng sớm khi mọi đỉnh dời
   < 0,02 × limit (đã bão hoà — mặt phẳng đứng yên ngay lượt 1).

   Hai chi tiết bắt buộc, thiếu là sai:
   - **Kẹp sống (ridge) 1e-3 × số hàng xóm vào các cột b/u²…**: lưới thật có vùng hàng xóm dẹt
     (trụ 128 đoạn: cạnh vòng 2,9 mm, cạnh dọc 30 mm) làm ma trận gần suy biến; không có nó nghiệm
     nhảy loạn và đỉnh bị đẩy sai chiều (đo được: cả lưới dời hết cỡ `limit`, thể tích −0,88 %).
   - **Chỉ đẩy theo `n`**: bản 1 dời theo vectơ đầy đủ, 98 % là trượt dọc mặt → hình không đổi.

6. **Kiểm tra + xuất**: đếm cạnh biên trước/sau để biết hình có bị hở không; tính độ dời **theo
   pháp tuyến** (trung vị / p95 / sâu nhất), số đỉnh dời quá 0,1 × limit, thể tích trước/sau, số
   đỉnh chạm trần; xuất lưới có index + `computeVertexNormals` (lưới không index như kết quả boolean
   thì xuất lại có index để pháp tuyến liền mạch). UV và mọi thuộc tính khác giữ nguyên nếu lưới
   gốc có index.

Không dùng lại `bevel`/`weld`: chúng **sinh** vật liệu; `sand` chỉ **dời** đỉnh.

---

## 6. Thứ tự dùng

```
dựng khối đặc → union → bevel (đắp/gọt) → sand  → boolean khoét lòng
                      ↑ gợn sinh ở đây  ↑ mài ở đây
```

- **Mài sau bevel/weld**, không bao giờ trước: mài trước thì bevel lại đắp lên trên và sinh gợn mới.
- **Mài trước khi khoét lòng** nếu mép lỗ cần sắc tuyệt đối: lúc đó chưa có mép, khoét sau cho mép
  sạch. Nếu lỗ đã khoét rồi mới mài thì phải để `lock: 30` (mặc định) để khỏi bo mép.
- **Không mài sau khi đã gắn decal** (chữ sẽ trượt khỏi mặt). `sand` giữ UV theo đỉnh nhưng độ dài
  cạnh đổi chút, texture theo UV co giãn ≤ `limit`/cạnh.
- Với vỏ mỏng: `limit` ≤ 1/4 bề dày vách. Ống 8 mm → limit ≤ 2 mm (mài thật đã dùng 1 mm).

---

## 7. Kết quả trả về

```
mài 4/4 lượt, bán kính 20.0 mm, trần 1.00 mm, vùng all, khoá 6670 đỉnh trên cạnh > 30°
dời theo pháp tuyến: trung vị 0.035 mm, p95 0.930 mm, sâu nhất 1.000 mm — 4200/142763 đỉnh dời > 0.100 mm, 6252 đỉnh chạm trần (nhiều nhất 1.000 mm), 298888 tam giác
thể tích 0.00378445 → 0.00377723 m³ (-0.19 %)
```

- `dời theo pháp tuyến` = cái mắt thấy. Trung vị nhỏ mà p95 lớn là đúng: phần lớn mặt đứng yên, chỉ
  chỗ gợn bị bào sâu.
- `đỉnh chạm trần` = số đỉnh đã bị kẹp ở `limit`. Quá 5 % số đỉnh trong vùng nghĩa là **trần đang
  chặn việc mài**: tăng `limit` (đừng tăng `strength` — thêm lượt cũng bị kẹp ở đó).
- Cảnh báo nếu thể tích đổi quá 2 % (mài đang ăn vào cấu trúc, không chỉ bào gợn).
- Hình hở sẵn thì không báo thể tích (chỉ báo số cạnh biên trước/sau).

---

## 8. Lỗi và cách sửa (thông điệp phải chỉ luôn hành động)

| Trường hợp | Thông điệp |
|---|---|
| `near`/`keep` mà thiếu `tools` | `region "near" cần hình thứ hai — truyền tools: [hình] (vùng mài tính theo hình đó).` |
| Lưới rỗng / không có tam giác | `[hình X] không có tam giác nào để mài.` |
| `near`/`keep` mà hình kia không chạm | `Vùng mài rỗng: hình thứ hai không nằm trong <reach> mm của "<input>". Tăng reach hoặc bỏ region.` |
| `lock` khoá hết | `<X>: không còn đỉnh nào để mài — khoá cạnh > 30° đã khoá N đỉnh. Hạ lock (ví dụ 60) hoặc dùng lock: 180 nếu muốn mài cả cạnh sắc.` |
| `limit` quá lớn so với vật | `limit 50,00 mm bằng 50 % kích thước nhỏ nhất (100,0 mm) — đây là sửa hình chứ không phải mài. Giảm limit.` (chặn ở 25 %) |

---

## 9. Điểm neo

Mài dời đỉnh ≤ `limit`, nên:
- điểm neo theo khung bao (`top`, `bottom`, …) tính lại sau khi mài — lệch ≤ `limit`;
- điểm neo tự đặt (`anchor_define`) và điểm neo của phép trước **giữ nguyên toạ độ**, lệch tối đa
  `limit`. Chấp nhận được; không có cơ chế "dán theo lưới" ở mốc này.
- Điểm neo `seam` của `bevel` nằm đúng tâm mối; mài không làm nó rời khỏi mặt.
- `sand` thêm điểm neo `mai` (tâm khung bao sau khi mài).

---

## 10. Ảnh hưởng tới phần khác

| Tệp | Việc | Trạng thái |
|---|---|---|
| `fe/assembly-kit/shapes/sand.ts` | **mới** — toàn bộ op | xong |
| `fe/assembly-kit/core/types.ts` | thêm `"sand"` vào `ShapeOp` | xong |
| `fe/assembly-kit/shapes/build.ts` | `OPS`, `case "sand"`, kiểm 1–2 input, kế thừa điểm neo | xong |
| `fe/assembly-kit/node.ts` | `export { sand }` cho script/selftest | xong |
| `fe/scripts/assembly-bridge/mcp.mjs` | schema `shape_sand` + handler | xong |
| `fe/scripts/assembly-bridge/instructions.mjs` | đoạn "MÀI" (khi nào dùng, khi nào không) | xong |
| `fe/scripts/assembly-bridge/sand-selftest.mjs` | **mới** — 7 ca ở §12 | xong |
| `fe/scripts/assembly-bridge/mai-ong.mjs` | **mới** — áp lên bộ ống gió, ghi bản `ong-gio-mai` | xong |
| `fe/assembly-kit/shapes/weld.ts` | không sửa; dùng lại `triGrid`, `meshDistances`, `sizeOf`, `smoothstep` | — |
| `docs/assembly-bevel-design.md` | ghi chú: 92 vòng Taubin trong `bevel` sẽ được thay bằng một bước `sand` **sau này** | chưa |

---

## 11. Kế hoạch làm

| Mốc | Nội dung | Trạng thái |
|---|---|---|
| **M1** | `sand.ts`: khớp mặt bậc 2 + chỉ đẩy theo pháp tuyến + kẹp `limit` + `lock`, `region: all`; đăng ký `OPS`/`ShapeOp` | xong — ca 1, 3, 4, 5 đạt |
| **M2** | `region: near/keep` + `reach` tự tính + trọng số mềm ở biên | xong — ca 6: 0 đỉnh ngoài `reach` bị dời |
| **M3** | MCP schema + handler + `instructions.mjs` | xong — `shape_sand` đã gọi được trên `/lap-rap-3d` |
| **M4** | Chạy trên ống gió: `ong-gio-han` → mài 1 mm (bán kính 20 mm) → bản `ong-gio-mai`, so ảnh trước/sau | xong — người dùng đã xem và duyệt |

---

## 12. Kiểm thử (bằng số, không bằng mắt)

Thước đo: **độ lệch so với mặt chuẩn** (cái mắt thấy), không phải độ đều của lưới:
trụ → trung vị |bán kính − 60 mm|; tấm → trung vị | |z| − 1 mm |; hộp/phẳng → dời 0 mm.
Bản 1 dùng "độ gợn" (Laplacian) nên báo giảm 57 % trong khi hình không đổi — đã bỏ.

1. **Trụ có gợn nhân tạo**: trụ Ø120 × 300 mm (128 đoạn), nhiễu ±0,3 mm từng trục. Mài `limit 0,3`,
   `strength 0,6` → lệch bán kính 0,136 → 0,052 mm (**−62 %**), bán kính trung bình 59,995 →
   59,976 mm, thể tích −0,06 %. Đạt.
2. **Ống gió thật** (`ong-gio-han`, 298 888 tam giác, cạnh trung vị 2,36 mm): mài `limit 1,0 mm`,
   `lock 30` → 12 619 / 149 433 đỉnh dời > 0,1 mm, p95 độ dời pháp tuyến 0,156 mm, thể tích
   −0,26 %, khung bao đổi 0,089 mm. Đạt.
3. **Hộp 100 × 100 × 100 mm chia 20**, `lock 30`, `limit 0,5`, `strength 1` → dời 0,000 mm, thể
   tích đổi 0,0000 %, khung bao nguyên (12 cạnh sắc còn nguyên). Đạt.
4. **Tấm dày 2 mm có gợn**, `lock 180`, `limit 0,5` (1/4 bề dày) → dày đều hơn 0,146 → 0,029 mm
   (−80 %), vẫn kín 0 cạnh biên, thể tích −3,4 % (san phẳng nhiễu ±0,3 mm trên tấm 2 mm thì thể
   tích giảm vài % là đúng, không phải ăn thủng). Đạt.
5. **Gọi 5 lần liên tiếp** cùng tham số trên hình ở ca 1 → tổng độ dời 0,300 mm (= đúng `limit`,
   không trôi); lần 5 không dời thêm so với lần 1. Đạt.
6. **Vùng `near`**: hộp 200³ + hộp nhỏ cách mặt 5 mm, `reach 10 mm`, `limit 0,2`, `lock 180` →
   **0 đỉnh** ngoài `reach` bị dời; 9 đỉnh trong vùng dời. Đạt.
7. **Lỗi** (region thiếu hình 2, `limit` quá lớn, vùng rỗng) → ném lỗi có câu chỉ cách sửa. Đạt.

---

## 13. Giới hạn đã biết

- **Không sửa hình sai.** Chỗ thiếu vật liệu, chỗ phẳng bị bẻ cong, mối nối hở: sai số lớn hơn
  `limit` nên mài không đụng tới.
- **Không khôi phục vật liệu đã mất** (bo quá tay, khoét lẹm).
- **Trần phải lớn hơn độ lệch của lưới.** Lưới boolean 2,4 mm lệch cỡ 0,2–0,5 mm, nên `limit` 0,2 mm
  gần như không mài được gì (66 % đỉnh chạm trần). Đây là giới hạn thật của kiểu mài "dời đỉnh có
  trần": muốn phẳng hơn nữa phải **chia lại lưới mịn hơn** (lưới đều thì `limit` nhỏ cũng đủ) —
  việc đó là của `refineToLength`, không phải sand.
- **Làm mỏng vách** nếu mài mạnh trên vỏ mỏng: `limit` chặn nhưng 1 mm trên vách 8 mm là 12 %, và
  mặt trong/mặt ngoài mài độc lập nên chỗ xấu nhất vách có thể mỏng đi tới 2 × `limit`. Trên ống
  8 mm với `limit` 1 mm: vẫn còn ≥ 6 mm.
- **Không dọn mảnh vụn / sliver** của boolean (1 273 cạnh gãy ở ca bevel là mảnh dẹt, diện tích ≈ 0).
  Mài có thể làm chúng bớt nhọn nhưng không xoá; việc đó cần op `clean` riêng.
- **Bán kính mài phải cỡ bước sóng của gợn.** Khớp mặt "đi theo" mọi thứ dài hơn `radius`; sóng
  10–20 mm mà mài với bán kính 7 mm thì gần như không bào được gì (p95 0,13 mm). Muốn bào sóng dài
  thì tăng `radius`, nhưng bán kính lớn quá (≈ quá 1/3 bán kính cong của vật) thì phép khớp bậc 2
  không theo kịp mặt cong và bắt đầu bóp hình — trên ống Ø120 thì 20 mm là an toàn, 30 mm bắt đầu
  phồng thể tích (+0,65 %).
- **Không sửa được lưới quá thô.** Trụ chia 10 đoạn dọc (cạnh 30 mm) thì không có đủ hàng xóm để
  khớp ở cỡ 0,3 mm; phải chia mịn hơn trước (việc đó là của `refineToLength`).
- **Không đổi topology**: lưới càng dày mài càng chậm (mỗi lượt ~O(số đỉnh × số hàng xóm × 36));
  150k đỉnh × 4 lượt, bán kính 20 mm ≈ 5 s.
- **Không phải đánh bóng vật liệu**: chỉ hình học. Độ nhám/bóng là việc của `material_*`.

---

## 14. Việc để sau

- `part_sand` (tầng bộ phận).
- **Mài theo độ cong**: chỉ mài nơi độ cong lệch bất thường so với lân cận (tự tìm gợn), thay vì mài
  đều cả vùng.
- **Tự chọn `limit`** từ phân bố độ lệch của lưới (ví dụ 2 × trung vị độ lệch), khỏi phải đo tay —
  hiện `"auto"` = 5 % cạnh lưới là quá nhỏ cho lưới boolean (§0).
- **Gộp vào `bevel`/`weld`** như bước cuối: thay 92 vòng Taubin hiện tại bằng gọi `sand` với
  `region: near` — khi đó `bevel` không cần tự miết nữa.
- **`shape_clean`**: dọn mảnh dẹt, hàn đỉnh, sửa pháp tuyến, tính lại UV — phần còn thiếu của đường
  ống dẫn từ boolean ra hình đẹp.
