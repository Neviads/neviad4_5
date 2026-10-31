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
  moves: string[];
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

/** Duỗi phẳng ở tư thế mọi khớp = 0. */
export function flatten(doc: AssemblyDoc): { parts: FlatPart[]; joints: FlatJoint[]; docs: Map<string, AssemblyDoc> } {
  const parts: FlatPart[] = [], joints: FlatJoint[] = [];
  const docs = new Map<string, AssemblyDoc>();
  const walk = (d: AssemblyDoc, prefix: string, parentPath: string | null, base: M4) => {
    const work: AssemblyDoc = JSON.parse(JSON.stringify(d));
    for (const j of work.joints) delete j.value;
    const reg = registryFor(work);
    const solved = solve(work, reg);
    const shapes = buildShapes(work, usedShapeIds(work));
    const byId = new Map(work.parts.map((p) => [p.id, p]));
    const shapeMat = new Map((work.shapes ?? []).map((s) => [`${SHAPE_PREFIX}${s.id}`, s.material ?? null]));
    docs.set(prefix, work);
    for (const id of solved.order) {
      const sp = solved.parts.get(id)!, inst = byId.get(id)!, pt = reg[sp.type];
      const path = prefix ? `${prefix}/${id}` : id;
      const world = chain(base, sp.rest);
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
      joints.push({ id: prefix ? `${prefix}/${j.id}` : j.id, joint: j, origin: o.toArray(), dir: dvec.toArray(), moves: j.moves.map((m) => (prefix ? `${prefix}/${m}` : m)) });
    }
  };
  walk(doc, "", null, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  return { parts, joints, docs };
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
