/**
 * Bộ vật liệu three.js cho các bộ phận của assembly-kit. Tên khớp với MATERIAL_NAMES (core/types.ts) để agent
 * chọn vật liệu cho khối cơ bản và dây nối; vài vật liệu đặc biệt (mặt số, chữ N/S, kính đồng hồ) chỉ bộ phận dùng.
 * Chỉ chạy trong trình duyệt (texture vẽ bằng canvas).
 */

import * as THREE from "three";
import type { MaterialName } from "../core/types";
import { dialTexture, letterTexture, windingTexture, woodTexture } from "./textures";

export function createMaterialKit() {
  const wood = woodTexture();
  const winding = windingTexture();
  winding.repeat.set(96, 1);
  const paint = (color: number) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.15 });
  const byName: Record<MaterialName, THREE.Material> = {
    wood: new THREE.MeshPhysicalMaterial({ map: wood, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
    felt: new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 1 }),
    aluminium: new THREE.MeshStandardMaterial({ color: 0xc9ccd1, metalness: 1, roughness: 0.32 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xdcdfe3, metalness: 1, roughness: 0.18 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x8b9199, metalness: 0.9, roughness: 0.38 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xe0956a, metalness: 1, roughness: 0.22 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xd2ac55, metalness: 1, roughness: 0.28 }),
    bakelite: new THREE.MeshPhysicalMaterial({ color: 0x2a1c15, roughness: 0.4, clearcoat: 0.5 }),
    carbon: new THREE.MeshStandardMaterial({ color: 0x1d1d1f, roughness: 0.85 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 }),
    redPaint: paint(0xc0262b),
    bluePaint: paint(0x1f4fa6),
    whitePaint: paint(0xeeeeea),
    blackPaint: paint(0x1b1b1d),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, transmission: 0.95, thickness: 0.002, ior: 1.5, transparent: true }),
    winding: new THREE.MeshStandardMaterial({ map: winding, metalness: 0.75, roughness: 0.38 }),
    tape: new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9 }),
    wireRed: new THREE.MeshStandardMaterial({ color: 0xb3201f, roughness: 0.5 }),
    wireBlack: new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 0.5 }),
    enamel: new THREE.MeshStandardMaterial({ color: 0xa8431c, metalness: 0.6, roughness: 0.3 }),
  };
  return {
    byName,
    dial: new THREE.MeshStandardMaterial({ map: dialTexture(), roughness: 0.6 }),
    // mặt kính phẳng của đồng hồ: chỉ phản chiếu, không khúc xạ (transmission làm nhoè mặt số)
    coverGlass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, transparent: true, opacity: 0.12, depthWrite: false }),
    letterN: new THREE.MeshBasicMaterial({ map: letterTexture("N"), transparent: true, depthWrite: false }),
    letterS: new THREE.MeshBasicMaterial({ map: letterTexture("S"), transparent: true, depthWrite: false }),
    filament: new THREE.MeshStandardMaterial({ color: 0x3a3a3a, emissive: 0xffb050, emissiveIntensity: 0, roughness: 0.5 }),
    slot: new THREE.MeshStandardMaterial({ color: 0x333333 }),
  };
}
export type MaterialKit = ReturnType<typeof createMaterialKit>;
