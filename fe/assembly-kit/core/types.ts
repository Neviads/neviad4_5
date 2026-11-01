/**
 * Kiểu dữ liệu của bộ lắp ráp 3D (xem docs/assembly-tool-design.md).
 *
 * Agent tự dựng từng bộ phận (hình tự dựng, cụm đã lưu) và nói quan hệ giữa chúng; bộ giải (solve.ts) tính tư thế bằng hình học.
 * Toàn bộ file này không phụ thuộc three.js: server MCP trong Node dùng được.
 */

import type { PhysicsConfig } from "../physics/model";
import type { M4, V3 } from "./math";

/**
 * GIỚI HẠN: CHẤT LỎNG — ghi 2026-10-28, sau khi dựng bơm bánh răng (/may-bom-thuy-luc).
 *
 * Bộ kit này dựng được KHỐI chất lỏng đứng yên và cơ cấu bơm, nhưng KHÔNG mô phỏng
 * chất lỏng chuyển động: nó là CAD + khớp rắn, không phải bộ giải CFD.
 *
 * Làm được:
 *  - Khối dầu/nước tĩnh đúng thể tích: shape_lathe (wall > 0) cho cốc/bể rỗng,
 *    shape_boolean intersect với nửa không gian dưới mức → đúng mặt phẳng mức.
 *  - Số đo thật: thể tích hình (m³), check_interference (thể tích giao), measure
 *    → tính được lưu lượng lý thuyết q = V_kẹt × số_răng × vòng/phút.
 *  - Mức dâng/hạ: gắn khối lỏng vào khớp prismatic + drive_add.
 *  - Hình học dòng chảy: shape_sweep cho ống/gioăng (uv.y = mét dọc theo đường).
 *
 * Không làm được (bản chất, không phải thiếu tính năng):
 *  - Không trường vận tốc, không bảo toàn khối lượng, không áp suất, không mặt
 *    thoáng biến dạng, không nhớt/xoáy. Mọi hình là manifold đóng, nướng một lần;
 *    "chảy" chỉ có thể là xoay/tịnh tiến khối đặc hoặc trượt vân.
 *  - Vật liệu chỉ có transmission để trong suốt — không opacity/transparent
 *    (xem MaterialDef bên dưới). Lồng hai lớp transmission (nước trong cốc thuỷ
 *    tinh, dầu trong ống nhựa trong) sẽ mất lớp trong, vì three.js loại vật liệu
 *    transmission khỏi lượt render transmission (xem three/presets.ts).
 *  - Texture thủ tục là tĩnh (noise/grain/tread/scratches): không kênh thời gian.
 *  - Physics chỉ có vật rắn: body/joint/drive/contact. Không SPH/LBM/FLIP, không
 *    lực nổi, không ma sát nhớt.
 *  - Không có khái niệm "mức" (fill/level): đổi mức phải dựng lại hình.
 *
 * Hệ quả đã gặp: "dầu trong rãnh răng" dựng bằng đĩa trừ hình bánh răng rồi gắn làm
 * con của bánh răng thì không bị ép ra khi ăn khớp — răng bánh này xuyên qua khối
 * dầu của bánh kia 1,79 cm³. Đó là giới hạn của phương pháp, không phải lỗi dựng.
 *
 * Nếu muốn kit làm được chất lỏng, thêm theo thứ tự chi phí:
 *  1. MaterialDef: opacity/transparent/depthWrite + PartInstance.visible.
 *  2. shape_fill {vessel, level, up} = giao phần rỗng với nửa không gian dưới mức.
 *  3. TextureSpec: uvScroll {speed, axis} — ống/dòng tự trượt, không cần code trang.
 *  4. Primitive jet/droplets/ripple có tham số lưu lượng.
 *  5. (ngoài CAD) op flow_field: LBM 2D trên hình cắt, trả texture + lưu lượng.
 *
 * Vai trò nên chia: kit = hình học + vật liệu + cơ cấu + số đo; chất lỏng = solver
 * ở trang (hoặc một MCP riêng).
 */

// ───────── tham số ─────────

export type ParamSpec =
  | { type: "number"; unit?: string; default: number; min?: number; max?: number; desc: string }
  | { type: "vec3"; unit?: string; default: V3; min?: number; max?: number; desc: string }
  | { type: "enum"; options: readonly string[]; default: string; desc: string }
  | { type: "boolean"; default: boolean; desc: string };
export type ParamSchema = Record<string, ParamSpec>;
export type Params = Record<string, number | V3 | string | boolean>;

// ───────── điểm neo ─────────

/**
 * Điểm neo khai báo trong khung toạ độ của bộ phận.
 * - face: mặt phẳng; `normal` hướng ra ngoài; `uv` là hai trục trong mặt dùng cho `at`.
 * - axis: một trục; `dir` là chiều trục, `radius` (nếu có) để kiểm tra trục lọt lỗ.
 * - point: một điểm có hướng "đi ra" (đầu dây, đầu tì).
 * - surface: mặt trụ quanh trục `axis` qua `origin`, bán kính `radius`; chọn điểm bằng `@bottom`, `@top`, `@front`,
 *   `@back`, `@left`, `@right` (theo hướng thế giới) hoặc `@angle=deg` (tính từ `ref`).
 * `up` (tuỳ chọn, vuông góc với hướng chính) khoá phép xoay quanh hướng chính khi ghép.
 */
