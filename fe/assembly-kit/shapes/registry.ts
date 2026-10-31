/**
 * Các loại bộ phận của một tài liệu: mỗi hình tự dựng thành loại "shape:<id>", cộng các cụm đã lưu (PARTS rỗng).
 * Mọi nơi giải hoặc dựng một tài liệu đều lấy registry ở đây thay vì dùng PARTS trực tiếp.
 */

import * as THREE from "three";
import { checkMaterialDef, checkMaterialRef } from "../core/materials";
import type { Registry } from "../core/solve";
import { AssemblyError } from "../core/solve";
import type { AssemblyDoc, CompositeType, PartType } from "../core/types";
import { PARTS } from "../parts";
import { kitOf, shadowed } from "../parts/_common";
import { type BuiltShape, buildShapes, usedShapeIds } from "./build";

export const SHAPE_PREFIX = "shape:";

function shapeType(s: BuiltShape): PartType {
  return {
    type: `${SHAPE_PREFIX}${s.id}`,
    category: "shape",
    description: `Hình tự dựng ${s.id}: ${s.info.join("; ")}`,
    params: {},
    anchors: () => s.anchors,
    bounds: () => s.bounds,
    // dùng chung lưới trong cache (hai xe cùng loại không nhân đôi bộ nhớ); đánh dấu để dispose không huỷ nó
    build: (_p, kit) => {
      s.geometry.userData.shared = true;
      return shadowed(new THREE.Mesh(s.geometry, kitOf(kit).byName.steel));
    },
  };
}

function compositeType(name: string, c: CompositeType): PartType {
  return {
    type: name,
    category: "composite",
    description: `${c.description} (cụm ${c.doc.parts.length} bộ phận lưu từ ${c.source}, gốc ${c.root})`,
    params: {},
    anchors: () => c.anchors,
    bounds: () => c.bounds,
    composite: { doc: c.doc, rootMatrix: c.rootMatrix },
  };
}

/** Tên cụm hợp lệ: không trùng loại có sẵn, không dùng tiền tố hình. */
export function checkTypeName(name: string): void {
  if (!/^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(name ?? "")) throw new AssemblyError(`Tên loại "${name}" không hợp lệ (chữ cái đầu, rồi chữ, số, _ và -).`);
  if (PARTS[name]) throw new AssemblyError(`Tên loại "${name}" trùng loại có sẵn trong thư viện; chọn tên khác.`);
  if (name.startsWith(SHAPE_PREFIX)) throw new AssemblyError(`Tên loại không được bắt đầu bằng "${SHAPE_PREFIX}".`);
}

export function registryFor(doc: AssemblyDoc): Registry {
  const types = Object.entries(doc.types ?? {});
  if (!doc.shapes?.length && !types.length) return PARTS;
  // chỉ dựng hình mà bộ phận dùng (hình trung gian đã nướng sẵn thì khỏi dựng)
  const shapes = doc.shapes?.length ? buildShapes(doc, usedShapeIds(doc)) : new Map();
  return {
    ...PARTS,
    ...Object.fromEntries([...shapes.values()].map((s) => [`${SHAPE_PREFIX}${s.id}`, shapeType(s)])),
    ...Object.fromEntries(types.map(([name, c]) => {
      checkTypeName(name);
      return [name, compositeType(name, c)];
    })),
  };
}

/** Kiểm tra phần vật liệu, decal và cảnh của tài liệu (phần hình và lắp ráp do buildShapes / solve kiểm tra). */
export function checkDocExtras(doc: AssemblyDoc): void {
  for (const [id, def] of Object.entries(doc.materials ?? {})) {
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) throw new AssemblyError(`id vật liệu "${id}" không hợp lệ.`);
    checkMaterialDef(def, `[vật liệu ${id}]`);
  }
  for (const s of doc.shapes ?? []) if (s.material) checkMaterialRef(doc, s.material, `[hình ${s.id}].material`);
  for (const p of doc.parts) if (p.material) checkMaterialRef(doc, p.material, `[${p.id}].material`);
  for (const r of doc.routes ?? []) checkMaterialRef(doc, r.material, `[dây ${r.id}].material`);
  const partIds = new Set(doc.parts.map((p) => p.id));
  for (const d of doc.decals ?? []) {
    if (!partIds.has(d.target)) throw new AssemblyError(`[decal ${d.id}] không có bộ phận "${d.target}".`);
    if (!Array.isArray(d.size) || d.size.length !== 2 || !d.size.every((x) => x > 0)) throw new AssemblyError(`[decal ${d.id}] size phải là [rộng, cao] > 0 (m).`);
    if (!d.content?.text && !d.content?.svg) throw new AssemblyError(`[decal ${d.id}] cần content.text hoặc content.svg.`);
  }
}
