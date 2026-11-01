# Lộ trình mở rộng bộ vật lý của assembly-kit

Kế hoạch làm dần, gắn với code, cho phần tầm nhìn ở `assembly-precision-design.md` §5–§9. Hiện bộ vật lý (`fe/assembly-kit/physics/`) chỉ có cơ học vật rắn; tài liệu này chia việc mở rộng thành 8 giai đoạn, mỗi giai đoạn có tool, mô hình dữ liệu, ca kiểm bằng đáp số và điều kiện xong. Đã làm (2026-10-31): mục 1.2 và 1.3 của Giai đoạn 1 (couple thành ràng buộc, bỏ đường riêng `gears`), cùng vòng kín và phần vị trí của động cơ tốc độ (xem §0 của `assembly-tool-design.md`). Các phần khác chưa làm.

## Hiện trạng code (điểm xuất phát)
- `physics/model.ts`: `PhysicsModel {version: 1, gravity, groundPlane, substeps, bodies, joints, gears, initial, notes}`; `PhysicsConfig` lưu trong `doc.physics`.
- `physics/build-model.ts` `buildPhysicsModel(doc)`: gom bộ phận thành vật; khối lượng, quán tính tích phân từ lưới × `density` (`materialProps` ở `physics/geometry.ts`); **một bao lồi cho cả vật** (≤ 256 đỉnh); `free` bỏ khớp.
- `physics/solver.ts` `World`: mỗi substep tích phân → `solveJoint` → tiếp xúc (điểm dò vs mặt bao lồi) → vận tốc từ vị trí → ma sát động, phục hồi → `solveMotor`, `solveGear`. Hàm dùng lại được: `applyPositional`, `applyAngular`, `applyImpulse`, `invW`, `invInertiaWorld`.
- MCP (`fe/scripts/assembly-bridge/mcp.mjs`): `physics_setup`, `body_set`, `initial_set`, `drive_add`, `simulate`, `sim_export`, `check_physics`; `physicsModel(doc)` có cache và ghi `.assembly-bridge/physics/<key>.json` cho trang.
- Trang: `fe/app/lap-rap-3d/Studio.tsx` tạo `new World(model)` rồi `view.setWorld(path, chain(world.matrix(b), part.offset))`.

**Lỗ hổng đã biết** (mục tiêu của Giai đoạn 1):
- `JointModel.limits` được truyền vào nhưng `solveJoint` không áp.
- ~~`couple` (tỉ số, bảng, lăn tự tính) bị bỏ qua khi dựng mô hình.~~ Đã làm: `PhysicsModel.couples` (bản 2).
- ~~`physics.gears` có trong cấu hình nhưng không tool nào đặt được.~~ Đã làm: đọc như couple.
- Một bao lồi cho cả vật, nên vật lõm (cốc, khung chữ U, bình) va chạm sai.
- Không báo lực ở khớp.
- Trang chạy bộ giải trên luồng chính.

---

## Nguyên tắc chung (áp cho mọi giai đoạn)
1. **Một bộ giải, hai nơi chạy.** TypeScript thuần trong `fe/assembly-kit/`, không phụ thuộc three; Node và trình duyệt cho cùng kết quả với cùng `dt`.
2. **Mỗi định luật mới phải có selftest so với đáp số tính tay**, có dung sai ghi rõ. Không có ca kiểm thì không coi là xong.
3. **Không đồ dựng sẵn.** Không thư viện linh kiện, vật liệu hay "chi tiết chuẩn". Agent tự khai thông số thật: suất điện động và điện trở trong của pin, nhiệt dung riêng, điện trở suất. Tool thiếu thông số thì báo lỗi, không tự điền.
4. **Mô tả tool tả cơ chế và tiêu chí vật lý, không gọi tên vật demo.** Hướng dẫn chung (`instructions.mjs`) giữ dưới 3 500 ký tự; chi tiết nằm trong mô tả từng tool.
5. **Mô hình có phiên bản.** `PhysicsModel.version` tăng khi thêm trường; trang đọc được bản cũ (trường mới là tuỳ chọn).
6. **Tham số vật liệu vật lý** thêm vào `MaterialDef` (`fe/assembly-kit/core/types.ts`) khi giai đoạn cần: `resistivity`, `specificHeat`, `conductivity`, `thermalExpansion`. Tất cả tuỳ chọn, chỉ bắt buộc khi bộ phận tham gia hiện tượng đó. Kiểm tra trong `checkMaterialDef` (`core/materials.ts`).
7. **Selftest vật lý tách file riêng:** `fe/scripts/assembly-bridge/physics-selftest.mjs`, theo mẫu `bevel-selftest.mjs` (bundle kit qua `selftest-lib.mjs`), để `mcp.mjs --selftest` không phình thêm. Thêm vào danh sách selftest trong `CLAUDE.md`.