export type AnchorSpec =
  | { kind: "face"; origin: V3; normal: V3; up?: V3; uv?: [V3, V3]; desc: string }
  | { kind: "axis"; origin: V3; dir: V3; up?: V3; radius?: number; desc: string }
  | { kind: "point"; origin: V3; dir: V3; up?: V3; desc: string }
  | { kind: "surface"; origin: V3; axis: V3; radius: number; ref: V3; desc: string };

/** Điểm neo đã quy về một khung: gốc, hướng chính (z), hướng tham chiếu (y), hai trục trong mặt cho `at`. */
export interface Frame {
  kind: "face" | "axis" | "point";
  origin: V3;
  dir: V3;
  up: V3;
  uv: [V3, V3];
  radius?: number;
}

// ───────── loại bộ phận ─────────

export interface Bounds {
  min: V3;
  max: V3;
}

/** Hàm dựng hình nhận module three và bộ vật liệu; kiểu để `unknown` để lõi không phụ thuộc three. */
export interface PartType {
  type: string;
  category: "shape" | "composite";
  description: string;
  params: ParamSchema;
  anchors(p: Params): Record<string, AnchorSpec>;
  bounds(p: Params): Bounds;
  build?: (p: Params, kit: unknown) => unknown;
  /** Loại là một cụm đã lưu (part_save_as_type): dựng bằng tài liệu con, đặt sao cho khung loại = khung bộ phận gốc. */
  composite?: { doc: AssemblyDoc; rootMatrix: M4 };
}

// ───────── tài liệu lắp ráp ─────────

export type PlacementKind = "onto" | "touch" | "coaxial" | "through" | "fixed";

/**
 * Cách đặt một bộ phận so với một bộ phận đã có (hoặc `ground`).
 * - onto / touch: hai mặt (hoặc điểm lên mặt) áp vào nhau, hướng ngược chiều; `at` là [u, v] trên mặt b;
 *   `offset` tách ra theo pháp tuyến; `angle` (độ) xoay quanh pháp tuyến.
 * - coaxial / through: hai trục trùng nhau, cùng chiều (`flip` để ngược); `offset` dời dọc trục; `angle` (độ) xoay quanh trục.
 *   `through` kiểm tra bán kính trục a ≤ bán kính lỗ b.
 * - fixed: khung a trùng khung b, dời `shift` [x, y, z] theo khung b; `angle` xoay quanh hướng chính của b.
 * `follow` (mặc định true): bộ phận chạy theo khi b chuyển động bởi một khớp. Đặt false cho tiếp xúc trượt
 * (chổi than tì vào vành trượt đang quay).
 */
export interface Placement {
  kind: PlacementKind;
  a: string;
  b: string;
  at?: [number, number];
  offset?: number;
  angle?: number;
  flip?: boolean;
  shift?: V3;
  follow?: boolean;
}

export interface PartInstance {
  id: string;
  type: string;
  params: Params;
  place: Placement;
  /** Vật liệu thay cho mọi mặt của bộ phận: id trong doc.materials, tên preset, hoặc tên trong MATERIAL_NAMES. */
  material?: string;
}

export interface Joint {
  id: string;
  kind: "revolute" | "prismatic";
  axis: string; // "id.anchor" kiểu axis
  moves: string[];
  limits?: [number, number]; // revolute: độ; prismatic: mét
  value?: number; // tư thế đang xem (chỉ khớp dẫn; khớp ghép và khớp do vòng tính thì bỏ qua)
  /** Khớp ghép: giá trị = ratio × giá trị khớp `joint`. Bỏ ratio khi bánh (revolute) lăn theo khớp trượt: tự tính từ bán kính trục.
   *  table [[giá trị khớp dẫn, giá trị khớp này], ...] (tăng dần theo khớp dẫn) thay cho ratio: nội suy từng đoạn, ngoài bảng giữ giá trị mút,
   *  cho cơ cấu chạy theo nhiều giai đoạn (cam, nòng khoá rồi mới lật).
   *  Ghép chạy HAI chiều khi đặt tư thế: pose cho khớp ghép một giá trị tuyệt đối thì bộ giải suy ngược ra khớp dẫn. */
  couple?: { joint: string; ratio?: number; table?: [number, number][] };
  /** lý do trục khớp được phép nằm xa vật liệu (MCP joint_add kiểm trục chạm vật liệu hai phía); chỉ là ghi chú */
  allowAir?: string;
}

/**
 * Vòng kín của cơ cấu nhiều khâu (xi lanh nâng, tay quay–thanh truyền, bốn khâu): gốc điểm neo `a` và gốc điểm neo `b`
 * (ở hai nhánh khác nhau của cây lắp ráp, hoặc `b` trên ground) phải trùng nhau ở mọi tư thế. Các khớp trong `solves`
 * do bộ giải tính ra (Gauss–Newton), không đặt tay; mỗi khớp đó phải kéo theo đúng một trong hai điểm. Khớp tự do còn
 * lại của nhóm là khớp dẫn; pose đặt khớp dẫn hoặc bất kỳ khớp nào trong nhóm (suy ngược).
 */
