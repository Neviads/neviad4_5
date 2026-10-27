// Hướng dẫn gửi kèm khi Claude kết nối MCP neviad-assembly.
export const CLAUDE_INSTRUCTIONS = `Xưởng lắp ráp vật 3D bằng bộ phận + ràng buộc (trang /lap-rap-3d). Bạn KHÔNG gõ toạ độ hay góc tuyệt đối: chọn bộ phận trong thư viện, đưa kích thước thật, và nói nó ghép vào bộ phận đã có thế nào; công cụ giải ra tư thế.

Quy trình: part_types_list → part_type_info (xem tham số và điểm neo) → assembly_create → part_add lần lượt (bộ phận đầu tiên đặt lên ground.top) → joint_add cho phần chuyển động → route_add cho dây nối → assembly_describe → assembly_view để XEM (ảnh 4 góc: phối cảnh, trước, cạnh, trên; cần trang /lap-rap-3d đang mở) → sửa bằng part_update.

Quy ước: mét, độ cho góc; y hướng lên, hệ tay phải; "front" là +z. Tham chiếu điểm neo: "boPhan.diemNeo", mặt trụ thêm vị trí: "ring1.surface@bottom" (bottom/top/front/back/left/right theo hướng thế giới) hoặc "@angle=30".

Kiểu ghép (place):
- onto / touch {a: mặt hoặc điểm của bộ phận mới, b: mặt của bộ phận có sẵn, at?: [u, v] trên mặt b, offset?: tách ra theo pháp tuyến, angle?: xoay quanh pháp tuyến}: hai mặt áp vào nhau, hướng ngược chiều. Đặt vật lên đế: onto(x.bottom, base.top, at [x, z]).
- coaxial / through {a: trục, b: trục, offset?: dời dọc trục, angle?: xoay quanh trục, flip?}: hai trục trùng nhau, cùng chiều. through còn kiểm tra trục a lọt lỗ b.
- fixed {shift?: [x, y, z] theo khung điểm neo b, angle?}: lối thoát cuối cùng.
- follow: false cho tiếp xúc trượt (chổi than tì vào vành đang quay) để bộ phận đó không quay theo khớp.

Mỗi bộ phận chỉ đặt vào bộ phận đã thêm trước đó; sửa bộ phận gốc thì cả nhánh đi theo. Sau part_add, đọc toạ độ thế giới của các điểm neo trong kết quả để chọn offset/at cho bộ phận tiếp theo (đó là số đo, không phải tự tính). Khớp: revolute/prismatic quanh một điểm neo kiểu axis, moves = các bộ phận được điều khiển (bộ phận ghép vào chúng tự đi theo). Xem tư thế khác bằng assembly_view {pose: {tenKhop: giaTri}}.

Trục cho khớp: ground.x / ground.y / ground.z (trục thế giới qua gốc, vd xe trượt dọc đường), block.axisX/axisY/axisZ (qua tâm hộp), trục của bộ phận tròn. Khớp ghép: joint_add {couple: {joint: "khopDan", ratio}} cho khớp chạy theo khớp khác; bánh xe lăn theo khớp trượt thì BỎ ratio, công cụ tự tính từ bán kính bánh và báo lại số độ mỗi mét — chỉ cần điều khiển khớp dẫn.

Đưa vào code: assembly_export {path: "fe/app/<route>/<ten>.assembly.json"}, rồi trong trang import JSON đó, buildAssembly(doc, createMaterialKit()) (@/assembly-kit/three/build-scene, @/assembly-kit/three/materials), thêm view.root vào scene và gọi view.setPose({khopDan: giaTri}) mỗi khung hình; phần vật lý của thí nghiệm chỉ cần tính giá trị các khớp dẫn.

HÌNH TỰ DỰNG — khi thư viện không có vật cần dựng, đừng ghép hộp: dựng hình theo đúng cách vật thật được chế tạo, rồi part_add {type: "shape:<id>"} (điểm neo sẵn có: top, bottom, left, right, front, back, center theo khung bao, cộng điểm neo riêng của phép).
- shape_lathe (tiện): vật tròn xoay — biên dạng [bán kính, y] từ dưới lên; wall > 0 cho thành dày thật và miệng bo (cốc, chai, lốp, la-zăng, đèn). Điểm neo axis, surface.
- shape_extrude (đùn): tấm, thanh, ốp, tay nắm, nan; plane xy | xz | zy; luôn bo cạnh (edgeRadius ≥ 0,5 mm mặc định).
- shape_sweep (quét): mặt cắt chạy dọc đường 3D — gioăng, viền, ống, dây, lò xo. Điểm neo start, end.
- shape_mirror (đối xứng, chỉ dựng một nửa), shape_pattern (lặp vòng / thẳng: nan, ốc, gai).
- Mọi đường 2D nhận round: [bán kính bo tại từng điểm]: KHÔNG để góc sắc ở chỗ vật thật được bo. offset / rotate để đặt hình trong khung của nó trước khi lặp hay đối xứng.
- anchor_define đặt điểm neo riêng (tâm hốc bánh, chân gương…) để ghép tiếp bằng quan hệ.

THÂN VỎ (xe, tàu, vỏ máy — mặt cong hai chiều): KHÔNG đùn hình nhìn ngang (hông sẽ phẳng như bánh quy cắt khuôn).
1. shape_loft {symmetric: true, sections: [{x, profile: nửa mặt cắt [z, y] từ tâm đáy lên tâm nóc}], caps: round}: 6–10 mặt cắt theo thông số thật (gầm, nắp capo, chân kính, nóc, cốp); thêm mặt cắt ở chỗ dáng đổi nhanh. Đọc bảng rộng × cao trả về để so với thông số.
2. shape_boolean subtract: hốc bánh (shape_lathe trụ, xoay trục theo z bằng rotate, đặt bằng offset), ô kính (shape_extrude cùng đường bao kính).
3. shape_round_edges {radius: 0,01–0,02}: bo mép hốc bánh và ô kính.
4. shape_groove: khe cửa (curve.plane axis x tại mép cửa, within chỉ lấy phần hông), khe capo, khe cốp.
5. shape_split_region: kính ôm theo thân (plane xy cho kính hông với range z > 0; plane zy cho kính chắn gió với range x), lift âm vài mm để kính thụt vào ô.
6. anchor_define tâm hốc bánh (kind axis, dir [0, 0, 1]) rồi part_add bánh xe coaxial vào đó; mirror (plane z) nếu chỉ dựng một bên.

DÙNG LẠI CỤM: dựng một cụm (bánh xe, đèn, gương…) ở bản riêng, rồi part_save_as_type {assembly, name, root, expose: {axis: "lop.axis"}} lưu vào thư viện. Ở bản khác part_add {type: name} như mọi bộ phận (cụm được chép vào tài liệu, file vẫn tự đủ), ghép bằng các điểm neo công khai. part_types_list liệt kê các cụm đã lưu.

VẬT LIỆU VÀ CẢNH: material_presets → material_define {preset, overrides, textures} → material_assign (bộ phận, hoặc "shape:<id>"). Vật thật không có bề mặt đều tăm tắp: dùng texture thủ tục (noise cho nhựa sần, grain cho kim loại chải, tread cho gai lốp trên một dải tiện riêng, scratches cho độ nhám). decal_add cho chữ, logo, vạch chia (arcRadius để chữ chạy theo cung). scene_set {environment: studio | street | sunset | dawn, stage: studioCyc | road | glossyFloor} rồi render_view {camera: threeQuarterFront | side | detail:<id>, quality: final} để xem ảnh đẹp. measure để so số đo với thông số thật. assembly_export .glb để xuất lưới và vật liệu.`;
