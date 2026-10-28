/**
 * Toán cho bộ giải vật lý: véc-tơ 3 (mảng số), quaternion [x, y, z, w], ma trận 3×3 (mảng 9 phần tử theo hàng).
 * Không phụ thuộc three: chạy giống nhau trong Node (MCP simulate) và trình duyệt.
 */

import type { M4, V3 } from "../core/math";

export type Q = [number, number, number, number];
export type M3 = number[]; // 9 phần tử, theo hàng

export const v = {
  add: (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a: V3) => Math.hypot(a[0], a[1], a[2]),
  norm: (a: V3): V3 => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
  addScaled: (a: V3, b: V3, k: number): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k],
};

export const q = {
  identity: (): Q => [0, 0, 0, 1],
  mul: (a: Q, b: Q): Q => [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ],
  conj: (a: Q): Q => [-a[0], -a[1], -a[2], a[3]],
  norm: (a: Q): Q => {
    const l = Math.hypot(a[0], a[1], a[2], a[3]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l, a[3] / l];
  },
  rotate: (a: Q, p: V3): V3 => {
    // p' = p + 2w(u×p) + 2u×(u×p)
    const u: V3 = [a[0], a[1], a[2]], w = a[3];
    const t = v.scale(v.cross(u, p), 2);
    return v.add(v.add(p, v.scale(t, w)), v.cross(u, t));
  },
  /** q ← q + ½·[ω, 0]·q·h (tích phân quay), đã chuẩn hoá. */
  integrate: (a: Q, w: V3, h: number): Q => {
    const d = q.mul([w[0], w[1], w[2], 0], a);
    return q.norm([a[0] + 0.5 * h * d[0], a[1] + 0.5 * h * d[1], a[2] + 0.5 * h * d[2], a[3] + 0.5 * h * d[3]]);
  },
  fromAxisAngle: (axis: V3, ang: number): Q => {
    const s = Math.sin(ang / 2), n = v.norm(axis);
    return [n[0] * s, n[1] * s, n[2] * s, Math.cos(ang / 2)];
  },
};

export const m3 = {
  mulV: (m: M3, a: V3): V3 => [m[0] * a[0] + m[1] * a[1] + m[2] * a[2], m[3] * a[0] + m[4] * a[1] + m[5] * a[2], m[6] * a[0] + m[7] * a[1] + m[8] * a[2]],
  inverse: (m: M3): M3 => {
    const [a, b, c, d, e, f, g, h, i] = m;
    const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
    const det = a * A + b * B + c * C;
    if (Math.abs(det) < 1e-30) return [0, 0, 0, 0, 0, 0, 0, 0, 0];
    const k = 1 / det;
    return [A * k, -(b * i - c * h) * k, (b * f - c * e) * k, B * k, (a * i - c * g) * k, -(a * f - c * d) * k, C * k, -(a * h - b * g) * k, (a * e - b * d) * k];
  },
};

/** Áp nghịch đảo tensor quán tính (khung vật) trong khung thế giới: R·I⁻¹·Rᵀ·a. */
export const invInertiaWorld = (invI: M3, rot: Q, a: V3): V3 => q.rotate(rot, m3.mulV(invI, q.rotate(q.conj(rot), a)));

/** Ma trận 4×4 (cột trước, như core/math) từ vị trí và quaternion. */
export function poseMatrix(x: V3, r: Q): M4 {
  const [qx, qy, qz, qw] = r;
  const xx = qx * qx, yy = qy * qy, zz = qz * qz, xy = qx * qy, xz = qx * qz, yz = qy * qz, wx = qw * qx, wy = qw * qy, wz = qw * qz;
  return [1 - 2 * (yy + zz), 2 * (xy + wz), 2 * (xz - wy), 0, 2 * (xy - wz), 1 - 2 * (xx + zz), 2 * (yz + wx), 0, 2 * (xz + wy), 2 * (yz - wx), 1 - 2 * (xx + yy), 0, x[0], x[1], x[2], 1];
}

/** Quaternion từ phần quay của ma trận 4×4 (cột trước). */
export function quatFromMatrix(m: M4): Q {
  const m00 = m[0], m10 = m[1], m20 = m[2], m01 = m[4], m11 = m[5], m21 = m[6], m02 = m[8], m12 = m[9], m22 = m[10];
  const tr = m00 + m11 + m22;
  let out: Q;
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    out = [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, s / 4];
  } else if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
    out = [s / 4, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s];
  } else if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
    out = [(m01 + m10) / s, s / 4, (m12 + m21) / s, (m02 - m20) / s];
  } else {
    const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
    out = [(m02 + m20) / s, (m12 + m21) / s, s / 4, (m10 - m01) / s];
  }
  return q.norm(out);
}
