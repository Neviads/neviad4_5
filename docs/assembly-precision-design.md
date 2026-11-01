# Bộ tool lắp ráp và mô phỏng chung: thiết kế

## 0. Trạng thái: bước 1–3 đã chạy (MCP `neviad-assembly`)

- **Bộ giải chung** `fe/assembly-kit/physics/` (TypeScript, dùng chung Node và trình duyệt):
  - `solver.ts`: XPBD vật rắn. Có khớp quay, trượt, cố định; động cơ tốc độ hoặc mô-men; bánh răng ở mức vận tốc.
  - **Va chạm:** bao lồi–bao lồi bằng điểm dò (đỉnh và tâm mặt) cộng mặt đất; ma sát tĩnh và động; hệ số phục hồi.
  - `build-model.ts`: gom bộ phận thành vật; khối lượng, trọng tâm, quán tính tích phân từ lưới × khối lượng riêng (lưới hở thì dùng bao lồi); bao lồi va chạm ≤ 256 đỉnh.
  - `geometry.ts`: duỗi phẳng bản lắp ráp, kể cả cụm lồng.
- **Selftest đã kiểm:**
  - Rơi tự do ½gt²; nằm yên trên sàn.
  - Va chạm hai hộp: e = 1 và e = 0 khớp công thức.
  - Con lắc thanh: T = 1,6375 s, lý thuyết 1,6379 s.
  - Đĩa lăn: ω·R = v.
  - Bánh răng: tỉ số 0,5.
- **Tool vật lý:** `physics_setup`, `body_set`, `initial_set`, `drive_add`, `simulate`, `sim_export`.
- **Tham chiếu kế thừa:**
  - boolean giữ điểm neo của dao (`hoc.axis`); bo cạnh và khắc giữ nguyên; pattern đánh số `spoke[2].…`; mirror thêm hậu tố `~m`.
  - `parseRef` cho phép dấu chấm trong tên điểm neo.
- **Khớp trong cụm:** `part_save_as_type` lưu kèm khớp; `setPose` và `assembly_view` nhận tên `cum/khop`; mô hình vật lý tự mở rộng các khớp này.
- **Kiểm tra:** `check_interference` (giao khối manifold), `check_clearance` (`minGap`), `check_floating`, `check_physics`.
- **Thử với hai sedan đâm nhau** (bản `va-cham-sedan` trong xưởng, chạy bằng `simulate`): chạm đúng thời điểm tính tay, bánh lăn nhờ ma sát, động lượng giữ trong khoảng 3%. Trang thí nghiệm riêng đã bỏ.
- **Chưa làm:** bước 4–7 (lò xo, dây, vải; đại lượng ẩn như điện; dò tia; chất lỏng; tham số; liếc nhanh). Bộ giải chạy trên luồng chính (Web Worker để sau). Giới hạn góc của khớp chưa áp vào bộ giải; `couple` của khớp bị bỏ qua khi mô phỏng; mỗi vật chỉ có một bao lồi va chạm.
- **Kế hoạch làm tiếp, chia giai đoạn kèm ca kiểm:** `docs/assembly-physics-roadmap.md`. Chỗ nào khác với các mục 5–9 bên dưới thì theo lộ trình đó.

## 1. Mục tiêu và ý tưởng chính
Agent dựng **mọi vật** rồi cho nó **hoạt động**: máy móc, dụng cụ thí nghiệm, dây, vải, nước, mạch điện, thấu kính. Agent **chỉ nói quan hệ**: "trục xuyên lỗ", "treo quả nặng vào dây", "nối cực + của pin với đèn", "đổ nước tới 200 ml". Mọi con số do tool suy ra.

**Ý tưởng chính (như Blender và các engine hiện đại):** mọi thứ nhìn thấy và chuyển động được đều quy về **điểm có toạ độ và vận tốc, cộng ràng buộc giữa các điểm**.
- Vật rắn, vật mềm, dây, vải, chất lỏng, bản lề, bánh răng **chạy chung một bộ giải**, không chia miền.
- Những đại lượng **không phải toạ độ** (dòng điện, nhiệt độ, từ trường) đi qua một **lớp mỏng**. Lớp này đọc toạ độ và vận tốc, rồi trả lại lực hoặc trạng thái hiển thị. Cuối cùng mọi thứ vẫn thành toạ độ để mắt thấy.
- **Ánh sáng:** phần nhìn để bộ render lo (dò tia thật). Chỉ tính tia khi thí nghiệm cần **đo**.

