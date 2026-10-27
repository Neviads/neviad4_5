/**
 * Đường 2D dùng chung cho lathe / extrude / sweep: kiểm tra, bo góc (chèn cung), tự cắt, diện tích có dấu.
 * Không phụ thuộc three.
 */

import { AssemblyError } from "../core/solve";
import type { Path2D } from "../core/types";

export type P2 = [number, number];

const sub2 = (a: P2, b: P2): P2 => [a[0] - b[0], a[1] - b[1]];
const len2 = (a: P2) => Math.hypot(a[0], a[1]);

export function checkPath(path: Path2D, label: string, minPts = 2): void {
  if (!path || !Array.isArray(path.pts)) throw new AssemblyError(`${label}: cần {pts: [[x, y], …]}.`);
  if (path.pts.length < minPts) throw new AssemblyError(`${label}: cần ít nhất ${minPts} điểm, đang có ${path.pts.length}.`);
  path.pts.forEach((p, i) => {
    if (!Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite)) throw new AssemblyError(`${label}.pts[${i}] phải là [số, số].`);
  });
  if (path.round && (!Array.isArray(path.round) || path.round.length !== path.pts.length || !path.round.every((r) => Number.isFinite(r) && r >= 0))) {
    throw new AssemblyError(`${label}.round phải là mảng ${path.pts.length} số ≥ 0 (bán kính bo tại từng điểm, 0 = giữ góc).`);
  }
  for (let i = 1; i < path.pts.length; i++) {
    if (len2(sub2(path.pts[i], path.pts[i - 1])) < 1e-9) throw new AssemblyError(`${label}: điểm ${i - 1} và ${i} trùng nhau.`);
  }
}

/** Thay mỗi góc có bán kính bo bằng một cung tròn tiếp xúc hai cạnh (bán kính tự thu lại nếu cạnh quá ngắn). */
export function roundCorners(path: Path2D, segPerQuarter = 6): P2[] {
  const pts = path.pts as P2[], n = pts.length, closed = !!path.closed;
  if (!path.round?.some((r) => r > 0)) return pts.map((p) => [p[0], p[1]]);
  const out: P2[] = [];
  for (let i = 0; i < n; i++) {
    const r = path.round[i] ?? 0;
    const hasPrev = closed || i > 0, hasNext = closed || i < n - 1;
    if (r <= 0 || !hasPrev || !hasNext) {
      out.push([pts[i][0], pts[i][1]]);
      continue;
    }
    const p = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const da = sub2(a, p), db = sub2(b, p), la = len2(da), lb = len2(db);
    const ua: P2 = [da[0] / la, da[1] / la], ub: P2 = [db[0] / lb, db[1] / lb];
    const cos = Math.max(-1, Math.min(1, ua[0] * ub[0] + ua[1] * ub[1]));
    const theta = Math.acos(cos); // góc trong tại p
    if (theta < 1e-3 || Math.PI - theta < 1e-3) {
      out.push([p[0], p[1]]);
      continue;
    }
    // khoảng từ đỉnh tới điểm tiếp xúc; không vượt nửa cạnh để hai góc kề không chồng nhau
    const t = Math.min(r / Math.tan(theta / 2), la / 2, lb / 2);
    const rr = t * Math.tan(theta / 2);
    const ta: P2 = [p[0] + ua[0] * t, p[1] + ua[1] * t], tb: P2 = [p[0] + ub[0] * t, p[1] + ub[1] * t];
    const bis: P2 = [ua[0] + ub[0], ua[1] + ub[1]], lbis = len2(bis);
    const dc = rr / Math.sin(theta / 2);
    const c: P2 = [p[0] + (bis[0] / lbis) * dc, p[1] + (bis[1] / lbis) * dc];
    const a0 = Math.atan2(ta[1] - c[1], ta[0] - c[0]), a1 = Math.atan2(tb[1] - c[1], tb[0] - c[0]);
    let sweep = a1 - a0;
    while (sweep > Math.PI) sweep -= 2 * Math.PI;
    while (sweep < -Math.PI) sweep += 2 * Math.PI;
    const steps = Math.max(2, Math.ceil((Math.abs(sweep) / (Math.PI / 2)) * segPerQuarter));
    for (let k = 0; k <= steps; k++) {
      const ang = a0 + (sweep * k) / steps;
      out.push([c[0] + rr * Math.cos(ang), c[1] + rr * Math.sin(ang)]);
    }
  }
  return out;
}

export function signedArea(pts: P2[]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}

const cross2 = (o: P2, a: P2, b: P2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

function segmentsCross(a: P2, b: P2, c: P2, d: P2): boolean {
  const d1 = cross2(c, d, a), d2 = cross2(c, d, b), d3 = cross2(a, b, c), d4 = cross2(a, b, d);
  return ((d1 > 1e-12 && d2 < -1e-12) || (d1 < -1e-12 && d2 > 1e-12)) && ((d3 > 1e-12 && d4 < -1e-12) || (d3 < -1e-12 && d4 > 1e-12));
}

/** Trả về cặp đoạn đầu tiên cắt nhau (chỉ số đoạn), hoặc null. */
export function selfIntersection(pts: P2[], closed: boolean): [number, number] | null {
  const n = pts.length, segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    for (let j = i + 2; j < segs; j++) {
      if (closed && i === 0 && j === segs - 1) continue;
      if (segmentsCross(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n])) return [i, j];
    }
  }
  return null;
}

/** Bo góc rồi kiểm tra tự cắt; đường kín được đưa về chiều ngược kim đồng hồ. */
export function preparePath(path: Path2D, label: string, opts: { closed?: boolean; minPts?: number } = {}): P2[] {
  checkPath(path, label, opts.minPts ?? (path.closed || opts.closed ? 3 : 2));
  const closed = opts.closed ?? !!path.closed;
  let pts = roundCorners({ ...path, closed });
  const hit = selfIntersection(pts, closed);
  if (hit) throw new AssemblyError(`${label}: đường tự cắt (đoạn ${hit[0]} cắt đoạn ${hit[1]} sau khi bo góc). Kiểm tra thứ tự điểm hoặc giảm bán kính bo.`);
  if (closed && signedArea(pts) < 0) pts = pts.reverse();
  return pts;
}
