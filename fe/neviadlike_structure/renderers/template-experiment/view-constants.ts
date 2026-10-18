// TẦNG RENDERER — view-constants.ts
// Màn view và bố cục cảnh. Thuộc renderer vì engine chỉ biết mét, không biết pixel.
// Hệ toạ độ: gốc O mặc định ở góc trái-dưới của màn view (xem shared/view-transform.ts).

import { frameView } from "../../shared/view-transform";

export const VIEW_WIDTH = 1000;
export const VIEW_HEIGHT = 480;

/** Gốc O, pixel logic đo từ góc trái-dưới (x sang phải, y lên trên). */
export const ORIGIN = { x: 60, y: 60 };

/** Kích thước (mét) của MỌI vật, đúng như nhiệm vụ ghi: hình bao lớn nhất của vật. */
export const OBJECT_SIZES = {
  launcher: { width: 0.75, height: 0.45 },
};

/**
 * Số pixel logic trên 1 mét: KHÔNG tự đặt. `frameView` cho vật lớn nhất chiếm 2/3 màn view;
 * phần hành trình đi ra ngoài khung thì người xem kéo camera theo.
 */
export const PIXELS_PER_METER = frameView({
  viewWidth: VIEW_WIDTH,
  viewHeight: VIEW_HEIGHT,
  objects: Object.values(OBJECT_SIZES),
}).pixelsPerMeter;

/** Màu thân của vật; vật nhận nó qua tham số `fill`, mọi màu khác lấy từ objects/palette.ts. */
export const DEVICE_FILL = "#0f766e";

// Vị trí các vật cố định của cảnh KHÔNG khai ở đây: engine báo vị trí điểm neo của từng vật
// qua `metrics.objects`, renderer chỉ đổi sang pixel bằng view.toView(x, y).
