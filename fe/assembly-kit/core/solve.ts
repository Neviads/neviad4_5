/**
 * Bộ giải lắp ráp: đi các bộ phận theo thứ tự trong tài liệu (mỗi bộ phận chỉ được đặt vào bộ phận đứng trước nó
 * hoặc `ground`, nên lắp ráp luôn là một cây), giải từng ràng buộc đặt chỗ thành ma trận thế giới:
 *
 *   X = W_b · F_b · M · F_a⁻¹
 *
 * F_a, F_b là khung của hai điểm neo (gốc, X = Y × Z, Y = up, Z = hướng chính), W_b là tư thế của bộ phận b, M là
 * phép biến đổi riêng của từng kiểu ghép (lật 180° quanh up để hai mặt áp vào nhau, dời `offset`, xoay `angle`).
 * Sau đó áp các khớp (revolute / prismatic) lên cụm bộ phận mà khớp kéo theo.
 */

import {
  type M4, type V3, add, anyPerpendicular, chain, cross, dot, fromFrame, identity, invertRigid, length, normalize, rotation,
  rotationAbout, scale, sub, transformDir, transformPoint, translation,
} from "./math";
import type { AnchorSpec, AssemblyDoc, Bounds, Frame, Joint, Params, PartInstance, PartType, Placement } from "./types";

export type Registry = Record<string, PartType>;

/** Lỗi dành cho agent: câu chữ nói rõ sai ở đâu và sửa thế nào. */
export class AssemblyError extends Error {}

const DEG = Math.PI / 180;
const fmt = (v: V3) => `[${v.map((x) => +x.toFixed(4)).join(", ")}]`;

// ───────── tham số ─────────

export function resolveParams(type: PartType, given: Params = {}): Params {
  const out: Params = {};
  for (const key of Object.keys(given)) {
    if (!(key in type.params)) throw new AssemblyError(`${type.type} không có tham số "${key}". Tham số hợp lệ: ${Object.keys(type.params).join(", ")}.`);
  }
  for (const [key, spec] of Object.entries(type.params)) {
    const v = key in given ? given[key] : spec.default;
    if (spec.type === "number") {
      if (typeof v !== "number" || !Number.isFinite(v)) throw new AssemblyError(`${type.type}.${key} phải là số (${spec.unit ?? ""}).`);
      if ((spec.min !== undefined && v < spec.min) || (spec.max !== undefined && v > spec.max)) {
        throw new AssemblyError(`${type.type}.${key} = ${v} ngoài miền [${spec.min ?? "−∞"}, ${spec.max ?? "∞"}]${spec.unit ? ` ${spec.unit}` : ""}.`);
      }
    } else if (spec.type === "vec3") {
      if (!Array.isArray(v) || v.length !== 3 || v.some((x) => typeof x !== "number" || !Number.isFinite(x))) throw new AssemblyError(`${type.type}.${key} phải là [x, y, z] (${spec.unit ?? ""}).`);
      if (v.some((x) => (spec.min !== undefined && (x as number) < spec.min) || (spec.max !== undefined && (x as number) > spec.max))) {
        throw new AssemblyError(`${type.type}.${key} = ${JSON.stringify(v)} có thành phần ngoài miền [${spec.min ?? "−∞"}, ${spec.max ?? "∞"}].`);
      }
    } else if (spec.type === "enum") {
      if (!spec.options.includes(v as string)) throw new AssemblyError(`${type.type}.${key} = ${JSON.stringify(v)}; chọn một trong: ${spec.options.join(", ")}.`);
    } else if (typeof v !== "boolean") {
      throw new AssemblyError(`${type.type}.${key} phải là true/false.`);
    }
    out[key] = Array.isArray(v) ? ([...v] as V3) : v;
  }
  return out;
}

// ───────── điểm neo ─────────

