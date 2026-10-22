// TẦNG OBJECTS — types.ts
// Chữ ký chung của một vật thể. Khớp với hợp đồng đầu ra của skill `draw-object`
// (be/src/beneviadsystem/resources/skills/draw-object/SKILL.md), nên code skill sinh ra dùng được ngay.
//
// Quy ước:
//   - Một vật thể = một hàm thuần trả về Konva.Group. Chỉ VẼ; không tính vật lý, không đọc engine.
//   - Gốc (0,0) của nhóm là "điểm neo": đứng trên sàn → điểm chạm sàn (thân y âm);
//     treo → điểm treo (thân y dương); khớp → tâm khớp; vật tròn → tâm.
//   - Mọi kích thước tính từ `radius` (pixel logic) và được kẹp min/max.
//   - Vật có bộ phận chuyển động trả thêm `update(values)`; chỉ đặt lại vị trí/kích thước
//     các bộ phận đã giữ tham chiếu, không dựng lại hình.

import type Konva from "konva";

export type Vec2 = { x: number; y: number };

/** Giá trị đã quy đổi cho bộ phận động (vd. { ratio: 0..1 } hoặc { angle: độ }). */
export type ObjectValues = Record<string, number>;

/** Kết quả chuẩn hoá: luôn có `group`; `update` chỉ có ở vật động. */
export type ObjectNode = {
  group: Konva.Group;
  update?: (values: ObjectValues) => void;
};

/** Hàm vẽ một vật thể. Vật tĩnh có thể trả thẳng Konva.Group. */
export type ObjectFactory = (
  p: Vec2,
  radius: number,
  fill: string,
  draggable: boolean,
  label?: string,
) => Konva.Group | ObjectNode;

/**
 * Bộ phận chuyển động BÊN TRONG một vật (pít-tông, cần bơm, kim). `node` là nhóm con: trượt thì gốc ở vị trí nghỉ, quay thì gốc ở tâm khớp.
 * Giá trị do engine cấp: mét theo `axis` với "slide", độ với "rotate", trong [min, max], tính từ tư thế nghỉ. Vật không tự dời nó.
 */
export type MovingPart = {
  node: Konva.Group;
  motion: "slide" | "rotate";
  axis?: "up" | "down" | "left" | "right";
  min: number;
  max: number;
};

/**
 * Hợp đồng HIỆN TẠI của vật do agent vẽ: chỉ là HÌNH, không có vật lý.
 *   - Hàm dựng `(p: Vec2, ppm: number, fill: string, label?: string) => ShapeObject`; `ppm` là pixel trên mét của cả cảnh, mọi độ dài = mét × ppm.
 *   - `group` đặt tại `p`, gốc là điểm neo; vật không đổi vị trí/góc/tỉ lệ của nó (cảnh đặt vật theo engine).
 *   - `parts`: bộ phận chuyển động (cảnh gắn tư thế bằng `applyPose` trong shared/object-pose.ts).
 *   - `points`: điểm có tên, toạ độ cục bộ px ở tư thế nghỉ (cảnh đổi sang toạ độ cảnh bằng `worldPoint`).
 * Kích thước, điểm neo, tên bộ phận và tên điểm lấy đúng từ `objectGeometry` của kịch bản.
 */
export type ShapeObject = {
  group: Konva.Group;
  parts: Record<string, MovingPart>;
  points: Record<string, Vec2>;
};

export type ShapeFactory = (p: Vec2, ppm: number, fill: string, label?: string) => ShapeObject;

/**
 * CŨ: vật thể thông minh của skill `draw-object` trước đây (vật tự có đầu vào và set()). Chỉ các mẫu cũ trong objects/ còn dùng.
 *   - inputs: các bậc tự do tức thời (dof) mà engine cấp theo từng khoảnh khắc; set() kẹp trong [min,max] và cập nhật hình.
 *   - joints: mỗi khớp có hai điểm nối tính từ hai vật cứng; phải trùng nhau ở mọi giá trị dof.
 *   - partAnchors: một điểm trên mỗi bộ phận của spec (khoá = tên bộ phận), để gắn huy hiệu số cho chú giải.
 *   - read(): chỉ là bản đối chiếu hình học của đại lượng đã có công thức trong engine.
 */
export type SmartObject = {
  group: Konva.Group;
  pixelsPerMeter: number;
  ports: Record<string, Vec2>;
  joints: Record<string, { a: Vec2; b: Vec2 }>;
  partAnchors: Record<string, Vec2>;
  inputs: Record<string, { label: string; unit: string; min: number; max: number; default: number }>;
  outputs: Record<string, { label: string; unit: string }>;
  set(values: Record<string, number>): void;
  get(): Record<string, number>;
  read(): Record<string, number>;
};
