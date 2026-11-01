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
import type { AnchorSpec, AssemblyDoc, Bounds, Frame, Joint, Loop, Params, PartInstance, PartType, Placement } from "./types";

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
  /** giá trị thật của từng khớp sau khi tính khớp ghép và vòng kín */
  values: Map<string, number>;
  /** khớp dẫn (không ghép, không do vòng tính) và giá trị của nó */
  drivers: Map<string, number>;
  /** nhóm liên động của mỗi khớp (khớp nối nhau bằng couple hoặc cùng một vòng) */
  groups: Map<string, string>;
  /** khớp dẫn của mỗi nhóm */
  groupDrivers: Map<string, string[]>;
  /** khớp phụ thuộc: chạy theo khớp nào ("couple:<khớp dẫn>") hoặc vòng nào ("loop:<id>") */
  dependsOn: Map<string, string>;
  /** độ hở còn lại của mỗi vòng (m) */
  loopGap: Map<string, number>;
  /** khớp do vòng tính ra mà vượt giới hạn của nó */
  warnings: string[];
}

/** Tuỳ chọn giải tư thế. */
export interface PoseOptions {
  /** giá trị khớp {id: giá trị}; khớp dẫn đặt thẳng, khớp phụ thuộc (ghép, do vòng tính) thì suy ngược ra khớp dẫn. Bỏ trống: lấy `value` của khớp dẫn trong tài liệu. */
  pose?: Record<string, number>;
  /** giá trị lần giải trước, làm điểm xuất phát cho vòng kín (giữ cơ cấu ở cùng một nhánh, chuyển động liền) */
  warm?: Map<string, number>;
  /** giá trị không tới được thì kẹp về giá trị gần nhất thay vì báo lỗi (trang) */
  clamp?: boolean;
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
export function solve(doc: AssemblyDoc, registry: Registry, opts: PoseOptions = {}): Solved {
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
  const prep = prepareJoints(doc.joints, parts, order, registry);
  const link = analyzeLinkage(doc.loops ?? [], prep, registry);
  const { values, loopGap, warnings } = resolvePose(prep, link, opts);
  applyMotion(prep, values);
  return {
    parts,
    order,
    clusters: prep.clusters,
    values,
    drivers: new Map(link.drivers.map((id) => [id, values.get(id)!])),
    groups: link.groups,
    groupDrivers: link.groupDrivers,
    dependsOn: link.dependsOn,
    loopGap,
    warnings,
  };
}

// ───────── khớp ─────────

type Axis = { p: V3; d: V3; radius?: number };

interface PreparedJoints {
  joints: Joint[];
  byId: Map<string, Joint>;
  axes: Map<string, Axis>;
  /** bộ phận → khớp trực tiếp điều khiển nó */
  owner: Map<string, Joint>;
  parts: Map<string, SolvedPart>;
  order: string[];
  clusters: Map<string, string[]>;
}

/** Trục (ở tư thế nghỉ), bộ phận được dẫn và cụm của từng khớp: phần không đổi theo giá trị khớp, tính một lần. */
function prepareJoints(joints: Joint[], parts: Map<string, SolvedPart>, order: string[], registry: Registry): PreparedJoints {
  const byId = new Map<string, Joint>();
  const axes = new Map<string, Axis>();
  const owner = new Map<string, Joint>();
  for (const j of joints) {
    if (byId.has(j.id)) throw new AssemblyError(`Trùng id khớp "${j.id}".`);
    byId.set(j.id, j);
    if (!j.moves?.length) throw new AssemblyError(`[khớp ${j.id}] "moves" trống.`);
    const { frame, world } = anchorFrame(registry, parts, j.axis, "rest");
    if (frame.kind !== "axis") throw new AssemblyError(`[khớp ${j.id}] ${j.axis} không phải trục (axis).`);
    axes.set(j.id, { p: transformPoint(world, frame.origin), d: transformDir(world, frame.dir), radius: frame.radius });
    for (const id of j.moves) {
      if (!parts.has(id)) throw new AssemblyError(`[khớp ${j.id}] không có bộ phận "${id}".`);
      if (owner.has(id)) throw new AssemblyError(`[khớp ${j.id}] "${id}" đã thuộc khớp ${owner.get(id)!.id}; mỗi bộ phận chỉ do một khớp trực tiếp điều khiển.`);
      owner.set(id, j);
    }
  }
  const inCluster = new Map<string, string>();
  for (const id of order) {
    const part = parts.get(id)!;
    const jid = owner.get(id)?.id ?? (part.parent !== "ground" && part.follow ? inCluster.get(part.parent) : undefined);
    if (jid) inCluster.set(id, jid);
  }
  const clusters = new Map<string, string[]>();
  for (const j of joints) clusters.set(j.id, order.filter((id) => inCluster.get(id) === j.id));
  return { joints, byId, axes, owner, parts, order, clusters };
}

function jointMotion(prep: PreparedJoints, j: Joint, v: number): M4 {
  const { p, d } = prep.axes.get(j.id)!;
  return j.kind === "revolute" ? rotationAbout(p, d, v * DEG) : translation(scale(d, v));
}

/** Đặt `world` của mọi bộ phận theo bảng giá trị khớp. */
function applyMotion(prep: PreparedJoints, values: Map<string, number>) {
  const carried = new Map<string, M4>();
  for (const id of prep.order) {
    const part = prep.parts.get(id)!;
    const parentMotion = part.parent !== "ground" && part.follow ? carried.get(part.parent) : undefined;
    const own = prep.owner.get(id);
    const motion = own ? chain(parentMotion ?? identity(), jointMotion(prep, own, values.get(own.id) ?? 0)) : parentMotion;
    if (motion) carried.set(id, motion);
    part.world = motion ? chain(motion, part.rest) : part.rest;
  }
}

/** Phép chuyển động một bộ phận chịu, chỉ đi theo chuỗi cha của nó (cho vòng Newton, khỏi tính lại cả cây). */
function motionOf(prep: PreparedJoints, id: string, values: Map<string, number>, memo: Map<string, M4 | undefined>): M4 | undefined {
  if (memo.has(id)) return memo.get(id);
  const part = prep.parts.get(id)!;
  const parentMotion = part.parent !== "ground" && part.follow ? motionOf(prep, part.parent, values, memo) : undefined;
  const own = prep.owner.get(id);
  const m = own ? chain(parentMotion ?? identity(), jointMotion(prep, own, values.get(own.id) ?? 0)) : parentMotion;
  memo.set(id, m);
  return m;
}

/** Các khớp kéo theo một bộ phận (khớp của nó và của mọi tổ tiên mà nó đi theo). */
function jointsAbove(prep: PreparedJoints, id: string | null): Set<string> {
  const out = new Set<string>();
  for (let cur = id; cur;) {
    const own = prep.owner.get(cur);
    if (own) out.add(own.id);
    const p = prep.parts.get(cur)!;
    if (p.parent === "ground" || !p.follow) break;
    cur = p.parent;
  }
  return out;
}

// ───────── vòng kín và nhóm liên động ─────────

/** Một đầu của vòng: điểm cục bộ trong bộ phận, hoặc điểm thế giới cố định (ground). */
interface LoopEnd {
  part: string | null;
  local: V3;
}

interface LoopData {
  loop: Loop;
  a: LoopEnd;
  b: LoopEnd;
}

interface Linkage {
  loops: LoopData[];
  /** khớp do vòng tính → id vòng */
  solvedBy: Map<string, string>;
  drivers: string[];
  groups: Map<string, string>;
  groupDrivers: Map<string, string[]>;
  dependsOn: Map<string, string>;
}

/** Sai số khép vòng chấp nhận được (m). */
export const LOOP_TOL = 1e-5;

function loopEnd(registry: Registry, prep: PreparedJoints, ref: string): LoopEnd {
  const { frame, part } = anchorFrame(registry, prep.parts, ref, "rest");
  return { part: part ? part.id : null, local: frame.origin };
}

function endWorld(prep: PreparedJoints, e: LoopEnd, values: Map<string, number>, memo: Map<string, M4 | undefined>): V3 {
  if (!e.part) return e.local;
  const m = motionOf(prep, e.part, values, memo);
  const part = prep.parts.get(e.part)!;
  return transformPoint(m ? chain(m, part.rest) : part.rest, e.local);
}

/** Kiểm các vòng, gom khớp thành nhóm liên động (couple, cùng vòng), tìm khớp dẫn của mỗi nhóm. */
function analyzeLinkage(loops: Loop[], prep: PreparedJoints, registry: Registry): Linkage {
  const solvedBy = new Map<string, string>();
  const data: LoopData[] = [];
  const members: string[][] = [];
  const seen = new Set<string>();
  for (const lp of loops) {
    const label = `[vòng ${lp.id}]`;
    try {
      if (seen.has(lp.id)) throw new AssemblyError(`trùng id vòng.`);
      seen.add(lp.id);
      if (!Array.isArray(lp.solves) || lp.solves.length < 1 || lp.solves.length > 3) throw new AssemblyError(`solves cần 1–3 khớp do vòng tính ra.`);
      const a = loopEnd(registry, prep, lp.a), b = loopEnd(registry, prep, lp.b);
      if (a.part === b.part) throw new AssemblyError(`a ("${lp.a}") và b ("${lp.b}") cùng thuộc ${a.part ?? "ground"}; vòng phải nối hai nhánh khác nhau của cây lắp ráp.`);
      const above = [jointsAbove(prep, a.part), jointsAbove(prep, b.part)];
      for (const s of lp.solves) {
        const j = prep.byId.get(s);
        if (!j) throw new AssemblyError(`không có khớp "${s}". Khớp hiện có: ${[...prep.byId.keys()].join(", ") || "(chưa có)"}.`);
        if (j.couple) throw new AssemblyError(`${s} đang ghép theo ${j.couple.joint}; khớp do vòng tính không được có couple (bỏ couple hoặc bỏ ${s} khỏi solves).`);
        if (solvedBy.has(s)) throw new AssemblyError(`${s} đã do vòng ${solvedBy.get(s)} tính; mỗi khớp chỉ do một vòng tính.`);
        const inA = above[0].has(s), inB = above[1].has(s);
        if (inA === inB) throw new AssemblyError(`${s} phải kéo theo đúng một trong hai đầu vòng; hiện nó kéo theo ${inA ? "cả hai" : "không đầu nào"} (${lp.a}, ${lp.b}). Chọn khớp nằm trên nhánh từ gốc tới một đầu.`);
        solvedBy.set(s, lp.id);
      }
      data.push({ loop: lp, a, b });
      // khớp kéo theo đúng một đầu: đổi nó là đổi độ hở của vòng
      members.push([...above[0]].filter((x) => !above[1].has(x)).concat([...above[1]].filter((x) => !above[0].has(x))));
    } catch (e) {
      if (e instanceof AssemblyError) throw new AssemblyError(`${label} ${e.message}`);
      throw e;
    }
  }
  const root = new Map(prep.joints.map((j) => [j.id, j.id]));
  const find = (x: string): string => {
    const r = root.get(x)!;
    if (r === x) return x;
    const rr = find(r);
    root.set(x, rr);
    return rr;
  };
  const union = (x: string, y: string) => root.set(find(x), find(y));
  const dependsOn = new Map<string, string>();
  for (const j of prep.joints) {
    if (!j.couple) continue;
    if (!prep.byId.has(j.couple.joint)) throw new AssemblyError(`[khớp ${j.id}] couple.joint "${j.couple.joint}" không có. Khớp hiện có: ${[...prep.byId.keys()].join(", ")}.`);
    union(j.id, j.couple.joint);
    dependsOn.set(j.id, `couple:${j.couple.joint}`);
  }
  for (const m of members) for (const x of m.slice(1)) union(m[0], x);
  for (const [s, lid] of solvedBy) dependsOn.set(s, `loop:${lid}`);
  const groups = new Map(prep.joints.map((j) => [j.id, find(j.id)]));
  const drivers = prep.joints.filter((j) => !dependsOn.has(j.id)).map((j) => j.id);
  const groupDrivers = new Map<string, string[]>();
  for (const d of drivers) groupDrivers.set(groups.get(d)!, [...(groupDrivers.get(groups.get(d)!) ?? []), d]);
  return { loops: data, solvedBy, drivers, groups, groupDrivers, dependsOn };
}

/** Giải ma trận đối xứng nhỏ A x = b (khử Gauss, chọn trụ). */
function solveSmall(A: number[][], b: number[]): number[] | null {
  const n = b.length, M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-300) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

/**
 * Lan truyền xuôi: khớp dẫn (`base`) → khớp ghép → khớp do vòng tính (Levenberg–Marquardt trên độ hở mọi vòng,
 * khớp ghép tính lại trong mỗi lần đánh giá). `init` là điểm xuất phát của các khớp do vòng tính.
 */
function forward(prep: PreparedJoints, link: Linkage, base: Map<string, number>, init: Map<string, number>): { values: Map<string, number>; loopGap: Map<string, number> } {
  const work = new Map(base);
  const S = [...link.solvedBy.keys()];
  for (const s of S) work.set(s, init.get(s) ?? 0);
  const evalValues = () => jointValues(prep.joints, prep.axes, work);
  if (!link.loops.length) return { values: evalValues(), loopGap: new Map() };
  const residual = (): number[] => {
    const vals = evalValues(), memo = new Map<string, M4 | undefined>(), r: number[] = [];
    for (const L of link.loops) {
      const pa = endWorld(prep, L.a, vals, memo), pb = endWorld(prep, L.b, vals, memo);
      r.push(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]);
    }
    return r;
  };
  const setX = (xs: number[]) => S.forEach((s, i) => work.set(s, xs[i]));
  const sq = (r: number[]) => r.reduce((s, x) => s + x * x, 0);
  let x = S.map((s) => work.get(s)!);
  let r = residual(), cost = sq(r), lambda = 1e-3;
  const H = 1e-6, n = S.length;
  for (let it = 0; it < 80 && cost > 1e-20; it++) {
    const cols: number[][] = [];
    for (let i = 0; i < n; i++) {
      const xs = [...x];
      xs[i] += H;
      setX(xs);
      cols.push(residual().map((v, k) => (v - r[k]) / H));
    }
    const A = cols.map((ci) => cols.map((cj) => ci.reduce((s, v, k) => s + v * cj[k], 0)));
    const g = cols.map((ci) => ci.reduce((s, v, k) => s + v * r[k], 0));
    let improved = false;
    for (let tries = 0; tries < 12; tries++) {
      const A2 = A.map((row, i) => row.map((v, j) => (i === j ? v + lambda * (v + 1e-12) : v)));
      const dx = solveSmall(A2, g.map((v) => -v));
      if (!dx) {
        lambda *= 4;
        continue;
      }
      const xn = x.map((v, i) => v + dx[i]);
      setX(xn);
      const rn = residual(), cn = sq(rn);
      if (cn < cost) {
        x = xn;
        r = rn;
        cost = cn;
        lambda = Math.max(lambda / 3, 1e-12);
        improved = true;
        break;
      }
      lambda *= 4;
    }
    if (!improved) break;
  }
  setX(x);
  const loopGap = new Map(link.loops.map((L, i) => [L.loop.id, Math.hypot(r[i * 3], r[i * 3 + 1], r[i * 3 + 2])]));
  return { values: evalValues(), loopGap };
}

