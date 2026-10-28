# Bo / đắp mối nối (`shape_bevel`): thiết kế

## 0. Trạng thái: ĐÃ CÓ trong kit (M1–M3); MCP cần khởi động lại

`shape_bevel` đã viết xong ở `fe/assembly-kit/shapes/bevel.ts` và đăng ký trong
`shapes/build.ts` (`OPS`, kiểm tra 1–2 input, kế thừa điểm neo), `core/types.ts` (`ShapeOp`), và
`fe/scripts/assembly-bridge/mcp.mjs` (schema + handler). Đã kiểm bằng số với
`fe/scripts/assembly-bridge/bevel-selftest.mjs` và chạy thật lên bộ ống gió
(`fe/scripts/assembly-bridge/bevel-ong.mjs`).

Cài đặt hiện tại (khác vài chỗ so với bản đề xuất đầu, ghi lại cho đúng):
- `add` **không** quét sợi đắp dọc đường giao; nó **đẩy dải mối nối ra ngoài theo pháp tuyến**
  (trường trọng số đã làm mượt) rồi miết Taubin. Rẻ hơn, không cần sắp thứ tự vòng, và cho đúng
  hình "đất nặn lăn quanh mối".
- `cut` dùng lại ruột "lăn bi" của `round_edges` (đã tách thành `rollEdgesToArc`), chỉ trên các cạnh
  gãy nằm trong dải mối nối.
- `auto` = có `other` thì `add` (mối của hai khối gộp LUÔN là góc lõm), không có `other` thì `cut`.
- `seamLoops` chỉ dùng để đếm/chọn vòng (`loop`) và đặt điểm neo, chưa dùng để giới hạn vùng đắp.

Vẫn là đề xuất, **chưa làm**: `part_bevel` (tầng bộ phận), chamfer thẳng, bán kính đổi dọc mối.
Mục §2–§13 dưới đây giữ nguyên như bản thiết kế gốc.

Tài liệu liên quan:
- `docs/assembly-weld-design.md`: `shape_weld` / `part_weld` (đã làm phần `shape_weld`).
- `docs/assembly-tool-design.md`: lõi lắp ráp (đặt chỗ, điểm neo, khớp).
- `docs/car-toolkit-design.md`: tạo hình, vật liệu, cảnh.

---

## 1. Vấn đề

Ba ca thật đã gặp trong bộ ống gió (Ø120, thành 8 mm, đoạn chéo 42°), và không ca nào cứu được
bằng tool hiện có:

| Hiện tượng (đã thấy trên màn hình) | Nguyên nhân hình học | Tool hiện có xử lý được? |
|---|---|---|
| Mối nối **có gờ gồ ghề**, chỉ mối dưới có, mối trên trơ | Hai khối **chồng vật liệu** ở mối dưới → `weld` miết được; mối trên hai ống gặp nhau ở **miệng ống** (lỗ) → không có đỉnh nào để miết | Không |
| Góc ngoài **vẫn sắc / vẫn hở**, không ra cung như hình vẽ tay | Cần **đắp thêm** vật liệu vào góc lõm; `weld` chỉ *dời* đỉnh sẵn có, không *sinh* vật liệu | Không |
| Bo thử bằng `round_edges` thì **ăn thủng vách 8 mm**, hoặc bo lây cả **miệng ống** | `round_edges` bo *mọi* cạnh > ngưỡng, bán kính bị chặn bởi bề dày | Không |
| Bản quét cong (một đường tâm) **nứt ở bụng cua** | Cua gắt bán kính 120 mm với ống Ø120 + khoét lòng bằng boolean trên vỏ mỏng | Không |

Điều cần: một op **bevel có chọn lọc** — biết *cạnh nào* thuộc mối nối, và biết cạnh đó **lồi**
(gọt) hay **lõm** (đắp). Đây đúng là thứ Blender gọi là **Bevel** (Ctrl+B, giới hạn theo góc) cộng
thêm phần mà Blender không có: **fillet lõm** (đắp như đất nặn).

---

## 2. Các cách đã cân nhắc