Tài liệu liên quan:
- `docs/assembly-tool-design.md`: lõi lắp ráp hiện có.
- `docs/car-toolkit-design.md`: tạo hình, vật liệu, cảnh.
- `docs/che-tao-bang-code.md`: chế tạo ngoài đời sang code.

### Bài học từ chiếc sedan
- **Vị trí đúng nhờ ràng buộc,** nhưng trục bánh vẫn do agent gõ số.
- **Bánh lăn bằng tỉ số tự tính,** cụm lưu lại thì mất khớp.
- **Va chạm hai xe là công thức viết tay** trong trang, không có lật hay xoay.
- **Kiểm tra chỉ theo hộp bao.**

Kiến trúc dưới đây giải quyết cả bốn mà không cần tool riêng cho xe.

## 2. Kiến trúc
```
Agent: nói quan hệ
  │
  ├─ A. Hình         (đã có) tiện, đùn, quét, loft, boolean, bo cạnh, khắc, tách vùng, vật liệu
  ├─ B. Tham chiếu   điểm neo tự sinh từ tính năng, chọn theo đặc điểm
  ├─ C. Lắp ráp      ràng buộc đặt chỗ (giải tư thế ban đầu, dạng cây) + mảng lắp
  │
  ├─ D. Bộ giải chung: điểm + ràng buộc (XPBD)
  │      vật rắn · vật mềm · dây · vải · chất lỏng · khớp · tiếp xúc · va chạm
  │        ▲ lực, trạng thái           │ toạ độ, vận tốc
  ├─ E. Lớp đại lượng ẩn: dòng điện, nhiệt, từ (phương trình gắn vào bộ phận)
  ├─ F. Quang: render cho mắt; dò tia khi cần đo
  │
  ├─ G. Kiểm tra     xuyên nhau, khe hở, quét chuyển động, đứng vững, lơ lửng, thông số, liếc nhanh
  └─ H. Dùng lại     cụm có tham số, chi tiết chuẩn
```
- **A–C** dựng nên **tư thế ban đầu** (như hiện nay).
- **D** làm cho vật **chạy theo vật lý** từ tư thế đó.
- **E–F** thêm những gì không phải toạ độ.
- **G** kiểm tra cả dựng lẫn chạy.

---

## 3. Tầng B: Tham chiếu theo tính năng

### `[tự động]` Điểm neo kế thừa từ dao cắt
- **Boolean:** mỗi hình dao để lại điểm neo trên kết quả, tên `<idDao>.<diemNeo>`. Ví dụ khoét bằng trụ `hoc` thì có `hoc.axis`, `hoc.top`, `hoc.bottom`.
- **Pattern:** đánh số bản sao, `lo[0]` … `lo[n]`.
- **Groove:** để lại `start`, `end`, `mid`.
- **Split region:** để lại `center` cùng pháp tuyến.
- Kết quả: bánh xe ghép `coaxial` vào `than.hocTruocT.axis`, **không còn số gõ tay**.

### `ref_find {target, kind: face|edge|axis|point, where}`
- **`where`:** `{normal, largest}`, `{cylinder, radius: [a, b]}`, `{edge: "longest"}`, `{nearest: [x, y, z]}`.
- **Trả về:** các ứng viên (kích thước, vị trí). Agent đặt tên bằng `anchor_define {from: "ref:…"}`.
- **Cách làm:** gom tam giác cùng pháp tuyến hoặc cùng trụ thành mặt; tìm cạnh gãy; lấy trục của mặt trụ.

### Ổn định khi sửa
Điểm neo gắn với tên tính năng, không gắn với chỉ số tam giác. Sửa làm mất một điểm neo đang được dùng thì báo lỗi kèm tên bộ phận ghép vào nó.

---

## 4. Tầng C: Lắp ráp (tư thế ban đầu)
Giữ bộ giải dạng cây hiện có (`onto`, `touch`, `coaxial`, `through`, `fixed`), thêm các kiểu ghép:

| Kiểu | Ý nghĩa |
|---|---|
| `parallel`, `perpendicular`, `distance`, `angle` | Quan hệ hướng và khoảng cách giữa hai tham chiếu |
| `tangent` | Mặt phẳng hoặc trụ tiếp xúc trụ: con lăn, ròng rọc |
| `insert` | Trục cắm vào lỗ tới vai: chốt, ốc, đui đèn |
| `symmetric` | Đối xứng một bộ phận qua mặt phẳng |

`part_pattern {part, along: "lo[*]"}` lắp một bản sao vào mỗi tham chiếu khớp mẫu, ví dụ 6 ốc vào 6 lỗ.

**Vòng kín** (tay quay – thanh truyền, cơ cấu 4 khâu) **không giải ở tầng này** nữa. Tầng C chỉ đặt gần đúng; ràng buộc phụ được giao cho tầng D, và bộ giải điểm tự kéo về đúng. Tầng C vì vậy luôn là cây, đơn giản.

---

## 5. Tầng D: Bộ giải chung, điểm và ràng buộc

### 5.1 Mô hình
Mỗi bước thời gian:
1. Dự đoán vị trí theo vận tốc và lực.
2. Lặp chiếu các ràng buộc (XPBD: mỗi ràng buộc kéo các điểm của nó về chỗ thoả mãn, độ cứng tính bằng độ mềm α).
3. Suy ra vận tốc mới từ vị trí cũ và mới.

Cùng một vòng lặp cho mọi loại vật:

| Vật hay liên kết | Điểm | Ràng buộc |
|---|---|---|
| **Vật rắn** | Tâm khối và hướng (hoặc cụm điểm) | Khớp hình (shape matching), hoặc vật rắn XPBD có quán tính |
| **Bản lề, trục, ray, cầu** | Điểm neo trên hai vật | Hai điểm trùng nhau; hướng trục trùng nhau |
| **Bánh răng, đai, vít** | Góc của hai vật | Góc₁·r₁ + góc₂·r₂ = 0 (bánh răng); tương tự cho đai và vít |
| **Lăn, trượt trên mặt** | Điểm tiếp xúc | Không xuyên mặt; ma sát (không trượt nếu đủ bám) |
| **Lò xo, dây chun** | Hai đầu | Khoảng cách với độ mềm α = 1/k |
| **Dây, xích** | Chuỗi điểm | Khoảng cách giữa các điểm liền nhau ≤ L (dây chùng được) |
| **Vải, màng** | Lưới điểm | Khoảng cách, uốn |
| **Cao su, vật mềm khối** | Lưới tứ diện | Thể tích, khoảng cách |
| **Chất lỏng** | Đám hạt | Mật độ không đổi (PBF), dính, nhớt |
| **Va chạm** | Mọi vật | Không xuyên nhau (lưới va chạm đơn giản hoá: bao lồi, cầu, hộp) |

- Mọi khớp lắp ráp hiện có (quay, trượt, ghép theo tỉ số) **quy về ràng buộc** trong bảng trên.
- Khớp **có giới hạn** thì thêm ràng buộc bất đẳng thức.
- Khớp **dẫn** (động cơ, tay người quay) thì thêm ràng buộc vận tốc hoặc lực đặt vào.

### 5.2 Tham số vật lý (tự suy ra, không bắt agent nhập)
| Tham số | Lấy từ đâu |
|---|---|
| Khối lượng, trọng tâm, quán tính | Lưới kín × khối lượng riêng của vật liệu (thép 7850, nhôm 2700, gỗ 600, cao su 1100, kính 2500 kg/m³) |
| Ma sát, hệ số phục hồi | Bảng theo cặp vật liệu (cao su–nhựa đường 0,8; thép–thép 0,5…) |
| Hình va chạm | Bao lồi hoặc ghép hình cơ bản, tự sinh từ lưới |

Agent ghi đè khi cần (vật rỗng, vật mua sẵn).