const GROUND_ANCHORS: Record<string, AnchorSpec> = {
  top: { kind: "face", origin: [0, 0, 0], normal: [0, 1, 0], up: [0, 0, -1], uv: [[1, 0, 0], [0, 0, 1]], desc: "mặt bàn (y = 0); at = [x, z]" },
  x: { kind: "axis", origin: [0, 0, 0], dir: [1, 0, 0], up: [0, 1, 0], desc: "trục x thế giới (cho khớp trượt dọc đường, ray…)" },
  y: { kind: "axis", origin: [0, 0, 0], dir: [0, 1, 0], up: [0, 0, 1], desc: "trục y thế giới (thẳng đứng)" },
  z: { kind: "axis", origin: [0, 0, 0], dir: [0, 0, 1], up: [0, 1, 0], desc: "trục z thế giới" },
};

export interface RefParts {
  id: string;
  anchor: string;
  mod?: string;
}

export function parseRef(ref: string): RefParts {
  // id bộ phận tới dấu chấm đầu tiên; tên điểm neo được chứa dấu chấm, [i] và ~ (điểm neo kế thừa: "hoc.axis", "lo[2].axis")
  const m = /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_.~[\]]+)(?:@(.+))?$/.exec(ref ?? "");
  if (!m) throw new AssemblyError(`"${ref}" không đúng dạng "boPhan.diemNeo" hoặc "boPhan.diemNeo@vitri".`);
  return { id: m[1], anchor: m[2], mod: m[3] };
}

const WORLD_DIRS: Record<string, V3> = { top: [0, 1, 0], bottom: [0, -1, 0], front: [0, 0, 1], back: [0, 0, -1], right: [1, 0, 0], left: [-1, 0, 0] };

/** Quy một điểm neo (trong khung bộ phận) về Frame cục bộ. `world` của bộ phận cần cho `surface@bottom`… */
export function toFrame(spec: AnchorSpec, mod: string | undefined, world: M4, label: string): Frame {
  if (spec.kind === "surface") {
    const axis = normalize(spec.axis);
    let n: V3;
    if (!mod) throw new AssemblyError(`${label} là mặt trụ: chọn điểm bằng @top/@bottom/@front/@back/@left/@right hoặc @angle=độ.`);
    const ang = /^angle=(-?[\d.]+)$/.exec(mod);
    if (ang) {
      const ref = normalize(sub(spec.ref, scale(axis, dot(spec.ref, axis))));
      n = normalize(transformDir(rotation(axis, +ang[1] * DEG), ref));
    } else if (WORLD_DIRS[mod]) {
      const local = transformDir(invertRigid(world), WORLD_DIRS[mod]);
      const p = sub(local, scale(axis, dot(local, axis)));
      if (length(p) < 1e-6) throw new AssemblyError(`${label}@${mod}: trục của mặt trụ đang song song với hướng "${mod}", không có điểm nào như vậy.`);
      n = normalize(p);
    } else {
      throw new AssemblyError(`${label}@${mod}: không hiểu vị trí "${mod}". Dùng top, bottom, front, back, left, right hoặc angle=độ.`);
    }
    return { kind: "face", origin: add(spec.origin, scale(n, spec.radius)), dir: n, up: axis, uv: [axis, cross(n, axis)] };
  }
  if (mod) throw new AssemblyError(`${label} không phải mặt trụ nên không nhận "@${mod}".`);
  const dir = normalize(spec.kind === "face" ? spec.normal : spec.dir);
  const upRaw = spec.up ?? anyPerpendicular(dir);
  const up = normalize(sub(upRaw, scale(dir, dot(upRaw, dir))));
  const x = cross(up, dir);
  const uv: [V3, V3] = spec.kind === "face" && spec.uv ? spec.uv : [x, up];
  return { kind: spec.kind, origin: spec.origin, dir, up, uv, radius: spec.kind === "axis" ? spec.radius : undefined };
}

