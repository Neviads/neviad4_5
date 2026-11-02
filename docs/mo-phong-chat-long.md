# Mô phỏng và hiển thị chất lỏng: screen-space và metaball

Tổng hợp ngày 2026-11-02, từ thử nghiệm trên `Cốc nước trên bàn – mô phỏng 3D.html` (file ở gốc repo, chưa được git theo dõi).

## Kết luận

- **Phần "giống nước" chủ yếu đến từ cách vẽ.** Solver chỉ là khoảng 1.100 viên bi đẩy nhau; cách vẽ biến chúng thành một khối liền.
- **Khi nước tràn thành vệt mỏng, screen-space đẹp hơn rõ rệt.** Metaball ở ô lưới `0.10` vỡ thành mảnh góc cạnh như kính vỡ.
- **Khi nước tụ thành khối, metaball ban đầu đẹp hơn** vì có bề mặt thật. Đã thử bù cho screen-space bằng lớp độ sâu, nhưng phần nước tràn sau khi sửa chưa được kiểm tra (xem mục "Trạng thái").
- **Hướng đang chọn:** giữ screen-space và cải thiện phần nước khối.

## Chọn cấu trúc theo điều cần thấy

Cây bộ phận không mô tả được chất lưu, vì chất lưu cần trạng thái tại từng nơi và từng thời điểm.

| Cấu trúc | Node | Hợp với | Không thấy được |
|---|---|---|---|
| Mạng thông số gộp | Một thể tích: bình, xi lanh | Thuỷ lực, khí nén, mạch dầu | Xoáy, dòng chảy bên trong |
| Lưới (Euler): LBM, Stable Fluids | Một ô cố định | Dòng quanh vật, xoáy, khói | Tia bắn, giọt bay kém tự nhiên |
| Hạt (Lagrange): SPH, PBF | Một hạt chuyển động | Nước bắn, sóng, phân tử khí | Áp suất thường nhiễu, nhiều hạt thì nặng |

Với assembly kit, nên tách hai lớp: kit giữ hình học, vật liệu, khớp và số đo; solver chất lưu nằm ở trang hoặc một module riêng. Kích sàn (`fe/app/kich-san-thuy-luc/page.tsx`) tính dầu bằng công thức rồi đưa kết quả vào khớp. Bơm bánh răng (`fe/app/may-bom-thuy-luc/page.tsx`) chỉ cho vân trượt trên lõi dầu.

## Solver trong file cốc nước

Thuộc nhóm hạt, nhưng đơn giản hơn SPH và PBF: không tính mật độ hay áp suất.

| Thành phần | Cách làm |
|---|---|
| Không nén | Hai hạt gần hơn `D = 0.16` thì bị đẩy ra, kiểu PBD |
| Tìm lân cận | Spatial hash, xét 27 ô quanh hạt |
| Độ nhớt | Trộn vận tốc giữa các hạt gần nhau, kiểu XSPH |
| Thành cốc | Công thức hình trụ, không dùng lưới |
| Trong hay ngoài cốc | Dựa vào vị trí bước trước, để hạt không xuyên qua thành |
| Cốc trượt | Ma sát Coulomb với bàn |

Giới hạn:

- Nước không tác động lại cốc, và cốc không đổ vì không có chuyển động xoay.
- `G = 30`, `R = 1`, nên không phải đơn vị mét.
- Không có áp suất đo được và không có sức căng bề mặt.
- Chân bàn và cạnh bên mặt bàn không chặn hạt.
- Độ nhớt có bán kính `1.4D` nhưng ô hash rộng `D`, nên có thể sót một số cặp.

## Hai cách vẽ

### Screen-space (trái)

Làm trên ảnh 2D của màn hình, giống nhỏ nhiều giọt mực mờ lên giấy:

1. Vẽ mỗi hạt thành một đốm mờ.
2. Cộng dồn các đốm thành bản đồ độ dày.
3. Cắt theo ngưỡng để có viền nước; các đốm tự nhập lại và tự đứt ra thành giọt.
4. Tô màu theo độ dày, thêm phản xạ và Fresnel.

Nhẹ và mịn ở chỗ nước mỏng, nhưng không tạo bề mặt 3D thật. Lớp nước được vẽ đè lên cốc và vành cốc.

### Metaball 3D (phải)