| Cách | Làm gì | Vì sao chọn / không chọn |
|---|---|---|
| **Mở rộng `round_edges`** (thêm `other`, `mode`) | Dùng lại toàn bộ phần lăn bi, thêm chọn cạnh theo mối | Rẻ nhất, nhưng làm op đang dùng cho thân xe/người mẫu phình tham số và khó đọc |
| **Op mới `shape_bevel`** (chọn) | Op riêng, 1–2 input, `mode: cut / add / auto` | Rõ nghĩa, không phá op cũ, đăng ký MCP riêng; dùng lại ruột của `round_edges` + `weld` |
| **Sợi đắp thủ công** (`sweep` + `union`) | Tự tính đường giao, quét sợi tròn, gộp | Chạy được ngay nhưng mỗi mối phải tính tay, không tái dùng, agent không nên phải làm |
| **Cắt vát miter rồi hàn** | Cắt hai đầu ống theo mặt phẳng chia đôi góc, áp khít, hàn | Đúng cách thợ làm, nhưng đổi hình học của chi tiết; chỉ dùng khi muốn mối *liền khối* |
| **Voxel remesh + smooth** | Voxel hoá cả cụm rồi nặn mượt | Liền thật nhưng nặng, mất chi tiết sắc, không điều khiển được chỗ nào mềm |
| **SDF metaball (smooth-min)** | Trường khoảng cách trộn mềm | Đẹp nhưng phải viết marching cubes, quá nặng cho nhu cầu |

Nguyên tắc: **chỉ đụng đúng dải quanh mối nối được chọn**, phần còn lại của hình giữ nguyên.

---

## 3. Một tầng hay hai tầng

```
shape_bevel (tầng thấp)  — nhận id HÌNH, trả về một hình mới
   ├─ (nếu có 2 input) boolean union
   ├─ tìm vòng mối nối (seamLoops)
   ├─ cut  : lăn bi trên cạnh lồi của vòng
   ├─ add  : quét sợi đắp dọc vòng + union + miết
   └─ kiểm tra: kín, thể tích trước/sau, tam giác, cạnh gãy còn lại
```

Mốc này chỉ làm **một tầng**. Tầng cao `part_bevel` (nhận id bộ phận, tự dọn khớp/dây thừa) để
sau — cùng kiểu quan hệ `shape_weld` → `part_weld`.

Lý do: `shape_bevel` là hình, nên dùng tiếp được cho boolean, mirror, pattern, và **quan trọng
nhất**: chạy được trên **khối đặc** trước khi khoét lòng.

---

## 4. API

```jsonc
shape_bevel {
  assembly: "ong-gio",
  id:       "gocMem",        // tên hình mới
  input:    "ongHan",        // bắt buộc — hình cần bo
  other:    "ongGoc",        // tuỳ chọn — có thì CHỈ bo đúng mối nối giữa input và other
  radius:   "auto",          // số mét, hoặc "auto" = 0,35 × bề dày nhỏ nhất, chặn 3–30 mm
  mode:     "auto",          // "cut" | "add" | "auto"
  loop:     0,               // khi mối nối có nhiều vòng: chọn vòng thứ mấy
  segments: 8,               // số đoạn của cung (độ mượt)
  profile:  0.5,             // 0..1: 0,5 = cung tròn đều; >0,5 phình ra; <0,5 lõm vào
  angle:    40,              // ngưỡng góc, dùng khi KHÔNG có `other`
  detail:   "auto",          // cỡ cạnh lưới trong dải bo (mặc định radius/3)
  maxTriangles: 300000
}
```

### 4.1 Tham số

| Tham số | Kiểu | Mặc định | Nghĩa |
|---|---|---|---|
| `input` | id hình | — | khối cần bo (phải kín) |
| `other` | id hình | — | nếu có: tìm mối nối giữa hai hình, **không** bo cạnh nào khác |
| `radius` | m \| `"auto"` | `"auto"` | bán kính cung. `"auto"` = 0,35 × bề dày nhỏ nhất của `input`, chặn 3–30 mm |
| `mode` | `cut` \| `add` \| `auto` | `auto` | `cut` = gọt góc lồi; `add` = đắp góc lõm; `auto` = tự xét từng cạnh |
| `loop` | số nguyên | `0` | mối nối có thể ra nhiều vòng; chọn theo chỉ số (0 = vòng dài nhất) |
| `segments` | 1..64 | `8` | số đoạn của cung; ảnh hưởng trực tiếp số tam giác |
| `profile` | 0..1 | `0.5` | dạng cung: 0,5 tròn đều, >0,5 phình (mối hàn dư), <0,5 lõm (rãnh) |
| `angle` | 1..179 | `40` | chỉ dùng khi không có `other` — ngưỡng "cạnh gãy" |
| `detail` | m \| `"auto"` | `radius/3` | cỡ cạnh lưới trong dải; nhỏ hơn = mượt hơn, nặng hơn |
| `maxTriangles` | số | `300000` | chặn trên; `detail` tự nới ra nếu vượt |