---

## Giai đoạn 0 — Nền (S)
- **Web Worker cho trang:** chuyển vòng `world.step` của `Studio.tsx` sang worker (`fe/assembly-kit/physics/worker.ts`); mỗi khung hình worker gửi về `Float32Array` ma trận các vật (transferable). Tự giảm substep khi khung hình chậm. Việc này cần trước khi thêm hạt (dây, chất lỏng).
- **API trạng thái chung:** `World.state()` trả `{t, bodies: {id: {x, q, v, w}}, links, quantities}` để trang và `simulate` đọc cùng một chỗ. Các giai đoạn sau thêm `quantities` (dòng điện, nhiệt độ…).
- **`simulate {record}` mở rộng:** nhận tên đại lượng (`"xeA.v"`, `"khop1.force"`, sau này `"den.I"`), không chỉ tên vật.
- **Dựng `physics-selftest.mjs`** và chuyển các ca vật lý hiện có (rơi tự do, va chạm e = 0/1, con lắc thanh, đĩa lăn, bánh răng) từ `mcp.mjs` sang đó.

**Xong khi:** trang chạy mô phỏng không giật giao diện; mọi ca vật lý cũ đạt trong file mới.

## Giai đoạn 1 — Hoàn thiện cơ học vật rắn (M)
1. **Giới hạn khớp.** Trong `solveJoint` (`solver.ts`): tính giá trị khớp hiện tại (quay: góc quanh trục từ `qrel`; trượt: độ dời dọc trục). Ra ngoài `limits` thì thêm hiệu chỉnh góc hoặc vị trí một phía (bất đẳng thức), kèm phục hồi ở bước vận tốc như tiếp xúc.
   Ca kiểm: con lắc thả từ 90° chạm chặn ở 30° và dừng đúng 30° ± 0,5°; năng lượng sau chặn ≤ trước.
2. **`couple` thành ràng buộc.** ĐÃ LÀM: `solveCouplePosition` / `solveCoupleVelocity` trong `solver.ts`; vòng kín (`doc.loops`) thành khớp ghim `point`; động cơ tốc độ có thêm phần vị trí (`solveMotorPosition`). Ca kiểm nằm trong `mcp.mjs --selftest` (mục "liên động"), chưa tách sang `physics-selftest.mjs`.
   - `build-model.ts` đọc `joint.couple` và sinh `CoupleModel {a, b, kind: ratio|table, ratio?, table?}`.
   - Solver tổng quát hoá `solveGear`: tỉ số giữa hai khớp bất kỳ, quay–quay, quay–trượt (thanh răng: v = ω·r) hoặc trượt–trượt, ở mức vận tốc, kèm hiệu chỉnh vị trí để không trôi dần.
   - Bảng: ràng buộc vị trí C = θ_b − f(θ_a), gradient lấy từ độ dốc đoạn nội suy (`interpolate` ở `core/solve.ts`).
   - "Lăn tự tính" (bánh theo khớp trượt) **không** thành ràng buộc khi `free` bỏ khớp trượt (lúc đó ma sát lo); ghi vào `model.notes`.
   - Ca kiểm: bánh răng 2:1 qua `couple`; thanh răng–bánh răng v = ωr; cơ cấu theo bảng đi đúng các điểm của bảng ± 1 %.
