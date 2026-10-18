Bạn chuẩn bị tiêu chí chấm cho hình MỘT vật thể sắp được vẽ cho một mô phỏng vật lý phổ thông. Vật có thể là bất cứ gì: thiết bị, đồ vật, hay thực thể của hiện tượng như hạt, hạt nhân, nguyên tử, phân tử, hành tinh. Bạn CHƯA thấy hình; chỉ dựa vào mô tả vật, hình học đã chốt và góc nhìn của cảnh, cùng kiến thức của bạn về HÌNH MẪU QUEN THUỘC của vật: vật thật (số liệu nhà sản xuất nếu là sản phẩm có thật) với thứ có ngoài đời, hình minh hoạ khoa học quen thuộc trong sách với thứ không chụp được (ví dụ hạt nhân là cụm proton và neutron tròn xếp khít).

Nếu mô tả có "Phong cách hình đã chốt với giáo viên", đặc điểm và dấu hiệu phải kiểm được ở đúng phong cách đó (ví dụ sơ đồ sách giáo khoa thì không đòi bóng, khối hay vân vật liệu); tỉ lệ bộ phận vẫn theo hình mẫu.

Kích thước toàn vật đã được đo bằng code, đừng đặt tiêu chí về nó. Màu thân do cảnh truyền vào, đừng đặt tiêu chí về màu thân.

Trả về:
- view: góc nhìn mà hình phải theo, một câu (lấy từ góc nhìn của cảnh nếu có; không có thì dụng cụ, máy móc là nhìn ngang một mặt bên, không phối cảnh; vật tròn đều như hạt hay hành tinh thì thấy là hình tròn).
- ratios: 0 đến 4 tỉ lệ BỘ PHẬN đo được bằng mắt trên hình ở góc nhìn đó, mỗi mục {name, expected}; name nói rõ cái gì chia cái gì (ví dụ "chiều cao chân đế / chiều cao cả vật": 0,1). Vật đơn giản không có bộ phận để so (một hạt, một quả cầu) thì để rỗng; đừng bịa tỉ lệ.
- features: 1 đến 6 đặc điểm hình dáng nhìn thấy được ở góc nhìn đó, làm vật nhận ra ngay đúng là nó; nếu mô tả có Khung thì lấy các bộ phận của khung làm đặc điểm trước (mỗi bộ phận có mặt đúng chỗ, đúng dáng đã tả); viết cụ thể, kiểm được bằng mắt (ví dụ "cánh tay cong hình chữ C nối chân đế với thân trên", "hạt nhân là cụm tròn gồm nhiều quả cầu nhỏ hai màu xếp khít"). Vật đơn giản thì ít đặc điểm là đủ.
- viewRules: 1 đến 4 dấu hiệu kiểm được bằng mắt rằng hình đúng và nhất quán với góc nhìn (ví dụ "không lộ mặt trước hay mặt sau", "các vật tròn quay về người xem là hình tròn đúng, không phải elip", "vật đứng trên sàn thì đáy nằm trên một đường ngang").
