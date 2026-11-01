/**
 * Bản lắp ráp → PhysicsModel (chạy trong Node, cần lưới hình và lõi manifold):
 * - gom bộ phận thành vật rắn: bộ phận ghép chặt với cha thì chung vật; mỗi bộ phận do khớp dẫn mở một vật mới; khớp
 *   trong doc.physics.free bị bỏ (vật thành tự do); bộ phận gắn ground mặc định đứng yên;
 * - khối lượng, trọng tâm, tensor quán tính: tích phân tứ diện có dấu trên lưới kín (lưới hở thì dùng bao lồi) nhân
 *   khối lượng riêng của vật liệu; doc.physics.bodies ghi đè khối lượng;
 * - va chạm: bao lồi của mỗi vật (manifold hull), giảm còn ≤ MAX_HULL đỉnh;
 * - couple của khớp → ràng buộc ghép hai chiều (CoupleModel); vòng kín (doc.loops) → khớp ghim "point" giữa hai vật.
 */

import { type M4, type V3, chain, translation } from "../core/math";
import { AssemblyError, rollingRatio } from "../core/solve";
import type { AssemblyDoc } from "../core/types";
import { kernel, toManifold } from "../shapes/kernel";
import { type FlatPart, flatten, materialProps, worldGeometry } from "./geometry";
import type { M3 } from "./math";
import type { BodyModel, CoupleModel, JointModel, PhysicsConfig, PhysicsModel } from "./model";

const MAX_HULL = 256;
const DEG = Math.PI / 180;

interface Moments {
  m: number;
  c: V3; // mô-men bậc 1 (∑ m·x)
  C: number[]; // ∫ x xᵀ dm (3×3, theo hàng)
}

/** Tích phân tứ diện (gốc, a, b, c) trên lưới kín có hướng: khối lượng, mô-men bậc 1, hiệp phương sai (Blow & Binstock). */
function integrate(pos: ArrayLike<number>, idx: ArrayLike<number> | null, density: number): Moments {
  const out: Moments = { m: 0, c: [0, 0, 0], C: [0, 0, 0, 0, 0, 0, 0, 0, 0] };
  const n = idx ? idx.length : pos.length / 3;
  for (let t = 0; t < n; t += 3) {
    const ia = (idx ? idx[t] : t) * 3, ib = (idx ? idx[t + 1] : t + 1) * 3, ic = (idx ? idx[t + 2] : t + 2) * 3;
    const a: V3 = [pos[ia], pos[ia + 1], pos[ia + 2]], b: V3 = [pos[ib], pos[ib + 1], pos[ib + 2]], c: V3 = [pos[ic], pos[ic + 1], pos[ic + 2]];
    const det = a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
    const vol = det / 6, mass = density * vol;
    out.m += mass;
    for (let k = 0; k < 3; k++) out.c[k] += (mass * (a[k] + b[k] + c[k])) / 4;
    const s: V3 = [a[0] + b[0] + c[0], a[1] + b[1] + c[1], a[2] + b[2] + c[2]];
    for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) out.C[r * 3 + q] += ((density * det) / 120) * (a[r] * a[q] + b[r] * b[q] + c[r] * c[q] + s[r] * s[q]);
  }
  return out;
}

/** Mô-men của một bộ phận ở thế giới: lưới kín thì tích phân thẳng, lưới hở thì tích phân bao lồi của nó. */
function partMoments(p: FlatPart, density: number, label: string): Moments {
  const g = worldGeometry(p);
  if (!g) return { m: 0, c: [0, 0, 0], C: [0, 0, 0, 0, 0, 0, 0, 0, 0] };
  try {
    const mf = toManifold(g, label);
    const mesh = mf.getMesh();
    mf.delete();
    const pos = new Float32Array((mesh.vertProperties.length / mesh.numProp) * 3);
    for (let i = 0, j = 0; i < mesh.vertProperties.length; i += mesh.numProp, j += 3) pos.set(mesh.vertProperties.subarray(i, i + 3), j);
    return integrate(pos, mesh.triVerts, density);
  } catch {
    const h = hullMesh(Array.from(g.attributes.position.array));
    return integrate(h.pos, h.idx, density);
  }
}

