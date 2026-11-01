/**
 * Duỗi phẳng một bản lắp ráp (kể cả cụm lồng) thành danh sách bộ phận có tư thế thế giới, lưới cục bộ và vật liệu.
 * Dùng cho mô hình vật lý (build-model.ts) và các tool kiểm tra theo lưới thật. Chạy trong Node (cần lưới hình).
 */

import * as THREE from "three";
import { type M4, chain, invertRigid } from "../core/math";
import { PRESETS } from "../core/materials";
import { anchorFrame, solve } from "../core/solve";
import type { AssemblyDoc, Joint } from "../core/types";
import { buildShapes, usedShapeIds } from "../shapes/build";
import { SHAPE_PREFIX, registryFor } from "../shapes/registry";

export interface FlatPart {
  path: string;
  /** đường dẫn bộ phận cha (cùng cấp hoặc cụm chứa nó); null = ground */
  parent: string | null;
  world: M4;
  /** lưới trong khung bộ phận; null với cụm (cụm không có hình riêng) */
  geometry: THREE.BufferGeometry | null;
  material: string | null;
  composite: boolean;
}

export interface FlatJoint {
  id: string;
  joint: Joint;
  /** trục khớp ở thế giới (tư thế 0) */
  origin: [number, number, number];
  dir: [number, number, number];
  /** bán kính trục (bánh tiện), để tính tỉ số lăn của couple */
  radius?: number;
  /** khớp dẫn của couple, đã thêm tiền tố cụm */
  lead?: string;
  moves: string[];
}

/** Vòng kín đã duỗi phẳng: hai bộ phận (null = ground) và điểm ghim ở thế giới (tư thế 0, hai đầu trùng nhau). */
export interface FlatLoop {
  id: string;
  a: string | null;
  b: string | null;
  point: [number, number, number];
}

/** Khối lượng riêng (kg/m³) theo tên vật liệu, preset hoặc vật liệu đã định nghĩa trong doc. */
const LEGACY_DENSITY: Record<string, number> = {
  wood: 600, felt: 300, aluminium: 2700, steel: 7850, iron: 7870, copper: 8960, brass: 8500, bakelite: 1300, carbon: 1800,
  rubber: 1100, redPaint: 7850, bluePaint: 7850, whitePaint: 7850, blackPaint: 7850, glass: 2500, winding: 8960, tape: 1200,
  wireRed: 3000, wireBlack: 3000, enamel: 7850,
};
const LEGACY_FRICTION: Record<string, number> = { rubber: 0.9, wood: 0.5, felt: 0.6, glass: 0.3, steel: 0.4, aluminium: 0.4 };

export function materialProps(doc: AssemblyDoc, ref: string | null): { density: number; friction: number } {
  if (!ref) return { density: 1000, friction: 0.5 };
  const def = doc.materials?.[ref];
  const preset = def ? def.preset : PRESETS[ref] ? ref : undefined;
  const p = preset ? PRESETS[preset] : undefined;
  if (def?.density !== undefined || p) return { density: def?.density ?? p?.density ?? 1000, friction: def?.friction ?? p?.friction ?? 0.5 };
  if (def) return { density: 1000, friction: def.friction ?? 0.5 };
  return { density: LEGACY_DENSITY[ref] ?? 1000, friction: LEGACY_FRICTION[ref] ?? 0.5 };
}

const boundsBox = (b: { min: number[]; max: number[] }) =>
  new THREE.BoxGeometry(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]).translate((b.max[0] + b.min[0]) / 2, (b.max[1] + b.min[1]) / 2, (b.max[2] + b.min[2]) / 2);

/** Lưới thật của loại bộ phận có sẵn (dựng như trong trang nhưng vật liệu rỗng); không dựng được thì null. */
function libraryGeometry(build: ((p: never, kit: unknown) => unknown) | undefined, params: unknown): THREE.BufferGeometry | null {
  if (!build) return null;
  try {
    const none = new Proxy({}, { get: () => undefined });
    const obj = build(params as never, new Proxy({ byName: none }, { get: (t, k) => (k === "byName" ? none : undefined) })) as THREE.Object3D;
    obj.updateMatrixWorld(true);
    const geos: THREE.BufferGeometry[] = [];
    obj.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.geometry?.attributes.position) return;
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", m.geometry.attributes.position.clone());
      if (m.geometry.index) g.setIndex(m.geometry.index.clone());
      geos.push((g.index ? g.toNonIndexed() : g).applyMatrix4(m.matrixWorld));
    });
    if (!geos.length) return null;
    let n = 0;
    for (const g of geos) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3);
    let o = 0;
    for (const g of geos) {
      pos.set(g.attributes.position.array as Float32Array, o);
      o += g.attributes.position.count * 3;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return out;
  } catch {
    return null;
  }
}

/**
 * Duỗi phẳng ở tư thế mọi khớp = 0. `pose` (khớp lớp ngoài, như measure) thì bộ phận đặt theo tư thế đó; cụm lồng đi theo
 * bộ phận chứa nó nhưng khớp bên trong vẫn ở 0. Trục khớp và điểm ghim vòng luôn ở tư thế nghỉ (mô hình vật lý dùng chúng).
 */
