# Chế tạo vật thể bằng code: ánh xạ từ công cụ ngoài đời

Tiêu chuẩn đặt ra: **nhìn nhanh mà mắt tự tách được vật thành hình cơ bản (hộp, trụ, cầu) thì vật không chân thực.**

Vật thật qua được tiêu chuẩn này vì hình của nó mang dấu vết của cách nó được làm ra:

- góc lượn của khuôn đúc,
- mặt cong liền của tấm dập,
- đường hàn và đầu ốc ở chỗ nối,
- cạnh đã vê, mặt đã mài hoặc sơn.

Tài liệu này ánh xạ từng hành động chế tạo ngoài đời sang một thao tác trong code, để công cụ số để lại đúng những dấu vết đó.

## Cách đọc bảng

**Độ khả thi:**

| Mức | Nghĩa |
|---|---|
| ✅ | three.js có sẵn hoặc viết được trong vài trăm dòng. |
| 🟡 | Làm được nhưng cần thư viện ngoài hoặc thuật toán đáng kể. |
| 🔴 | Khó làm tổng quát. Chỉ làm được cho trường hợp riêng, hoặc phải thay bằng cách khác. |

**Các thư viện được nhắc tới:**

| Thư viện | Vai trò |
|---|---|
| `three` | `LatheGeometry`, `ExtrudeGeometry`, `TubeGeometry`, `Shape`, `CatmullRomCurve3`, `MeshPhysicalMaterial`, `RGBELoader`, `GLTFLoader`. |
| `manifold-3d` (WASM) | Phép boolean (cộng, trừ, giao) trên lưới kín, nhanh và không thủng lưới. |
| `three-bvh-csg` | Phép boolean thuần JS, kém bền hơn `manifold-3d`. |
| `opencascade.js` / `replicad` | Lõi CAD B-rep, tức hình biểu diễn bằng mặt toán học như phần mềm CAD thật: bo cạnh (fillet), vát cạnh (chamfer), loft, shell. Nặng (~10 MB WASM) nhưng là cách duy nhất để bo cạnh tổng quát. |
| Subdivision (Catmull-Clark, Loop) | Làm mượt lưới thô thành mặt cong. |
| Texture thủ tục (canvas, shader noise) | Vân gỗ, xước, bụi, độ nhám không đều. |

---

## 1. Tạo hình từ khối: bớt vật liệu đi

| Ngoài đời | Trong code | Khả thi | Ghi chú |
|---|---|---|---|
| **Tiện** | `lathe(profile)`: biên dạng `[r, y]` xoay quanh trục (`THREE.LatheGeometry`) | ✅ | Đúng bản chất vật tròn xoay. Profile phải có **độ dày thành** (đi lên mặt ngoài, bo qua miệng, đi xuống mặt trong) như ly trong `Bàn thí nghiệm.html`. Điểm neo (đáy, miệng, trục) suy ra từ profile. |
| **Tiện ren, khía nhám** | lathe kèm dịch chuyển theo góc (xoắn), hoặc normal map | 🟡 | Ren thật thì dịch theo hàm xoắn. Khía nhám ở núm vặn thì chỉ cần normal map. |
| **Phay mặt, phay rãnh, phay hốc** | `extrude(outline)` rồi **trừ boolean** công cụ dao (hộp hoặc trụ quét theo đường chạy dao) | 🟡 | Dùng `manifold-3d`. Đáy và góc hốc phải có bán kính bằng bán kính dao; đây chính là dấu vết làm hốc phay trông thật. |
| **Khoan, doa** | trừ một trụ, kèm vát miệng lỗ | ✅ / 🟡 | Lỗ có miệng vát nhỏ 0,3–1 mm thì mép mới bắt sáng. |
| **Đục, chạm, gọt** | sculpt: dịch đỉnh lưới theo trường nhiễu hoặc theo nét | 🔴 | Không tổng quát được. Vật điêu khắc nên lấy mesh có sẵn (mục 7). |

## 2. Tạo hình từ chất lỏng hoặc dẻo: đổ vào khuôn

| Ngoài đời | Trong code | Khả thi | Ghi chú |
|---|---|---|---|
| **Đúc kim loại** | hợp boolean các khối thô, rồi **bo mọi giao tuyến** (fillet) | 🟡 / 🔴 | Đặc trưng của vật đúc là góc lượn ở mọi chỗ giao. Bo cạnh tổng quát cần lõi B-rep (`opencascade.js`). Cách rẻ hơn: SDF (hình định nghĩa bằng hàm khoảng cách) kèm **smooth union**, tức hợp mềm có bán kính lượn k, rồi marching cubes (thuật toán dựng lưới từ SDF) ra lưới. |
| **Ép phun nhựa** | như đúc, nhưng là vỏ mỏng: **shell** (khoét rỗng, giữ thành dày t) cộng bo cạnh cộng gân | 🟡 | Có `shell` trong `opencascade.js`. Vỏ nhựa cần thêm đường phân khuôn (một gờ mảnh) và lỗ ốc. |
| **Thổi thuỷ tinh, thổi nhựa** | lathe có thành dày đều, miệng bo tròn | ✅ | Phần còn lại do vật liệu quyết định: `transmission`, `ior`, `thickness`, `attenuation`. |
| **Bàn xoay gốm** | lathe, cộng nhiễu nhẹ theo chiều cao và theo góc | ✅ | Gốm làm tay hơi lệch, không tròn tuyệt đối. Biên độ nhiễu khoảng 0,2–0,5 mm. |