### 5.3 Tool
| Tool | Làm gì |
|---|---|
| `physics_setup {assembly, gravity?, substeps?}` | Biến bản lắp ráp thành hệ điểm và ràng buộc. Báo: số vật, số ràng buộc, khối lượng từng vật, khớp nào thành ràng buộc gì |
| `body_set {part, mass?, fixed?, collider?, material?}` | Ghi đè tính chất vật lý của một bộ phận; `fixed` cho vật đứng yên (đế, tường) |
| `link_add {kind, a, b, …}` | Liên kết vật lý thêm, không phải lắp ráp: `spring {k, rest}`, `rope {length, segments}`, `damper {c}`, `contact`, `weld` (dính vào nhau sau va chạm) |
| `soft_make {part, kind: cloth\|rope\|volume, stiffness}` | Đổi một bộ phận thành vật mềm (lưới điểm) |
| `fluid_add {container, volume \| level, liquid}` | Đổ chất lỏng vào bình (hạt hoặc mặt thoáng giản lược) |
| `drive_add {joint, kind: speed\|torque\|force\|position, value \| curve}` | Động cơ, tay quay, lực đẩy |
| `initial_set {part, velocity?, angularVelocity?}` | Vận tốc đầu, ví dụ xe chạy 54 km/h |
| `simulate {duration, dt?, record: [đại lượng]}` | Chạy trong Node, trả bảng số theo thời gian: vị trí, vận tốc, động lượng, năng lượng, lực ở khớp. Không cần trình duyệt |
| `sim_export {path}` | Xuất cấu hình cho trang: trang chạy cùng bộ giải theo thời gian thực, người dùng kéo thả, chỉnh tham số |

### 5.4 Ví dụ
- **Hai xe đâm nhau:**
  - `initial_set` cho hai xe vận tốc đầu.
  - Bánh lăn bằng ràng buộc lăn trên mặt đường, có ma sát.
  - Hai xe va chạm bằng lưới va chạm thật: xoay, lệch, hoặc dính nhau (`weld` khi e = 0).
  - Trang không còn công thức va chạm viết tay.
- **Con lắc lò xo:** đế `fixed` → `link_add spring {k: 40}` → quả nặng 200 g. `simulate` trả chu kỳ, so được với 2π√(m/k).
- **Con lắc đơn có dây thật:** `link_add rope {length: 1}` nối giá treo với quả nặng. Dây chùng được khi quả nặng bị ném lên.
- **Bình thông nhau:** `fluid_add` vào một nhánh; mực hai nhánh tự cân bằng.

### 5.5 Hiệu năng (máy yếu)
- `simulate` chạy trong Node (MCP), không đụng trình duyệt.
- Trang chạy bộ giải trong **Web Worker**, nên giao diện không đứng; số vòng lặp tự giảm khi máy chậm.
- Vật rắn dùng ít điểm (tâm và hướng). Chỉ vật mềm và chất lỏng mới nhiều điểm. Va chạm dùng lưới giản lược, không dùng lưới hiển thị.

---

## 6. Tầng E: Lớp đại lượng ẩn
Cho những thứ **không phải toạ độ**: dòng điện, điện áp, nhiệt độ, từ trường. Mỗi bộ phận khai báo **cổng** (kiểu điện, nhiệt, từ) và **vài phương trình**. Liên kết là "nối cổng A với cổng B"; tool tự sinh luật chung: đại lượng ngang (điện thế, nhiệt độ) bằng nhau, đại lượng dòng (dòng điện, dòng nhiệt) có tổng bằng 0.

### 6.1 Ghép với tầng D (hai chiều)
| Đọc từ tầng D | Ghi về tầng D |
|---|---|
| Vận tốc góc rô-to → suất điện động trong cuộn dây | Lực hãm Lenz → mô-men lên rô-to |
| Vị trí nam châm → từ thông qua cuộn dây | Lực từ → lực lên nam châm và cuộn |
| Ma sát trượt → nhiệt sinh ra | Nhiệt độ → giãn nở (đổi độ dài ràng buộc) |

Ngoài ra lớp này ghi **trạng thái hiển thị**: độ sáng bóng đèn, góc kim đồng hồ, màu dây nóng đỏ, cột thuỷ ngân. Góc kim và cột thuỷ ngân là toạ độ, nên lại đi qua tầng D.