### 4.2 Khác biệt với `shape_round_edges`

| | `round_edges` | `shape_bevel` |
|---|---|---|
| Chọn cạnh | ngưỡng góc, **toàn hình** | theo **mối nối giữa 2 hình** (hoặc ngưỡng góc nếu không có `other`) |
| Chiều | chỉ **cắt** (góc lồi) | cắt **và** đắp (góc lõm) |
| Miệng ống | bị bo lây | không đụng, vì không nằm trên mối nối |
| Bán kính | bị chặn bởi bề dày | đắp được cung lớn hơn bề dày (vật liệu nằm ngoài) |
| Nhiều vòng | không phân biệt | chọn được bằng `loop` |

---

## 5. Thuật toán

### Bước 0 — chuẩn bị

- Dựng `input` (và `other` nếu có). Cả hai phải **kín** (manifold).
- Nếu có `other`: `union` hai hình thành `U`; giữ bản sao lưới của `A = input`, `B = other` để còn
  tính khoảng cách.
- Nếu không có `other`: `U = input`, và tập cạnh lấy bằng ngưỡng `angle` (đúng như `round_edges`).

### Bước 1 — tìm dải mối nối

Với mỗi đỉnh `v` của `U`:

```
d_a = khoảng cách(v, A);  d_b = khoảng cách(v, B)
thuộc mối nối  ⇔  d_a < ε  và  d_b < ε        (ε = 0,25 × detail)
```

Đây đúng là phép `weld` đang dùng (dải đỉnh nằm sát cả hai khối) → **dùng lại**, không viết mới.
Cạnh có cả hai đầu thuộc mối nối → tập cạnh ứng viên.

### Bước 2 — gom thành vòng (`seamLoops`)

Dựng đồ thị đỉnh–cạnh trên tập ứng viên, duyệt để ra các **đường kín**. Một mối nối có thể ra
nhiều vòng; ví dụ ống chéo xuyên miệng ống ngang sinh:

- vòng trên **mặt ngoài** hai ống (vòng cần bo/đắp),
- vòng ở **mép miệng ống** (vòng không nên đụng).

Chọn vòng theo `loop`, mặc định **vòng dài nhất**. Nếu không có vòng kín → báo lỗi (xem §8).

### Bước 3a — `cut` (gọt góc lồi)

Dùng lại ruột "lăn bi" của `round_edges`: với mỗi cạnh trong vòng, trục bo song song cạnh và cách
đều hai mặt một khoảng `radius`; đỉnh nằm trên một trong hai mặt, cách cạnh `s < T = radius·tan(θ/2)`
được đưa lên cung. Chỗ giao nhiều cạnh (góc) xử lý như code hiện tại.

Khác biệt duy nhất so với `round_edges`: **tập cạnh đầu vào** là tập của Bước 2, không phải toàn hình.

### Bước 3b — `add` (đắp như đất nặn)

1. Lấy vòng ở Bước 2, chiếu mỗi điểm ra ngoài dọc **pháp tuyến trung bình** của hai mặt tại điểm đó
   → đường tâm sợi đắp.
2. Quét mặt cắt tròn bán kính `radius × profile` dọc đường đó (`sweep`), sợi nằm lọt **~60 %** vào
   trong khối, **~40 %** thò ra. Hai đầu sợi vuốt nhỏ dần (scaleEnd 0,1) để không lộ mấu.
3. `union` sợi vào `U`.
4. **Miết** dải tiếp giáp: làm mượt Taubin (λ 0,5 / μ −0,53) số vòng `20 + 60 × strength`, giống
   `weld`, chỉ trên các đỉnh trong bán kính `2 × radius` quanh vòng.

### Bước 3c — `auto`

Xét từng cạnh của vòng: hai mặt pháp tuyến `n1`, `n2`, cạnh tiếp tuyến `t`.

```
cạnh LỒI  ⇔  (n1 × n2) · t  và  góc nhị diện > 180°   →  cut
cạnh LÕM  ⇔  ngược lại                                →  add
```

Chạy `cut` và `add` trên hai tập con trong **cùng một lượt** (đắp trước, gọt sau) để không gọt
mất phần vừa đắp.

### Bước 4 — kiểm tra