const closed = (gaps: Map<string, number>) => [...gaps.values()].every((g) => g <= LOOP_TOL);
const unit = (j: Joint) => (j.kind === "revolute" ? "°" : " m");

/** Giá trị khớp dẫn `d` để khớp phụ thuộc `k` bằng `target`: cát tuyến từ giá trị cũ, không được thì quét trong giới hạn rồi chia đôi. */
function invert(prep: PreparedJoints, link: Linkage, base: Map<string, number>, init: Map<string, number>, d: string, k: string, target: number, start: number, clamp: boolean): number {
  const jd = prep.byId.get(d)!, jk = prep.byId.get(k)!;
  const [lo, hi] = jd.limits ?? (jd.kind === "revolute" ? [-180, 180] : [-1, 1]);
  // nghiệm vòng đã tìm ở mỗi giá trị khớp dẫn: lần đánh giá sau xuất phát từ nghiệm ở giá trị gần nhất (đi liền một nhánh
  // như cơ cấu thật); lời giải cuối để lại trong `init`
  const seen: [number, Map<string, number>][] = [[start, new Map(init)]];
  const f = (x: number): number | null => {
    const near = seen.reduce((p, c) => (Math.abs(c[0] - x) < Math.abs(p[0] - x) ? c : p))[1];
    const b2 = new Map(base);
    b2.set(d, x);
    const res = forward(prep, link, b2, near);
    if (!closed(res.loopGap)) return null;
    const sol = new Map([...link.solvedBy.keys()].map((s) => [s, res.values.get(s)!]));
    seen.push([x, sol]);
    for (const [s, v] of sol) init.set(s, v);
    return res.values.get(k)! - target;
  };
  const tol = 1e-9 * (1 + Math.abs(target));
  const done = (x: number) => {
    f(x);
    return x;
  };
  const inRange = (x: number) => !jd.limits || (x >= lo - 1e-9 && x <= hi + 1e-9);
  // cát tuyến: một bước cho ghép tuyến tính, vài bước cho bảng và vòng
  let x0 = start, x1 = start + (jd.kind === "revolute" ? 1 : 1e-3);
  let f0 = f(x0), f1 = f(x1);
  if (f0 !== null && Math.abs(f0) < tol && inRange(x0)) return done(x0);
  for (let it = 0; it < 40 && f0 !== null && f1 !== null; it++) {
    if (Math.abs(f1) < tol) {
      if (inRange(x1)) return done(x1);
      break;
    }
    const den = f1 - f0;
    if (Math.abs(den) < 1e-300) break;
    const x2 = x1 - (f1 * (x1 - x0)) / den;
    if (!Number.isFinite(x2) || Math.abs(x2 - x1) > 4 * (hi - lo)) break;
    x0 = x1;
    f0 = f1;
    x1 = x2;
    f1 = f(x1);
  }
  // quét trong giới hạn, chọn đoạn đổi dấu gần giá trị cũ nhất
  const N = 33, xs: number[] = [], fs: (number | null)[] = [];
  for (let i = 0; i < N; i++) {
    xs.push(lo + ((hi - lo) * i) / (N - 1));
    fs.push(f(xs[i]));
  }
  let best = -1;
  for (let i = 0; i + 1 < N; i++) {
    const a = fs[i], b = fs[i + 1];
    if (a === null || b === null || a * b > 0) continue;
    if (best < 0 || Math.abs((xs[i] + xs[i + 1]) / 2 - start) < Math.abs((xs[best] + xs[best + 1]) / 2 - start)) best = i;
  }
  if (best >= 0) {
    let a = xs[best], b = xs[best + 1], fa = fs[best]!;
    for (let it = 0; it < 80 && b - a > 1e-12 * (1 + Math.abs(a)); it++) {
      const m = (a + b) / 2, fm = f(m);
      if (fm === null) break;
      if (fa * fm <= 0) b = m;
      else {
        a = m;
        fa = fm;
      }
    }
    return done((a + b) / 2);
  }
  const ok = fs.map((v, i) => [v, xs[i]] as const).filter(([v]) => v !== null) as [number, number][];
  if (clamp && ok.length) return done(ok.reduce((p, c) => (Math.abs(c[0]) < Math.abs(p[0]) ? c : p))[1]);
  const vals = ok.map(([v]) => v + target);
  const range = vals.length ? `[${+Math.min(...vals).toFixed(5)}, ${+Math.max(...vals).toFixed(5)}]${unit(jk)}` : "(vòng không khép ở đâu cả)";
  throw new AssemblyError(`${k} = ${target}${unit(jk)} không tới được: khi khớp dẫn ${d} chạy trong [${lo}, ${hi}]${unit(jd)} thì ${k} chỉ đi trong ${range}.`);
}

