// TẦNG OBJECTS — piston-cylinder.ts
// Vật động tham chiếu: xi lanh có pít-tông. Điểm neo ở tâm đáy xi lanh, thân lên trên (y âm).
// `update({ ratio })` với ratio từ 0 (pít-tông ở trên cùng) đến 1 (ở dưới cùng) chỉ đặt lại vị trí
// các bộ phận đã giữ tham chiếu: không tính vật lý, không tạo hình mới.

import Konva from "konva";
import { BODY_SHADOW, COLOR, STROKE, clamp, objectFontFamily } from "./palette";
import type { ObjectFactory, ObjectNode, ObjectValues } from "./types";

export const pistonCylinder: ObjectFactory = (p, radius, fill, draggable, label): ObjectNode => {
  const w = clamp(radius * 2.4, 46, 84);
  const h = clamp(radius * 4.2, 90, 150);
  const wall = 6;
  const headHalf = 6;
  const rodLength = 32;
  const topLimit = -h + wall + headHalf + 8; // tâm đầu pít-tông khi ratio = 0
  const bottomLimit = -wall - headHalf - 8; // tâm đầu pít-tông khi ratio = 1
  const group = new Konva.Group({ x: p.x, y: p.y, draggable });

  const fluid = new Konva.Rect({ x: -w / 2 + wall, y: -h / 2, width: w - 2 * wall, height: 10, fill, opacity: 0.55, listening: false });
  const head = new Konva.Rect({
    x: -w / 2 + wall,
    y: -h / 2 - headHalf,
    width: w - 2 * wall,
    height: 2 * headHalf,
    cornerRadius: 2,
    fill: COLOR.slate400,
    stroke: COLOR.slate200,
    strokeWidth: 1.5,
  });
  const rod = new Konva.Line({
    points: [0, -h / 2, 0, -h / 2 - rodLength],
    stroke: COLOR.slate300,
    strokeWidth: STROKE.link,
    lineCap: "round",
    listening: false,
  });
  const handle = new Konva.Rect({
    x: -14,
    y: -h / 2 - rodLength - 8,
    width: 28,
    height: 8,
    cornerRadius: 3,
    fill: COLOR.slate500,
    stroke: COLOR.slate300,
    strokeWidth: 2,
  });

  group.add(
    new Konva.Rect({
      x: -w / 2,
      y: -h,
      width: w,
      height: h,
      cornerRadius: 4,
      fill: COLOR.fixed,
      stroke: COLOR.slate300,
      strokeWidth: STROKE.body,
      ...BODY_SHADOW,
    }),
    fluid,
    new Konva.Line({
      points: [-w / 2 + 5, -h + 10, -w / 2 + 5, -h * 0.55],
      stroke: COLOR.slate200,
      strokeWidth: 2,
      opacity: 0.55,
      lineCap: "round",
      listening: false,
    }),
    head,
    rod,
    handle,
    new Konva.Rect({
      x: -w / 2 - 6,
      y: -4,
      width: w + 12,
      height: 6,
      cornerRadius: 2,
      fill: COLOR.slate500,
      stroke: COLOR.slate400,
      strokeWidth: 1.5,
    }),
  );
  if (label) {
    group.add(
      new Konva.Text({
        x: -w / 2,
        y: 10,
        width: w,
        text: label,
        align: "center",
        fontSize: 12,
        fontStyle: "normal",
        fontFamily: objectFontFamily(),
        fill: COLOR.inkOnDark,
        listening: false,
      }),
    );
  }

  const update = (values: ObjectValues) => {
    const ratio = clamp(values.ratio ?? 0, 0, 1);
    const centerY = topLimit + (bottomLimit - topLimit) * ratio;
    head.y(centerY - headHalf);
    rod.points([0, centerY, 0, centerY - rodLength]);
    handle.y(centerY - rodLength - 8);
    fluid.y(centerY + headHalf);
    fluid.height(Math.max(1, -wall - (centerY + headHalf)));
  };
  update({ ratio: 0.5 });
  return { group, update };
};