export function flatten(doc: AssemblyDoc, opts: { pose?: Record<string, number> } = {}): { parts: FlatPart[]; joints: FlatJoint[]; loops: FlatLoop[]; docs: Map<string, AssemblyDoc> } {
  const parts: FlatPart[] = [], joints: FlatJoint[] = [], loops: FlatLoop[] = [];
  const docs = new Map<string, AssemblyDoc>();
  const walk = (d: AssemblyDoc, prefix: string, parentPath: string | null, base: M4) => {
    const work: AssemblyDoc = JSON.parse(JSON.stringify(d));
    for (const j of work.joints) delete j.value;
    const reg = registryFor(work);
    const posed = !prefix && opts.pose && Object.keys(opts.pose).length > 0;
    const solved = solve(work, reg, posed ? { pose: opts.pose } : {});
    const shapes = buildShapes(work, usedShapeIds(work));
    const byId = new Map(work.parts.map((p) => [p.id, p]));
    const shapeMat = new Map((work.shapes ?? []).map((s) => [`${SHAPE_PREFIX}${s.id}`, s.material ?? null]));
    docs.set(prefix, work);
    for (const id of solved.order) {
      const sp = solved.parts.get(id)!, inst = byId.get(id)!, pt = reg[sp.type];
      const path = prefix ? `${prefix}/${id}` : id;
      const world = chain(base, posed ? sp.world : sp.rest);
      const parent = sp.parent === "ground" ? parentPath : prefix ? `${prefix}/${sp.parent}` : sp.parent;
      if (pt.composite) {
        parts.push({ path, parent, world, geometry: null, material: null, composite: true });
        walk(pt.composite.doc, path, path, chain(world, invertRigid(pt.composite.rootMatrix)));
        continue;
      }
      let geometry: THREE.BufferGeometry;
      if (sp.type.startsWith(SHAPE_PREFIX)) geometry = shapes.get(sp.type.slice(SHAPE_PREFIX.length))!.geometry;
      else geometry = libraryGeometry(pt.build, sp.params) ?? boundsBox(pt.bounds(sp.params));
      const material = inst.material ?? shapeMat.get(sp.type) ?? ((sp.params.material as string | undefined) ?? null);
      parts.push({ path, parent, world, geometry, material, composite: false });
    }
    for (const j of work.joints) {
      const { frame, world } = anchorFrame(reg, solved.parts, j.axis, "rest");
      const W = chain(base, world);
      const o = new THREE.Vector3(...frame.origin).applyMatrix4(new THREE.Matrix4().fromArray(W));
      const dvec = new THREE.Vector3(...frame.dir).transformDirection(new THREE.Matrix4().fromArray(W));
      const pre = (x: string) => (prefix ? `${prefix}/${x}` : x);
      joints.push({ id: pre(j.id), joint: j, origin: o.toArray(), dir: dvec.toArray(), radius: frame.radius, lead: j.couple ? pre(j.couple.joint) : undefined, moves: j.moves.map(pre) });
    }
    for (const l of work.loops ?? []) {
      // ground của tài liệu con là cụm chứa nó
      const end = (ref: string) => {
        const { frame, world, part } = anchorFrame(reg, solved.parts, ref, "rest");
        const p = new THREE.Vector3(...frame.origin).applyMatrix4(new THREE.Matrix4().fromArray(chain(base, world)));
        return { path: part ? (prefix ? `${prefix}/${part.id}` : part.id) : parentPath, point: p.toArray() as [number, number, number] };
      };
      const a = end(l.a), b = end(l.b);
      loops.push({ id: prefix ? `${prefix}/${l.id}` : l.id, a: a.path, b: b.path, point: a.point });
    }
  };
  walk(doc, "", null, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  return { parts, joints, loops, docs };
}

// ───────── khoảng cách tới lưới (không cần lưới kín) ─────────

/** Tam giác của một lưới (khung cục bộ), bỏ tam giác suy biến (lưới tiện có tam giác dẹt ở trục). Đệm theo geometry. */
const trianglesCache = new WeakMap<THREE.BufferGeometry, THREE.Triangle[]>();
function trianglesOf(g: THREE.BufferGeometry): THREE.Triangle[] {
  const hit = trianglesCache.get(g);
  if (hit) return hit;
  const pos = g.attributes.position;
  const idx = g.index;
  const n = idx ? idx.count : pos.count;
  const out: THREE.Triangle[] = [];
  const v = (i: number) => new THREE.Vector3().fromBufferAttribute(pos, idx ? idx.getX(i) : i);
  for (let i = 0; i + 2 < n; i += 3) {
    const t = new THREE.Triangle(v(i), v(i + 1), v(i + 2));
    if (t.getArea() > 1e-12) out.push(t);
  }
  trianglesCache.set(g, out);
  return out;
}

const tmpClosest = new THREE.Vector3();
function localDistance(tris: THREE.Triangle[], p: THREE.Vector3, stop = 0): number {
  let best = Infinity;
  for (const t of tris) {
    t.closestPointToPoint(p, tmpClosest);
    const d = tmpClosest.distanceTo(p);
    if (d < best) {
      best = d;
      if (best <= stop) break;
    }
  }
  return best;
}

/** Điểm (khung cục bộ) nằm trong khối: đếm chẵn lẻ giao cắt theo ba tia lệch nhau, lấy đa số (lưới hở vẫn ra kết quả gần đúng). */
const RAYS = [new THREE.Vector3(1, 0.0137, 0.0071), new THREE.Vector3(-0.0113, 1, 0.0191), new THREE.Vector3(0.0157, -0.0089, -1)].map((v) => v.normalize());
const tmpHit = new THREE.Vector3();
function localInside(tris: THREE.Triangle[], box: THREE.Box3, p: THREE.Vector3): boolean {
  if (!box.containsPoint(p)) return false;
  let votes = 0;
  for (const dir of RAYS) {
    const ray = new THREE.Ray(p, dir);
    let n = 0;
    for (const t of tris) if (ray.intersectTriangle(t.a, t.b, t.c, false, tmpHit)) n++;
    if (n % 2 === 1) votes++;
  }
  return votes >= 2;
}

function localBox(g: THREE.BufferGeometry): THREE.Box3 {
  if (!g.boundingBox) g.computeBoundingBox();
  return g.boundingBox!;
}

/**
 * Khoảng cách (m) từ điểm thế giới tới VẬT LIỆU của bộ phận có tư thế `world`: 0 nếu điểm nằm trong khối, không thì tới
 * bề mặt gần nhất. `ceiling`: đã biết có chỗ gần hơn thì khung bao xa hơn mức đó trả luôn cận dưới, khỏi duyệt tam giác.
 */
export function meshPointDistance(geometry: THREE.BufferGeometry, world: M4, point: [number, number, number], ceiling = Infinity): number {
  const p = new THREE.Vector3(...point).applyMatrix4(new THREE.Matrix4().fromArray(invertRigid(world)));
  const box = localBox(geometry);
  const lower = box.distanceToPoint(p);
  if (lower >= ceiling) return lower;
  const tris = trianglesOf(geometry);
  const d = localDistance(tris, p);
  return d > 1e-6 && localInside(tris, box, p) ? 0 : d;
}

/**
 * Khoảng cách nhỏ nhất (m) từ đoạn trục origin + t·dir, t ∈ [t0, t1] (thế giới) tới bề mặt lưới, lấy mẫu bước `step`.
 * Trục xuyên qua vật liệu cho ~0; trục đi qua lỗ cho bán kính lỗ. `ceiling` như meshPointDistance.
 */
export function meshAxisDistance(geometry: THREE.BufferGeometry, world: M4, origin: [number, number, number], dir: [number, number, number], t0: number, t1: number, step = 0.002, ceiling = Infinity): number {
  const inv = new THREE.Matrix4().fromArray(invertRigid(world));
  const box = localBox(geometry);
  const o = new THREE.Vector3(...origin), d = new THREE.Vector3(...dir).normalize();
  const n = Math.max(1, Math.ceil((t1 - t0) / step));
  let best = ceiling;
  for (let i = 0; i <= n; i++) {
    const p = o.clone().addScaledVector(d, t0 + ((t1 - t0) * i) / n).applyMatrix4(inv);
    const lower = box.distanceToPoint(p);
    if (lower >= best) continue;
    const tris = trianglesOf(geometry);
    const dist = localDistance(tris, p, 1e-6);
    // mẫu nằm trong khối (trục xuyên qua chốt đặc): chạm vật liệu
    if (dist > 1e-6 && localInside(tris, box, p)) return 0;
    best = Math.min(best, dist);
    if (best <= 1e-6) break;
  }
  return best; // = ceiling khi không mẫu nào gần hơn: người gọi lấy min nên không sai
}

/** Lưới thế giới của một bộ phận phẳng (bản sao). */
export function worldGeometry(p: FlatPart): THREE.BufferGeometry | null {
  if (!p.geometry) return null;
  const g = p.geometry.clone();
  g.applyMatrix4(new THREE.Matrix4().fromArray(p.world));
  return g;
}

/** Bộ phận theo đường dẫn: chính nó, hoặc mọi bộ phận bên trong nếu là cụm (không gồm bộ phận chỉ ghép vào nó). */
export function partOrCluster(parts: FlatPart[], path: string): FlatPart[] {
  return parts.filter((p) => p.path === path || p.path.startsWith(`${path}/`));
}

/** Bộ phận và mọi bộ phận con cháu của nó (một cụm tính như cả cụm). */
export function descendants(parts: FlatPart[], path: string): FlatPart[] {
  const out = parts.filter((p) => p.path === path);
  for (let grew = true; grew;) {
    grew = false;
    for (const p of parts) if (p.parent && out.some((o) => o.path === p.parent) && !out.includes(p)) {
      out.push(p);
      grew = true;
    }
  }
  return out;
}
