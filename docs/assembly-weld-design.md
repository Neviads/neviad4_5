# Hàn mối nối (`shape_weld` / `part_weld`): thiết kế

## 0. Trạng thái: đề xuất, chưa có trong kit

Hiện kit có `shape_boolean` (gộp/cắt) và `shape_round_edges` (bo cạnh). **Chưa có gì làm mối nối
giữa hai khối "chảy" vào nhau.** Tài liệu này là thiết kế cho phần đó.

Tài liệu liên quan:
- `docs/assembly-tool-design.md`: lõi lắp ráp (đặt chỗ, điểm neo, khớp).
- `docs/assembly-precision-design.md`: bộ giải chung, kiểm tra.
- `docs/car-toolkit-design.md`: tạo hình, vật liệu, cảnh.

---

## 1. Vấn đề

Khi hai bộ phận được dựng riêng rồi lắp sát nhau (tay áo vào vai, ống quần vào hông, tay vào
cổ tay), chỗ gặp nhau **luôn** ra một trong hai thứ xấu:

| Hiện tượng | Nguyên nhân hình học |
|---|---|
| **Khe tối + bậc** (như ảnh vai) | Hai mặt gần **song song**, chỉ chạm nhau ở một đường; giữa chúng không có vật liệu |
| **Đường lượn sóng sắc** | Hai mặt cắt nhau ở góc rất nông (grazing); đường giao dài, nhạy với sai số |
| **Bậc rõ như chốt cắm** | Hai mặt cắt nhau gần vuông góc |

`shape_round_edges` **không cứu được** trường hợp 1 và 2: nó chỉ bắt cạnh có **góc gãy lớn hơn
ngưỡng** (mặc định 30°). Hai mặt gần song song lệch nhau rất ít → tool không coi là "cạnh gãy" →
không làm gì. Đây đúng là lý do cái khe ở vai vẫn còn sau khi gộp.

Điều cần: **đắp thêm vật liệu vào góc lõm** để nó thành cung tròn — kỹ thuật quen thuộc trong CAD
("fillet ở góc lõm", "weld bead") và trong Blender (Smart Bridge + Smooth, hoặc smooth brush sau
boolean).

---

## 2. Các cách đã cân nhắc

| Cách | Làm gì | Vì sao chọn / không chọn |
|---|---|---|
| **Bridge edge loops** (thủ công) | Xoá nắp hai đầu ống, nối hai vòng mép hở bằng dải mặt mới | Kết quả đẹp nhất, nhưng cần sửa lưới trực tiếp (chọn mặt, chọn vòng mép, đặt từng đỉnh). Kit không có, và agent cũng không nên phải làm |
| **Smart Bridge** (add-on) | Khoét lỗ hai bên, nối ống nhiều vòng, **relax + smooth các vòng ở hai đầu** | Đúng thứ cần. Bước quyết định là *relax/smooth dải quanh mối nối*, không phải bước nối |
| **Voxel remesh + smooth** ("nặn đất sét") | Voxel hoá cả cụm, dựng lại mặt, làm mượt | Liền thật, nhưng lưới nặng, mất chi tiết sắc, không kiểm soát được chỗ nào mềm chỗ nào sắc |
| **SDF metaball (smooth-min)** | Trường khoảng cách hai khối trộn mềm, dựng lại mặt | Đẹp và tự động, nhưng phải viết cả marching cubes; nặng hơn nhiều so với nhu cầu |
| **Weld dải** (chọn) | Gộp hai khối, **tìm đường nối**, rồi làm mượt **một dải rộng R** quanh đường đó | Nhẹ nhất mà vẫn đúng hiệu ứng; giữ được chi tiết ở chỗ khác; chạy trong ~1 s; không cần marching cubes |

Nguyên tắc chọn: **chỉ làm mềm đúng dải quanh mối nối**, không đụng phần còn lại của hình.

---

## 3. Hai tầng tool

