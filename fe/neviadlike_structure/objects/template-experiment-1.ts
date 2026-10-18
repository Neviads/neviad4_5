// TẦNG OBJECTS — vật của thí nghiệm mẫu: máy bắn ném xiên.
//
// KHUÔN MẪU của hợp đồng `ShapeObject` hiện tại (xem `objects/types.ts`):
//   - Chữ ký `(p, ppm, fill, label?) => { group, parts, points }`.
//   - `ppm` là pixel trên MỘT MÉT của cả cảnh: mọi độ dài viết bằng mét × ppm, nên vật tự co giãn
//     theo cảnh và không bao giờ cần một "hệ số cho vừa".
//   - Gốc (0,0) của `group` là ĐIỂM NEO (ở đây: tâm đáy, chạm sàn), nên thân vật nằm ở y ÂM
//     (trục y của Konva hướng xuống). Vật KHÔNG tự đặt vị trí: cảnh gọi `placeObject`.
//   - `parts` là các nhóm con chuyển động. Vật không viết code cho chúng chạy: engine đưa số,
//     cảnh gắn tư thế bằng `applyPose`. Gốc nhóm con của bộ phận QUAY đặt đúng tâm khớp.
//   - `points` là các điểm có tên, toạ độ cục bộ px ở tư thế nghỉ, để cảnh biết chỗ phát hiện tượng.
//   - KHÔNG vật lý: không `set`, không thời gian, không vận tốc. Cũng không vẽ sẵn hạt hay vệt —
//     những thứ đó engine sinh ra và cảnh vẽ.

import Konva from "konva";

import { COLOR, STROKE } from "./palette";
import type { ShapeObject, Vec2 } from "./types";

/** Kích thước theo kịch bản, bằng MÉT. */
const BODY_WIDTH = 0.52;
const BODY_HEIGHT = 0.32;
const BARREL_LENGTH = 0.42;
const BARREL_THICKNESS = 0.1;

export function makeTemplateExperimentDevice1(
  p: Vec2,
  ppm: number,
  fill: string,
  label?: string,
): ShapeObject {
  const group = new Konva.Group({ x: p.x, y: p.y });

  const bodyWidth = BODY_WIDTH * ppm;
  const bodyHeight = BODY_HEIGHT * ppm;
  const barrelLength = BARREL_LENGTH * ppm;
  const barrelThickness = BARREL_THICKNESS * ppm;

  // Bệ máy: đứng trên sàn, nên đỉnh bệ ở y = −bodyHeight.
  group.add(new Konva.Rect({
    x: -bodyWidth / 2,
    y: -bodyHeight,
    width: bodyWidth,
    height: bodyHeight,
    cornerRadius: bodyHeight * 0.18,
    fill,
    stroke: COLOR.slate200,
    strokeWidth: STROKE.body,
  }));

  // Hai bánh cho ra dáng máy bắn, thuần trang trí và đứng yên.
  for (const side of [-1, 1]) {
    group.add(new Konva.Circle({
      x: (side * bodyWidth) / 3,
      y: -bodyHeight * 0.18,
      radius: bodyHeight * 0.22,
      fill: COLOR.deeper,
      stroke: COLOR.slate400,
      strokeWidth: STROKE.detail,
    }));
  }

  // Khớp quay của nòng, ngay trên bệ.
  const pivot = { x: 0, y: -bodyHeight };
  group.add(new Konva.Circle({
    x: pivot.x,
    y: pivot.y,
    radius: barrelThickness * 0.55,
    fill: COLOR.slate600,
    stroke: COLOR.slate200,
    strokeWidth: STROKE.detail,
  }));

  // BỘ PHẬN QUAY: gốc nhóm con đặt ĐÚNG tâm khớp, nòng vươn sang phải ở tư thế nghỉ (0°).
  // Konva quay theo chiều kim đồng hồ, mà engine cho góc ngẩng lên, nên cảnh truyền góc ÂM.
  const barrel = new Konva.Group({ x: pivot.x, y: pivot.y });
  barrel.add(new Konva.Rect({
    x: 0,
    y: -barrelThickness / 2,
    width: barrelLength,
    height: barrelThickness,
    cornerRadius: barrelThickness * 0.35,
    fill: COLOR.slate500,
    stroke: COLOR.slate200,
    strokeWidth: STROKE.detail,
  }));
  barrel.add(new Konva.Rect({
    x: barrelLength - barrelThickness * 0.3,
    y: -barrelThickness * 0.72,
    width: barrelThickness * 0.3,
    height: barrelThickness * 1.44,
    fill: COLOR.slate300,
  }));
  group.add(barrel);

  if (label) {
    group.add(new Konva.Text({
      x: -bodyWidth / 2,
      y: bodyHeight * 0.18,
      width: bodyWidth,
      align: "center",
      text: label,
      fontSize: Math.max(10, 0.09 * ppm),
      fill: COLOR.inkOnDark,
    }));
  }

  return {
    group,
    parts: {
      // Engine cho góc ngẩng 0..80°; cảnh gọi applyPose và nhóm con quay quanh gốc của nó.
      barrel: { node: barrel, motion: "rotate", min: 0, max: 80 },
    },
    points: {
      // Miệng nòng ở tư thế NGHỈ (nòng nằm ngang). Cảnh lấy bằng worldPoint khi cần.
      muzzle: { x: pivot.x + barrelLength, y: pivot.y },
    },
  };
}