3. **Tool `gear_add`/`couple` cho vật lý:** ĐÃ LÀM. bỏ đường riêng `physics.gears` (hiện chỉ selftest đặt được); vật lý dùng thẳng `couple` của khớp. Giữ đọc `gears` cũ.
4. **Động cơ vị trí (servo):** `drive_add {kind: "position", value | curve: [[t, giá trị], …], maxForce}`. Ràng buộc góc hoặc vị trí khớp theo thời gian, có độ mềm. Kim đồng hồ đo ở Giai đoạn 4 sẽ dùng lại.
   Ca kiểm: khớp bám đường cong với sai số < 1 % khi tải nhẹ.
5. **Lực ở khớp:** lưu λ của mỗi ràng buộc khớp mỗi substep; lực = λ/h². `simulate {record: ["khop.force"]}`.
   Ca kiểm: con lắc đứng yên ở đáy có lực treo = m·g; trên đỉnh vòng tròn đúng m(v²/R − g).
6. **Va chạm vật lõm.**
   - Mỗi vật mang **nhiều bao lồi**: mặc định một bao cho mỗi bộ phận (đã có lưới riêng từng bộ phận trong `build-model.ts`).
   - `body_set {collider: "parts" | "hull" | "box" | "sphere"}`.
   - Bộ phận tự lõm (cốc tiện có `wall`) thì tách lồi gần đúng: cắt lưới theo lưới ô (voxel) rồi lấy bao lồi từng ô, bằng `Manifold.hull` có sẵn.
   - `penetration` và `candidates` trong `solver.ts` lặp qua danh sách bao.
   - Ca kiểm: bi nằm yên trong lòng cốc; khối trượt trong rãnh chữ U không xuyên vách.
7. **Mặt phẳng nghiêng và ma sát chuẩn.**
   Ca kiểm: khối trên dốc θ có a = g(sinθ − μcosθ) ± 2 %; ở góc tanθ < μ thì đứng yên.
8. **(Tuỳ chọn) chống xuyên với vật nhanh:** quét hình cầu bao theo quãng đi trong bước, chia nhỏ bước cho vật đó.

**Tool mới hoặc sửa:** `drive_add` (kind `position`), `body_set` (`collider`), `simulate` (`record` đại lượng). `check_physics` thêm cảnh báo khớp vượt giới hạn.

## Giai đoạn 2 — Liên kết mềm: lò xo, giảm chấn, dây (M)
- **Mô hình:** `LinkModel {id, kind: "spring" | "damper" | "rope" | "rod", a, b, pointA, pointB, rest, k?, c?, length?, segments?}`; cấu hình `doc.physics.links`.
- **Điểm gắn bằng điểm neo** (`"boPhan.diemNeo"`, kể cả trong cụm), đổi sang khung vật bằng `anchorFrame` (`core/solve.ts`). Không gõ toạ độ.
- **Solver:**
  - Lò xo: ràng buộc khoảng cách XPBD với độ mềm α = 1/k.
  - Giảm chấn: lực −c·(vận tốc tương đối dọc phương) ở bước vận tốc.
  - Thanh cứng: α = 0.
  - Dây: thêm tập **hạt** vào `World` (`particles: {x, v, invMass, radius}`), nối liền bằng ràng buộc khoảng cách một phía (≤ đoạn), nên dây chùng được. Hạt va chạm mặt đất và các bao lồi (dùng `penetration`).
