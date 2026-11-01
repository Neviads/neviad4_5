// Hướng dẫn gửi kèm khi Claude kết nối MCP neviad-assembly. Client cắt phần vượt khoảng 4 000 ký tự, nên giữ dưới
// 3 500 (selftest kiểm); hướng dẫn chuyên đề (thân vỏ, mối nối, mài, mô phỏng, vật liệu) nằm trong mô tả của tool.
export const CLAUDE_INSTRUCTIONS = `Xưởng lắp ráp vật 3D bằng bộ phận + ràng buộc (trang /lap-rap-3d). KHÔNG gõ toạ độ hay góc tuyệt đối: dựng từng bộ phận theo kích thước thật, nói nó ghép vào bộ phận đã có thế nào; công cụ giải ra tư thế.

Quy trình: assembly_create → dựng hình (shape_*) → part_add {type: "shape:<id>"} lần lượt (bộ phận đầu tiên lên ground.top) → joint_add cho phần chuyển động → assembly_describe → assembly_view để XEM ảnh 4 góc (cần trang /lap-rap-3d mở) → sửa bằng part_update → check_* trước khi mô phỏng.

Quy ước: mét, độ; y lên, hệ tay phải; "front" là +z. Điểm neo: "boPhan.diemNeo"; mặt trụ thêm vị trí "ring1.surface@bottom" (bottom/top/front/back/left/right) hoặc "@angle=30".

Kiểu ghép (place):
- onto / touch {a: mặt/điểm bộ phận mới, b: mặt bộ phận có sẵn, at?: [u, v] trên b, offset?, angle?}: hai mặt áp vào nhau.
- coaxial / through {a: trục, b: trục, offset? dọc trục, angle?, flip?}: trục trùng nhau; through kiểm trục lọt lỗ.
- fixed {shift?, angle?}: lối thoát CUỐI CÙNG. Đừng dựng hình ở toạ độ thế giới rồi ghép fixed shift 0 — mất hết quan hệ, sửa một chỗ phải sửa tay cả nhánh.
- follow: false cho tiếp xúc trượt (bộ phận tì lên vật đang quay mà không quay theo).
Mỗi bộ phận chỉ ghép vào bộ phận đã có; sửa gốc thì cả nhánh đi theo. Sau part_add, đọc toạ độ điểm neo trong kết quả để chọn at/offset tiếp theo (số đo, không tự tính).

Khớp: revolute/prismatic quanh điểm neo kiểu axis (ground.x/y/z, trục của hình tiện, trục kế thừa từ dao cắt, hoặc trục đặt bằng anchor_define); moves = bộ phận được điều khiển. couple {joint, ratio} cho khớp chạy theo khớp khác; bánh lăn theo khớp trượt thì bỏ ratio, tool tự tính. Khâu nối hai nhánh (xi lanh đẩy thùng, thanh truyền): loop_add, không couple tay. pose đặt bất kỳ khớp nào của nhóm, cả nhóm đi theo: assembly_view {pose: {khop: giaTri}}.

HÌNH TỰ DỰNG — không có thư viện bộ phận viết sẵn, mọi bộ phận đều tự dựng: dựng như vật thật được chế tạo (shape_lathe tiện, shape_extrude đùn, shape_sweep quét, shape_loft thân vỏ, shape_mirror, shape_pattern, shape_boolean, bo/khắc/tách), rồi part_add {type: "shape:<id>"}. Đường 2D nhận round: [bán kính bo từng điểm] — đừng để góc sắc ở chỗ vật thật được bo. Đọc mô tả từng tool shape_* trước khi dùng: cách dựng thân vỏ, mối nối, mài nằm ở đó.
GHÉP VÀO HÌNH bằng điểm neo của nó: điểm neo riêng (anchor_define) hoặc điểm neo kế thừa từ dao cắt boolean ("than.hoc.axis" sau khi khoét hốc "hoc"), lặp thì "nan[2].axis".

Mối nối hai chi tiết: shape_bevel (đắp cung vào góc lõm), shape_weld (miết khe hẹp), shape_sand (mài gợn còn lại). Kết quả mỗi phép báo "lưới: N tam giác, X chỗ gấp mép, Y tam giác dẹt" — có cảnh báo thì sửa tham số trước khi dùng tiếp.

Kiểm tra: check_connections (chỗ nối có khối thật không — neo trùng chưa đủ; gọi trước khi báo xong), check_interference, check_clearance, check_floating, check_physics, measure; check_* nhận pose. Mô phỏng: physics_setup → body_set → initial_set → drive_add → simulate. Vật liệu: material_define (tự đặt màu, độ nhám, kim loại… và khối lượng riêng theo vật liệu thật) → material_assign; decal_add, scene_set, render_view. Dùng lại cụm: part_save_as_type (part_types_list liệt kê cụm đã lưu).

Đưa vào code: assembly_export {path: "fe/app/<route>/<ten>.assembly.json"}; trong trang buildAssembly(doc, createMaterialKit()) (@/assembly-kit/three/build-scene, /materials), thêm view.root vào scene, gọi view.setPose({khopDan: giaTri}) mỗi khung hình.`;
