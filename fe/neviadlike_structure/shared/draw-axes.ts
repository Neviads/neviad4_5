// SHARED — vẽ lưới và hệ trục Oxy đủ 4 hướng (Ox, Oy, −Ox, −Oy) trong màn view.
// Chỉ vẽ; vị trí gốc lấy từ ViewTransform. Nửa trục nằm ngoài view tự bị cắt.
// Bảng màu theo cảnh nền tối của các thí nghiệm gốc (#0f172a).
//
// Bước lưới và vạch chia KHÔNG do renderer chọn: luôn là số đẹp (1, 2, 5 × 10ⁿ) gần 1/10 bề
// ngang khung nhìn nhất, ở mọi tỉ lệ và mọi mức thu phóng, nên trục không bao giờ dày đặc.
// Đơn vị của nhãn tự đổi theo bước (mm, cm, m, km). Trục và lưới là nền: mờ hơn vật.

import type { ViewTransform } from "./view-transform";

export const SCENE_COLORS = {
  background: "#0f172a",
  ground: "#0b1220",
  grid: "#3a4a68",
  groundLine: "#64748b",
  /** Trục toạ độ và vạch chia: trắng mờ, để vật luôn nổi hơn trục. */
  axis: "rgba(248, 250, 252, 0.45)",
  label: "#94a3b8",
  origin: "rgba(255, 255, 255, 0.7)",
} as const;

/**
 * Vùng cần phủ, tính bằng pixel logic của màn view. Lớn hơn màn view khi container
 * khác tỉ lệ (phần letterbox), để nền và lưới luôn phủ kín container.
 */
export type Extents = {
  x0: number; y0: number; x1: number; y1: number;
  /** Mức phóng của camera người xem (shared/view-camera.tsx); 1 khi không có camera. */
  zoom?: number;
};

/** Số đẹp (1, 2, 5 × 10ⁿ) gần `x` nhất, so theo log. */
export function niceNearest(x: number) {
  const p = 10 ** Math.floor(Math.log10(x));
  let best = p;
  for (const m of [1, 2, 5, 10]) {
    if (Math.abs(Math.log10((m * p) / x)) < Math.abs(Math.log10(best / x))) best = m * p;
  }
  return best;
}

/** Bước lưới và vạch chia (mét): số đẹp gần 1/10 bề ngang khung nhìn trên màn hình nhất. */
export function viewStep(transform: ViewTransform, extents: Extents) {
  const viewMeters = transform.bounds.maxX - transform.bounds.minX;
  return niceNearest(viewMeters / 10 / (extents.zoom ?? 1));
}

/** Đơn vị hiển thị cho một bước: nhãn không bao giờ là 0.001 hay 100000. */
function unitFor(step: number) {
  if (step >= 1000) return { name: "km", factor: 1000 };
  if (step >= 1) return { name: "m", factor: 1 };
  if (step >= 0.01) return { name: "cm", factor: 0.01 };
  return { name: "mm", factor: 0.001 };
}

/** Vùng nhìn thấy trong container, quy về pixel logic của màn view. */
export function visibleExtents(
  container: { width: number; height: number },
  fit: { scale: number; offsetX: number; offsetY: number; zoom?: number },
): Extents {
  return {
    zoom: fit.zoom ?? 1,
    x0: -fit.offsetX / fit.scale,
    y0: -fit.offsetY / fit.scale,
    x1: (container.width - fit.offsetX) / fit.scale,
    y1: (container.height - fit.offsetY) / fit.scale,
  };
}

type AxesOptions = {
  extents: Extents;
  /**
   * 0 = không vẽ vạch chia và nhãn số. Giá trị khác bị bỏ qua: bước luôn tự tính bằng `viewStep`
   * (tham số còn giữ để renderer cũ không vỡ).
   */
  tickEvery?: number;
};

/** Khoảng toạ độ vật lý nằm trong `extents`. */
function worldBounds(transform: ViewTransform, e: Extents) {
  const lo = transform.toWorld(e.x0, e.y1);
  const hi = transform.toWorld(e.x1, e.y0);
  return { minX: lo.x, maxX: hi.x, minY: lo.y, maxY: hi.y };
}

/**
 * Nền đặc + lưới ô vuông mỗi `viewStep` mét, phủ kín `extents`; nét lưới giữ mảnh khi thu phóng.
 * Tham số thứ tư bị bỏ qua (còn giữ để renderer cũ không vỡ).
 */
export function drawGrid(
  context: CanvasRenderingContext2D,
  transform: ViewTransform,
  extents: Extents,
  _step?: number,
) {
  const { x0, y0, x1, y1 } = extents;
  const zoom = extents.zoom ?? 1;
  const step = viewStep(transform, extents);
  context.save();
  context.fillStyle = SCENE_COLORS.background;
  context.fillRect(x0, y0, x1 - x0, y1 - y0);
  context.strokeStyle = SCENE_COLORS.grid;
  context.lineWidth = 0.75 / zoom;
  const { minX, maxX, minY, maxY } = worldBounds(transform, extents);
  context.beginPath();
  for (let i = Math.ceil(minX / step); i * step <= maxX; i++) {
    const p = transform.toView(i * step, 0).x;
    context.moveTo(p, y0);
    context.lineTo(p, y1);
  }
  for (let i = Math.ceil(minY / step); i * step <= maxY; i++) {
    const p = transform.toView(0, i * step).y;
    context.moveTo(x0, p);
    context.lineTo(x1, p);
  }
  context.stroke();
  context.restore();
}

