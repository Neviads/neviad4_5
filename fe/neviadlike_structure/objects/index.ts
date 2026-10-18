// TẦNG OBJECTS — registry. Vật thể không đăng ký ở đây thì renderer không tra được theo tên.
//
// Thêm vật mới (thường do skill `draw-object` sinh ra):
//   1. Tạo objects/<ten-vat>.ts, export một ObjectFactory (xem pendulum-bob.ts, piston-cylinder.ts).
//   2. Import và thêm vào OBJECTS bên dưới, khoá là tên camelCase của hình.
//   3. Renderer gọi createObject("<ten>", p, radius, fill) rồi group.add(node.group);
//      vật động thì giữ node.update và gọi mỗi frame với giá trị đã tính từ engine.

import { pendulumBob } from "./pendulum-bob";
import { pistonCylinder } from "./piston-cylinder";
import type { ObjectFactory, ObjectNode, Vec2 } from "./types";

export const OBJECTS = {
  pendulumBob,
  pistonCylinder,
} satisfies Record<string, ObjectFactory>;

export type ObjectName = keyof typeof OBJECTS;

/** Dựng một vật theo tên và chuẩn hoá kết quả về { group, update? }. */
export function createObject(
  name: ObjectName,
  p: Vec2,
  radius: number,
  fill: string,
  options: { draggable?: boolean; label?: string } = {},
): ObjectNode {
  const built = OBJECTS[name](p, radius, fill, options.draggable ?? false, options.label);
  return "group" in built ? built : { group: built };
}

export type { ObjectFactory, ObjectNode, ObjectValues, Vec2 } from "./types";