/** Bao lồi của một đám điểm (mảng phẳng xyz), lấy mẫu thưa nếu quá nhiều điểm. */
function hullMesh(flat: number[], limit = 40000): { pos: number[]; idx: number[] } {
  const { Manifold } = kernel();
  const n = flat.length / 3, step = Math.max(1, Math.ceil(n / limit));
  const pts: [number, number, number][] = [];
  for (let i = 0; i < n; i += step) pts.push([flat[i * 3], flat[i * 3 + 1], flat[i * 3 + 2]]);
  let m = Manifold.hull(pts);
  // giảm đỉnh: đơn giản hoá rồi lấy bao lồi lại, nới dung sai tới khi đủ ít
  const bb = m.boundingBox(), size = Math.hypot(bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2]);
  for (let tol = size * 0.002; m.numVert() > MAX_HULL && tol < size * 0.2; tol *= 1.6) {
    const s = m.simplify(tol);
    const mesh = s.getMesh();
    s.delete();
    const vp: [number, number, number][] = [];
    for (let i = 0; i < mesh.vertProperties.length; i += mesh.numProp) vp.push([mesh.vertProperties[i], mesh.vertProperties[i + 1], mesh.vertProperties[i + 2]]);
    m.delete();
    m = Manifold.hull(vp);
  }
  const mesh = m.getMesh();
  m.delete();
  const pos: number[] = [];
  for (let i = 0; i < mesh.vertProperties.length; i += mesh.numProp) pos.push(mesh.vertProperties[i], mesh.vertProperties[i + 1], mesh.vertProperties[i + 2]);
  return { pos, idx: Array.from(mesh.triVerts) };
}