const frameMatrix = (f: Frame): M4 => fromFrame(f.origin, cross(f.up, f.dir), f.up, f.dir);
/** Lật 180° quanh trục up (Y) của khung: Z → −Z, X → −X. */
const FLIP: M4 = [-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1];

// ───────── kết quả ─────────

export interface SolvedPart {
  id: string;
  type: string;
  params: Params;
  parent: string; // "ground" hoặc id
  follow: boolean;
  rest: M4; // tư thế khi mọi khớp bằng 0
  world: M4; // tư thế theo giá trị khớp hiện tại
}

export interface Solved {
  parts: Map<string, SolvedPart>;
  order: string[];
  /** Cụm bộ phận mà mỗi khớp kéo theo. */
  clusters: Map<string, string[]>;
  /** giá trị thật của từng khớp sau khi tính khớp ghép */
  values: Map<string, number>;
}

export function getType(registry: Registry, type: string): PartType {
  const t = registry[type];
  if (!t) throw new AssemblyError(type.startsWith("shape:") ? `Chưa có hình "${type.slice(6)}". Dựng bằng shape_lathe / shape_extrude / shape_sweep, xem shape_list.` : `Không có loại bộ phận "${type}". Gọi part_types_list để xem các loại.`);
  return t;
}

/** Khung của một điểm neo (cục bộ) cùng tư thế bộ phận chứa nó. */
export function anchorFrame(registry: Registry, solved: Map<string, SolvedPart>, ref: string, pose: "rest" | "world" = "rest"): { frame: Frame; world: M4; part: SolvedPart | null } {
  const { id, anchor, mod } = parseRef(ref);
  if (id === "ground") {
    const spec = GROUND_ANCHORS[anchor];
    if (!spec) throw new AssemblyError(`ground chỉ có điểm neo: ${Object.keys(GROUND_ANCHORS).join(", ")}.`);
    return { frame: toFrame(spec, mod, identity(), ref), world: identity(), part: null };
  }
  const part = solved.get(id);
  if (!part) throw new AssemblyError(`Chưa có bộ phận "${id}" (hoặc nó đứng sau trong danh sách). Thêm "${id}" trước rồi mới tham chiếu.`);
  const type = getType(registry, part.type);
  const specs = type.anchors(part.params);
  const spec = specs[anchor];
  if (!spec) throw new AssemblyError(`${part.type} "${id}" không có điểm neo "${anchor}". Có: ${Object.entries(specs).map(([k, s]) => `${k} (${s.kind})`).join(", ")}.`);
  const world = pose === "rest" ? part.rest : part.world;
  return { frame: toFrame(spec, mod, world, `${id}.${anchor}`), world, part };
}

