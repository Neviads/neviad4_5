// Gắn số của engine vào vật dạng ShapeObject (objects/types.ts). Viết sẵn một lần để mọi cảnh dùng chung, không ai phải tự viết lại.
//
//   placeObject(obj, view.toView(x, y))     đặt điểm neo của vật tại vị trí engine báo (đã đổi sang pixel của cảnh)
//   setObjectVisible(obj, pose.visible)     ẩn vật khi engine báo `visible: false` (vật chưa xuất hiện hay đã biến mất)
//   applyPose(obj, { tên: giá trị }, ppm)  dời/quay các bộ phận chuyển động; giá trị bằng mét (slide) hoặc độ (rotate), kẹp trong [min, max]
//   worldPoint(obj, "tên")                 toạ độ một điểm có tên trong hệ của lớp chứa vật (để vẽ hạt, vệt, mũi tên đúng chỗ)
//
// Không có vật lý ở đây: engine quyết định mọi con số.

import type Konva from "konva";
import type { MovingPart, ShapeObject, Vec2 } from "../objects/types";

type Rest = { x: number; y: number; rotation: number };

/** Tư thế nghỉ của mỗi nhóm con, ghi lần đầu gặp: mọi giá trị sau đó tính từ đây, nên gọi lại nhiều lần vẫn đúng. */
const rests = new WeakMap<Konva.Group, Rest>();

function restOf(node: Konva.Group): Rest {
  let rest = rests.get(node);
  if (!rest) {
    rest = { x: node.x(), y: node.y(), rotation: node.rotation() };
    rests.set(node, rest);
  }
  return rest;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Hướng trượt trên màn hình (trục y của Konva hướng xuống, nên "up" là y âm). */
const DIRECTION: Record<NonNullable<MovingPart["axis"]>, Vec2> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** Đặt điểm neo của vật tại `at` (pixel, trong hệ của lớp chứa vật). */
export function placeObject(obj: ShapeObject, at: Vec2): void {
  obj.group.position(at);
}

/** Ẩn hay hiện cả vật theo `visible` của engine (vật chưa xuất hiện hay đã biến mất); bỏ trống là đang thấy. */
export function setObjectVisible(obj: ShapeObject, visible: boolean | undefined): void {
  obj.group.visible(visible !== false);
}

/** Dời hay quay từng bộ phận theo giá trị engine cấp; bộ phận không có trong `values` giữ nguyên. Góc tính theo chiều của Konva (dương là cùng chiều kim đồng hồ). */
export function applyPose(obj: ShapeObject, values: Record<string, number> | undefined, ppm: number): void {
  if (!values) return;
  for (const [name, part] of Object.entries(obj.parts)) {
    const raw = values[name];
    if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
    const value = clamp(raw, part.min, part.max);
    const rest = restOf(part.node);
    if (part.motion === "rotate") {
      part.node.rotation(rest.rotation + value);
    } else {
      const dir = DIRECTION[part.axis ?? "up"];
      part.node.position({ x: rest.x + dir.x * value * ppm, y: rest.y + dir.y * value * ppm });
    }
  }
}

/** Điểm có tên của vật, đổi sang hệ toạ độ của lớp chứa vật (tính cả vị trí, góc và tỉ lệ của nhóm). */
export function worldPoint(obj: ShapeObject, name: string): Vec2 | null {
  const local = obj.points[name];
  if (!local) return null;
  return obj.group.getTransform().point(local);
}