function arrow(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
  size = 8,
) {
  const nx = -dy;
  const ny = dx;
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x - dx * size + nx * size * 0.45, y - dy * size + ny * size * 0.45);
  context.lineTo(x - dx * size - nx * size * 0.45, y - dy * size - ny * size * 0.45);
  context.closePath();
  context.fill();
}

export function drawAxes(
  context: CanvasRenderingContext2D,
  transform: ViewTransform,
  { extents, tickEvery }: AxesOptions,
) {
  const { x0, y0, x1, y1 } = extents;
  // u: một pixel trên màn hình, để nét, chữ và vạch chia giữ cỡ khi người xem thu phóng.
  const u = 1 / (extents.zoom ?? 1);
  const step = viewStep(transform, extents);
  const unit = unitFor(step);
  const digits = Math.max(0, -Math.floor(Math.log10(step / unit.factor) + 1e-9));
  const label = (v: number) => (v / unit.factor).toFixed(digits);
  const o = transform.toView(0, 0);
  const bounds = worldBounds(transform, extents);
  const inRange = (v: number, min: number, max: number) => v >= min && v <= max;

  context.save();
  context.strokeStyle = SCENE_COLORS.axis;
  context.fillStyle = SCENE_COLORS.axis;
  context.lineWidth = u;
  context.font = `${11 * u}px sans-serif`;

  // Ox (+ và −): đường ngang qua gốc.
  if (inRange(o.y, y0, y1)) {
    context.beginPath();
    context.moveTo(x0, o.y);
    context.lineTo(x1, o.y);
    context.stroke();
    arrow(context, x1, o.y, 1, 0, 7 * u);
    context.fillStyle = SCENE_COLORS.label;
    context.textAlign = "right";
    context.fillText(`x (${unit.name})`, x1 - 10 * u, o.y - 8 * u);
    context.textAlign = "left";
    context.fillStyle = SCENE_COLORS.axis;
    if (bounds.minX < 0) arrow(context, x0, o.y, -1, 0, 7 * u);
  }

  // Oy (+ và −): đường dọc qua gốc.
  if (inRange(o.x, x0, x1)) {
    context.beginPath();
    context.moveTo(o.x, y0);
    context.lineTo(o.x, y1);
    context.stroke();
    arrow(context, o.x, y0, 0, -1, 7 * u);
    context.fillStyle = SCENE_COLORS.label;
    context.fillText(`y (${unit.name})`, o.x + 8 * u, y0 + 14 * u);
    context.fillStyle = SCENE_COLORS.axis;
    if (bounds.minY < 0) arrow(context, o.x, y1, 0, 1, 7 * u);
  }

  // Gốc O.
  context.fillStyle = SCENE_COLORS.origin;
  context.beginPath();
  context.arc(o.x, o.y, 2.5 * u, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = SCENE_COLORS.label;
  context.fillText("O", o.x + 6 * u, o.y - 8 * u);

  // Vạch chia và nhãn số, cùng bước với lưới.
  if (tickEvery !== 0) {
    const { minX, maxX, minY, maxY } = bounds;
    context.lineWidth = u;
    context.strokeStyle = SCENE_COLORS.axis;
    context.textAlign = "center";
    for (let i = Math.ceil(minX / step); i * step <= maxX; i++) {
      if (i === 0) continue;
      const p = transform.toView(i * step, 0);
      context.beginPath();
      context.moveTo(p.x, o.y - 4 * u);
      context.lineTo(p.x, o.y + 4 * u);
      context.stroke();
      context.fillText(label(i * step), p.x, o.y + 16 * u);
    }
    context.textAlign = "left";
    for (let i = Math.ceil(minY / step); i * step <= maxY; i++) {
      if (i === 0) continue;
      const p = transform.toView(0, i * step);
      context.beginPath();
      context.moveTo(o.x - 4 * u, p.y);
      context.lineTo(o.x + 4 * u, p.y);
      context.stroke();
      context.fillText(label(i * step), o.x + 8 * u, p.y + 4 * u);
    }
  }
  context.restore();
}

/** Ghi chú nhỏ ở góc dưới-trái khung nhìn, vd. khi có vật được phóng to (`magnifyFor` > 1). */
export function drawScaleNote(
  context: CanvasRenderingContext2D,
  extents: Extents,
  text = "Vật không theo tỉ lệ",
) {
  const u = 1 / (extents.zoom ?? 1);
  context.save();
  context.fillStyle = SCENE_COLORS.label;
  context.font = `italic ${11 * u}px sans-serif`;
  context.textBaseline = "bottom";
  context.fillText(text, extents.x0 + 12 * u, extents.y1 - 10 * u);
  context.restore();
}
