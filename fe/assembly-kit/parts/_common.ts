/**
 * Trợ giúp chung cho các file định nghĩa bộ phận: đọc tham số, khai báo điểm neo, đặt vật liệu.
 *
 * Quy ước khung của bộ phận: y hướng lên, mét. Vật tròn xoay có trục dọc y (như CylinderGeometry) trừ khi file nói
 * khác. Mặt nằm ngang dùng up = −z và uv = [x, z]; mặt đứng dùng up = +y. Nhờ vậy hai bộ phận chồng lên nhau bằng
 * onto/touch giữ nguyên hướng, không tự xoay.
 */

import * as THREE from "three";
import type { V3 } from "../core/math";
import type { AnchorSpec, Params } from "../core/types";
import type { MaterialKit } from "../three/materials";

export const num = (p: Params, k: string) => p[k] as number;
export const vec = (p: Params, k: string) => p[k] as V3;
export const str = (p: Params, k: string) => p[k] as string;
export const bool = (p: Params, k: string) => p[k] as boolean;

const HORIZONTAL_UV: [V3, V3] = [[1, 0, 0], [0, 0, 1]];

/** Mặt nằm ngang (pháp tuyến ±y): at = [x, z] trong khung bộ phận. */
export const hface = (origin: V3, up: boolean, desc: string): AnchorSpec => ({ kind: "face", origin, normal: [0, up ? 1 : -1, 0], up: [0, 0, -1], uv: HORIZONTAL_UV, desc });
/** Mặt đứng: up = +y, at = [ngang, y]. */
export const vface = (origin: V3, normal: V3, desc: string): AnchorSpec => {
  const horizontal: V3 = Math.abs(normal[0]) > 0.5 ? [0, 0, normal[0] > 0 ? -1 : 1] : [normal[2] > 0 ? 1 : -1, 0, 0];
  return { kind: "face", origin, normal, up: [0, 1, 0], uv: [horizontal, [0, 1, 0]], desc };
};
export const axis = (origin: V3, dir: V3, up: V3, desc: string, radius?: number): AnchorSpec => ({ kind: "axis", origin, dir, up, radius, desc });
export const point = (origin: V3, dir: V3, desc: string, up?: V3): AnchorSpec => ({ kind: "point", origin, dir, up, desc });
export const surface = (origin: V3, ax: V3, radius: number, ref: V3, desc: string): AnchorSpec => ({ kind: "surface", origin, axis: ax, radius, ref, desc });

/** Sáu mặt của một hộp tâm `c`, cỡ `s`. */
export function boxFaces(s: V3, c: V3 = [0, 0, 0]): Record<string, AnchorSpec> {
  const [w, h, d] = s.map((x) => x / 2);
  return {
    top: hface([c[0], c[1] + h, c[2]], true, "mặt trên; at = [x, z]"),
    bottom: hface([c[0], c[1] - h, c[2]], false, "mặt dưới; at = [x, z]"),
    right: vface([c[0] + w, c[1], c[2]], [1, 0, 0], "mặt +x; at = [−z, y]"),
    left: vface([c[0] - w, c[1], c[2]], [-1, 0, 0], "mặt −x; at = [z, y]"),
    front: vface([c[0], c[1], c[2] + d], [0, 0, 1], "mặt +z (trước); at = [x, y]"),
    back: vface([c[0], c[1], c[2] - d], [0, 0, -1], "mặt −z (sau); at = [−x, y]"),
  };
}

export const kitOf = (k: unknown) => k as MaterialKit;

export function shadowed(o: THREE.Object3D) {
  o.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  return o;
}

/** Thân tròn xoay (trục y) từ profile [bán kính, y], có lỗ nếu bán kính trong > 0. */
export function ringLathe(outerR: number, innerR: number, h: number, segments = 48) {
  const pts = innerR > 0
    ? [[innerR, -h / 2], [outerR, -h / 2], [outerR, h / 2], [innerR, h / 2], [innerR, -h / 2]]
    : [[0.0001, -h / 2], [outerR, -h / 2], [outerR, h / 2], [0.0001, h / 2]];
  return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segments);
}
