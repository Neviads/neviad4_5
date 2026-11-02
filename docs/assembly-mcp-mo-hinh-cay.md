# Cách hiểu `neviad-assembly`: vật thể là một cây

Tổng hợp ngày 2026-11-02. Sơ đồ ví dụ đầy đủ (xe ben) nằm ở [assembly-tree-vi-du.md](assembly-tree-vi-du.md).

## Kết luận

Một vật thể rắn có thể mô tả bằng **một cây bộ phận, nối với nhau bằng các khớp**, cộng thêm vài ràng buộc nằm ngoài cây. Các lệnh gọi tool sắp theo phụ thuộc của cấu trúc đó, nên cây cũng là khung để chia nhỏ việc dựng một vật phức tạp.

```text
Node      = bộ phận
Edge      = khớp (gắn chặt, quay hoặc trượt)
Ngoài cây = couple và loop
```

## Model tạo ra cái gì

Model không tự viết file, code Three.js hay lưới. Nó gọi tool nhiều lần, mỗi lần gửi tham số của một bước; server giải tư thế và ghi file.

| File | Khi nào có | Vai trò |
|---|---|---|
| `fe/.assembly-bridge/state.json` | Trong lúc dựng | Trạng thái làm việc, trang `/lap-rap-3d` đọc từ đây |
| `fe/app/<route>/<ten>.assembly.json` | Khi gọi `assembly_export` | Tài liệu để route dựng lại |
| `fe/public/assembly-meshes/<băm>.bin` | Cùng lúc export `.json` | Lưới dựng sẵn, để route không phải dựng lại hình nặng |

Mỗi lần gọi vẫn phải đủ tham số bắt buộc của tool đó, nên nên chốt kích thước thật của vật trước khi dựng.

## Cập nhật lên giao diện

Mỗi lệnh sửa thành công sẽ giải lại toàn bộ bản lắp ráp và ghi `state.json`. Trang tự hỏi mỗi 700 ms qua `GET /api/assembly-bridge?since=<version>`, tức là trang chủ động hỏi chứ server không đẩy xuống.

- Lệnh lỗi thì không ghi gì.
- Trang chưa mở thì thay đổi vẫn được lưu; chỉ các tool chụp ảnh như `assembly_view` mới cần trang đang mở.
- Lệnh gọi nhanh hơn 700 ms có thể làm trang bỏ qua vài bước trung gian.
- API trả 404 ngoài chế độ `development`.

## Ba tầng của một vật

| Tầng | Câu hỏi | Tool |
|---|---|---|
| Cụm và bộ phận | Cái này gắn vào cái nào? | `part_add`, `part_save_as_type` |
| Chi tiết | Chi tiết này được chế tạo thế nào? | `shape_*` |
| Chuyển động | Cái gì chuyển động, theo trục nào? | `joint_add`, `loop_add` |

Một cách kiểm tra nhanh khi chia cây: nếu dời bộ phận này, những gì phải đi theo chính là nhánh con của nó.

## Edge của cây là gì

Coi gắn chặt là khớp 0 bậc tự do (như "fixed joint" trong URDF) thì mọi edge đều là khớp. Khi đối chiếu với tool cần nhớ:

| Khớp | Bậc tự do | Khai báo |
|---|---|---|
| Gắn chặt | 0 | Chỉ có `place`, không gọi `joint_add` |
| Quay | 1 | `place` và `joint_add` kiểu `revolute` |
| Trượt | 1 | `place` và `joint_add` kiểu `prismatic` |

- `joint_add` không tạo edge mới. Bộ phận vẫn cần `place` để biết nằm ở đâu.
- `place.kind: "fixed"` không có nghĩa là "khớp gắn chặt". Đây là cách đặt vị trí bằng `shift`, chỉ dùng làm lối thoát cuối cùng.
- Một `joint` có thể đẩy nhiều bộ phận qua `moves`, nên không phải lúc nào cũng ứng với đúng một edge.
- `couple` nối hai khớp với nhau, còn `loop_add` khép vòng hai nhánh. Vì vậy toàn bộ vật không phải một cây thuần tuý.

## Thứ tự gọi tool

Các lệnh tạo thành một đồ thị phụ thuộc (DAG) có cây vật thể làm xương sống. Thứ tự gọi là một sắp xếp topo của đồ thị đó, nên có nhiều thứ tự hợp lệ.

| Phải có trước | Làm sau |
|---|---|
| Bộ phận cha | Bộ phận con |
| Các hình đầu vào | Hình kết quả, như `shape_boolean` |
| Hình | `part_add` với `shape:<id>` |
| Bộ phận | `joint_add` cho bộ phận đó |
| Các khớp trong `solves` | `loop_add` |
| `material_define` và bộ phận | `material_assign` |

Vòng xem và sửa (`assembly_view` → `part_update`) và các lệnh `check_*` không thuộc đồ thị này. Chúng có thể chạy nhiều lần.

## Dựng vật phức tạp

MCP không tự phân tích hay chia nhỏ vật; model phải tự chia.

1. Chốt kích thước và cây lắp ráp, và nên cho người dùng duyệt ở bước này vì sửa ở đây rẻ nhất.
2. Dựng từng chi tiết theo cách vật thật được chế tạo.
3. Ghép từ gốc ra ngọn, đọc toạ độ điểm neo mà `part_add` trả về.
4. Gom phần lặp bằng `part_save_as_type`, `shape_pattern` hoặc `shape_mirror`.
5. Thêm khớp và vòng khép kín.
6. Kiểm tra theo từng cụm, kể cả ở các tư thế khác nhau.

## Giới hạn của mô hình cây

Cây chỉ mô tả vật rắn. `physics_setup` chỉ giải vật rắn, và `fe/assembly-kit/core/types.ts` ghi rõ kit không mô phỏng chất lỏng chuyển động. Phần không rắn do code của trang xử lý, xem [mo-phong-chat-long.md](mo-phong-chat-long.md).

## Chưa kiểm chứng

- Server có an toàn khi nhiều agent ghi song song không; hiện nên chạy tuần tự.
- Trang có hiển thị hình `shape_*` trước khi có `part_add` không. Suy từ cấu trúc dữ liệu thì không, nhưng chưa chạy thử.
- `AssemblyAgent` ở backend chia việc thế nào; chưa đọc phần này.
- Xe ben trong file ví dụ chưa được dựng thật bằng công cụ.
