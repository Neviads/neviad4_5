/**
 * Vật liệu PBR: bảng tham số agent tự đặt (MATERIAL_PARAMS) và cách tra một tên vật liệu. Không phụ thuộc three: server
 * MCP dùng để kiểm tra; three/presets.ts dựng vật liệu thật trong trình duyệt. PRESETS chỉ còn để đọc tài liệu cũ; MCP
 * không liệt kê và không nhận chúng.
 */

import { AssemblyError } from "./solve";
import { type AssemblyDoc, MATERIAL_NAMES, type MaterialDef, type TextureSpec } from "./types";

export interface PresetSpec {
  desc: string;
  /** khối lượng riêng kg/m³ và hệ số ma sát (cho mô hình vật lý) */
  density?: number;
  friction?: number;
  /** Tham số chỉnh được và giá trị mặc định. Màu viết "#rrggbb". */
  defaults: Record<string, number | string>;
}

export const PRESETS: Record<string, PresetSpec> = {
  carPaint: { density: 7850, friction: 0.5, desc: "Sơn xe: màu nền, vảy kim loại (flakes), lớp bóng clearcoat", defaults: { color: "#b3121a", roughness: 0.38, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.03, flakes: 0.35 } },
  chrome: { density: 7850, friction: 0.4, desc: "Mạ chrome bóng gương", defaults: { color: "#f4f6f8", roughness: 0.05, metalness: 1 } },
  brushedAluminium: { density: 2700, friction: 0.4, desc: "Nhôm chải xước, phản chiếu kéo dài theo một hướng", defaults: { color: "#c8ccd2", roughness: 0.32, metalness: 1, anisotropy: 0.8, anisotropyRotation: 0 } },
  paintedMetal: { density: 2700, friction: 0.45, desc: "Kim loại sơn mờ (la-zăng sơn, kẹp phanh)", defaults: { color: "#2a2d33", roughness: 0.45, metalness: 0.6, clearcoat: 0.5, clearcoatRoughness: 0.2 } },
  tireRubber: { density: 1100, friction: 0.9, desc: "Cao su lốp: đen ngả xám, nhám, có sheen", defaults: { color: "#1a1b1d", roughness: 0.88, sheen: 0.35, sheenRoughness: 0.7, sheenColor: "#4a5258" } },
  glassTinted: { density: 2500, friction: 0.3, desc: "Kính khúc xạ thật (transmission, ior, màu hấp thụ)", defaults: { color: "#ffffff", roughness: 0.02, transmission: 1, ior: 1.52, thickness: 0.004, attenuationColor: "#d8ecf2", attenuationDistance: 0.5 } },
  lampLens: { density: 1200, friction: 0.3, desc: "Chao đèn: nhựa trong có vân, hơi ám màu", defaults: { color: "#ffffff", roughness: 0.08, transmission: 0.95, ior: 1.49, thickness: 0.003, attenuationColor: "#ffffff", attenuationDistance: 1 } },
  plasticTextured: { density: 1200, friction: 0.5, desc: "Nhựa đen sần (ốp gầm, viền)", defaults: { color: "#202224", roughness: 0.75, metalness: 0 } },
  emissiveLight: { density: 1200, friction: 0.4, desc: "Nguồn sáng (đèn hậu, đèn xi-nhan); emissiveIntensity càng lớn càng loá (bloom)", defaults: { color: "#ffffff", emissive: "#ff2a1a", emissiveIntensity: 3, roughness: 0.3 } },
  asphalt: { density: 2300, friction: 0.8, desc: "Mặt đường nhựa", defaults: { color: "#2b2c2e", roughness: 0.95, metalness: 0 } },
  ceramic: { density: 2400, friction: 0.4, desc: "Gốm, sứ tráng men", defaults: { color: "#f2efe8", roughness: 0.15, clearcoat: 0.6, clearcoatRoughness: 0.1 } },
};

export const TEXTURE_KINDS: TextureSpec["kind"][] = ["noise", "flakes", "tread", "grain", "scratches"];

const COLOR = /^#[0-9a-fA-F]{6}$/;

