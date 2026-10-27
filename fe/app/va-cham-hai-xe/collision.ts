/**
 * Va chạm một chiều của hai xe trên đường thẳng: chuyển động đều (có thể có ma sát lăn μ·g), va chạm tức thời với
 * hệ số phục hồi e (e = 1 đàn hồi, e = 0 mềm — hai xe dính vào nhau). Toạ độ là độ dời của khớp trượt (m) so với
 * vị trí lắp ráp; không có React hay three ở đây.
 */

export interface CarState {
  s: number; // độ dời dọc đường, m
  v: number; // vận tốc, m/s (+x là hướng xe A chạy tới)
}

export interface CollisionParams {
  mA: number; // kg
  mB: number;
  e: number; // hệ số phục hồi
  mu: number; // hệ số ma sát lăn
  gapRest: number; // khoảng hở giữa hai cản khi cả hai khớp bằng 0, m
  sMin: [number, number]; // giới hạn độ dời (hết đường) cho A, B
  sMax: [number, number];
}

export interface Impact {
  t: number;
  before: [number, number];
  after: [number, number];
}

export interface World {
  t: number;
  a: CarState;
  b: CarState;
  impact: Impact | null;
}

const G = 9.81;

/** Vận tốc sau va chạm theo bảo toàn động lượng và định nghĩa hệ số phục hồi. */
export function collide(mA: number, mB: number, vA: number, vB: number, e: number): [number, number] {
  const p = mA * vA + mB * vB, M = mA + mB;
  return [(p + mB * e * (vB - vA)) / M, (p + mA * e * (vA - vB)) / M];
}

function roll(c: CarState, dt: number, mu: number, lo: number, hi: number) {
  const dv = mu * G * dt;
  const v = Math.abs(c.v) <= dv ? 0 : c.v - Math.sign(c.v) * dv;
  c.s += ((c.v + v) / 2) * dt;
  c.v = v;
  if (c.s < lo || c.s > hi) {
    c.s = Math.min(hi, Math.max(lo, c.s));
    c.v = 0; // hết đường thì dừng
  }
}

/** Tiến một bước dt (s); va chạm xử lý ngay khi hai cản chạm nhau và đang lại gần. */
export function step(w: World, p: CollisionParams, dt: number) {
  roll(w.a, dt, p.mu, p.sMin[0], p.sMax[0]);
  roll(w.b, dt, p.mu, p.sMin[1], p.sMax[1]);
  w.t += dt;
  const gap = p.gapRest + w.b.s - w.a.s;
  if (gap <= 0 && w.a.v > w.b.v) {
    // lùi về đúng lúc chạm để hai xe không lồng vào nhau
    const back = -gap / 2;
    w.a.s -= back;
    w.b.s += back;
    const before: [number, number] = [w.a.v, w.b.v];
    [w.a.v, w.b.v] = collide(p.mA, p.mB, w.a.v, w.b.v, p.e);
    w.impact ??= { t: w.t, before, after: [w.a.v, w.b.v] };
  }
}