- Đóng kín lại (`toManifold`), nếu không kín → **báo lỗi**, không trả hình rách.
- Báo **thể tích trước / sau**, số tam giác, và số cạnh gãy > `angle` **còn lại trong vùng bo**
  (phải bằng 0 với `cut`, hoặc giảm rõ với `add`).
- Nếu `cut` mà thể tích **giảm quá 35 %** → nghi ăn thủng vách → cảnh báo kèm gợi ý giảm `radius`.

---

## 6. Thứ tự bắt buộc khi làm ống rỗng

Bevel **phải** chạy trên **khối đặc**, rồi mới khoét lòng bằng `boolean subtract`:

```
3 ống ĐẶC  →  union  →  shape_bevel  →  subtract lòng Ø104
```

Làm ngược lại (bo trên vỏ 8 mm) thì cung bán kính > 8 mm sẽ cắt xuyên vách — đúng vết nứt đã thấy
ở bản quét cong. Op ghi rõ điều này trong thông điệp khi phát hiện `input` là vỏ mỏng (bề dày nhỏ
nhất < 2 × radius).

---

## 7. Kết quả trả về

```
bevel (auto) ongHan + ongGoc: bán kính 12 mm, 1 vòng (dài 0,41 m), 38 cạnh
  cắt 24 cạnh, đắp 14 cạnh, 8 đoạn/cung
  thể tích 0,011594 → 0,011702 m³ (+0,9 %)
  88070 tam giác, kín (manifold NoError), còn 0 cạnh gãy > 40° trong vùng bo
khung bao [-0,16, 0, -0,0608] → [0,29, 0,42, 0,0607]
điểm neo (khung của hình):
  seam (axis) [0,1708, 0,2863, 0] → [0,0,1], R 0,012     ← tâm mối nối, để ghép tiếp
```

---

## 8. Lỗi và cách sửa (thông điệp phải chỉ luôn hành động)

| Tình huống | Thông điệp |
|---|---|
| Hai hình không chạm nhau | `"ongHan" và "ongGoc" không chạm nhau (xa nhất 12 mm) — không có mối nối để bo. Dùng part_update để đẩy chúng chồng nhau vài mm, hoặc bỏ other.` |
| Chỉ chạm một đường, không chồng | `Hai hình chỉ chạm một đường — dải mối nối rỗng. Đẩy chúng cắm vào nhau ≥ 2 mm.` |
| Mối nối có nhiều vòng | `Mối nối có 3 vòng (dài 0,41 / 0,38 / 0,12 m). Đang bo vòng 0 (dài nhất); đổi bằng loop: 1 hoặc 2.` |
| Không ra vòng kín | `Không gom được vòng kín (86 % cạnh rời). Hình có thể bị rách — chạy shape_boolean union trước rồi bo.` |
| Ăn thủng vách | `Cung 20 mm ăn thủng vách dày 8 mm (thể tích −41 %). Giảm radius xuống ≤ 12 mm, hoặc bo trên khối đặc rồi mới khoét lòng.` |
| `add` trên mối nối ở miệng ống | `Vòng chọn đi qua mép miệng ống — đắp vào đây sẽ bịt miệng. Chọn loop khác, hoặc hàn trước (shape_weld) để có vật liệu nền.` |

---

## 9. Điểm neo

`shape_bevel` giữ **nguyên** các điểm neo của `input` (kể cả điểm neo kế thừa từ boolean), và thêm:

| Tên | Loại | Ý nghĩa |
|---|---|---|
| `seam` | axis | tâm vòng mối nối, hướng = pháp tuyến trung bình, `R` = radius. Để ghép tiếp (đai ốp, giá đỡ) |
| `seamStart` / `seamEnd` | point | hai đầu vòng khi vòng không kín (chỉ dùng cho chẩn đoán) |

Quy ước kế thừa giống `boolean`: hình khoét/bo giữ điểm neo của hình gốc với tiền tố
`"<idHìnhGốc>.<điểmNeo>"` khi cần phân biệt.

---

## 10. Ảnh hưởng tới phần khác

