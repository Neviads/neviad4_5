/**
 * CHẤT LƯỢNG LƯỚI sau các phép dời đỉnh (weld / bevel / sand): đếm chỗ gấp mép và tam giác dẹt, gỡ tam giác
 * bị lật, và viết một dòng báo cáo để agent biết hình có hỏng không (lõi manifold chỉ báo "kín", không báo gấp).
 *
 *  - gấp mép: cạnh có hai mặt gập quá 150° (mặt đè ngược lên nhau), chỉ tính khi cả hai mặt không dẹt —
 *    tam giác dẹt có pháp tuyến nhiễu, đếm vào thì ra hàng trăm "gấp" giả
 *  - tam giác dẹt: diện tích < 1e-3 × trung vị
 */

import type * as THREE from "three";
import { AssemblyError } from "../core/solve";

export interface Welded {
  pos: Float64Array;
  tri: Uint32Array;
  /** đỉnh gốc i → đỉnh đã hàn map[i] (để ghi lại đúng thứ tự cho lưới có index) */
  map: Int32Array;
  nv: number;
}

/** Hàn đỉnh theo VỊ TRÍ (1e-7 m), giữ bảng ánh xạ để trả lại đúng thứ tự đỉnh của lưới gốc. */
export function weldByPosition(g: THREE.BufferGeometry, label: string): Welded {
  const attr = g.attributes.position;
  if (!attr) throw new AssemblyError(`${label}: hình không có thuộc tính vị trí.`);
  const src = attr.array as ArrayLike<number>;
  const n = attr.count;
  const index = g.index ? g.index.array : null;
  const key = new Map<string, number>();
  const map = new Int32Array(n);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(src[i * 3] * 1e7)},${Math.round(src[i * 3 + 1] * 1e7)},${Math.round(src[i * 3 + 2] * 1e7)}`;
    let j = key.get(k);
    if (j === undefined) {
      j = out.length / 3;
      key.set(k, j);
      out.push(src[i * 3], src[i * 3 + 1], src[i * 3 + 2]);
    }
    map[i] = j;
  }
  const nTri = index ? index.length : n;
  const tri = new Uint32Array(nTri);
  if (index) for (let i = 0; i < nTri; i++) tri[i] = map[index[i] as number];
  else for (let i = 0; i < nTri; i++) tri[i] = map[i];
  return { pos: Float64Array.from(out), tri, map, nv: out.length / 3 };
}

/** Pháp tuyến chưa chuẩn hoá (độ dài = 2 × diện tích) của tam giác t. */
function cross(pos: ArrayLike<number>, tri: ArrayLike<number>, t: number, out: Float64Array, o: number): void {
  const a = tri[t * 3] * 3, b = tri[t * 3 + 1] * 3, c = tri[t * 3 + 2] * 3;
  const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
  const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
  out[o] = uy * vz - uz * vy;
  out[o + 1] = uz * vx - ux * vz;
  out[o + 2] = ux * vy - uy * vx;
}

function crosses(pos: ArrayLike<number>, tri: ArrayLike<number>): { n: Float64Array; area: Float64Array } {
  const T = tri.length / 3;
  const n = new Float64Array(T * 3);
  const area = new Float64Array(T);
  for (let t = 0; t < T; t++) {
    cross(pos, tri, t, n, t * 3);
    area[t] = Math.hypot(n[t * 3], n[t * 3 + 1], n[t * 3 + 2]) / 2;
  }
  return { n, area };
}

export interface MeshStats {
  tris: number;
  /** cạnh chỉ có một mặt */
  open: number;
  folds: number;
  slivers: number;
}

const FOLD_COS = Math.cos((150 * Math.PI) / 180);

export function meshStats(pos: ArrayLike<number>, tri: ArrayLike<number>): MeshStats {
  const T = tri.length / 3;
  const { n, area } = crosses(pos, tri);
  const med = T ? Float64Array.from(area).sort()[T >> 1] : 0;
  let slivers = 0;
  for (let t = 0; t < T; t++) if (area[t] < 1e-3 * med) slivers++;
  const nv = pos.length / 3;
  const faces = new Map<number, number[]>();
  for (let t = 0; t < T; t++) {
    for (let e = 0; e < 3; e++) {
      const a = tri[t * 3 + e], b = tri[t * 3 + ((e + 1) % 3)];
      const k = a < b ? a * nv + b : b * nv + a;
      const l = faces.get(k);
      if (l) l.push(t);
      else faces.set(k, [t]);
    }
  }
  let open = 0, folds = 0;
  for (const l of faces.values()) {
    if (l.length === 1) open++;
    if (l.length !== 2) continue;
    const [s, u] = l;
    if (area[s] < 0.05 * med || area[u] < 0.05 * med) continue;
    const dot = (n[s * 3] * n[u * 3] + n[s * 3 + 1] * n[u * 3 + 1] + n[s * 3 + 2] * n[u * 3 + 2]) / (4 * area[s] * area[u]);
    if (dot < FOLD_COS) folds++;
  }
  return { tris: T, open, folds, slivers };
}

export function geometryStats(g: THREE.BufferGeometry): MeshStats {
  const m = weldByPosition(g, "lưới");
  return meshStats(m.pos, m.tri);
}

/**
 * Gỡ tam giác hỏng do dời đỉnh: tam giác lật so với `ref` (pháp tuyến ngược chiều), dẹt lại dưới 1e-3 diện
 * tích ban đầu, hoặc gập quá 150° với mặt kề (mà ở `ref` không gập). Đỉnh của chúng và một vòng hàng xóm được
 * làm mượt Laplace tại chỗ (kéo hẳn về `ref` thì tạo bậc mới với hàng xóm đã dời); lặp tới khi hết hoặc đủ
 * `maxIter`. `pos` và `ref` cùng thứ tự đỉnh, cùng `tri`. Không có `ref` (lưới đã giản lược, đổi cấu trúc) thì
 * chỉ sửa chỗ gấp mép và tam giác dẹt. `how: "revert"` trả hẳn đỉnh hỏng về `ref` — hợp với phép chỉ dời đỉnh
 * rất ít (sand), vì bậc tạo ra không quá vài phần mười mm. Trả về số tam giác hỏng lúc đầu và còn lại.
 */
export function untangle(
  pos: Float64Array,
  tri: ArrayLike<number>,
  ref?: ArrayLike<number>,
  maxIter = 12,
  how: "smooth" | "revert" = "smooth",
): { bad: number; left: number } {
  const T = tri.length / 3;
  const nv = pos.length / 3;
  const r = crosses(ref ?? pos, tri);
  const medRef = T ? Float64Array.from(r.area).sort()[T >> 1] : 0;
  // cặp mặt kề + đánh dấu cặp đã gập sẵn ở ref (đó là hình gốc, không phải lỗi mới)
  const faces = new Map<number, number[]>();
  const nbr: Set<number>[] = Array.from({ length: nv }, () => new Set<number>());
  for (let t = 0; t < T; t++) {
    for (let e = 0; e < 3; e++) {
      const a = tri[t * 3 + e], b = tri[t * 3 + ((e + 1) % 3)];
      nbr[a].add(b);
      nbr[b].add(a);
      const k = a < b ? a * nv + b : b * nv + a;
      const l = faces.get(k);
      if (l) l.push(t);
      else faces.set(k, [t]);
    }
  }
  const folded = (n: Float64Array, area: Float64Array, s: number, u: number) =>
    area[s] >= 0.05 * medRef && area[u] >= 0.05 * medRef &&
    (n[s * 3] * n[u * 3] + n[s * 3 + 1] * n[u * 3 + 1] + n[s * 3 + 2] * n[u * 3 + 2]) / (4 * area[s] * area[u]) < FOLD_COS;
  const pairs: [number, number][] = [];
  for (const l of faces.values()) if (l.length === 2 && !(ref && folded(r.n, r.area, l[0], l[1]))) pairs.push([l[0], l[1]]);
  const neighbours = nbr.map((s) => [...s]);

  const badTri = new Uint8Array(T);
  const mark = new Uint8Array(nv);
  let bad = -1, left = 0;
  for (let k = 0; k <= maxIter; k++) {
    const c = crosses(pos, tri);
    badTri.fill(0);
    // không có ref: tam giác dẹt (so với trung vị) cũng sửa — giản lược hay để lại vài cái ở mối nối
    for (let t = 0; t < T && !ref; t++) if (c.area[t] < 1e-3 * medRef) badTri[t] = 1;
    for (let t = 0; t < T && ref; t++) {
      if (!(r.area[t] > 0)) continue;
      const dot = c.n[t * 3] * r.n[t * 3] + c.n[t * 3 + 1] * r.n[t * 3 + 1] + c.n[t * 3 + 2] * r.n[t * 3 + 2];
      if (dot <= 0 || c.area[t] < 1e-3 * r.area[t]) badTri[t] = 1;
    }
    for (const [s, u] of pairs) if (folded(c.n, c.area, s, u)) badTri[s] = badTri[u] = 1;
    left = 0;
    for (let t = 0; t < T; t++) left += badTri[t];
    if (bad < 0) bad = left;
    if (!left || k === maxIter) break;
    if (how === "revert" && ref) {
      for (let t = 0; t < T; t++) {
        if (!badTri[t]) continue;
        for (let e = 0; e < 3; e++) {
          const v = tri[t * 3 + e] * 3;
          pos[v] = ref[v];
          pos[v + 1] = ref[v + 1];
          pos[v + 2] = ref[v + 2];
        }
      }
      continue;
    }
    // vùng sửa: đỉnh của tam giác hỏng + một vòng hàng xóm
    mark.fill(0);
    for (let t = 0; t < T; t++) {
      if (!badTri[t]) continue;
      for (let e = 0; e < 3; e++) {
        const v = tri[t * 3 + e];
        mark[v] = 1;
        for (const j of neighbours[v]) if (!mark[j]) mark[j] = 2;
      }
    }
    for (let pass = 0; pass < 2; pass++) {
      const src = Float64Array.from(pos);
      for (let i = 0; i < nv; i++) {
        if (!mark[i]) continue;
        const l = neighbours[i];
        if (!l.length) continue;
        let sx = 0, sy = 0, sz = 0;
        for (const j of l) {
          sx += src[j * 3];
          sy += src[j * 3 + 1];
          sz += src[j * 3 + 2];
        }
        const f = mark[i] === 1 ? 0.6 : 0.3;
        pos[i * 3] += f * (sx / l.length - src[i * 3]);
        pos[i * 3 + 1] += f * (sy / l.length - src[i * 3 + 1]);
        pos[i * 3 + 2] += f * (sz / l.length - src[i * 3 + 2]);
      }
    }
  }
  return { bad, left };
}

/** Dòng báo cáo chất lượng (kèm so với đầu vào nếu có) và cảnh báo khi lưới có chỗ gấp. */
export function qualityLines(s: MeshStats, before?: MeshStats): string[] {
  const out = [
    `lưới: ${s.tris} tam giác, ${s.folds} chỗ gấp mép, ${s.slivers} tam giác dẹt` +
      (before ? ` (đầu vào: ${before.tris} / ${before.folds} / ${before.slivers})` : ""),
  ];
  const newFolds = s.folds - (before?.folds ?? 0);
  if (newFolds > 0) {
    out.push(`cảnh báo: lưới có ${s.folds} chỗ gấp mép (mặt đè ngược lên nhau, nhìn thành vệt đen/rách) — giảm radius/strength hoặc tách mối nối ra xa cạnh sắc`);
  }
  if (s.open) out.push(`cảnh báo: lưới hở ${s.open} cạnh`);
  return out;
}

/** Sửa chỗ gấp mép và tam giác dẹt ngay trên lưới cuối (sau giản lược). Chỉ dời đỉnh, giữ nguyên cấu trúc. Trả về số tam giác đã gỡ. */
export function repairFolds(g: THREE.BufferGeometry): number {
  const m = weldByPosition(g, "lưới");
  const { bad } = untangle(m.pos, m.tri);
  if (!bad) return 0;
  const pa = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < m.map.length; i++) {
    const j = m.map[i];
    pa.setXYZ(i, m.pos[j * 3], m.pos[j * 3 + 1], m.pos[j * 3 + 2]);
  }
  pa.needsUpdate = true;
  return bad;
}
