// SHARED — vẽ HIỆN TƯỢNG: những thứ thí nghiệm tạo ra theo thời gian và không vật nào sở hữu
// (mảnh vỡ, hạt, chấm sáng, điểm vệt, tia lửa).
//
// Ranh giới: engine sinh ra chúng và đưa ra qua `metrics.items` bằng toạ độ THẾ GIỚI (mét);
// ở đây chỉ đổi sang pixel bằng `ViewTransform` rồi vẽ. Không vật lý, không trạng thái:
// gọi lại mỗi khung hình với danh sách của khung hình đó.
//
//   drawItems(context, view, metrics.items, { shape: "shard", fill: "#94a3b8", size: 0.08 })
//   drawItems(context, view, metrics.items.filter((i) => i.kind === "spark"), { shape: "dot", fill: "#fbbf24" })
//   drawItems(context, view, fragments, { size: 0.3, draw: (c, r) => { /* hình riêng quanh gốc, cỡ r pixel */ } })
//
// Khác với vật (đặt bằng `placeObject`, dời bộ phận bằng `applyPose`), số lượng item thay đổi
// từng khung hình, nên chúng KHÔNG phải nút Konva: vẽ thẳng lên canvas nền là rẻ và đúng hơn.

import type { ViewTransform } from "./view-transform";

/** Một thứ thí nghiệm tạo ra, tại một khoảnh khắc. `x`, `y` bằng MÉT trong thế giới; khớp `metrics.items` của engine. */
export type SceneItem = {
  /** Tên hiện tượng trong kịch bản, để cảnh chọn hình và màu cho từng loại. */
  kind: string;
  x: number;
  y: number;
  /** Độ, cho mảnh xoay khi bay. Mặc định 0. */
  angle?: number;
  /** Cỡ tương đối so với `size` của style. Mặc định 1. */
  scale?: number;
  /** 0..1, cho thứ mờ dần rồi tắt. Mặc định 1. */
  opacity?: number;
};

export type ItemShape = "dot" | "shard" | "square" | "streak";

export type ItemStyle = {
  /** Hình vẽ cho loại này. Mặc định "dot". Bị bỏ qua khi có `draw`. */
  shape?: ItemShape;
  /**
   * Hình riêng cho loại này, khi không hình có sẵn nào hợp (mảnh phân hạch hai màu, phân tử nhỏ...). Gọi một lần cho mỗi item, với
   * gốc canvas đã ở tâm item, đã quay theo `angle` và đã đặt độ mờ; `radius` là cỡ của item bằng pixel. Tự `beginPath`/`fill`; `fill`
   * và `stroke` của style đã được đặt sẵn làm mặc định.
   */
  draw?: (context: CanvasRenderingContext2D, radius: number, item: SceneItem) => void;
  fill?: string;
  stroke?: string;
  /** Cỡ cơ bản bằng MÉT (bán kính với "dot", nửa cạnh với "shard"/"square", nửa chiều dài với "streak"). */
  size?: number;
};

const DEFAULT_STYLE = { shape: "dot" as ItemShape, fill: "#e2e8f0", size: 0.05 };

/** Mảnh vỡ: ngũ giác lệch, trông như mẩu vật liệu bị bẻ ra chứ không phải hình học đều. */
const SHARD: ReadonlyArray<readonly [number, number]> = [
  [-1, -0.55], [0.15, -1], [1, -0.1], [0.45, 0.9], [-0.7, 0.75],
];

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

/**
 * Vẽ một danh sách hiện tượng lên canvas. Item có toạ độ không hữu hạn bị bỏ qua, nên một engine
 * lỡ cho ra NaN làm mất một chấm chứ không làm hỏng cả khung hình.
 */
export function drawItems(
  context: CanvasRenderingContext2D,
  transform: ViewTransform,
  items: readonly SceneItem[] | undefined,
  style: ItemStyle = {},
): void {
  if (!items || items.length === 0) return;
  const shape = style.shape ?? DEFAULT_STYLE.shape;
  const fill = style.fill ?? DEFAULT_STYLE.fill;
  const size = transform.length(style.size ?? DEFAULT_STYLE.size);

  context.save();
  context.fillStyle = fill;
  if (style.stroke) {
    context.strokeStyle = style.stroke;
    context.lineWidth = Math.max(1, size * 0.12);
  }
  context.lineJoin = "round";

  for (const item of items) {
    if (!Number.isFinite(item.x) || !Number.isFinite(item.y)) continue;
    const at = transform.toView(item.x, item.y);
    const radius = size * (Number.isFinite(item.scale) ? (item.scale as number) : 1);
    if (!(radius > 0)) continue;

    context.globalAlpha = clamp01(Number.isFinite(item.opacity) ? (item.opacity as number) : 1);
    context.save();
    context.translate(at.x, at.y);
    if (item.angle) context.rotate((item.angle * Math.PI) / 180);

    if (style.draw) {
      style.draw(context, radius, item);
      context.restore();
      continue;
    }

    context.beginPath();
    if (shape === "dot") {
      context.arc(0, 0, radius, 0, Math.PI * 2);
    } else if (shape === "square") {
      context.rect(-radius, -radius, radius * 2, radius * 2);
    } else if (shape === "streak") {
      // Vệt nằm theo chính hướng `angle`, mảnh hơn nhiều so với chiều dài.
      const thickness = Math.max(1, radius * 0.22);
      context.rect(-radius, -thickness / 2, radius * 2, thickness);
    } else {
      context.moveTo(SHARD[0][0] * radius, SHARD[0][1] * radius);
      for (let i = 1; i < SHARD.length; i += 1) context.lineTo(SHARD[i][0] * radius, SHARD[i][1] * radius);
      context.closePath();
    }
    context.fill();
    if (style.stroke) context.stroke();

    context.restore();
  }

  context.restore();
}

/** Gom item theo `kind` để mỗi hiện tượng vẽ bằng một style riêng. */
export function groupByKind(items: readonly SceneItem[] | undefined): Map<string, SceneItem[]> {
  const out = new Map<string, SceneItem[]>();
  for (const item of items ?? []) {
    const bucket = out.get(item.kind);
    if (bucket) bucket.push(item);
    else out.set(item.kind, [item]);
  }
  return out;
}