export function buildPhysicsModel(doc: AssemblyDoc): PhysicsModel {
  const cfg: PhysicsConfig = doc.physics ?? {};
  const { parts, joints, loops } = flatten(doc);
  const byPath = new Map(parts.map((p) => [p.path, p]));
  const free = new Set(cfg.free ?? []);
  for (const f of free) if (!joints.some((j) => j.id === f)) throw new AssemblyError(`physics.free: không có khớp "${f}". Có: ${joints.map((j) => j.id).join(", ") || "(chưa có khớp)"}.`);

  // bộ phận nào do khớp nào dẫn
  const drivenBy = new Map<string, string>();
  for (const j of joints) for (const m of j.moves) drivenBy.set(m, j.id);

  // gom vật: hợp với cha trừ khi cha là ground hoặc bộ phận được khớp dẫn
  const root = new Map<string, string>();
  const find = (p: string): string => {
    const r = root.get(p) ?? p;
    if (r === p) return p;
    const rr = find(r);
    root.set(p, rr);
    return rr;
  };
  for (const p of parts) root.set(p.path, p.path);
  for (const p of parts) if (p.parent && !drivenBy.has(p.path)) root.set(find(p.path), find(p.parent));
  const groups = new Map<string, FlatPart[]>();
  for (const p of parts) {
    const r = find(p.path);
    groups.set(r, [...(groups.get(r) ?? []), p]);
  }

  const notes: string[] = [];
  const bodies: BodyModel[] = [];
  const bodyOf = new Map<string, string>();
  for (const [rootPath, members] of groups) {
    const head = byPath.get(rootPath)!;
    // ghi đè đặt theo bất kỳ bộ phận nào của vật
    const override = members.map((p) => cfg.bodies?.[p.path]).find(Boolean) ?? {};
    // vật gắn thẳng vào ground mà không có khớp dẫn thì đứng yên (đế, đường), trừ khi agent cho thả
    const onGround = !head.parent && !drivenBy.has(rootPath);
    const fixed = override.fixed ?? onGround;
    const tot: Moments = { m: 0, c: [0, 0, 0], C: [0, 0, 0, 0, 0, 0, 0, 0, 0] };
    const pts: number[] = [];
    let friction = 0;
    for (const p of members) {
      if (!p.geometry) continue;
      const mp = materialProps(doc, p.material);
      friction = Math.max(friction, mp.friction);
      if (!fixed) {
        const mo = partMoments(p, mp.density, `[vật ${rootPath}] ${p.path}`);
        tot.m += mo.m;
        for (let k = 0; k < 3; k++) tot.c[k] += mo.c[k];
        for (let k = 0; k < 9; k++) tot.C[k] += mo.C[k];
      }
      const g = worldGeometry(p)!;
      const arr = g.attributes.position.array;
      for (let i = 0; i < arr.length; i++) pts.push(arr[i]);
    }
    if (!pts.length) continue; // cụm rỗng
    const hull = hullMesh(pts);
    // trọng tâm: theo khối lượng (vật động) hoặc tâm bao lồi (vật đứng yên)
    let com: V3;
    if (!fixed && tot.m > 1e-9) com = [tot.c[0] / tot.m, tot.c[1] / tot.m, tot.c[2] / tot.m];
    else {
      const n = hull.pos.length / 3;
      com = [0, 1, 2].map((k) => hull.pos.filter((_, i) => i % 3 === k).reduce((s, x) => s + x, 0) / n) as V3;
    }
    // tensor quán tính quanh gốc rồi dời về trọng tâm (định lý trục song song)
    let mass = tot.m, inertia: M3 = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    if (!fixed) {
      const C = tot.C, tr = C[0] + C[4] + C[8];
      const I0 = [tr - C[0], -C[1], -C[2], -C[3], tr - C[4], -C[5], -C[6], -C[7], tr - C[8]];
      const cc = com[0] ** 2 + com[1] ** 2 + com[2] ** 2;
      inertia = I0.map((x, k) => {
        const r = Math.floor(k / 3), c = k % 3;
        return x - mass * ((r === c ? cc : 0) - com[r] * com[c]);
      });
      if (mass <= 1e-9) throw new AssemblyError(`[vật ${rootPath}] khối lượng bằng 0: lưới hở hoặc rỗng. Đặt body_set {mass}.`);
      if (override.mass) {
        const k = override.mass / mass;
        mass = override.mass;
        inertia = inertia.map((x) => x * k);
      }
    }
    const toBody = translation([-com[0], -com[1], -com[2]]);
    const verts: V3[] = [];
    for (let i = 0; i < hull.pos.length; i += 3) verts.push([hull.pos[i] - com[0], hull.pos[i + 1] - com[1], hull.pos[i + 2] - com[2]]);
    const tris: [number, number, number][] = [];
    for (let i = 0; i < hull.idx.length; i += 3) tris.push([hull.idx[i], hull.idx[i + 1], hull.idx[i + 2]]);
    bodies.push({
      id: rootPath,
      parts: members.filter((p) => !p.composite).map((p) => ({ path: p.path, offset: chain(toBody, p.world) as M4 })),
      mass: fixed ? 0 : mass,
      inertia,
      x0: com,
      q0: [0, 0, 0, 1],
      fixed,
      hull: { verts, tris },
      friction: override.friction ?? (friction || 0.5),
      restitution: override.restitution ?? 0.2,
    });
    for (const p of members) bodyOf.set(p.path, rootPath);
    if (!fixed && mass > 50000) notes.push(`vật ${rootPath} nặng ${mass.toFixed(0)} kg (vật đặc theo lưới): đặt body_set {mass} nếu vật thật rỗng.`);
  }

  // khớp: mỗi bộ phận được dẫn nối vật của nó với vật của cha
  const out: JointModel[] = [];
  const physIds = new Map<string, string[]>();
  for (const j of joints) {
    if (free.has(j.id)) continue;
    const kind = j.joint.kind;
    const drive = cfg.drives?.[j.id];
    for (const m of j.moves) {
      const a = bodyOf.get(m), part = byPath.get(m);
      if (!a || !part) continue;
      const b = part.parent ? bodyOf.get(part.parent) ?? null : null;
      const ba = bodies.find((x) => x.id === a)!, bb = b ? bodies.find((x) => x.id === b)! : null;
      let piv = j.origin as V3;
      if (kind === "prismatic") {
        // điểm nào trên trục cũng giữ được khớp trượt; lấy hình chiếu trọng tâm vật được dẫn để cánh tay đòn bằng 0
        // (trục đặt ở chân xi lanh mà cán nhẹ ở xa: hiệu chỉnh vuông góc xoay cán mạnh, khoá góc kéo lại, rung)
        const d = j.dir as V3, t = (ba.x0[0] - piv[0]) * d[0] + (ba.x0[1] - piv[1]) * d[1] + (ba.x0[2] - piv[2]) * d[2];
        piv = [piv[0] + d[0] * t, piv[1] + d[1] * t, piv[2] + d[2] * t];
      }
      const pid = j.moves.length > 1 ? `${j.id}:${m}` : j.id;
      physIds.set(j.id, [...(physIds.get(j.id) ?? []), pid]);
      out.push({
        id: pid,
        kind,
        a,
        b,
        pivotA: [piv[0] - ba.x0[0], piv[1] - ba.x0[1], piv[2] - ba.x0[2]],
        pivotB: bb ? [piv[0] - bb.x0[0], piv[1] - bb.x0[1], piv[2] - bb.x0[2]] : piv,
        axisA: j.dir as V3,
        axisB: j.dir as V3,
        ...(j.joint.limits ? { limits: j.joint.limits } : {}),
        ...(drive ? { motor: { kind: drive.kind, value: kind === "revolute" && drive.kind === "speed" ? drive.value * DEG : drive.value, ...(drive.maxForce !== undefined ? { maxForce: drive.maxForce } : {}) } } : {}),
      });
    }
  }
  // couple → ràng buộc ghép (SI: radian, mét); khớp có nhiều bộ phận được dẫn thì mỗi bản ghép theo bản đầu của khớp dẫn
  const couples: CoupleModel[] = [];
  const flatById = new Map(joints.map((j) => [j.id, j]));
  const si = (kind: string) => (kind === "revolute" ? DEG : 1);
  for (const j of joints) {
    if (!j.lead) continue;
    if (free.has(j.id) || free.has(j.lead)) {
      notes.push(`khớp ${j.id} ghép theo ${j.lead}: một trong hai khớp thả tự do (physics.free), bỏ ràng buộc ghép (ma sát và va chạm lo).`);
      continue;
    }
    const lead = flatById.get(j.lead), leadIds = physIds.get(j.lead), ids = physIds.get(j.id);
    if (!lead || !leadIds?.length || !ids?.length) continue;
    const c = j.joint.couple!;
    let spec: { ratio: number } | { table: [number, number][] };
    if (c.table) spec = { table: c.table.map(([x, y]) => [x * si(lead.joint.kind), y * si(j.joint.kind)] as [number, number]) };
    else {
      const r = c.ratio ?? rollingRatio({ d: j.dir as V3, radius: j.radius }, { d: lead.dir as V3 }, `[khớp ${j.id}]`);
      spec = { ratio: (r * si(j.joint.kind)) / si(lead.joint.kind) };
    }
    for (const f of ids) couples.push({ id: `couple:${f}`, lead: leadIds[0], follow: f, ...spec });
  }
  // bánh răng kiểu cũ (physics.gears: ratio·ωa + ωb = 0) đi cùng đường
  (cfg.gears ?? []).forEach((g, i) => couples.push({ id: `gear${i}`, lead: g.a, follow: g.b, ratio: -g.ratio }));

  // vòng kín → khớp ghim: hai vật giữ chung một điểm
  for (const l of loops) {
    let a = l.a ? bodyOf.get(l.a) ?? null : null, b = l.b ? bodyOf.get(l.b) ?? null : null;
    if (a === b) throw new AssemblyError(`[vòng ${l.id}] hai đầu thuộc cùng một vật (${a ?? "thế giới"}): khớp do vòng tính chưa tách được hai nhánh thành vật riêng.`);
    if (!a) [a, b] = [b, null];
    const ba = bodies.find((x) => x.id === a)!, bb = b ? bodies.find((x) => x.id === b)! : null;
    const p = l.point;
    out.push({
      id: `loop:${l.id}`,
      kind: "point",
      a: a!,
      b,
      pivotA: [p[0] - ba.x0[0], p[1] - ba.x0[1], p[2] - ba.x0[2]],
      pivotB: bb ? [p[0] - bb.x0[0], p[1] - bb.x0[1], p[2] - bb.x0[2]] : p,
      axisA: [0, 1, 0],
      axisB: [0, 1, 0],
    });
  }

  const initial: PhysicsModel["initial"] = {};
  for (const [path, init] of Object.entries(cfg.initial ?? {})) {
    const b = bodyOf.get(path);
    if (!b) throw new AssemblyError(`physics.initial: không có bộ phận "${path}".`);
    initial[b] = { ...(init.velocity ? { v: init.velocity } : {}), ...(init.angularVelocity ? { w: init.angularVelocity.map((x) => x * DEG) as V3 } : {}) };
  }
  return {
    version: 2,
    gravity: cfg.gravity ?? [0, -9.81, 0],
    groundPlane: cfg.groundPlane ?? true,
    substeps: cfg.substeps ?? 12,
    bodies,
    joints: out,
    gears: [],
    couples,
    initial,
    notes,
  };
}

/** Vật chứa một bộ phận (đường dẫn), để tool ghi đè theo bộ phận. */
export const bodyOfPart = (model: PhysicsModel, path: string) => model.bodies.find((b) => b.parts.some((p) => p.path === path) || b.id === path);