```
Agent: "hàn tay áo vào thân áo, mềm vừa"
  │
  ├─ part_weld   (tầng cao)  — nhận id BỘ PHẬN, gộp luôn, trả về một bộ phận
  │     └─ shape_weld (tầng thấp) — nhận id HÌNH, trả về một hình mới
  │            ├─ boolean union
  │            ├─ tìm dải mối nối
  │            └─ làm mượt dải (Taubin) + chia mịn + giản lược
  └─ kiểm tra: kín, tự xuyên, khung bao, thể tích, số tam giác
```

- **Tầng thấp** để ghép vào cây hình (dùng tiếp cho boolean, mirror, pattern…).
- **Tầng cao** là thứ agent gọi 90% số lần: chỉ cần nói hai bộ phận.
- **Không bao giờ** đòi agent nhập toạ độ, chọn đỉnh, chọn đường hay chọn mặt.

---

## 4. API

### 4.1 `shape_weld` (tầng thấp)

```jsonc
shape_weld {
  assembly: "nguoi-mau",     // bắt buộc
  id:       "vaiWeld",       // bắt buộc, tên hình mới
  a:        "than",          // bắt buộc, hình thứ nhất
  b:        "tayAo",         // bắt buộc, hình thứ hai
  radius:   "auto",          // số mét, hoặc "auto" (mặc định)
  strength: 0.6,             // 0..1, độ "miết" (mặc định 0.6)
  detail:   "auto",          // "auto" | số mét — cỡ cạnh lưới trong dải
  maxTriangles: 200000,      // chặn trên; vượt thì giản lược
  material: "ao",            // bỏ trống = lấy vật liệu của a
  dryRun:   false            // true = chỉ báo số liệu, không dựng hình
}
```

**Ngữ nghĩa `radius`**
- Là **bán kính của cung** đắp vào góc lõm, tính bằng mét.
- `"auto"` = `clamp(0.35 × min(bề dày a, bề dày b), 0.004, 0.03)`, trong đó "bề dày" = cạnh nhỏ
  nhất của khung bao. Với ống tay Ø 0,114 m → ra khoảng 0,028 m.
- Guard: nếu `radius > 0.4 × min(bề dày)` thì **cảnh báo** (dễ bị thắt cổ chai), nhưng vẫn làm.

**Ngữ nghĩa `strength`**
- `0` = chỉ gộp, không làm mượt (giống `union`).
- `0.6` = mặc định, đủ để mất cạnh gãy ở hầu hết mối nối.
- `1` = mềm tối đa (dải mượt hết cỡ, có thể hơi bẹt).
- Quy ra: số vòng lặp `K = round(20 + 60 × strength)`, hệ số `λ = 0.5`.

**Ngữ nghĩa `detail`**
- `"auto"` = chia mịn lưới trong dải cho tới khi cạnh ≤ `radius / 4`. Không có bước này thì lưới
  thô ở chỗ nối sẽ không đủ đỉnh để uốn thành cung.

### 4.2 `part_weld` (tầng cao)

```jsonc
part_weld {
  assembly: "nguoi-mau",
  a: "tayAoT",               // bộ phận thứ nhất
  b: "than",                 // bộ phận thứ hai
  softness: "vừa",           // "nhẹ" | "vừa" | "mạnh"  (mặc định "vừa")
  keep_children: true,       // bộ phận con của b chuyển sang a (mặc định true)
  preview: false             // true = tự render sau khi hàn
}
```

`softness` → `strength`: `nhẹ` 0.35, `vừa` 0.6, `mạnh` 0.85.

**Việc `part_weld` tự làm**
1. Gộp hình của `a` và `b` thành một hình mới (bake vị trí thế giới của cả hai vào một khung).
2. Gọi `shape_weld` với `radius: "auto"`.
3. Thay hai bộ phận bằng **một bộ phận mới**, giữ id của `a`.
4. Chuyển các bộ phận con của `b` sang `a` (nếu `keep_children`).
5. Nếu `a` và `b` khác vật liệu → **lỗi**, trừ khi truyền `material`.
6. Xoá các khớp/dây nối tham chiếu tới `b` (và báo lại đã xoá gì).

---

## 5. Thuật toán `shape_weld`