/** Giá trị mọi khớp cho một tư thế: khớp dẫn đặt thẳng, khớp phụ thuộc suy ngược, rồi lan truyền xuôi. */
function resolvePose(prep: PreparedJoints, link: Linkage, opts: PoseOptions): { values: Map<string, number>; loopGap: Map<string, number>; warnings: string[] } {
  const given = opts.pose;
  const base = new Map<string, number>();
  for (const id of link.drivers) {
    const v = given ? given[id] : prep.byId.get(id)!.value;
    base.set(id, typeof v === "number" && Number.isFinite(v) ? v : 0);
  }
  const init = new Map<string, number>();
  for (const s of link.solvedBy.keys()) init.set(s, opts.warm?.get(s) ?? given?.[s] ?? 0);
  const used = new Map<string, string>();
  for (const [k, v] of Object.entries(given ?? {})) {
    if (!prep.byId.has(k) || !link.dependsOn.has(k) || typeof v !== "number") continue;
    const g = link.groups.get(k)!;
    const drv = link.groupDrivers.get(g) ?? [];
    const how = link.dependsOn.get(k)!.replace(/^couple:/, "ghép theo ").replace(/^loop:/, "do vòng tính, vòng ");
    if (drv.length !== 1) throw new AssemblyError(`pose.${k}: ${k} là khớp phụ thuộc (${how}) trong nhóm có ${drv.length ? `${drv.length} khớp dẫn (${drv.join(", ")})` : "không khớp dẫn nào"}; chỉ suy ngược được khi nhóm có đúng một khớp dẫn. Đặt thẳng các khớp dẫn.`);
    const d = drv[0];
    if (given![d] !== undefined) throw new AssemblyError(`pose đặt cả ${d} và ${k}, hai khớp cùng một nhóm liên động (${k} ${how}); mỗi nhóm chỉ đặt một khớp.`);
    if (used.has(g)) throw new AssemblyError(`pose đặt cả ${used.get(g)} và ${k}, hai khớp cùng một nhóm liên động (khớp dẫn ${d}); mỗi nhóm chỉ đặt một khớp.`);
    used.set(g, k);
    const start = opts.warm?.get(d) ?? base.get(d) ?? 0;
    base.set(d, invert(prep, link, base, init, d, k, v, start, !!opts.clamp));
  }
  const res = forward(prep, link, base, init);
  for (const L of link.loops) {
    const gap = res.loopGap.get(L.loop.id)!;
    if (gap <= LOOP_TOL) continue;
    const g = link.groups.get(L.loop.solves[0])!;
    const at = (link.groupDrivers.get(g) ?? []).map((d) => `${d} = ${+base.get(d)!.toFixed(4)}`).join(", ");
    throw new AssemblyError(`[vòng ${L.loop.id}] không khép: còn hở ${(gap * 1000).toFixed(2)} mm${at ? ` khi ${at}` : ""}. Cơ cấu không với tới tư thế này: đặt limits của khớp dẫn trong miền khép được (loop_add in bảng quét).`);
  }
  const warnings: string[] = [];
  for (const [s, lid] of link.solvedBy) {
    const j = prep.byId.get(s)!, v = res.values.get(s)!;
    if (j.limits && (v < j.limits[0] - 1e-6 || v > j.limits[1] + 1e-6)) warnings.push(`${s} = ${+v.toFixed(4)}${unit(j)} (do vòng ${lid} tính) ngoài giới hạn ${JSON.stringify(j.limits)}.`);
  }
  return { ...res, warnings };
}