export interface Loop {
  id: string;
  a: string;
  b: string;
  solves: string[];
  /** lý do hai đầu vòng được phép nằm xa vật liệu (MCP loop_add kiểm); chỉ là ghi chú */
  allowAir?: string;
}

export interface Route {
  id: string;
  from: string;
  to: string;
  via?: { on: string }[];
  radius: number;
  material: string;
}

// ───────── hình tự dựng (shapes/) ─────────

/** Đường 2D: các điểm, bo góc tại từng điểm theo bán kính `round[i]` (0 = giữ góc), `closed` nối điểm cuối về đầu. */
export interface Path2D {
  pts: [number, number][];
  round?: number[];
  closed?: boolean;
}

export type ShapeOp = "lathe" | "extrude" | "sweep" | "mirror" | "pattern" | "loft" | "boolean" | "roundEdges" | "groove" | "splitRegion" | "weld" | "bevel" | "sand";

/** Điểm neo do agent đặt trên một hình (anchor_define), trong khung của hình. */
export type ShapeAnchor = AnchorSpec;

/**
 * Một nút trong cây tính năng. `params` theo từng op (shapes/*.ts); `inputs` là id các hình đầu vào (mirror, pattern);
 * `offset` / `rotate` (độ, XYZ) dời và xoay kết quả trước khi tính điểm neo.
 */
export interface ShapeNode {
  id: string;
  op: ShapeOp;
  params: Record<string, unknown>;
  inputs?: string[];
  offset?: V3;
  rotate?: V3;
  material?: string;
  anchors?: Record<string, ShapeAnchor>;
}

/** Texture thủ tục (vẽ bằng canvas trong trình duyệt). */
export interface TextureSpec {
  kind: "noise" | "flakes" | "tread" | "grain" | "scratches";
  scale?: number; // số lần lặp trên UV
  seed?: number;
  strength?: number;
}

export interface MaterialDef {
  /** Tham số PBR do agent tự đặt (bảng MATERIAL_PARAMS ở core/materials.ts). */
  params?: Record<string, number | string>;
  /** Khối lượng riêng kg/m³ và hệ số ma sát của vật liệu thật (cho mô hình vật lý). */
  density?: number;
  friction?: number;
  /** Chỉ còn để đọc tài liệu cũ: preset trong PRESETS, ghi đè bằng overrides. */
  preset?: string;
  overrides?: Record<string, number | string>;
  textures?: { normal?: TextureSpec; roughness?: TextureSpec; color?: TextureSpec };
}

/** Chữ hoặc hình chiếu lên mặt một bộ phận tại một điểm neo kiểu face (kể cả mặt trụ @…). */
export interface Decal {
  id: string;
  target: string; // id bộ phận
  at: string; // "id.diemNeo" kiểu face, hoặc mặt trụ "id.surface@angle=…"
  size: [number, number];
  angle?: number;
  depth?: number;
  content: { text?: string; svg?: string; color?: string; background?: string; font?: string; arcRadius?: number };
  mode?: "print" | "emboss" | "engrave";
}

export interface SceneSpec {
  environment?: "room" | "studio" | "street" | "sunset" | "dawn";
  stage?: "table" | "studioCyc" | "road" | "glossyFloor" | "none";
  exposure?: number;
}

/**
 * Cụm bộ phận đã lưu thành loại mới (part_save_as_type). `doc` là tài liệu con tự đủ (bộ phận giữ nguyên cách ghép,
 * hình, vật liệu, decal, types lồng); khung của loại là khung bộ phận `root` lúc mọi khớp = 0 (`rootMatrix` trong doc).
 */
export interface CompositeType {
  description: string;
  source: string;
  root: string;
  doc: AssemblyDoc;
  rootMatrix: M4;
  anchors: Record<string, AnchorSpec>;
  bounds: Bounds;
}

export interface AssemblyDoc {
  id: string;
  title: string;
  parts: PartInstance[];
  joints: Joint[];
  /** Vòng kín (loop_add). */
  loops?: Loop[];
  routes: Route[];
  shapes?: ShapeNode[];
  materials?: Record<string, MaterialDef>;
  decals?: Decal[];
  scene?: SceneSpec;
  /** Cụm đã lưu mà tài liệu này dùng (bản sao từ thư viện, để file tự đủ). */
  types?: Record<string, CompositeType>;
  /** Cấu hình mô phỏng (physics_setup, body_set, initial_set, drive_add). */
  physics?: PhysicsConfig;
}

export const MATERIAL_NAMES = [
  "wood", "felt", "aluminium", "steel", "iron", "copper", "brass", "bakelite", "carbon", "rubber",
  "redPaint", "bluePaint", "whitePaint", "blackPaint", "glass", "winding", "tape", "wireRed", "wireBlack", "enamel",
] as const;
export type MaterialName = (typeof MATERIAL_NAMES)[number];