```
1. Dựng lưới A, B (đã có sẵn trong bộ dựng hình).
2. U = union(A, B)                          // manifold-3d, đã có
3. Tìm dải mối nối:
     với mỗi đỉnh v của U:
        da = khoảng cách từ v tới mặt A
        db = khoảng cách từ v tới mặt B
        v ∈ Seam  ⇔  da < ε và db < ε      // ε = 0.25 × radius
4. Trọng số mềm:  w(v) = smoothstep(1 − d(v, Seam) / radius)   // d = khoảng cách tới đỉnh Seam gần nhất
5. Chia mịn trong dải (detail): cạnh nào có cả hai đầu w > 0 và dài > detail → chia đôi, lặp ≤ 3 lần.
6. Làm mượt Taubin (không co thể tích):
     lặp K lần:
        v ← v + w·λ·(trung bình hàng xóm − v)      // λ = 0.5
        v ← v − w·μ·(trung bình hàng xóm − v)      // μ = 0.53   (Taubin: giữ thể tích)
   Chỉ đỉnh có w > 0 mới dịch; đỉnh w = 0 đứng yên tuyệt đối → phần còn lại của hình không đổi.
7. Kiểm tra: manifold kín, không tự xuyên (manifold `status()`), thể tích tăng < 25 %.
8. Nếu số tam giác > maxTriangles → `simplify(eps)` tới khi dưới ngưỡng.
9. Trả hình mới + số liệu.
```

**Vì sao Taubin mà không phải Laplacian thường:** Laplacian làm co khối (hình nhỏ lại sau mỗi
vòng). Taubin xen một bước "phình" nhẹ nên độ mượt tăng mà thể tích gần như giữ nguyên.

**Vì sao khoảng cách tới "mặt A" và "mặt B" mà không phải "cạnh giao":** không cần trích đường
giao — chỉ cần biết đỉnh nào **nằm sát cả hai mặt ban đầu**. Cách này bền với lưới lộn xộn do
boolean sinh ra, và không phụ thuộc góc gãy (khác `round_edges`).

**Tăng tốc:** lưới tam giác gia tốc (BVH) cho A và B. Dải cần tính rất hẹp nên chỉ duyệt đỉnh
trong khung bao mở rộng `radius`.

---

## 6. Kết quả trả về

Tool trả **số liệu**, không chỉ "xong":

```
Đã hàn than + tayAo → hình vaiWeld.
  Mối nối     : 1 dải, 9.283 đỉnh (5,1 % lưới)
  Lưới        : 41.200 → 63.700 tam giác (giới hạn 200.000)
  Khung bao   : không đổi  0,380 × 0,560 × 0,210 m
  Kín         : có        Tự xuyên: không
  Thể tích    : 0,0124 → 0,0131 m³  (+5,6 % — bình thường, hàn là đắp thêm)
  Bán kính    : 0,028 m (auto = 0,35 × 0,080)
  Thời gian   : 0,9 s
```

Ngưỡng cảnh báo:
- thể tích tăng > 25 % → "bán kính quá lớn, hình bị phình".
- khung bao đổi > 2 mm → "mối hàn đẩy hình ra ngoài".
- tam giác tăng > 3× → gợi ý giảm `detail` hoặc `strength`.

---

## 7. Lỗi và cách sửa (thông điệp phải chỉ luôn hành động)

| Tình huống | Thông điệp |
|---|---|
| Hai hình không chạm nhau | `Hai hình cách nhau 8 mm — đẩy b vào a thêm ≥ 8 mm rồi gọi lại.` |
| Chạm quá nông (< ε) | `Hai hình chỉ chạm ở một đường, không có vật liệu để hàn. Đẩy b vào sâu ≥ 10 mm.` |
| `radius` quá lớn | `Bán kính 50 mm > 0,4 × bề dày ống tay (38 mm) → chỗ nối sẽ bị thắt. Dùng ≤ 38 mm.` |
| Mối nối dài bất thường (2 mặt gần song song) | `Mối nối dài 0,42 m — hai mặt gần song song. Xoay b cho cắt vuông góc hơn, hoặc chấp nhận radius lớn.` |
| Vẫn còn cạnh gãy sau khi hàn | `Còn 12 đỉnh gãy > 35° trong dải. Tăng strength hoặc radius.` |
| Vật liệu khác nhau (chỉ `part_weld`) | `a là "ao", b là "quan" — hàn sẽ mất một màu. Truyền material nếu đồng ý.` |
| Vượt `maxTriangles` | `Cần 480.000 tam giác > giới hạn. Giảm detail, hoặc tăng maxTriangles.` |