### 6.2 Bộ phận mẫu (mỗi loại vài dòng phương trình)
| Bộ phận | Cổng | Phương trình |
|---|---|---|
| Pin | điện ±, nhiệt | V = E − I·r |
| Điện trở, bóng đèn | điện, nhiệt | V = I·R(T); công suất → nhiệt và độ sáng |
| Cuộn dây quay trong từ trường | điện, cơ | e = −dΦ/dt; τ = B·I·N·S·sinθ |
| Tụ điện, cuộn cảm | điện | I = C·dV/dt; V = L·dI/dt |
| Ampe kế, vôn kế | điện, cơ (kim) | Góc kim ∝ I (hoặc V); điện trở trong |
| Nam châm | từ, cơ | Mô hình lưỡng cực; lực lên lưỡng cực khác |
| Vật nóng | nhiệt | C·dT/dt = Σ dòng nhiệt; dẫn nhiệt và toả nhiệt |

### 6.3 Tool
| Tool | Làm gì |
|---|---|
| `port_connect {a: "pin.plus", b: "den.a"}` | Nối hai cổng cùng kiểu. Dây `route` hiện có trở thành dây dẫn thật, có điện trở theo chiều dài và tiết diện |
| `circuit_report` | Sơ đồ nút: nút nào nối nút nào, dòng và áp mỗi nhánh ở tư thế hiện tại, báo hở mạch hoặc chập |
| `probe_add {port \| part, quantity}` | Đặt đầu đo để `simulate` ghi lại: dòng qua đèn, nhiệt độ dây, suất điện động |

Bộ giải: hệ phương trình vi phân–đại số nhỏ, giải cùng bước thời gian với tầng D (tách bước: D trước, E sau, rồi trao đổi lực).

---

## 7. Tầng F: Quang học
- **Nhìn:** bộ render lo. Thấu kính, lăng kính, nước đều khúc xạ đúng nhờ vật liệu kính (`transmission`, `ior`). Không cần tool riêng.
- **Đo:** `ray_trace {from, dir \| towards, count?, maxBounces?}` dò tia qua các bộ phận có chiết suất và gương (theo lưới thật). Trả về đường đi và điểm hội tụ.
  - Ví dụ: vật cách thấu kính 15 cm, f = 10 cm → ảnh thật cách 30 cm.
  - Tia được vẽ bằng `route` để người xem thấy.
- **Bộ phận quang có tham số:** thấu kính (tiêu cự hoặc bán kính hai mặt, chiết suất), gương phẳng và cầu, lăng kính, màn chắn, nguồn sáng (chùm song song hoặc điểm). Hình sinh từ tham số bằng tiện và đùn.

---

## 8. Tầng G: Kiểm tra
Mọi tool **chỉ đọc**, trả danh sách lỗi có mức độ, vị trí và gợi ý.

| Tool | Kiểm tra |
|---|---|
| `check_interference` | Xuyên nhau theo lưới thật (manifold), bỏ qua cặp ghép chặt có khai báo |
| `check_clearance {a, b, min}` | Khe hở nhỏ nhất theo lưới thật (BVH) |
| `check_motion {joint, range, steps}` | Quét dải khớp, báo tư thế đầu tiên va chạm hoặc kẹt |
| `check_stability` | Trọng tâm có nằm trong chân đế; góc nghiêng tối đa trước khi đổ |
| `check_floating` | Bộ phận không chạm gì; cụm không nối về gốc |
| `check_physics` | Chạy `simulate` ngắn: vật có nổ tung, rơi xuyên sàn, năng lượng tăng vô lý không (dấu hiệu ràng buộc mâu thuẫn) |
| `check_geometry` | Lưới hở, mặt lật, cạnh còn sắc, chi tiết quá mảnh |
| `check_spec` | So số đo, khối lượng với thông số agent khai báo (`spec_set`) |
| `check_glance` | Ảnh nhỏ và bóng đen: dấu hiệu "ghép hộp", kim loại quá tối, decal bị cắt (chạy trong trang, ảnh preview) |
| `check_all` | Gộp tất cả, sắp theo mức độ |

---

## 9. Tầng H: Dùng lại
- **Cụm có tham số:** `part_save_as_type` nhận `params` và lưu **cả khớp, liên kết vật lý, cổng** của cụm. Ví dụ `banhXe(vanh, beRong, tiLe)`, `conLac(chieuDai, khoiLuong)`.
- **Khớp và cổng trong cụm** lộ ra ngoài theo tên: `xeA/banhTruocT`, `mayPhat/cucDuong`. Bản ngoài dẫn động hoặc nối được.
- ~~**Chi tiết chuẩn**~~ (ốc ISO, ổ bi, pin AA, thấu kính theo tiêu cự…): **đã bỏ** (2026-10-31). Kit không có đồ dựng sẵn (thư viện bộ phận và preset vật liệu đã gỡ vì thành lời giải mẫu cho agent). Agent tự dựng hình và tự khai thông số thật; linh kiện điện, nguồn nhiệt chỉ là hành vi gắn lên bộ phận (xem `assembly-physics-roadmap.md`).

