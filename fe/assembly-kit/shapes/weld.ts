/**
 * HÀN MỐI NỐI (weld): gộp hai khối kín rồi làm mượt một dải quanh đường giao, để góc lõm — chỗ hai mặt
 * chạm nhau gần song song mà `roundEdges` bỏ qua vì không đủ góc gãy — chảy thành cung tròn.
 *
 * Thiết kế: docs/assembly-weld-design.md
 *  1. union hai khối (manifold)
 *  2. tìm đỉnh nằm sát CẢ HAI mặt ban đầu  → đó là dải mối nối (không cần trích đường giao)
 *  3. trọng số mềm theo khoảng cách tới dải
 *  4. làm mượt Taubin (giữ thể tích) chỉ trên các đỉnh có trọng số
 *  5. trả lưới sạch + số liệu để agent tự đánh giá
 */

import * as THREE from "three";
import { mergeVertices, toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { V3 } from "../core/math";
import { AssemblyError } from "../core/solve";
import { point } from "../parts/_common";
import { fromManifoldIndexed, toManifold } from "./kernel";
import { type OpResult, numParam } from "./ops";

type Raw = Record<string, unknown>;

export interface TMesh {
  pos: Float64Array;
  tri: Uint32Array;
}

export interface Grid {
  cell: number;
  map: Map<string, number[]>;
}

export const cellKey = (x: number, y: number, z: number) => `${x},${y},${z}`;
export const smoothstep = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** Lưới chỉ có vị trí, đã hàn đỉnh trùng (để tính hàng xóm và khoảng cách). */
export function meshOf(g: THREE.BufferGeometry, label: string): TMesh {
  const base = new THREE.BufferGeometry();
  base.setAttribute("position", g.attributes.position.clone());
  if (g.index) base.setIndex(g.index.clone());
  const weldedGeo = mergeVertices(base.index ? base.toNonIndexed() : base, 1e-6);
  const idx = weldedGeo.index;
  if (!idx) throw new AssemblyError(`${label}: lưới không có chỉ số sau khi hàn đỉnh.`);
  return {
    pos: Float64Array.from(weldedGeo.attributes.position.array as ArrayLike<number>),
    tri: Uint32Array.from(idx.array as ArrayLike<number>),
  };
}

/** Lưới băm tam giác: mỗi tam giác ghi vào mọi ô mà hộp bao nở `reach` của nó đi qua. */
export function triGrid(m: TMesh, reach: number): Grid {
  const cell = Math.max(reach, 1e-4);
  const map = new Map<string, number[]>();
  const n = m.tri.length / 3;
  const lo = [0, 0, 0];
  const hi = [0, 0, 0];
  for (let t = 0; t < n; t++) {
    const ia = m.tri[t * 3] * 3, ib = m.tri[t * 3 + 1] * 3, ic = m.tri[t * 3 + 2] * 3;
    for (let k = 0; k < 3; k++) {
      const a = m.pos[ia + k], b = m.pos[ib + k], c = m.pos[ic + k];
      lo[k] = Math.floor((Math.min(a, b, c) - reach) / cell);
      hi[k] = Math.floor((Math.max(a, b, c) + reach) / cell);
    }
    for (let x = lo[0]; x <= hi[0]; x++) {
      for (let y = lo[1]; y <= hi[1]; y++) {
        for (let z = lo[2]; z <= hi[2]; z++) {
          const k = cellKey(x, y, z);
          const l = map.get(k);
          if (l) l.push(t);
          else map.set(k, [t]);
        }
      }
    }
  }
  return { cell, map };
}

/** Khoảng cách điểm → tam giác (thuật toán Ericson, điểm gần nhất trên tam giác). */
function distPointTri(
  px: number, py: number, pz: number,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
): number {
  const abx = bx - ax, aby = by - ay, abz = bz - az;
  const acx = cx - ax, acy = cy - ay, acz = cz - az;
  const apx = px - ax, apy = py - ay, apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz;
  const d2 = acx * apx + acy * apy + acz * apz;
  if (d1 <= 0 && d2 <= 0) return Math.hypot(apx, apy, apz);
  const bpx = px - bx, bpy = py - by, bpz = pz - bz;
  const d3 = abx * bpx + aby * bpy + abz * bpz;
  const d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) return Math.hypot(bpx, bpy, bpz);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    return Math.hypot(px - (ax + abx * v), py - (ay + aby * v), pz - (az + abz * v));
  }
  const cpx = px - cx, cpy = py - cy, cpz = pz - cz;
  const d5 = abx * cpx + aby * cpy + abz * cpz;
  const d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) return Math.hypot(cpx, cpy, cpz);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    return Math.hypot(px - (ax + acx * w), py - (ay + acy * w), pz - (az + acz * w));
  }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    return Math.hypot(px - (bx + (cx - bx) * w), py - (by + (cy - by) * w), pz - (bz + (cz - bz) * w));
  }
  const denom = 1 / (va + vb + vc);
  const v = vb * denom, w = vc * denom;
  return Math.hypot(px - (ax + abx * v + acx * w), py - (ay + aby * v + acy * w), pz - (az + abz * v + acz * w));
}

