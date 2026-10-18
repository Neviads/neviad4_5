// SHARED — hệ toạ độ chung cho mọi thí nghiệm.
//
// Hai lớp, tách bạch:
//   1. WORLD  (mét): gốc O, Ox hướng phải, Oy hướng LÊN. Hai nửa trục âm (−Ox, −Oy)
//      vẫn hợp lệ, chỉ là nằm ngoài view khi gốc đặt ở góc.
//   2. VIEW   (pixel logic, viewWidth × viewHeight): gốc ở góc trên-trái, y hướng
//      xuống (kiểu canvas). Đây là "màn view" cố định, không phụ thuộc kích thước
//      màn hình thật.
// `fitView` là lớp thứ 3: đặt màn view vào container thật (letterbox, căn giữa).
//
// Mặc định gốc O nằm ở góc TRÁI-DƯỚI của màn view. Thí nghiệm cần gốc khác
// (vd. giữa-dưới) truyền `origin` bằng pixel đo từ góc trái-dưới của view.

export type ViewConfig = {
  viewWidth: number;
  viewHeight: number;
  pixelsPerMeter: number;
  /** Vị trí gốc O, pixel logic đo từ góc trái-dưới, trục hướng lên/phải. Mặc định (0, 0). */
  origin?: { x: number; y: number };
};

export type ViewTransform = {
  /** Toạ độ vật lý (m) → pixel trong màn view. */
  toView: (x: number, y: number) => { x: number; y: number };
  /** Pixel trong màn view → toạ độ vật lý (m). */
  toWorld: (px: number, py: number) => { x: number; y: number };
  /** Độ dài vật lý (m) → pixel. */
  length: (meters: number) => number;
  /** Khoảng toạ độ vật lý đang nhìn thấy trong view. */
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
};

export function createViewTransform(config: ViewConfig): ViewTransform {
  const { viewWidth, viewHeight, pixelsPerMeter } = config;
  const ox = config.origin?.x ?? 0;
  const oy = config.origin?.y ?? 0;

  return {
    toView: (x, y) => ({
      x: ox + x * pixelsPerMeter,
      y: viewHeight - oy - y * pixelsPerMeter,
    }),
    toWorld: (px, py) => ({
      x: (px - ox) / pixelsPerMeter,
      y: (viewHeight - oy - py) / pixelsPerMeter,
    }),
    length: (meters) => meters * pixelsPerMeter,
    bounds: {
      minX: -ox / pixelsPerMeter,
      maxX: (viewWidth - ox) / pixelsPerMeter,
      minY: -oy / pixelsPerMeter,
      maxY: (viewHeight - oy) / pixelsPerMeter,
    },
  };
}

/** Co màn view vào container thật, giữ tỉ lệ và căn giữa. */
export function fitView(
  container: { width: number; height: number },
  viewWidth: number,
  viewHeight: number,
) {
  const scale = Math.min(container.width / viewWidth, container.height / viewHeight);
  return {
    scale,
    offsetX: (container.width - viewWidth * scale) / 2,
    offsetY: (container.height - viewHeight * scale) / 2,
  };
}

/** Cạnh dài nhỏ nhất (pixel của màn view) của một vật ĐỘNG trước khi phải phóng to nó. */
export const MIN_OBJECT_PX = 28;

/**
 * Tỉ lệ của cả cảnh: vật LỚN NHẤT chiếm đúng `fill` (mặc định 2/3) màn view theo chiều bó buộc,
 * dù kích thước thật là 1 cm hay 100 m. Truyền kích thước (mét) của MỌI vật trong nhiệm vụ;
 * vật dãn hay vươn ra thì lấy hình bao lớn nhất của nó. Hành trình không tính: vật đi ra ngoài
 * khung thì người xem kéo camera theo.
 */
export function frameView({
  viewWidth,
  viewHeight,
  objects,
  fill = 2 / 3,
}: {
  viewWidth: number;
  viewHeight: number;
  objects: { width: number; height: number }[];
  fill?: number;
}) {
  let ppm = Infinity;
  for (const { width, height } of objects) {
    if (width > 0) ppm = Math.min(ppm, viewWidth / width);
    if (height > 0) ppm = Math.min(ppm, viewHeight / height);
  }
  if (!Number.isFinite(ppm)) throw new Error("frameView: cần kích thước dương của ít nhất một vật");
  return { pixelsPerMeter: fill * ppm };
}

/**
 * Hệ số phóng hình của một vật ĐỘNG nhỏ để cạnh dài của nó đạt `minPx` trên màn view; 1 nếu đã
 * đủ lớn. Chỉ đổi hình (`group.scale` quanh điểm neo), vị trí vẫn do engine tính bằng kích thước thật.
 */
export function magnifyFor(
  size: { width: number; height: number },
  ppm: number,
  minPx = MIN_OBJECT_PX,
) {
  const longest = Math.max(size.width, size.height) * ppm;
  return longest > 0 ? Math.max(1, minPx / longest) : 1;
}