---

## 10. So với hiện trạng
Cập nhật 2026-10-31 (bảng cũ viết trước bước 1–3).

| Phần | Đã có | Thiếu |
|---|---|---|
| A. Hình | Tiện, đùn, quét, loft, đối xứng, lặp, boolean, bo cạnh, khắc, tách vùng, hàn, đắp mối nối, mài; vật liệu tự định nghĩa | Tách khối thành panel kín, vỏ (`shell`), điêu khắc, nhập mesh |
| B. Tham chiếu | Điểm neo theo khung bao và phép dựng, `anchor_define`, kế thừa từ dao cắt, `~m`, `[i]` | `ref_find` |
| C. Lắp ráp | 5 kiểu ghép, cây, cụm đã lưu kèm khớp, `couple` theo tỉ số hoặc bảng | Kiểu ghép hướng và khoảng cách, `part_pattern` |
| D. Bộ giải chung | Vật rắn XPBD, khớp quay, trượt, cố định, động cơ, bánh răng, va chạm bao lồi, ma sát | Giới hạn khớp, `couple` khi mô phỏng, vật lõm, lò xo, dây, vải, chất lỏng (lộ trình giai đoạn 1–3, 7) |
| E. Đại lượng ẩn | Máy phát viết tay riêng (`generator-sim.ts`) | Toàn bộ (lộ trình giai đoạn 4–5) |
| F. Quang | Render khúc xạ đúng | `ray_trace` (lộ trình giai đoạn 6) |
| G. Kiểm tra | `check_interference`, `check_clearance`, `check_floating`, `check_physics`, `measure` | `check_motion`, `check_stability`, `check_geometry`, `check_spec`, `check_glance`; kiểm theo tư thế |
| H. Dùng lại | Cụm đã lưu kèm khớp, khớp trong cụm `cum/khop` | Cụm có tham số |

## 11. Thứ tự làm
1. **D lõi:** vật rắn, khớp (quay, trượt, cầu, lăn, bánh răng), va chạm bao lồi, `physics_setup`, `initial_set`, `simulate`. Làm lại thí nghiệm hai xe bằng bộ giải thật để thử.
2. **B kế thừa từ dao cắt, H khớp trong cụm:** bỏ số gõ tay, bánh xe trong cụm lăn được.
3. **G phần lưới thật:** `check_interference`, `check_clearance`, `check_floating`, `check_physics`.
4. **D mở rộng:** lò xo, dây, vải (`link_add`, `soft_make`). Con lắc, dao động.
5. **E:** cổng điện, pin, đèn, cuộn dây quay, đồng hồ. Làm lại máy phát điện bằng bộ giải chung, thay `generator-sim.ts`.
6. **F:** `ray_trace` và bộ phận quang.
7. **D chất lỏng, H tham số và chi tiết chuẩn, G liếc nhanh.**

## 12. Ghi chú kỹ thuật
- **XPBD:** Müller và cộng sự, "XPBD: Position-Based Simulation of Compliant Constrained Dynamics" (2016), "Detailed Rigid Body Simulation with XPBD" (2020); chất lỏng theo "Position Based Fluids" (2013).
- **Viết bộ giải trong `fe/assembly-kit/physics/`,** TypeScript thuần, không phụ thuộc three, để Node (MCP `simulate`) và trình duyệt (Web Worker) dùng chung đúng một mã. Hai nơi cho cùng kết quả.
- **Ranh giới với Rapier đang dùng ở trang máy phát:** XPBD thay được Rapier cho vật rắn và thêm vật mềm, dây, chất lỏng trong cùng bộ giải. Nếu cần độ chính xác cao hơn cho vật rắn thuần, giữ Rapier làm phương án phụ qua cùng giao diện `physics_setup`.
- **Lưới va chạm:** bao lồi hoặc ghép bao lồi, tính bằng manifold (đã có `hull`); lưu kèm lưới nướng sẵn.