/** Khoảng cách từ mỗi điểm tới lưới (Infinity nếu ô không có tam giác nào trong `reach`). */
export function meshDistances(m: TMesh, grid: Grid, pts: Float64Array): Float64Array {
  const n = pts.length / 3;
  const out = new Float64Array(n).fill(Infinity);
  for (let i = 0; i < n; i++) {
    const px = pts[i * 3], py = pts[i * 3 + 1], pz = pts[i * 3 + 2];
    const cands = grid.map.get(cellKey(Math.floor(px / grid.cell), Math.floor(py / grid.cell), Math.floor(pz / grid.cell)));
    if (!cands) continue;
    let best = Infinity;
    for (const t of cands) {
      const ia = m.tri[t * 3] * 3, ib = m.tri[t * 3 + 1] * 3, ic = m.tri[t * 3 + 2] * 3;
      const d = distPointTri(
        px, py, pz,
        m.pos[ia], m.pos[ia + 1], m.pos[ia + 2],
        m.pos[ib], m.pos[ib + 1], m.pos[ib + 2],
        m.pos[ic], m.pos[ic + 1], m.pos[ic + 2],
      );
      if (d < best) best = d;
    }
    out[i] = best;
  }
  return out;
}

/** Hàng xóm theo cạnh tam giác. */
export function neighbors(tri: Uint32Array, nv: number): number[][] {
  const sets: Set<number>[] = Array.from({ length: nv }, () => new Set<number>());
  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t], b = tri[t + 1], c = tri[t + 2];
    sets[a].add(b); sets[a].add(c);
    sets[b].add(a); sets[b].add(c);
    sets[c].add(a); sets[c].add(b);
  }
  return sets.map((s) => [...s]);
}

/** Một lượt làm mượt có trọng số: chỉ đỉnh có w > 0 dịch, đỉnh ngoài dải đứng yên tuyệt đối. */
export function relax(pos: Float64Array, nbr: number[][], w: Float64Array, factor: number): void {
  const src = Float64Array.from(pos);
  for (let i = 0; i < w.length; i++) {
    const wi = w[i];
    if (wi <= 0) continue;
    const list = nbr[i];
    if (!list.length) continue;
    let sx = 0, sy = 0, sz = 0;
    for (const j of list) {
      sx += src[j * 3]; sy += src[j * 3 + 1]; sz += src[j * 3 + 2];
    }
    const inv = 1 / list.length;
    pos[i * 3] = src[i * 3] + factor * wi * (sx * inv - src[i * 3]);
    pos[i * 3 + 1] = src[i * 3 + 1] + factor * wi * (sy * inv - src[i * 3 + 1]);
    pos[i * 3 + 2] = src[i * 3 + 2] + factor * wi * (sz * inv - src[i * 3 + 2]);
  }
}

export const sizeOf = (g: THREE.BufferGeometry): V3 => {
  const c = g.clone();
  c.computeBoundingBox();
  const s = c.boundingBox!.getSize(new THREE.Vector3());
  return [s.x, s.y, s.z];
};

/** Khoảng cách nhỏ nhất giữa hai lưới (chỉ dùng cho thông điệp lỗi; lấy mẫu để nhanh). */
function roughGap(a: TMesh, b: TMesh, reach: number): number {
  const grid = triGrid(a, reach * 4);
  const pts = b.pos;
  const step = Math.max(1, Math.floor(pts.length / 3 / 4000)) * 3;
  let best = Infinity;
  const n = pts.length / 3;
  for (let i = 0; i < n; i += step) {
    const cands = grid.map.get(cellKey(Math.floor(pts[i * 3] / grid.cell), Math.floor(pts[i * 3 + 1] / grid.cell), Math.floor(pts[i * 3 + 2] / grid.cell)));
    if (!cands) continue;
    for (const t of cands) {
      const ia = a.tri[t * 3] * 3, ib = a.tri[t * 3 + 1] * 3, ic = a.tri[t * 3 + 2] * 3;
      const d = distPointTri(
        pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2],
        a.pos[ia], a.pos[ia + 1], a.pos[ia + 2],
        a.pos[ib], a.pos[ib + 1], a.pos[ib + 2],
        a.pos[ic], a.pos[ic + 1], a.pos[ic + 2],
      );
      if (d < best) best = d;
    }
  }
  return best;
}

