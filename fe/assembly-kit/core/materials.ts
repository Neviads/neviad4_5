/**
 * Danh mục vật liệu PBR có sẵn (preset) và cách tra một tên vật liệu. Không phụ thuộc three: server MCP dùng để kiểm
 * tra và liệt kê; three/presets.ts dựng vật liệu thật trong trình duyệt theo đúng danh mục này.
 */

import { AssemblyError } from "./solve";
import { type AssemblyDoc, MATERIAL_NAMES, type MaterialDef, type TextureSpec } from "./types";

export interface PresetSpec {
  desc: string;
  /** Tham số chỉnh được và giá trị mặc định. Màu viết "#rrggbb". */
  defaults: Record<string, number | string>;
}

export const PRESETS: Record<string, PresetSpec> = {
  carPaint: { desc: "Sơn xe: màu nền, vảy kim loại (flakes), lớp bóng clearcoat", defaults: { color: "#b3121a", roughness: 0.38, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.03, flakes: 0.35 } },
  chrome: { desc: "Mạ chrome bóng gương", defaults: { color: "#f4f6f8", roughness: 0.05, metalness: 1 } },
  brushedAluminium: { desc: "Nhôm chải xước, phản chiếu kéo dài theo một hướng", defaults: { color: "#c8ccd2", roughness: 0.32, metalness: 1, anisotropy: 0.8, anisotropyRotation: 0 } },
  paintedMetal: { desc: "Kim loại sơn mờ (la-zăng sơn, kẹp phanh)", defaults: { color: "#2a2d33", roughness: 0.45, metalness: 0.6, clearcoat: 0.5, clearcoatRoughness: 0.2 } },
  tireRubber: { desc: "Cao su lốp: đen ngả xám, nhám, có sheen", defaults: { color: "#1a1b1d", roughness: 0.88, sheen: 0.35, sheenRoughness: 0.7, sheenColor: "#4a5258" } },
  glassTinted: { desc: "Kính khúc xạ thật (transmission, ior, màu hấp thụ)", defaults: { color: "#ffffff", roughness: 0.02, transmission: 1, ior: 1.52, thickness: 0.004, attenuationColor: "#d8ecf2", attenuationDistance: 0.5 } },
  lampLens: { desc: "Chao đèn: nhựa trong có vân, hơi ám màu", defaults: { color: "#ffffff", roughness: 0.08, transmission: 0.95, ior: 1.49, thickness: 0.003, attenuationColor: "#ffffff", attenuationDistance: 1 } },
  plasticTextured: { desc: "Nhựa đen sần (ốp gầm, viền)", defaults: { color: "#202224", roughness: 0.75, metalness: 0 } },
  emissiveLight: { desc: "Nguồn sáng (đèn hậu, đèn xi-nhan); emissiveIntensity càng lớn càng loá (bloom)", defaults: { color: "#ffffff", emissive: "#ff2a1a", emissiveIntensity: 3, roughness: 0.3 } },
  asphalt: { desc: "Mặt đường nhựa", defaults: { color: "#2b2c2e", roughness: 0.95, metalness: 0 } },
  ceramic: { desc: "Gốm, sứ tráng men", defaults: { color: "#f2efe8", roughness: 0.15, clearcoat: 0.6, clearcoatRoughness: 0.1 } },
};

export const TEXTURE_KINDS: TextureSpec["kind"][] = ["noise", "flakes", "tread", "grain", "scratches"];

const COLOR = /^#[0-9a-fA-F]{6}$/;

export function checkMaterialDef(def: MaterialDef, label: string): void {
  const preset = PRESETS[def.preset];
  if (!preset) throw new AssemblyError(`${label}: không có preset "${def.preset}". Có: ${Object.keys(PRESETS).join(", ")}.`);
  for (const [k, v] of Object.entries(def.overrides ?? {})) {
    if (!(k in preset.defaults)) throw new AssemblyError(`${label}: preset ${def.preset} không có tham số "${k}". Có: ${Object.keys(preset.defaults).join(", ")}.`);
    const d = preset.defaults[k];
    if (typeof d === "string" && (typeof v !== "string" || !COLOR.test(v))) throw new AssemblyError(`${label}.${k} phải là màu "#rrggbb".`);
    if (typeof d === "number" && (typeof v !== "number" || !Number.isFinite(v))) throw new AssemblyError(`${label}.${k} phải là số.`);
  }
  for (const [slot, t] of Object.entries(def.textures ?? {})) {
    if (!["normal", "roughness", "color"].includes(slot)) throw new AssemblyError(`${label}.textures: ô "${slot}" không có; dùng normal, roughness, color.`);
    if (!t || !TEXTURE_KINDS.includes(t.kind)) throw new AssemblyError(`${label}.textures.${slot}.kind phải là một trong: ${TEXTURE_KINDS.join(", ")}.`);
  }
}

/** Một tên vật liệu hợp lệ là: id trong doc.materials, tên preset, hoặc tên cũ trong MATERIAL_NAMES. */
export function checkMaterialRef(doc: AssemblyDoc, ref: string, label: string): void {
  if (doc.materials?.[ref] || PRESETS[ref] || (MATERIAL_NAMES as readonly string[]).includes(ref)) return;
  throw new AssemblyError(`${label}: không có vật liệu "${ref}". Dùng id đã material_define (${Object.keys(doc.materials ?? {}).join(", ") || "chưa có"}), preset (${Object.keys(PRESETS).join(", ")}) hoặc tên cũ (${MATERIAL_NAMES.join(", ")}).`);
}