- **Hiển thị** (`fe/assembly-kit/three/build-scene.ts`):
  - `view.setLink(id, pa, pb)`: lò xo vẽ là đường xoắn có số vòng cố định, bước giãn theo khoảng cách hai đầu (cùng kiểu `sweep` xoắn, dựng lại lưới nhẹ mỗi khung hoặc co giãn dọc trục).
  - Dây vẽ là ống qua các hạt (cùng cách vẽ `route`: `TubeGeometry` qua đường cong).
- **Tool:**
  - `link_add {id, kind, a, b, k?, c?, rest?, length?, segments?}` trả về độ dài nghỉ, độ dãn ban đầu, lực ban đầu.
  - `link_remove`.
  - Mô tả nói rõ khi nào dùng lò xo, dây hay thanh, bằng tiêu chí vật lý.
- **Ca kiểm:**
  - Con lắc lò xo T = 2π√(m/k) ± 1 %; hai lò xo nối tiếp và song song.
  - Giảm chấn: biên độ giảm theo e^(−c·t/2m) ± 3 %.
  - Con lắc đơn bằng dây, góc nhỏ: T = 2π√(L/g) ± 1 %.
  - Ném vật nối dây lên cao thì lực căng bằng 0 trong lúc dây chùng.
  - Ròng rọc cố định hai vật (máy Atwood): a = g(m₁ − m₂)/(m₁ + m₂) ± 2 %.
- **2b (sau, L):** vải và màng (`soft_make {part, kind: "cloth"}`: lưới hạt, ràng buộc kéo và uốn); vật mềm khối (tứ diện, ràng buộc thể tích). Cần Giai đoạn 0 (worker).

## Giai đoạn 3 — Lực của môi trường: đẩy Ác-si-mét, lực cản (S–M)
- **Tool `medium_set`:** `{id, region: {below: y} | {inside: "boPhan"}, density, viscosity?, dragCoefficient?}`. Agent tự khai khối lượng riêng và độ nhớt của chất lỏng hay khí.
- **Lực đẩy:** mỗi bước, cắt bao lồi của vật bằng mặt thoáng (cắt khối lồi bằng mặt phẳng thì tính giải tích được, rẻ), ra thể tích chìm V và tâm đẩy. Lực F = ρ·g·V đặt tại tâm đẩy, nên vật tự lật về tư thế cân bằng.
- **Lực cản:** F = ½ρC_d·A·v² (A là diện tích chiếu của bao lồi theo phương vận tốc), cộng lực nhớt Stokes khi vận tốc nhỏ. Mô-men cản quay.
- **Hiển thị:** mặt nước là hình tĩnh agent tự dựng; trang chỉ cần bộ giải.
- **Ca kiểm:**
  - Hộp gỗ nổi với độ chìm h = m/(ρ_nước·A) ± 2 %.
  - Vật nặng hơn nước chìm; vật rỗng nổi.
  - Rơi trong không khí đạt vận tốc giới hạn v = √(2mg/(ρC_dA)) ± 3 %.
  - Bi rơi trong dầu theo Stokes v = 2r²(ρ_bi − ρ_dầu)g/(9η) ± 5 %.

## Giai đoạn 4 — Điện và điện từ (tầng E) (L)
- **Module mới `fe/assembly-kit/circuit/`:**
  - `model.ts`: netlist gồm nút, nhánh, linh kiện.
  - `solver.ts`: phương pháp nút cải tiến (MNA). Mỗi bước giải hệ tuyến tính nhỏ (khử Gauss, vài chục nút). Tụ và cuộn cảm dùng mô hình tương đương Euler lùi. Đèn có điện trở phụ thuộc nhiệt độ (nối Giai đoạn 5); diode tuyến tính từng khúc.