---

## 8. Điểm neo

Kế thừa y như boolean:

- Giữ neo của cả hai hình đầu vào, có tiền tố: `than.center`, `tayAo.top`, …
- Thêm neo mới **`seam`**: tâm của dải mối nối + pháp tuyến trung bình — để agent gắn tiếp đồ
  (đường may, nút áo) vào đúng chỗ vừa hàn.
- Bo cạnh / khắc rãnh sau đó giữ nguyên các neo này (đã đúng với các op hiện có).

---

## 9. Ảnh hưởng tới phần khác

| Phần | Ảnh hưởng |
|---|---|
| Vật liệu | Một hình → **một vật liệu**. `part_weld` chặn nếu hai bên khác màu (trừ khi cho phép) |
| Vật lý | Hàn xong là **một vật rắn**, không còn khớp giữa hai chi tiết. Phải bỏ khớp/dây nối liên quan |
| Mô phỏng | Khối lượng/quán tính tính lại từ lưới mới — tự đúng, không cần sửa |
| Xuất GLB | Không đổi; lưới mới chỉ là một mesh nữa |
| Trang `/lap-rap-3d` | Không đổi; hình mới hiện ngay như mọi hình khác |
| Cụm (`part_save_as_type`) | Hàn trước khi lưu cụm thì cụm giữ mối hàn; lưu rồi mới hàn thì không |

---

## 10. Kế hoạch làm

| Bước | Nội dung | Nghiệm thu |
|---|---|---|
| **M1** | `shape_weld` lõi: union → tìm dải → Taubin, chưa chia mịn | Hai quả cầu chồng nhau: mối nối mất cạnh gãy, hình không co |
| **M2** | Chia mịn trong dải + giản lược + guard + `dryRun` | Cung tròn đều, không răng cưa; số liệu khớp thực tế |
| **M3** | `part_weld` tầng cao + chuyển con + bỏ khớp | Gọi một lệnh là xong, hình đúng |
| **M4** | Áp vào hình người: vai áo, hông quần, cổ tay | Ảnh trước/sau ở cùng góc; không còn khe |

**Tiêu chí đạt** (đo được, không phải "nhìn thấy mượt"):
- Góc gãy lớn nhất dọc mối nối **< 20°** (hiện tại ~60–90° ở chỗ bậc).
- Khung bao đổi **< 2 mm**.
- Số tam giác tăng **< 2×**.
- Thời gian dựng **< 2 s** cho hình cỡ người.
- Kín, không tự xuyên (qua `manifold.status()` + `check_interference`).

---

## 11. Giới hạn đã biết

- **Mất chuyển động riêng**: hàn xong thì hai chi tiết là một. Nếu cần xoay vai/gập gối thì đừng
  hàn chỗ đó — dùng khối chuyển tiếp (khớp cầu) thay thế.
- **Không tái tạo lưới đẹp**: kết quả vẫn là tam giác lộn xộn, chỉ là mối nối mượt. Muốn lưới bốn
  cạnh đều như hình mẫu thì phải nhập mô hình dựng sẵn, không phải việc của tool này.
- **Không thay cho retopology**: chi tiết sắc quanh mối nối (đường may, cúc) sẽ mềm đi.
- **Bán kính bị chặn bởi bề dày**: hàn chỗ mỏng (cổ tay Ø 60 mm) thì cung tối đa ~24 mm.

## 12. Việc để sau

- **`shape_bridge`**: khoét lỗ hai bên + nối ống (đúng Smart Bridge) — sạch hơn weld, nhưng phải
  sửa được lưới (khoét mặt), nhiều việc hơn.
- **SDF smooth-min**: cho chỗ nối "chảy" tự nhiên hơn nữa, cần voxel + marching cubes.
- **`shape_relax {where, radius}`**: làm mượt một vùng bất kỳ, không cần boolean — dùng cho các
  trường hợp lưới bị rối sau boolean.