/**
 * Tỉ số của khớp ghép khi không cho `ratio`: bánh (revolute) lăn không trượt trên mặt ngang theo khớp trượt
 * (prismatic). Tâm bánh đi s theo d thì góc quay θ thoả θ·R·(a × up) = s·d, nên θ/s = (d · (a × up)) / R.
 */
export function rollingRatio(revolute: { d: V3; radius?: number }, prismatic: { d: V3 }, label: string): number {
  if (!revolute.radius) throw new AssemblyError(`${label}: trục của khớp quay không có bán kính để tính lăn; cho "ratio" (độ mỗi mét) hoặc dùng trục của bánh tiện (shape_lathe, "banh.axis").`);
  const k = dot(prismatic.d, cross(revolute.d, [0, 1, 0]));
  if (Math.abs(k) < 1e-6) throw new AssemblyError(`${label}: trục bánh song song với hướng trượt hoặc thẳng đứng, bánh không lăn theo được; cho "ratio".`);
  return k / revolute.radius / DEG;
}

/** Nội suy từng đoạn trong bảng [[x, y], ...] (x tăng dần); ngoài bảng giữ giá trị mút. */
export function interpolate(table: [number, number][], x: number, label: string): number {
  if (!table.length) throw new AssemblyError(`${label}: couple.table rỗng.`);
  for (let i = 1; i < table.length; i++) {
    if (!(table[i][0] > table[i - 1][0])) throw new AssemblyError(`${label}: couple.table phải tăng dần theo giá trị khớp dẫn (cột đầu).`);
  }
  if (x <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i];
    if (x <= x1) {
      const [x0, y0] = table[i - 1];
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return table[table.length - 1][1];
}

/**
 * Giá trị thật của từng khớp: khớp không ghép lấy từ `base` (hoặc `value` trong tài liệu khi không có `base`); khớp ghép
 * (couple) = ratio × giá trị khớp dẫn, hoặc nội suy theo bảng.
 */
export function jointValues(joints: Joint[], axes?: Map<string, { d: V3; radius?: number }>, base?: Map<string, number>): Map<string, number> {
  const byId = new Map(joints.map((j) => [j.id, j]));
  const out = new Map<string, number>();
  const visiting = new Set<string>();
  const val = (j: Joint): number => {
    if (out.has(j.id)) return out.get(j.id)!;
    if (visiting.has(j.id)) throw new AssemblyError(`[khớp ${j.id}] ghép vòng tròn (couple trỏ ngược về chính nó).`);
    visiting.add(j.id);
    let v: number;
    if (!j.couple) v = base ? base.get(j.id) ?? 0 : j.value ?? 0;
    else {
      const lead = byId.get(j.couple.joint);
      if (!lead) throw new AssemblyError(`[khớp ${j.id}] couple.joint "${j.couple.joint}" không có. Khớp hiện có: ${[...byId.keys()].join(", ")}.`);
      if (j.couple.table) v = interpolate(j.couple.table, val(lead), `[khớp ${j.id}]`);
      else {
        let ratio = j.couple.ratio;
        if (ratio === undefined) {
          if (j.kind !== "revolute" || lead.kind !== "prismatic") throw new AssemblyError(`[khớp ${j.id}] thiếu couple.ratio; chỉ tự tính được khi khớp quay (bánh) theo khớp trượt.`);
          if (!axes) throw new AssemblyError(`[khớp ${j.id}] cần trục khớp để tính tỉ số lăn.`);
          ratio = rollingRatio(axes.get(j.id)!, axes.get(lead.id)!, `[khớp ${j.id}]`);
        }
        v = ratio * val(lead);
      }
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