- **Linh kiện là hành vi gắn lên bộ phận, không phải hình dựng sẵn.**
  - `component_set {part, kind, params, ports}`, với `kind`: `source` (E, r), `resistor` (R), `lamp` (R nóng, công suất định mức), `switch` (gắn trạng thái vào một khớp: góc cần gạt thì đóng hoặc mở), `capacitor` (C), `inductor` (L), `meter` (ampe hoặc vôn, điện trở trong; điều khiển một khớp kim bằng động cơ vị trí của Giai đoạn 1), `coil` (N vòng, diện tích hoặc lấy từ hình), `motor`.
  - Cổng là điểm neo của bộ phận, nên dây `route` nối được và trông đúng.
- **Dây dẫn thật:** `route_add {…, conductor: true}`. Điện trở R = ρ·L/S, với L là độ dài route đã tính và S từ `radius`, ρ là `resistivity` của vật liệu (bắt buộc khi `conductor: true`). Hoặc `port_connect {a, b}` cho nối không vẽ dây.
- **Từ trường:** `field_set {id, part?, region: "boPhan" | box, B: [x, y, z] (T)}`, từ trường đều trong vùng; agent tự khai độ lớn.
- **Ghép cơ–điện** (theo §6.1 của tài liệu thiết kế cũ):
  - Cuộn dây trên khớp quay trong từ trường: Φ = N·B·S·cos θ từ góc khớp. Suất điện động e = −dΦ/dt tính từ θ và ω của bộ giải cơ.
  - Dòng I từ mạch sinh mô-men τ = N·B·I·S·sin θ, trả về khớp như động cơ mô-men.
  - Vành trượt hay cổ góp: tham số `rectify` của `coil`.
  - Nam châm chuyển động qua cuộn dây (cảm ứng do dịch chuyển): Φ theo vị trí khớp trượt, tính bằng bảng do bộ dựng mô hình lấy mẫu trước.
- **Tách bước:** cơ học trước, rồi mạch đọc θ và ω, giải ra I, rồi lực và mô-men áp vào substep sau. Ghi rõ sai số tách bước trong ca kiểm năng lượng.
- **Tool:**
  - `component_set`, `port_connect`, `field_set`.
  - `circuit_report`: sơ đồ nút, dòng và áp từng nhánh ở tư thế hiện tại; báo hở mạch, chập mạch, cổng chưa nối.
  - `probe_add` hoặc `simulate {record: ["den.I", "pin.V", "cuon.emf"]}`.
- **Hiển thị:** đèn sáng theo công suất (`emissiveIntensity`); kim đồng hồ là khớp thật; dòng điện vẽ được bằng vân trượt dọc dây (sau).
- **Ca kiểm:**
  - Định luật Ôm, mắc nối tiếp và song song; định luật Kirchhoff.
  - Nạp và xả tụ τ = RC ± 1 %; mạch RL τ = L/R.
  - Máy phát: suất điện động cực đại NBSω ± 1 %, tần số = ω/2π.
  - Định luật Lenz: rô-to quay tự do có tải chậm dần; động năng mất bằng ∫I²R dt ± 3 % (kiểm bảo toàn năng lượng giữa hai bộ giải).
  - Động cơ không tải: ω → V/(NBS) ± 2 %.
- **Nghiệm thu:** dựng lại máy phát điện quay tay chỉ bằng tool, thay được `fe/app/may-phat-dien-xoay-chieu/generator-sim.ts`.

