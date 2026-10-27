/**
 * Toán tối giản cho bộ giải lắp ráp: vector 3 và ma trận 4×4 cứng (xoay + dời), không phụ thuộc three.js
 * để server MCP trong Node giải được. Ma trận lưu theo cột, cùng thứ tự với THREE.Matrix4.elements.
 * Hệ tay phải, y hướng lên, mét, radian.
 */

export type V3 = [number, number, number];
export type M4 = number[]; // 16 phần tử, theo cột

export const v3 = (x = 0, y = 0, z = 0): V3 => [x, y, z];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const length = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const normalize = (a: V3): V3 => {
  const l = length(a);
  if (l < 1e-12) throw new Error("vector độ dài 0");
  return scale(a, 1 / l);
};

/** Một vector đơn vị bất kỳ vuông góc với a (dùng khi không có hướng tham chiếu). */
export function anyPerpendicular(a: V3): V3 {
  const ref: V3 = Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  return normalize(cross(cross(a, ref), a));
}

export const identity = (): M4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

export function multiply(a: M4, b: M4): M4 {
  const r = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let row = 0; row < 4; row++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + row] * b[c * 4 + k];
    r[c * 4 + row] = s;
  }
  return r;
}
export const chain = (...ms: M4[]): M4 => ms.reduce((acc, m) => multiply(acc, m), identity());

/** Nghịch đảo của ma trận cứng: [Rᵀ | −Rᵀt]. */
export function invertRigid(m: M4): M4 {
  const r = identity();
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[j * 4 + i] = m[i * 4 + j];
  const t: V3 = [m[12], m[13], m[14]];
  for (let i = 0; i < 3; i++) r[12 + i] = -(r[i] * t[0] + r[4 + i] * t[1] + r[8 + i] * t[2]);
  return r;
}

export function translation(t: V3): M4 {
  const m = identity();
  m[12] = t[0];
  m[13] = t[1];
  m[14] = t[2];
  return m;
}

/** Xoay góc `angle` quanh trục đơn vị `axis` (qua gốc), theo quy tắc tay phải. */
export function rotation(axis: V3, angle: number): M4 {
  const [x, y, z] = normalize(axis);
  const c = Math.cos(angle), s = Math.sin(angle), t = 1 - c;
  return [
    t * x * x + c, t * x * y + s * z, t * x * z - s * y, 0,
    t * x * y - s * z, t * y * y + c, t * y * z + s * x, 0,
    t * x * z + s * y, t * y * z - s * x, t * z * z + c, 0,
    0, 0, 0, 1,
  ];
}

/** Xoay quanh đường thẳng đi qua `point` theo hướng `axis`. */
export const rotationAbout = (point: V3, axis: V3, angle: number): M4 => chain(translation(point), rotation(axis, angle), translation(scale(point, -1)));

/** Khung toạ độ (cột X, Y, Z, gốc) thành ma trận. */
export function fromFrame(origin: V3, x: V3, y: V3, z: V3): M4 {
  return [x[0], x[1], x[2], 0, y[0], y[1], y[2], 0, z[0], z[1], z[2], 0, origin[0], origin[1], origin[2], 1];
}

export const transformPoint = (m: M4, p: V3): V3 => [
  m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
  m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
  m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
];
export const transformDir = (m: M4, d: V3): V3 => [
  m[0] * d[0] + m[4] * d[1] + m[8] * d[2],
  m[1] * d[0] + m[5] * d[1] + m[9] * d[2],
  m[2] * d[0] + m[6] * d[1] + m[10] * d[2],
];
export const column = (m: M4, i: 0 | 1 | 2 | 3): V3 => [m[i * 4], m[i * 4 + 1], m[i * 4 + 2]];

/** Góc Euler XYZ (độ) của phần xoay, chỉ để báo cho người đọc. */
export function eulerXYZDeg(m: M4): V3 {
  const m11 = m[0], m12 = m[4], m13 = m[8], m22 = m[5], m23 = m[9], m32 = m[6], m33 = m[10];
  const y = Math.asin(Math.max(-1, Math.min(1, m13)));
  let x: number, z: number;
  if (Math.abs(m13) < 0.9999999) {
    x = Math.atan2(-m23, m33);
    z = Math.atan2(-m12, m11);
  } else {
    x = Math.atan2(m32, m22);
    z = 0;
  }
  const d = 180 / Math.PI;
  return [x * d, y * d, z * d];
}

export const round = (v: number, digits = 4) => Math.round(v * 10 ** digits) / 10 ** digits || 0;
export const roundV = (v: V3, digits = 4): V3 => [round(v[0], digits), round(v[1], digits), round(v[2], digits)];