1. Mỗi hạt cộng ảnh hưởng vào các đỉnh của lưới 3D, lưu thưa bằng bảng băm vì nước có thể trải rất rộng.
2. Marching cubes dựng lưới tam giác tại mức ngưỡng.
3. Pháp tuyến lấy từ đạo hàm giải tích của trường, nên mịn hơn lưới.

Có lưới thật, nên che khuất đúng và có thể xuất ra. Không biết độ dày nước, nên độ đậm chỉ ước lượng theo góc nhìn. Thông số `MB_RAD = 0.22`, `MB_ISO = 0.5` được chọn qua đo đạc: `0.26` và `0.5` làm 19,2% bề mặt nhô ra ngoài thành kính, còn bộ này thì 0%.

## So sánh

| Vùng | Screen-space ban đầu | Metaball ô `0.10` | Đẹp hơn |
|---|---|---|---|
| Nước trong cốc | Mờ như sương, giữa có đốm tối lốm đốm | Có khối, mặt gợn sóng | Metaball |
| Vệt nước trên bàn | Mềm, liền, tròn mép | Mảnh góc cạnh | Screen-space |
| Giọt nhỏ | Tròn | Mảnh nhọn hình thoi | Screen-space |
| Nước dưới sàn | Liền, hơi giống chuỗi hạt | Như kính vỡ | Screen-space |

Metaball vỡ ở chỗ mỏng vì ô lưới `0.10` xấp xỉ bán kính một giọt (khoảng `0.1`). Muốn mịn phải giảm ô lưới, mà chi phí tăng rất nhanh:

| Ô lưới | Thời gian mỗi lần dựng | Số tam giác |
|---|---|---|
| 0,18 | 2,1 ms | 1.612 |
| 0,14 | 6,8 ms | 2.868 |
| 0,10 | 12 ms | 6.028 |
| 0,07 | 38 ms | 12.340 |

Số đo lấy khi tạm dừng, trên máy test dùng GPU giả lập bằng phần mềm, với cùng một trạng thái nước. Khi chạy thật, ở ô `0.10` trang báo 14–30 ms. Chi phí GPU của cả hai cách và FPS trên GPU thật chưa được đo.

## Cải tiến screen-space bằng lớp độ sâu

Mục tiêu là cho nước khối có bề mặt rõ mà vẫn giữ phần nước mỏng mịn:

1. Vẽ mỗi hạt thành một quả cầu, giữ độ sâu gần camera nhất vào texture float.
2. Làm mượt độ sâu theo hai chiều, không trộn qua chỗ độ sâu chênh lớn.
3. Suy pháp tuyến từ độ sâu, thay cho gradient độ dày.
4. Lấy trung bình và chặn trên độ dày khi tính màu.

### Trạng thái

| Hạng mục | Kết quả |
|---|---|
| Shader biên dịch và chạy trên Chrome headless | Đạt, không có lỗi console |
| Đốm tối lốm đốm giữa khối nước | Đã hết trong ảnh chụp lúc nước yên |
| Mặt nước có khối và điểm phản xạ | Có |
| Nước khối bị đậm hơn bản trước | **Chưa ổn**, cần chỉnh màu |
| Mép dưới còn răng cưa, mép trên có chút nhiễu | **Chưa ổn** |
| Nước tràn sau khi sửa | **Chưa kiểm tra.** Kịch bản giật bàn tự động làm cốc rơi khỏi bàn và khuất dưới mặt bàn, nên ảnh không cho thấy vệt nước |
| Chạy trên GPU thật | **Chưa kiểm tra** |

Nhược điểm dự kiến là thêm ba lượt vẽ toàn khung trên texture float, nên nặng hơn bản cũ, nhất là trên màn hình độ phân giải cao. Máy không có WebGL2 sẽ quay về pháp tuyến từ độ dày như cũ, nhưng nhánh này chưa được chạy thử.

## Việc tiếp theo

1. Sửa kịch bản test để cốc ở lại trên bàn, rồi so ảnh nước tràn trước và sau.
2. Chỉnh độ đậm của nước khối và mép dưới.
3. Đo FPS trên GPU thật ở từng chế độ.
4. Nếu đạt, tách phần hiển thị và solver thành module để làm tool `fluid_add`. Phần khó nhất của tool này là biên va chạm với hình bất kỳ: hình tiện dùng trực tiếp biên dạng, hình khác cần trường khoảng cách (SDF).