function solvePlacement(registry: Registry, solved: Map<string, SolvedPart>, inst: PartInstance, params: Params): { rest: M4; parent: string } {
  const pl: Placement = inst.place;
  if (!pl || typeof pl !== "object") throw new AssemblyError(`${inst.id}: thiếu "place".`);
  const ra = parseRef(pl.a);
  if (ra.id !== inst.id) throw new AssemblyError(`${inst.id}: place.a phải là điểm neo của chính nó ("${inst.id}.…"), đang là "${pl.a}".`);
  const type = getType(registry, inst.type);
  const specs = type.anchors(params);
  const specA = specs[ra.anchor];
  if (!specA) throw new AssemblyError(`${inst.type} "${inst.id}" không có điểm neo "${ra.anchor}". Có: ${Object.entries(specs).map(([k, s]) => `${k} (${s.kind})`).join(", ")}.`);
  if (specA.kind === "surface" && !ra.mod) throw new AssemblyError(`${pl.a} là mặt trụ: thêm @angle=độ.`);
  // Với điểm neo của chính a, "@top" theo hướng thế giới chưa có nghĩa (a chưa đặt): chỉ nhận @angle=.
  if (specA.kind === "surface" && ra.mod && !/^angle=/.test(ra.mod)) throw new AssemblyError(`${pl.a}: với điểm neo của bộ phận đang đặt, mặt trụ chỉ nhận @angle=độ.`);
  const fa = toFrame(specA, ra.mod, identity(), pl.a);
  const b = anchorFrame(registry, solved, pl.b, "rest");
  const fb = { ...b.frame };
  const angle = (pl.angle ?? 0) * DEG;
  let M: M4;

  switch (pl.kind) {
    case "onto":
    case "touch": {
      if (fb.kind !== "face") throw new AssemblyError(`${pl.kind}: b phải là một mặt (face hoặc mặt trụ @…), "${pl.b}" là ${fb.kind}.`);
      if (fa.kind === "axis") throw new AssemblyError(`${pl.kind}: a phải là mặt hoặc điểm, "${pl.a}" là trục. Dùng coaxial/through cho trục.`);
      if (pl.at) {
        if (!Array.isArray(pl.at) || pl.at.length !== 2) throw new AssemblyError(`at phải là [u, v] (mét) trên mặt b.`);
        fb.origin = add(fb.origin, add(scale(fb.uv[0], pl.at[0]), scale(fb.uv[1], pl.at[1])));
      }
      M = chain(translation([0, 0, pl.offset ?? 0]), rotation([0, 0, 1], angle), FLIP);
      break;
    }
    case "coaxial":
    case "through": {
      if (fa.kind !== "axis" || fb.kind !== "axis") throw new AssemblyError(`${pl.kind}: cả a và b phải là trục (axis); "${pl.a}" là ${fa.kind}, "${pl.b}" là ${fb.kind}.`);
      if (pl.kind === "through" && fa.radius !== undefined && fb.radius !== undefined && fa.radius > fb.radius + 1e-6) {
        throw new AssemblyError(`through: ${pl.a} bán kính ${fa.radius} m lớn hơn lỗ ${pl.b} bán kính ${fb.radius} m.`);
      }
      M = chain(translation([0, 0, pl.offset ?? 0]), rotation([0, 0, 1], angle), pl.flip ? FLIP : identity());
      break;
    }
    case "fixed":
      M = chain(translation(pl.shift ?? [0, 0, 0]), rotation([0, 0, 1], angle));
      break;
    default:
      throw new AssemblyError(`Không có kiểu ghép "${(pl as Placement).kind}". Dùng onto, touch, coaxial, through, fixed.`);
  }
  return { rest: chain(b.world, frameMatrix(fb), M, invertRigid(frameMatrix(fa))), parent: b.part ? b.part.id : "ground" };
}

/** Giải toàn bộ tài liệu. Ném AssemblyError (có tên bộ phận) ở lỗi đầu tiên. */
export function solve(doc: AssemblyDoc, registry: Registry): Solved {
  const parts = new Map<string, SolvedPart>();
  const order: string[] = [];
  for (const inst of doc.parts) {
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(inst.id) || inst.id === "ground") throw new AssemblyError(`id "${inst.id}" không hợp lệ (chữ, số, _ và -, không được là "ground").`);
    if (parts.has(inst.id)) throw new AssemblyError(`Trùng id "${inst.id}".`);
    try {
      const type = getType(registry, inst.type);
      const params = resolveParams(type, inst.params);
      const { rest, parent } = solvePlacement(registry, parts, inst, params);
      parts.set(inst.id, { id: inst.id, type: inst.type, params, parent, follow: inst.place.follow !== false, rest, world: rest });
      order.push(inst.id);
    } catch (e) {
      if (e instanceof AssemblyError) throw new AssemblyError(`[${inst.id}] ${e.message}`);
      throw e;
    }
  }
  const { clusters, values } = applyJoints(doc.joints, parts, order, registry);
  return { parts, order, clusters, values };
}