## 3. Tạo hình từ tấm: uốn, dập, kéo

| Ngoài đời | Trong code | Khả thi | Ghi chú |
|---|---|---|---|
| **Dập, kéo sâu** (vỏ ô tô, nồi, lon) | **loft**: nối mượt nhiều mặt cắt ngang. Hoặc lưới thô rồi **subdivision** | 🟡 | Đây là thứ còn thiếu để làm thân ô tô. Loft cho kích thước chính xác; subdivision cho mặt cong mượt nhưng khó khống chế số đo. Ra mặt cong hai chiều liền một tấm. |
| **Chấn gấp** | profile tấm (đường gấp khúc) đùn theo chiều dài, **mỗi nếp gấp có bán kính uốn** bằng độ dày tấm | ✅ | Tôn gấp góc 90° sắc là dấu hiệu giả. Nếp thật luôn tròn. |
| **Gò, cán cong** | sweep một tấm theo cung | ✅ | |
| **Cắt tấm** (laser, kéo) | outline 2D đùn bằng độ dày tấm, kèm vát hoặc bo mép rất nhỏ | ✅ | |

## 4. Tạo hình theo đường: kéo dài một mặt cắt

| Ngoài đời | Trong code | Khả thi | Ghi chú |
|---|---|---|---|
| **Đùn** (thanh nhôm định hình, ống) | `extrude(outline, depth, bevel)` | ✅ | Phải có `bevelEnabled`. Mặt cắt định hình thật có nhiều bậc và rãnh, không phải hình chữ nhật. |
| **Uốn ống** | `sweep(section, path)`: mặt cắt chạy dọc đường cong (`TubeGeometry` hoặc frame tự tính) | ✅ | Đoạn uốn có bán kính tối thiểu khoảng 2–3 lần đường kính ống. Không có khúc gập gãy. |
| **Cuốn lò xo** | sweep theo đường xoắn ốc, hai đầu mài phẳng | ✅ | Bước xoắn đổi theo khớp nén hoặc giãn. |
| **Kéo sợi, bện dây** | sweep nhiều sợi xoắn quanh nhau, hoặc một ống kèm normal map | ✅ / 🟡 | Dây điện: lõi đồng cộng vỏ nhựa, đầu tuốt vỏ. |

## 5. Nối các phần lại

Chỗ nối là nơi mắt dễ phát hiện "hình ghép" nhất. Mỗi kiểu nối là một **bộ phận phụ do công cụ tự thêm** khi AI khai báo cách ghép.

| Ngoài đời | Trong code | Khả thi | Ghi chú |
|---|---|---|---|
| **Hàn** | sweep một mặt cắt bán nguyệt dọc giao tuyến, cộng nhiễu vảy hàn | 🟡 | Tính giao tuyến giữa hai lưới cần `manifold-3d`. Trường hợp thường gặp (ống hàn vào tấm) có công thức riêng. |
| **Hàn thiếc** | giọt hình nón lõm ở chân linh kiện, vật liệu thiếc bóng | ✅ | |
| **Vặn ốc, tán đinh** | thêm đầu ốc (lục giác đùn, đầu vát, rãnh vít), long đen, ren lộ ra | ✅ | Kiểu ghép `bolt(a, b)` tự đặt ốc ở điểm neo. |
| **Dán, ghép mộng** | khe hở 0,2–0,5 mm giữa hai mặt, hoặc gờ keo | ✅ | Khe hở tạo đường bóng mảnh, cho mắt biết đây là hai chi tiết thật. |
| **Lắp trục vào ổ, nắp vào thân** | ràng buộc `through`/`coaxial` (đã có), cộng vòng đệm hoặc vát ở miệng lỗ | ✅ | |
| **Chỗ chuyển tiếp nói chung** | **fillet ở giao tuyến** hoặc smooth union (SDF) | 🟡 / 🔴 | Tương tự mục đúc ở trên. |

## 6. Hoàn thiện bề mặt

Phần này phần lớn **không đổi hình**, chỉ đổi vật liệu và ánh sáng. Làm rẻ mà hiệu quả lớn nhất.