export function weld(p: Raw, label: string, inputs: THREE.BufferGeometry[]): OpResult {
  if (inputs.length !== 2) throw new AssemblyError(`${label}: weld cần đúng 2 hình: input (a) và tools[0] (b).`);
  const strength = numParam(p, "strength", label, { def: 0.6, min: 0, max: 1 });
  const maxTri = Math.round(numParam(p, "maxTriangles", label, { def: 200000, min: 1000 }));
  const info: string[] = [];

  const A = meshOf(inputs[0], `${label} (a)`);
  const B = meshOf(inputs[1], `${label} (b)`);
  const thickA = Math.min(...sizeOf(inputs[0]));
  const thickB = Math.min(...sizeOf(inputs[1]));
  const autoRadius = Math.min(0.03, Math.max(0.004, 0.35 * Math.min(thickA, thickB)));
  const radiusGiven = p.radius;
  const radius = typeof radiusGiven === "number" && Number.isFinite(radiusGiven) ? radiusGiven : autoRadius;
  if (!(radius > 0)) throw new AssemblyError(`${label}.radius phải là số > 0 (hoặc bỏ trống để tự tính).`);
  const minThick = Math.min(thickA, thickB);
  if (radius > 0.4 * minThick) {
    info.push(`cảnh báo: bán kính ${(radius * 1000).toFixed(1)} mm > 0,4 × bề dày ${(minThick * 1000).toFixed(1)} mm — chỗ nối có thể bị thắt`);
  }

  // 1. gộp hai khối
  const ma = toManifold(inputs[0], `${label} (a)`);
  const mb = toManifold(inputs[1], `${label} (b)`);
  const mu = ma.add(mb);
  ma.delete();
  mb.delete();
  if (mu.isEmpty()) throw new AssemblyError(`${label}: hai hình không chồng nhau nên gộp ra rỗng.`);
  const volBefore = mu.volume();
  const triUnion = mu.numTri();

  // 2. chia mịn trong cả lưới (nếu cần) để dải mối nối đủ đỉnh mà uốn
  const detailGiven = p.detail;
  const detail = typeof detailGiven === "number" && detailGiven > 0 ? detailGiven : Math.max(0.006, radius / 3);
  let mU = mu;
  if (typeof mu.refineToLength === "function" && triUnion * 6 <= maxTri * 3) {
    try {
      const fine = mu.refineToLength(detail);
      if (!fine.isEmpty() && fine.numTri() <= Math.max(maxTri, triUnion * 4)) {
        mU = fine;
        info.push(`chia mịn ${detail * 1000} mm: ${triUnion} → ${fine.numTri()} tam giác`);
      } else fine.delete();
    } catch {
      /* chia mịn là tuỳ chọn: hỏng thì làm trên lưới gộp */
    }
  }
  const U = meshOf(fromManifoldIndexed(mU), `${label} (gộp)`);
  if (mU !== mu) mU.delete();
  mu.delete();

  // 3. dải mối nối: đỉnh nằm sát cả hai mặt ban đầu
  const gA = triGrid(A, radius);
  const gB = triGrid(B, radius);
  const dA = meshDistances(A, gA, U.pos);
  const dB = meshDistances(B, gB, U.pos);
  const eps = radius * 0.4;
  const seam: number[] = [];
  for (let i = 0; i < dA.length; i++) if (dA[i] < eps && dB[i] < eps) seam.push(i);
  if (!seam.length) {
    const gap = roughGap(A, B, Math.max(radius * 4, 0.02));
    if (!Number.isFinite(gap) || gap > Math.max(radius * 4, 0.02)) {
      throw new AssemblyError(`${label}: hai hình không chạm nhau (cách > ${((Math.max(radius * 4, 0.02)) * 1000).toFixed(0)} mm) — đẩy b vào a rồi gọi lại.`);
    }
    throw new AssemblyError(`${label}: hai hình chỉ chạm ở một đường, không có vật liệu để hàn (khe ${(gap * 1000).toFixed(1)} mm). Đẩy b vào sâu a thêm ≥ ${((radius + 0.005) * 1000).toFixed(0)} mm.`);
  }

  // 4. trọng số mềm theo khoảng cách tới dải
  const w = new Float64Array(U.pos.length / 3);
  {
    const cell = Math.max(radius, 1e-4);
    const map = new Map<string, number[]>();
    for (const i of seam) {
      const k = cellKey(Math.floor(U.pos[i * 3] / cell), Math.floor(U.pos[i * 3 + 1] / cell), Math.floor(U.pos[i * 3 + 2] / cell));
      const l = map.get(k);
      if (l) l.push(i);
      else map.set(k, [i]);
    }
    for (let i = 0; i < w.length; i++) {
      const cx = Math.floor(U.pos[i * 3] / cell), cy = Math.floor(U.pos[i * 3 + 1] / cell), cz = Math.floor(U.pos[i * 3 + 2] / cell);
      let best = Infinity;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const l = map.get(cellKey(cx + dx, cy + dy, cz + dz));
            if (!l) continue;
            for (const j of l) {
              const d = Math.hypot(U.pos[i * 3] - U.pos[j * 3], U.pos[i * 3 + 1] - U.pos[j * 3 + 1], U.pos[i * 3 + 2] - U.pos[j * 3 + 2]);
              if (d < best) best = d;
            }
          }
        }
      }
      w[i] = best >= radius ? 0 : smoothstep(1 - best / radius);
    }
  }

  // 5. làm mượt Taubin: λ (làm mượt) rồi μ (bù thể tích) — chỉ trên dải
  const nbr = neighbors(U.tri, w.length);
  const pos = Float64Array.from(U.pos);
  const rounds = Math.max(0, Math.round(20 + 60 * strength));
  for (let k = 0; k < rounds; k++) {
    relax(pos, nbr, w, 0.5);
    relax(pos, nbr, w, -0.53);
  }

  const smoothed = new THREE.BufferGeometry();
  smoothed.setAttribute("position", new THREE.BufferAttribute(Float32Array.from(pos), 3));
  smoothed.setIndex(new THREE.BufferAttribute(Uint32Array.from(U.tri), 1));

  let mOut = toManifold(smoothed, `${label} (sau khi hàn)`);
  const volAfter = mOut.volume();
  let tris = mOut.numTri();
  if (tris > maxTri && typeof mOut.simplify === "function") {
    const before = tris;
    const lean = mOut.simplify(detail * 0.4);
    if (!lean.isEmpty()) {
      mOut.delete();
      mOut = lean;
      tris = mOut.numTri();
      info.push(`giản lược ${before} → ${tris} tam giác (giới hạn ${maxTri})`);
    }
  }
  const geometry = toCreasedNormals(fromManifoldIndexed(mOut), (30 * Math.PI) / 180);
  const status = typeof mOut.status === "function" ? mOut.status() : 0;
  mOut.delete();

  // 6. điểm neo ở tâm mối hàn
  const centre = new THREE.Vector3();
  for (const i of seam) centre.add(new THREE.Vector3(U.pos[i * 3], U.pos[i * 3 + 1], U.pos[i * 3 + 2]));
  centre.multiplyScalar(1 / seam.length);
  geometry.computeBoundingBox();
  const c0 = geometry.boundingBox!.getCenter(new THREE.Vector3());
  const dir = centre.clone().sub(c0);
  if (dir.lengthSq() < 1e-12) dir.set(0, 1, 0);
  dir.normalize();

  const grown = volBefore > 0 ? (volAfter / volBefore - 1) * 100 : 0;
  info.unshift(
    `hàn 2 hình: bán kính ${(radius * 1000).toFixed(1)} mm${typeof radiusGiven === "number" ? "" : " (tự tính)"}, ` +
      `dải ${seam.length} đỉnh, ${rounds} vòng Taubin, lưới ${triUnion} → ${tris} tam giác, ` +
      `thể tích ${+volBefore.toPrecision(6)} → ${+volAfter.toPrecision(6)} m³ (${grown >= 0 ? "+" : ""}${grown.toFixed(1)} %)` +
      (status ? `, lõi báo trạng thái ${status}` : ""),
  );
  if (grown > 25) info.push(`cảnh báo: thể tích tăng ${grown.toFixed(0)} % — bán kính quá lớn, hình bị phình`);
  if (tris > maxTri) info.push(`cảnh báo: ${tris} tam giác vẫn vượt giới hạn ${maxTri}`);

  return {
    geometry,
    anchors: { seam: point(centre.toArray() as V3, dir.toArray() as V3, "tâm mối hàn (giữa dải đã làm mượt)") },
    info,
  };
}