function applyJoints(joints: Joint[], parts: Map<string, SolvedPart>, order: string[], registry: Registry): { clusters: Map<string, string[]>; values: Map<string, number> } {
  const owner = new Map<string, { joint: Joint; motion: M4 }>();
  const clusters = new Map<string, string[]>();
  const axes = new Map<string, { p: V3; d: V3; radius?: number }>();
  for (const j of joints) {
    if (!j.moves?.length) throw new AssemblyError(`[khớp ${j.id}] "moves" trống.`);
    const { frame, world } = anchorFrame(registry, parts, j.axis, "rest");
    if (frame.kind !== "axis") throw new AssemblyError(`[khớp ${j.id}] ${j.axis} không phải trục (axis).`);
    axes.set(j.id, { p: transformPoint(world, frame.origin), d: transformDir(world, frame.dir), radius: frame.radius });
  }
  const values = jointValues(joints, axes);
  for (const j of joints) {
    const { p, d } = axes.get(j.id)!;
    const v = values.get(j.id)!;
    const motion = j.kind === "revolute" ? rotationAbout(p, d, v * DEG) : translation(scale(d, v));
    for (const id of j.moves) {
      if (!parts.has(id)) throw new AssemblyError(`[khớp ${j.id}] không có bộ phận "${id}".`);
      if (owner.has(id)) throw new AssemblyError(`[khớp ${j.id}] "${id}" đã thuộc khớp ${owner.get(id)!.joint.id}; mỗi bộ phận chỉ do một khớp trực tiếp điều khiển.`);
      owner.set(id, { joint: j, motion });
    }
  }
  const carried = new Map<string, M4>();
  const inCluster = new Map<string, string>();
  for (const id of order) {
    const part = parts.get(id)!;
    const parentMotion = part.parent !== "ground" && part.follow ? carried.get(part.parent) : undefined;
    const own = owner.get(id);
    const motion = own ? chain(parentMotion ?? identity(), own.motion) : parentMotion;
    if (motion) {
      carried.set(id, motion);
      part.world = chain(motion, part.rest);
      const jid = own ? own.joint.id : inCluster.get(part.parent)!;
      inCluster.set(id, jid);
    }
  }
  for (const j of joints) clusters.set(j.id, order.filter((id) => inCluster.get(id) === j.id));
  return { clusters, values };
}

/**
 * Tỉ số của khớp ghép khi không cho `ratio`: bánh (revolute) lăn không trượt trên mặt ngang theo khớp trượt
 * (prismatic). Tâm bánh đi s theo d thì góc quay θ thoả θ·R·(a × up) = s·d, nên θ/s = (d · (a × up)) / R.
 */
export function rollingRatio(revolute: { d: V3; radius?: number }, prismatic: { d: V3 }, label: string): number {
  if (!revolute.radius) throw new AssemblyError(`${label}: trục của khớp quay không có bán kính để tính lăn; cho "ratio" (độ mỗi mét) hoặc dùng trục bánh (disc.axis).`);
  const k = dot(prismatic.d, cross(revolute.d, [0, 1, 0]));
  if (Math.abs(k) < 1e-6) throw new AssemblyError(`${label}: trục bánh song song với hướng trượt hoặc thẳng đứng, bánh không lăn theo được; cho "ratio".`);
  return k / revolute.radius / DEG;
}