| Ngoài đời | Trong code | Khả thi | Ghi chú |
|---|---|---|---|
| **Mài, giũa, vê cạnh** | **bevel hoặc chamfer mặc định cho mọi cạnh**: `RoundedBox`, bevel của extrude, profile lathe có bo | ✅ / 🟡 | Quan trọng bậc nhất. Không cạnh nào được sắc tuyệt đối. Bo 0,3–1 mm đã đủ tạo viền sáng. Bo cạnh sau boolean thì cần B-rep. |
| **Đánh bóng** | `roughness` thấp, `clearcoat` | ✅ | |
| **Phun cát, chải xước** | `roughnessMap` thủ tục. Xước chải là các vệt song song, có `anisotropy` (`MeshPhysicalMaterial`) | ✅ | Kim loại chải phản chiếu kéo dài theo một hướng. |
| **Sơn, sơn xe** | màu nền cộng `clearcoat`, vảy kim loại bằng normal map nhiễu nhỏ cộng `metalness` cục bộ | ✅ | |
| **Mạ chrome, anod hoá** | `metalness: 1`, `roughness` rất thấp (chrome) hoặc màu với độ nhám vừa (anod) | ✅ | Chrome chỉ thật khi có HDRI để phản chiếu. |
| **Khắc vạch, in chữ, dán nhãn** | decal: texture canvas chiếu lên mặt (`DecalGeometry`), hoặc normal map cho vạch khắc chìm | ✅ | Thước có vạch, đồng hồ có mặt số, bình có nhãn thể tích. |
| **Hao mòn tự nhiên** (xước, bạc màu, bụi bám góc, vết tay) | mask thủ tục theo **độ cong** (mép lồi mòn sáng, hốc lõm bám bụi) cộng **ambient occlusion**, rồi trộn vật liệu | 🟡 | Cần tính độ cong và AO trên lưới, hoặc bake (tính sẵn) vào texture. Mức vừa phải là đủ; quá nhiều sẽ trông như đồ cổ. |
| **Ánh sáng nơi đặt vật** | **HDRI** cảnh thật (`RGBELoader` cộng `PMREMGenerator`), bóng đổ mềm, **bóng tiếp xúc** ở chân vật | ✅ | Không phải hành động chế tạo, nhưng không có nó thì mọi bước trên đều mất tác dụng. |

## 7. Thứ không nên tự dựng

| Ngoài đời | Trong code | Khả thi | Ghi chú |
|---|---|---|---|
| Vật hữu cơ, điêu khắc (con vật, bàn tay, hoa, đồ chơi phức tạp) | **nhập mesh**: glTF CC0 (Poly Haven, Sketchfab) hoặc mesh do AI tạo (Hunyuan3D) | ✅ | Công cụ lắp ráp chỉ thêm **điểm neo** cho mesh: đáy từ khung bao, trục chính, điểm do AI chọn trên ảnh. Nhờ vậy mesh vẫn ghép được với các bộ phận khác. |

---

## Tóm tắt: cần những thao tác nào

| Thao tác | Thay cho | Khả thi |
|---|---|---|
| `lathe(profile, wall, lip)` | tiện, thổi, bàn xoay | ✅ |
| `extrude(outline, depth, bevel)` | đùn, cắt tấm, phay mặt | ✅ |
| `sheet(polyline, thickness, bendRadius)` | chấn gấp | ✅ |
| `sweep(section, path)` | uốn ống, lò xo, dây, đường hàn | ✅ |
| `loft(sections[])` | dập, kéo sâu (thân xe) | 🟡 |
| `boolean(union / subtract / intersect)` cộng bán kính dao | phay hốc, khoan | 🟡 (`manifold-3d`) |
| `fillet(edges, r)` hoặc smooth union | đúc, ép phun, chuyển tiếp chỗ nối | 🔴 tổng quát (B-rep), 🟡 bằng SDF |
| Bộ phận nối tự thêm (ốc, long đen, đường hàn, khe hở) | vặn ốc, hàn, dán | ✅ |
| Thư viện vật liệu PBR cộng texture thủ tục | đánh bóng, phun cát, sơn, mạ | ✅ |
| Decal | khắc, in, dán nhãn | ✅ |
| Mòn theo độ cong cộng AO | hao mòn tự nhiên | 🟡 |
| HDRI cộng bóng tiếp xúc | ánh sáng nơi đặt vật | ✅ |
| `mesh(file) + anchors` | vật hữu cơ | ✅ |

**Kết luận:**

- Phần lớn hành động chế tạo làm được bằng code, ở mức ✅ hoặc 🟡.
- Hai chỗ khó thật là **bo cạnh tổng quát sau khi ghép khối** và **mặt cong tự do**. Bo cạnh cần lõi CAD hoặc SDF; mặt cong cần loft, subdivision, hoặc nhập mesh.
- Hai thứ tác động lớn nhất lên tiêu chuẩn lại rẻ nhất:
  - Vê cạnh mặc định cho mọi bộ phận.
  - Vật liệu PBR cùng HDRI và bóng tiếp xúc.