/** Tham số PBR agent tự đặt trong MaterialDef.params: "color" = màu "#rrggbb", [min, max] = số trong khoảng. */
export const MATERIAL_PARAMS: Record<string, { range: "color" | [number, number]; desc: string }> = {
  color: { range: "color", desc: "màu nền (albedo)" },
  roughness: { range: [0, 1], desc: "độ nhám: 0 bóng gương, 1 mờ hẳn" },
  metalness: { range: [0, 1], desc: "1 = kim loại (màu nằm ở phản xạ), 0 = điện môi" },
  clearcoat: { range: [0, 1], desc: "lớp phủ bóng trong suốt bên trên" },
  clearcoatRoughness: { range: [0, 1], desc: "độ nhám của lớp phủ" },
  transmission: { range: [0, 1], desc: "độ truyền sáng (vật trong suốt khúc xạ)" },
  ior: { range: [1, 2.5], desc: "chiết suất" },
  thickness: { range: [0, 1], desc: "bề dày quang học (m) cho khúc xạ" },
  attenuationColor: { range: "color", desc: "màu ánh sáng còn lại sau khi đi qua vật" },
  attenuationDistance: { range: [0, 1e6], desc: "quãng (m) ánh sáng đi được trước khi nhuốm attenuationColor" },
  sheen: { range: [0, 1], desc: "ánh mượt ở góc nghiêng (vải, cao su)" },
  sheenRoughness: { range: [0, 1], desc: "độ loang của sheen" },
  sheenColor: { range: "color", desc: "màu của sheen" },
  anisotropy: { range: [0, 1], desc: "phản xạ kéo dài theo một hướng (kim loại chải)" },
  anisotropyRotation: { range: [-360, 360], desc: "hướng của anisotropy (độ)" },
  emissive: { range: "color", desc: "màu tự phát sáng" },
  emissiveIntensity: { range: [0, 100], desc: "cường độ tự phát sáng" },
  flakes: { range: [0, 1], desc: "vảy kim loại nằm dưới lớp phủ" },
};

function checkParam(k: string, v: unknown, label: string, allowed: Record<string, number | string>): void {
  const spec = MATERIAL_PARAMS[k];
  if (!spec || !(k in allowed)) throw new AssemblyError(`${label}: không có tham số "${k}". Có: ${Object.keys(allowed).join(", ")}.`);
  if (spec.range === "color") {
    if (typeof v !== "string" || !COLOR.test(v)) throw new AssemblyError(`${label}.${k} phải là màu "#rrggbb".`);
  } else if (typeof v !== "number" || !Number.isFinite(v) || v < spec.range[0] || v > spec.range[1]) {
    throw new AssemblyError(`${label}.${k} phải là số trong [${spec.range.join(", ")}].`);
  }
}

const ALL_PARAMS = Object.fromEntries(Object.keys(MATERIAL_PARAMS).map((k) => [k, 0]));

export function checkMaterialDef(def: MaterialDef, label: string): void {
  for (const [k, v] of Object.entries(def.params ?? {})) checkParam(k, v, `${label}.params`, ALL_PARAMS);
  for (const [k, v] of [["density", def.density], ["friction", def.friction]] as const) {
    if (v !== undefined && !(typeof v === "number" && v > 0 && Number.isFinite(v))) throw new AssemblyError(`${label}.${k} phải là số > 0.`);
  }
  const preset = def.preset === undefined ? null : PRESETS[def.preset];
  if (def.preset !== undefined && !preset) throw new AssemblyError(`${label}: không có preset "${def.preset}".`);
  if (!preset && def.density === undefined) throw new AssemblyError(`${label}: thiếu density (khối lượng riêng kg/m³ của vật liệu thật).`);
  for (const [k, v] of Object.entries(def.overrides ?? {})) {
    // wireframe: ô hiển thị dùng chung cho mọi preset (xem lưới tam giác), không phải tham số vật liệu
    if (k === "wireframe") {
      if (typeof v !== "boolean") throw new AssemblyError(`${label}.wireframe phải là true hoặc false.`);
      continue;
    }
    if (!preset) throw new AssemblyError(`${label}.overrides: chỉ dùng cho tài liệu cũ có preset; đặt tham số trong params.`);
    checkParam(k, v, `${label}.overrides`, preset.defaults);
  }
  for (const [slot, t] of Object.entries(def.textures ?? {})) {
    if (!["normal", "roughness", "color"].includes(slot)) throw new AssemblyError(`${label}.textures: ô "${slot}" không có; dùng normal, roughness, color.`);
    if (!t || !TEXTURE_KINDS.includes(t.kind)) throw new AssemblyError(`${label}.textures.${slot}.kind phải là một trong: ${TEXTURE_KINDS.join(", ")}.`);
  }
}

/** Vật liệu agent vừa chọn phải là id đã định nghĩa trong doc.materials (không nhận preset hay tên cũ). */
export function checkDefinedMaterial(doc: AssemblyDoc, ref: string, label: string): void {
  if (doc.materials?.[ref]) return;
  throw new AssemblyError(`${label}: chưa có vật liệu "${ref}". Định nghĩa bằng material_define trước. Đã có: ${Object.keys(doc.materials ?? {}).join(", ") || "(chưa có)"}.`);
}

/** Một tên vật liệu đọc được là: id trong doc.materials, hoặc (tài liệu cũ) tên preset / tên trong MATERIAL_NAMES. */
export function checkMaterialRef(doc: AssemblyDoc, ref: string, label: string): void {
  if (PRESETS[ref] || (MATERIAL_NAMES as readonly string[]).includes(ref)) return;
  checkDefinedMaterial(doc, ref, label);
}
