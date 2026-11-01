/**
 * Dựng cảnh three.js từ một tài liệu lắp ráp: dựng các hình tự dựng (shapes/), giải bằng core/solve, gọi build() của
 * từng bộ phận, gán vật liệu theo tài liệu, đặt ma trận thế giới, dán decal, vẽ dây nối bằng ống Catmull-Rom.
 * `setPose` giải lại với giá trị khớp mới và chỉ cập nhật ma trận.
 */

import * as THREE from "three";
import { solveRoute } from "../core/route";
import { invertRigid } from "../core/math";
import { type Solved, solve } from "../core/solve";
import type { AssemblyDoc } from "../core/types";
import { SHAPE_PREFIX, registryFor } from "../shapes/registry";
import { addDecals } from "./decals";
import type { MaterialKit } from "./materials";
import { docMaterials } from "./presets";

export { createStage } from "./stage";

export interface AssemblyView {
  root: THREE.Group;
  parts: Map<string, THREE.Object3D>;
  solved: Solved;
  /**
   * giá trị khớp; khớp trong cụm viết "<idBoPhan>/<khop>". Khớp dẫn đặt thẳng; khớp ghép hoặc khớp do vòng kín tính thì
   * bộ giải suy ngược ra khớp dẫn của nhóm (giá trị không tới được thì kẹp về gần nhất). Giá trị mọi khớp sau khi giải:
   * `solved.values`.
   */
  setPose(values: Record<string, number>): void;
  /** đặt ma trận thế giới cho một bộ phận ("id" hoặc "idCum/idTrong"), dùng khi bộ giải vật lý điều khiển */
  setWorld(path: string, world: number[]): void;
  dispose(): void;
}

export function buildAssembly(doc: AssemblyDoc, kit: MaterialKit): AssemblyView {
  const work: AssemblyDoc = JSON.parse(JSON.stringify(doc));
  const root = new THREE.Group();
  root.name = doc.id;
  const parts = new Map<string, THREE.Object3D>();
  const registry = registryFor(work);
  const material = docMaterials(work, kit);
  const shapeMaterial = new Map((work.shapes ?? []).filter((s) => s.material).map((s) => [`${SHAPE_PREFIX}${s.id}`, s.material!]));
  const byId = new Map(work.parts.map((p) => [p.id, p]));
  let solved = solve(work, registry);

  const children: AssemblyView[] = [];
  const childOf = new Map<string, AssemblyView>();
  for (const id of solved.order) {
    const sp = solved.parts.get(id)!;
    const pt = registry[sp.type];
    let obj: THREE.Object3D;
    if (pt.composite) {
      // cụm đã lưu: dựng tài liệu con, dời để khung của loại trùng khung bộ phận gốc
      const child = buildAssembly(pt.composite.doc, kit);
      children.push(child);
      childOf.set(id, child);
      child.root.matrixAutoUpdate = false;
      child.root.matrix.fromArray(invertRigid(pt.composite.rootMatrix));
      obj = new THREE.Group();
      obj.add(child.root);
    } else obj = (pt.build?.(sp.params, kit) as THREE.Object3D | undefined) ?? new THREE.Group();
    const ref = byId.get(id)!.material ?? shapeMaterial.get(sp.type);
    if (ref) {
      const m = material(ref);
      obj.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = m;
      });
    }
    obj.name = id;
    obj.matrixAutoUpdate = false;
    obj.matrix.fromArray(sp.world);
    obj.matrixWorldNeedsUpdate = true;
    parts.set(id, obj);
    root.add(obj);
  }
  root.updateMatrixWorld(true);
  if (work.decals?.length) addDecals(work.decals, parts, solved, registry);

  const routes = new THREE.Group();
  root.add(routes);
  const drawRoutes = () => {
    routes.children.forEach((c) => (c as THREE.Mesh).geometry.dispose());
    routes.clear();
    for (const r of work.routes) {
      const s = solveRoute(r, solved, registry);
      const curve = new THREE.CatmullRomCurve3(s.points.map((p) => new THREE.Vector3(...p)), false, "centripetal");
      const m = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(32, s.points.length * 20), s.radius, 10, false), material(s.material));
      m.castShadow = m.receiveShadow = true;
      routes.add(m);
    }
  };
  drawRoutes();

  return {
    root,
    parts,
    get solved() {
      return solved;
    },
    setPose(values) {
      for (const [id, child] of childOf) {
        const inner = Object.fromEntries(Object.entries(values).filter(([k]) => k.startsWith(`${id}/`)).map(([k, x]) => [k.slice(id.length + 1), x]));
        if (Object.keys(inner).length) child.setPose(inner);
      }
      const own = Object.fromEntries(Object.entries(values).filter(([k]) => !k.includes("/")));
      // lời giải trước làm điểm xuất phát cho vòng kín: cơ cấu ở yên một nhánh, chạy liền
      solved = solve(work, registry, { pose: own, warm: solved.values, clamp: true });
      for (const [id, obj] of parts) {
        obj.matrix.fromArray(solved.parts.get(id)!.world);
        obj.matrixWorldNeedsUpdate = true;
      }
      drawRoutes();
    },
    setWorld(path, world) {
      const slash = path.indexOf("/");
      if (slash > 0) return childOf.get(path.slice(0, slash))?.setWorld(path.slice(slash + 1), world);
      const obj = parts.get(path);
      if (!obj) return;
      // ma trận cục bộ = (thế giới của cha)⁻¹ · thế giới mong muốn
      obj.parent?.updateMatrixWorld(true);
      const parentInv = obj.parent ? obj.parent.matrixWorld.clone().invert() : new THREE.Matrix4();
      obj.matrix.copy(parentInv.multiply(new THREE.Matrix4().fromArray(world)));
      obj.matrixWorldNeedsUpdate = true;
    },
    dispose() {
      root.traverse((o) => {
        const g = (o as THREE.Mesh).geometry;
        if (g && !g.userData.shared) g.dispose();
      });
      children.forEach((c) => c.dispose());
    },
  };
}
