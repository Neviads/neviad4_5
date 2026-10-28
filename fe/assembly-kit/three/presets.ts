/**
 * Dựng vật liệu three.js theo tài liệu lắp ráp: id trong doc.materials (preset + ghi đè + texture thủ tục), tên preset
 * (core/materials.ts) hoặc tên cũ trong MATERIAL_NAMES (bộ vật liệu kit). Chỉ chạy trong trình duyệt.
 */

import * as THREE from "three";
import { PRESETS } from "../core/materials";
import type { AssemblyDoc, MaterialDef } from "../core/types";
import type { MaterialKit } from "./materials";
import { grayTexture, normalTexture } from "./procedural";

function make(def: MaterialDef): THREE.MeshPhysicalMaterial {
  const p = { ...PRESETS[def.preset].defaults, ...(def.overrides ?? {}) } as Record<string, number | string>;
  const num = (k: string) => p[k] as number | undefined;
  const col = (k: string) => (p[k] !== undefined ? new THREE.Color(p[k] as string) : undefined);
  const m = new THREE.MeshPhysicalMaterial({ color: col("color") });
  for (const k of ["roughness", "metalness", "clearcoat", "clearcoatRoughness", "transmission", "ior", "thickness", "attenuationDistance", "sheen", "sheenRoughness", "anisotropy", "emissiveIntensity"] as const) {
    if (num(k) !== undefined) (m as unknown as Record<string, number>)[k] = num(k)!;
  }
  if (num("anisotropyRotation") !== undefined) m.anisotropyRotation = (num("anisotropyRotation")! * Math.PI) / 180;
  if (col("attenuationColor")) m.attenuationColor = col("attenuationColor")!;
  if (col("sheenColor")) m.sheenColor = col("sheenColor")!;
  if (col("emissive")) m.emissive = col("emissive")!;
  const tex = def.textures ?? {};
  // sơn xe: vảy kim loại nằm dưới lớp bóng (normal map chỉ ở lớp nền, clearcoat vẫn phẳng)
  const flakes = num("flakes");
  if (tex.normal) m.normalMap = normalTexture(tex.normal);
  else if (flakes) {
    m.normalMap = normalTexture({ kind: "flakes", scale: 24, strength: flakes });
    m.normalScale.setScalar(1);
  }
  if (tex.roughness) m.roughnessMap = grayTexture(tex.roughness, false);
  if (tex.color) m.map = grayTexture(tex.color, true);
  // CHẤT LỎNG: đây là chỗ chặn "nước bán trong". Tài liệu chỉ cho transmission, không
  // có opacity/transparent, nên hai lớp trong suốt lồng nhau (nước trong cốc thuỷ tinh,
  // dầu trong ống nhựa trong) sẽ mất lớp bên trong: three.js loại vật liệu transmission
  // khỏi lượt render transmission. Muốn có alpha thật thì phải thêm opacity/transparent
  // vào MaterialDef (xem ghi chú đầu core/types.ts).
  if (m.transmission > 0) m.depthWrite = false;
  // wireframe: chỉ vẽ cạnh tam giác (màu đậm trên nền sáng, không phát sáng)
  if (def.overrides?.wireframe) {
    m.wireframe = true;
    m.metalness = 0;
    m.roughness = 1;
    m.clearcoat = 0;
    m.emissiveIntensity = 0;
  }
  m.name = def.preset;
  return m;
}

/** Bộ tra vật liệu cho một tài liệu; cùng tên trả cùng một vật liệu. */
export function docMaterials(doc: AssemblyDoc, kit: MaterialKit) {
  const cache = new Map<string, THREE.Material>();
  return (ref: string): THREE.Material => {
    let m = cache.get(ref);
    if (m) return m;
    const def = doc.materials?.[ref];
    if (def && PRESETS[def.preset]) m = make(def);
    else if (PRESETS[ref]) m = make({ preset: ref });
    else m = kit.byName[ref as keyof MaterialKit["byName"]] ?? kit.byName.steel;
    cache.set(ref, m);
    return m;
  };
}