| Việc | File | Ghi chú |
|---|---|---|
| Thuật toán bevel | `fe/assembly-kit/shapes/bevel.ts` (mới) | dùng lại `weld.ts` (dải mối nối, Taubin) và `ops-solid.ts` (lăn bi) |
| Tách `seamLoops()` | `fe/assembly-kit/shapes/seam.ts` (mới) | hàm thuần: 2 lưới → các vòng điểm; test riêng được |
| `roundEdges` nhận tập cạnh | `fe/assembly-kit/shapes/ops-solid.ts` | thêm tham số `edges?` (mặc định = như hiện tại) — `round_edges` không đổi hành vi |
| Đăng ký op | `fe/assembly-kit/shapes/build.ts` | thêm `"bevel"` vào `OPS`; kiểm tra 1–2 input; kế thừa điểm neo |
| Kiểu dữ liệu | `fe/assembly-kit/core/types.ts` | `ShapeOp` thêm `"bevel"` |
| Tool MCP | `fe/scripts/assembly-bridge/mcp.mjs` | schema `shape_bevel` + handler `upsertShape("bevel", args)`; mô tả phải nhắc "bo trên khối đặc rồi mới khoét lòng" |
| Hướng dẫn agent | `fe/scripts/assembly-bridge/instructions.mjs` | thêm 3 dòng: khi nào dùng `bevel` thay `weld`/`round_edges` |

Điểm cần nhớ: bridge **đóng gói kit một lần lúc khởi động**, nên sau khi thêm op phải khởi động
lại thì tool mới hiện (đúng như `shape_weld` hiện nay).

---

## 11. Kế hoạch làm

| Mốc | Nội dung | Ước lượng |
|---|---|---|
| **M1** | Tách `edges?` khỏi `roundEdges`; `bevel.ts` chế độ `cut` với 1 input | ~150 dòng |
| **M2** | `seam.ts`: `seamLoops()`, chọn vòng, `other` (2 input), test 2 trụ vuông góc | ~120 dòng |
| **M3** | Chế độ `add` (quét sợi + union + miết) và `auto` | ~120 dòng |
| **M4** | Schema MCP, `bevel-selftest.mjs`, chạy thật lên `ong-gio-han` | ~80 dòng |

Mỗi mốc phải **dừng và xem ảnh** trước khi sang mốc sau.

---

## 12. Kiểm thử (bằng số, không bằng mắt)

`fe/scripts/assembly-bridge/bevel-selftest.mjs`:

| Ca | Hình | Kỳ vọng |
|---|---|---|
| 1 | Hai hộp ghép góc L, `cut`, r = 20 mm | thể tích **giảm**, kín, 0 cạnh gãy > 40° trong vùng bo |
| 2 | Hai trụ Ø60 vuông góc (chữ T), `add`, r = 15 mm | thể tích **tăng**, kín, không tam giác lật |
| 3 | Hai trụ Ø120, 42° (đúng ống gió), `auto`, r = 12 mm | chỗ lõm tăng, chỗ lồi giảm, tổng thể tích đổi < 3 % |
| 4 | Hộp 200 × 200 × 8 mm + trụ, `cut`, r = 20 mm | **báo lỗi ăn thủng**, không trả hình rách |
| 5 | Hai trụ **không chạm** (cách 5 mm) | **báo lỗi** "không chạm nhau", kèm hành động |

Tiêu chí chung: mọi kết quả phải `manifest NoError`, thể tích hữu hạn, khung bao không nở quá
`2 × radius` ngoài dự kiến.

---

## 13. Giới hạn đã biết

1. **Không phải bevel tổng quát như Blender.** Blender bo được một *tập cạnh do người dùng chọn*
   trên lưới bất kỳ; ở đây chọn theo **mối nối hai hình** hoặc **ngưỡng góc**. Muốn bo một cạnh lẻ
   giữa hình thì phải tách hình đó ra.
2. **`add` bám theo đường giao**, nên chất lượng phụ thuộc đường giao. Chỗ hai mặt gần song song
   (grazing) đường giao dài và nhiễu → sợi đắp sẽ gợn. `weld` xử lý ca đó tốt hơn.
3. **Không tự biết "chỗ nào cần mượt"**. Vẫn phải nói `other` hoặc `loop`; tool không đoán được ý
   người dùng như Blender có người ngồi chọn cạnh.
4. **Thành rất mỏng (< 2 mm)** vẫn có thể rách khi miết; khi đó phải bo trên khối đặc.

---

## 14. Việc để sau

- `part_bevel`: tầng bộ phận, nhận nhiều cặp bộ phận, tự dọn khớp/dây thừa.
- Bé vát (chamfer, cung thẳng) ngoài cung tròn: `profile` hiện chỉ đổi độ phình, chưa có cung
  thẳng.
- Bo **không đều**: bán kính thay đổi dọc mối (chỗ cần dày chỗ mảnh).
- Ghi thẳng kết quả bevel vào `.glb` kèm vật liệu theo vùng (mối hàn thường khác màu thép).