## Giai đoạn 5 — Nhiệt (M)
- **Mạng nhiệt gom cục** dùng lại bộ giải MNA của Giai đoạn 4 (tương tự điện–nhiệt: nhiệt độ ↔ điện thế, dòng nhiệt ↔ dòng điện, nhiệt dung ↔ tụ, nhiệt trở ↔ điện trở). Đặt ở `fe/assembly-kit/thermal/` hoặc chung `circuit/` với miền khác nhau.
- **Nút nhiệt:** mỗi bộ phận có C = m·c, với m từ lưới × `density` và c = `specificHeat` (bắt buộc khi bộ phận tham gia nhiệt).
- **Dẫn nhiệt:** giữa hai bộ phận chạm nhau (lấy từ quan hệ `onto`/`touch` của lắp ráp, hoặc từ sự kiện tiếp xúc), G = k·A/L ước từ diện tích tiếp xúc. `thermal_link {a, b, G}` để agent ghi đè.
- **Đối lưu và bức xạ ra môi trường:** `ambient_set {T, h}`.
- **Nguồn nhiệt:** I²R từ mạch (tự động); `heat_source {part, power}` cho ngọn lửa hay bếp.
- **Ghép cơ–nhiệt:**
  - Giãn nở: độ dài nghỉ của `link` hoặc kích thước đổi theo `thermalExpansion`·ΔT. Chỉ làm cho liên kết, không biến dạng lưới.
  - Khí trong xi lanh: `gas_set {id, chamber: "boPhan", piston: "khop", area, n, node}`. Thể tích V = V₀ + A·x (x là giá trị khớp trượt), áp suất p = nRT/V, lực (p − p₀)·A đặt lên khớp. Quá trình đẳng nhiệt hay đoạn nhiệt chọn bằng tham số.
- **Hiển thị:** màu theo nhiệt độ (đỏ dần khi nóng) qua `emissive` của vật liệu ở trang.
- **Ca kiểm:**
  - Nguội theo Newton: T(t) = T_mt + (T₀ − T_mt)e^(−t·hA/mc) ± 1 %.
  - Hai vật trao đổi nhiệt tới nhiệt độ cân bằng (m₁c₁T₁ + m₂c₂T₂)/(m₁c₁ + m₂c₂) ± 0,5 %.
  - Nhiệt lượng Joule Q = I²Rt ± 1 %.
  - Khí đẳng nhiệt pV không đổi ± 1 %; đoạn nhiệt pV^γ không đổi.
- **Nghiệm thu:** động cơ nhiệt hai xi lanh chạy bằng nguồn nhiệt, ra được công trên trục.

## Giai đoạn 6 — Quang hình (tầng F) (M)
- **Module `fe/assembly-kit/optics/raytrace.ts`:** cây BVH tự viết trên lưới thế giới của các bộ phận (dùng `worldGeometry` ở `physics/geometry.ts`; repo không có `three-mesh-bvh`, tự viết vì đơn giản).
  - Tia giao tam giác; khúc xạ theo Snell với `ior` của vật liệu (đã có trong `MATERIAL_PARAMS`).
  - Phản xạ toàn phần; gương khi vật liệu có `metalness` = 1 hoặc bộ phận khai `optic: "mirror"`.
  - Tán sắc: `ior` theo bước sóng bằng công thức Cauchy, agent khai hệ số B, C.
- **Tool:**
  - `ray_trace {from: "boPhan.diemNeo", dir | towards, count, spread, maxBounces, wavelengths?}` trả đường đi từng tia, hướng ra, điểm hội tụ (giao bình phương tối thiểu), góc lệch.
  - `ray_show {id, …}` lưu tia vào tài liệu để trang vẽ (ống mảnh phát sáng).
- **Không có bộ phận quang dựng sẵn.** Thấu kính là hình agent tự tiện (`shape_lathe`) với bán kính hai mặt thật; tool chỉ đo.
- **Ca kiểm:**
  - Thấu kính hai mặt lồi tiện từ R₁, R₂, n: tiêu cự khớp công thức thợ kính ± 2 % (tia gần trục).
  - Ảnh của vật ở d cho d' theo 1/f = 1/d + 1/d' ± 2 %.
  - Gương phẳng: góc tới bằng góc phản xạ.
  - Góc giới hạn sin i = 1/n; lăng kính có góc lệch cực tiểu đúng công thức ± 0,5°.

## Giai đoạn 7 — Chất lỏng thật và sóng (L, tuỳ chọn)
- **Chất lỏng hạt (Position Based Fluids):** chạy trong worker, giới hạn 2–5 nghìn hạt. Cần Giai đoạn 1.6 (va chạm vật lõm) để bình chứa được nước.
  - Tool `fluid_add {container, volume | level, density, viscosity}`.
  - Ca kiểm: bình thông nhau cân bằng mực ± 2 %; áp suất đáy ρgh.
