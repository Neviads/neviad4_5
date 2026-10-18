// TẦNG OBJECTS — pendulum-bob.ts
// Vật tĩnh tham chiếu: quả lắc. Điểm neo ở tâm quả. Dạy bộ ba thân màu + điểm sáng + cung tối,
// viền sáng cùng tông và nhãn đậm cùng tông trên thân. Bóng đổ chỉ đặt trên thân chính.

import Konva from "konva";
import { BODY_SHADOW, COLOR, clamp, objectFontFamily } from "./palette";
import type { ObjectFactory } from "./types";

export const pendulumBob: ObjectFactory = (p, radius, fill, draggable, label) => {
  const bobRadius = clamp(radius, 18, 32);
  const group = new Konva.Group({ x: p.x, y: p.y, draggable });
  group.add(
    new Konva.Circle({
      radius: bobRadius,
      fill,
      stroke: COLOR.rimTeal,
      strokeWidth: 3,
      ...BODY_SHADOW,
    }),
    new Konva.Circle({
      x: -bobRadius * 0.28,
      y: -bobRadius * 0.3,
      radius: bobRadius * 0.28,
      fill: COLOR.glintTeal,
      opacity: 0.72,
      listening: false,
    }),
    new Konva.Arc({
      innerRadius: bobRadius * 0.72,
      outerRadius: bobRadius * 0.82,
      angle: 78,
      rotation: 28,
      fill: COLOR.shadeTeal,
      opacity: 0.75,
      listening: false,
    }),
    new Konva.Text({
      x: -bobRadius,
      y: -7,
      width: bobRadius * 2,
      text: label ?? "",
      align: "center",
      fontSize: 14,
      fontStyle: "normal",
      fontFamily: objectFontFamily(),
      fill: COLOR.inkOnTeal,
      listening: false,
    }),
  );
  return group;
};