/** Giá trị thật của từng khớp: khớp ghép (couple) = ratio × giá trị khớp dẫn + value riêng. */
export function jointValues(joints: Joint[], axes?: Map<string, { d: V3; radius?: number }>): Map<string, number> {
  const byId = new Map(joints.map((j) => [j.id, j]));
  const out = new Map<string, number>();
  const visiting = new Set<string>();
  const val = (j: Joint): number => {
    if (out.has(j.id)) return out.get(j.id)!;
    if (visiting.has(j.id)) throw new AssemblyError(`[khớp ${j.id}] ghép vòng tròn (couple trỏ ngược về chính nó).`);
    visiting.add(j.id);
    let v = j.value ?? 0;
    if (j.couple) {
      const lead = byId.get(j.couple.joint);
      if (!lead) throw new AssemblyError(`[khớp ${j.id}] couple.joint "${j.couple.joint}" không có. Khớp hiện có: ${[...byId.keys()].join(", ")}.`);
      let ratio = j.couple.ratio;
      if (ratio === undefined) {
        if (j.kind !== "revolute" || lead.kind !== "prismatic") throw new AssemblyError(`[khớp ${j.id}] thiếu couple.ratio; chỉ tự tính được khi khớp quay (bánh) theo khớp trượt.`);
        if (!axes) throw new AssemblyError(`[khớp ${j.id}] cần trục khớp để tính tỉ số lăn.`);
        ratio = rollingRatio(axes.get(j.id)!, axes.get(lead.id)!, `[khớp ${j.id}]`);
      }
      v += ratio * val(lead);
    }
    visiting.delete(j.id);
    out.set(j.id, v);
    return v;
  };
  for (const j of joints) val(j);
  return out;
}

// ───────── báo cáo ─────────

export function worldBounds(registry: Registry, part: SolvedPart): Bounds {
  const b = getType(registry, part.type).bounds(part.params);
  const min: V3 = [Infinity, Infinity, Infinity], max: V3 = [-Infinity, -Infinity, -Infinity];
  for (const x of [b.min[0], b.max[0]]) for (const y of [b.min[1], b.max[1]]) for (const z of [b.min[2], b.max[2]]) {
    const p = transformPoint(part.world, [x, y, z]);
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], p[k]);
      max[k] = Math.max(max[k], p[k]);
    }
  }
  return { min, max };
}

/** Các điểm neo của một bộ phận ở toạ độ thế giới, dạng chữ ngắn để agent tham chiếu tiếp. */
export function describeAnchors(registry: Registry, part: SolvedPart): string[] {
  const specs = getType(registry, part.type).anchors(part.params);
  return Object.entries(specs).map(([name, s]) => {
    const o = transformPoint(part.world, s.origin);
    if (s.kind === "surface") return `${part.id}.${name} (surface) trục qua ${fmt(o)} hướng ${fmt(transformDir(part.world, s.axis))}, R ${s.radius}`;
    const d = transformDir(part.world, s.kind === "face" ? s.normal : s.dir);
    return `${part.id}.${name} (${s.kind}) ${fmt(o)} → ${fmt(d)}${s.kind === "axis" && s.radius ? `, R ${s.radius}` : ""}`;
  });
}

export const worldOrigin = (part: SolvedPart): V3 => transformPoint(part.world, [0, 0, 0]);

/** Đổi một điểm neo sang khung khác bằng phép biến đổi cứng m. */
export function transformAnchorSpec(a: AnchorSpec, m: M4): AnchorSpec {
  switch (a.kind) {
    case "face":
      return { ...a, origin: transformPoint(m, a.origin), normal: transformDir(m, a.normal), up: a.up && transformDir(m, a.up), uv: a.uv && [transformDir(m, a.uv[0]), transformDir(m, a.uv[1])] };
    case "axis":
    case "point":
      return { ...a, origin: transformPoint(m, a.origin), dir: transformDir(m, a.dir), up: a.up && transformDir(m, a.up) };
    case "surface":
      return { ...a, origin: transformPoint(m, a.origin), axis: transformDir(m, a.axis), ref: transformDir(m, a.ref) };
  }
}

/** Khung bao (trục thẳng) của một hộp sau phép biến đổi m. */
export function transformBounds(b: Bounds, m: M4): Bounds {
  const min: V3 = [Infinity, Infinity, Infinity], max: V3 = [-Infinity, -Infinity, -Infinity];
  for (const x of [b.min[0], b.max[0]]) for (const y of [b.min[1], b.max[1]]) for (const z of [b.min[2], b.max[2]]) {
    const p = transformPoint(m, [x, y, z]);
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], p[k]);
      max[k] = Math.max(max[k], p[k]);
    }
  }
  return { min, max };
}
export { fmt as fmtV3 };