- **Sóng mặt nước:** bộ giải lưới độ cao 2D (nước nông) trên mặt thoáng, nguồn dao động gắn vào khớp. Ca kiểm: vận tốc sóng √(g·h) ± 3 %; giao thoa hai nguồn ra đúng vị trí cực đại.
- Sóng âm và chất khí chuyển động thật: ngoài phạm vi.

---

## Thứ tự và cỡ việc
| Thứ tự | Giai đoạn | Cỡ | Mở ra |
|---|---|---|---|
| 1 | 0 Nền (worker, state, selftest riêng) | S | Điều kiện cho mọi giai đoạn sau |
| 2 | 1 Cơ học vật rắn hoàn chỉnh | M | Cơ cấu chạy bằng lực thật, vật lõm, lực khớp |
| 3 | 2 Lò xo, dây | M | Dao động, ròng rọc, con lắc dây |
| 4 | 3 Ác-si-mét, lực cản | S–M | Nổi chìm, rơi có cản |
| 5 | 4 Điện, điện từ | L | Mạch, máy phát, động cơ |
| 6 | 5 Nhiệt | M | Truyền nhiệt, động cơ nhiệt |
| 7 | 6 Quang hình | M | Thấu kính, gương, lăng kính |
| 8 | 7 Chất lỏng, sóng | L | Bình thông nhau, sóng nước |

Mỗi giai đoạn là một (hoặc vài) commit riêng, kèm cập nhật §0 của tài liệu thiết kế và mô tả tool.

## File chính sẽ đụng (khi làm)
- `fe/assembly-kit/physics/model.ts`, `build-model.ts`, `solver.ts`, `geometry.ts`; mới: `physics/worker.ts`, `circuit/`, `thermal/`, `optics/`.
- `fe/assembly-kit/core/types.ts` (`MaterialDef` thêm thuộc tính vật lý, `Route.conductor`), `core/materials.ts`.
- `fe/assembly-kit/three/build-scene.ts` (`setLink`, đèn sáng, màu nhiệt, tia).
- `fe/scripts/assembly-bridge/mcp.mjs` (tool mới), `instructions.mjs` (một dòng mỗi mảng), mới: `physics-selftest.mjs`.
- `fe/app/lap-rap-3d/Studio.tsx` (worker, hiển thị đại lượng).

## Kiểm tra cho từng giai đoạn
1. `node fe/scripts/assembly-bridge/physics-selftest.mjs`: mọi ca đáp số đạt (in bảng ca, kết quả, đáp số, sai lệch).
2. `node fe/scripts/assembly-bridge/mcp.mjs --selftest` cùng các selftest bevel, weld, sand vẫn đạt.
3. `npx tsc --noEmit` và `npm --prefix fe run lint` sạch.
4. Reconnect MCP, dựng một thí nghiệm nghiệm thu chỉ bằng tool (vật không có trong mô tả tool), `simulate` so với tính tay, mở `/lap-rap-3d` xem chạy mượt.

## Rủi ro
- **Tách bước giữa các bộ giải** (cơ ↔ điện ↔ nhiệt) làm lệch năng lượng: kiểm bằng ca bảo toàn năng lượng, giảm `dt` nếu cần.
- **Va chạm vật lõm bằng voxel** làm số bao lồi tăng, chậm đi: giới hạn số bao mỗi vật, cache trong `.physics.json`.
- **Hạt (dây, chất lỏng) trên máy yếu:** bắt buộc worker và giới hạn số hạt; `simulate` trong Node có trần thời gian chạy.
- **Mô hình phình to:** giữ các trường mới là tuỳ chọn, chỉ sinh khi tài liệu dùng tới.
