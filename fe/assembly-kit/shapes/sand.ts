/**
 * MÀI BỀ MẶT — "giấy ráp": làm mượt có TRẦN, để bào lớp gợn cỡ dưới `limit` mà không đổi dáng vật.
 *
 * Thiết kế: docs/assembly-sand-design.md
 *  1. hàn đỉnh theo vị trí (giữ bảng ánh xạ để trả lại đúng vật liệu/UV của lưới gốc)
 *  2. vùng mài: cả vật, hoặc quanh / trừ vùng quanh một hình khác (trọng số mềm ở biên)
 *  3. khoá đỉnh trên cạnh gãy hơn `lock` (miệng ống, mép khoét, cạnh hộp vẫn sắc)
 *  4. Taubin (λ 0,5 / μ −0,53 — giữ thể tích) N lượt, mỗi lượt KẸP |p − p₀| ≤ limit
 *  5. trả lưới + số liệu: độ gợn trước/sau, thể tích trước/sau, số đỉnh chạm trần
 *
 * Khác `weld`/`bevel`: hai op kia SINH vật liệu; sand chỉ DỜI đỉnh. Khác Taubin thường: có trần nên
 * gọi 1 lần hay 5 lần cũng không trôi hình.
 */

import * as THREE from "three";
import type { V3 } from "../core/math";
import { AssemblyError } from "../core/solve";
import { point } from "../parts/_common";
import { type OpResult, enumParam, numParam } from "./ops";
import { type Welded, meshStats, qualityLines, untangle, weldByPosition } from "./quality";
import { type TMesh, meshDistances, neighbors, sizeOf, smoothstep, triGrid } from "./weld";

type Raw = Record<string, unknown>;

/** Vị trí gốc mang theo trên lưới để lần mài sau vẫn kẹp theo cùng một gốc (không trôi). */
type SandOriginCarrier = THREE.BufferGeometry & { sandOrigin?: { pos: Float64Array } };

/** Cạnh biên (chỉ có một mặt) — dùng để biết lưới có kín hay không. */
function boundaryCount(tri: Uint32Array): number {
  const seen = new Map<number, number>();
  const nv = tri.length;
  let n = 0;
  for (let t = 0; t < tri.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = tri[t + e], b = tri[t + ((e + 1) % 3)];
      const k = a < b ? a * nv + b : b * nv + a;
      const c = (seen.get(k) ?? 0) + 1;
      seen.set(k, c);
    }
  }
  for (const c of seen.values()) if (c === 1) n++;
  return n;
}

/** Đỉnh nào nằm trên cạnh gãy hơn `angleDeg` (để khoá, không cho mài). */
function sharpVertexMask(m: Welded, angleDeg: number): Uint8Array {
  const mask = new Uint8Array(m.nv);
  const nTri = m.tri.length / 3;
  const fn = new Float64Array(nTri * 3);
  for (let t = 0; t < nTri; t++) {
    const a = m.tri[t * 3] * 3, b = m.tri[t * 3 + 1] * 3, c = m.tri[t * 3 + 2] * 3;
    const ux = m.pos[b] - m.pos[a], uy = m.pos[b + 1] - m.pos[a + 1], uz = m.pos[b + 2] - m.pos[a + 2];
    const vx = m.pos[c] - m.pos[a], vy = m.pos[c + 1] - m.pos[a + 1], vz = m.pos[c + 2] - m.pos[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    fn[t * 3] = nx / l;
    fn[t * 3 + 1] = ny / l;
    fn[t * 3 + 2] = nz / l;
  }
  const first = new Map<number, number>();
  const nv = m.tri.length;
  for (let t = 0; t < nTri; t++) {
    for (let e = 0; e < 3; e++) {
      const a = m.tri[t * 3 + e], b = m.tri[t * 3 + ((e + 1) % 3)];
      const k = a < b ? a * nv + b : b * nv + a;
      const f = first.get(k);
      if (f === undefined) {
        first.set(k, t);
        continue;
      }
      const dot = fn[f * 3] * fn[t * 3] + fn[f * 3 + 1] * fn[t * 3 + 1] + fn[f * 3 + 2] * fn[t * 3 + 2];
      const ang = (Math.acos(Math.min(1, Math.max(-1, dot))) * 180) / Math.PI;
      if (ang > angleDeg) {
        mask[a] = 1;
        mask[b] = 1;
      }
    }
  }
  return mask;
}

/** Pháp tuyến đỉnh (cộng dồn theo diện tích tam giác) — tính lại mỗi lượt vì đỉnh vừa dời. */
function vertexNormals(pos: Float64Array, tri: Uint32Array, nv: number): Float64Array {
  const n = new Float64Array(nv * 3);
  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t] * 3, b = tri[t + 1] * 3, c = tri[t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    n[a] += nx; n[a + 1] += ny; n[a + 2] += nz;
    n[b] += nx; n[b + 1] += ny; n[b + 2] += nz;
    n[c] += nx; n[c + 1] += ny; n[c + 2] += nz;
  }
  for (let i = 0; i < nv; i++) {
    const l = Math.hypot(n[i * 3], n[i * 3 + 1], n[i * 3 + 2]) || 1;
    n[i * 3] /= l;
    n[i * 3 + 1] /= l;
    n[i * 3 + 2] /= l;
  }
  return n;
}

/**
 * Lưới đều theo ô: với mỗi đỉnh, danh sách đỉnh cách nó ≤ radius và KHÔNG vắt qua cạnh gãy
 * (pháp tuyến hai đỉnh lệch ≤ `normalCut` độ). Lọc theo pháp tuyến là bắt buộc: không có nó,
 * khớp mặt ở gần mép hộp/tấm sẽ "nhìn" sang mặt bên kia và bóp mép — đúng lỗi của bản đầu.
 */
function neighborsWithin(pos: Float64Array, nrm: Float64Array, nv: number, radius: number, normalCut: number): number[][] {
  const inv = 1 / Math.max(radius, 1e-9);
  const P = 100000;
  const key = (cx: number, cy: number, cz: number) => ((cx + 50000) * P + (cy + 50000)) * P + (cz + 50000);
  const grid = new Map<number, number[]>();
  const cosCut = Math.cos((normalCut * Math.PI) / 180);
  for (let i = 0; i < nv; i++) {
    const k = key(Math.floor(pos[i * 3] * inv), Math.floor(pos[i * 3 + 1] * inv), Math.floor(pos[i * 3 + 2] * inv));
    const a = grid.get(k);
    if (a) a.push(i);
    else grid.set(k, [i]);
  }
  const r2 = radius * radius;
  const out: number[][] = new Array(nv);
  for (let i = 0; i < nv; i++) {
    const cx = Math.floor(pos[i * 3] * inv), cy = Math.floor(pos[i * 3 + 1] * inv), cz = Math.floor(pos[i * 3 + 2] * inv);
    const ni = i * 3;
    const list: number[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const a = grid.get(key(cx + dx, cy + dy, cz + dz));
          if (!a) continue;
          for (const j of a) {
            if (j === i) continue;
            const ex = pos[j * 3] - pos[i * 3], ey = pos[j * 3 + 1] - pos[i * 3 + 1], ez = pos[j * 3 + 2] - pos[i * 3 + 2];
            if (ex * ex + ey * ey + ez * ez > r2) continue;
            const nj = j * 3;
            if (nrm[ni] * nrm[nj] + nrm[ni + 1] * nrm[nj + 1] + nrm[ni + 2] * nrm[nj + 2] < cosCut) continue;
            list.push(j);
          }
        }
      }
    }
    out[i] = list;
  }
  return out;
}

/**
 * KHỚP MẶT BẬC 2 cục bộ: dựng khung (t1, t2, n) tại đỉnh rồi khớp
 *   z = a + b·u + c·v + d·u² + e·uv + f·v²   (u, v, z chuẩn hoá theo radius)
 * trả về `a` = đỉnh đang cao/thấp hơn mặt khớp bao nhiêu (mét, dấu theo n).
 *
 * Vì sao KHÔNG lấy trung bình hàng xóm: trên mặt trụ bán kính ρ, trung bình các hàng xóm nằm lọt
 * vào trong ~R²/(4ρ) → mỗi lượt bóp nhỏ ống (đo được 0,009 mm/lượt trên ống Ø120). Mặt bậc 2 khớp
 * ĐÚNG mặt trụ nên a ≈ 0 ở phần ống tròn và chỉ khác 0 ở chỗ có gợn.
 */
function fitHeight(pos: Float64Array, i: number, nrm: Float64Array, list: number[], radius: number): number | null {
  const nx = nrm[i * 3], ny = nrm[i * 3 + 1], nz = nrm[i * 3 + 2];
  let t1x: number, t1y: number, t1z: number;
  if (Math.abs(nx) < 0.9) {
    t1x = 0; t1y = -nz; t1z = ny;
  } else {
    t1x = -nz; t1y = 0; t1z = nx;
  }
  const l1 = Math.hypot(t1x, t1y, t1z) || 1;
  t1x /= l1; t1y /= l1; t1z /= l1;
  const t2x = ny * t1z - nz * t1y, t2y = nz * t1x - nx * t1z, t2z = nx * t1y - ny * t1x;

  const A = new Float64Array(36), b = new Float64Array(6);
  const f = new Float64Array(6);
  const inv = 1 / radius;
  const px = pos[i * 3], py = pos[i * 3 + 1], pz = pos[i * 3 + 2];
  for (const j of list) {
    const dx = pos[j * 3] - px, dy = pos[j * 3 + 1] - py, dz = pos[j * 3 + 2] - pz;
    const u = (dx * t1x + dy * t1y + dz * t1z) * inv;
    const v = (dx * t2x + dy * t2y + dz * t2z) * inv;
    const z = (dx * nx + dy * ny + dz * nz) * inv;
    f[0] = 1; f[1] = u; f[2] = v; f[3] = u * u; f[4] = u * v; f[5] = v * v;
    for (let r = 0; r < 6; r++) {
      b[r] += f[r] * z;
      for (let c = 0; c < 6; c++) A[r * 6 + c] += f[r] * f[c];
    }
  }
  // khử Gauss có chọn trục
  // (thêm "sống" nhỏ vào các cột bậc 0/1/2: lưới thật có vùng hàng xóm dẹt — trụ 128 đoạn có cạnh
  //  vòng 2,9 mm nhưng cạnh dọc 30 mm — ma trận gần suy biến, không có số hạng này thì nghiệm nhảy
  //  loạn và đỉnh bị đẩy sai chiều. Trị số nhỏ nên không ảnh hưởng chỗ dữ liệu đầy đủ.)
  for (let r = 1; r < 6; r++) A[r * 6 + r] += list.length * 1e-3;
  for (let col = 0; col < 6; col++) {
    let piv = col;
    for (let r = col + 1; r < 6; r++) if (Math.abs(A[r * 6 + col]) > Math.abs(A[piv * 6 + col])) piv = r;
    const pv = A[piv * 6 + col];
    if (!Number.isFinite(pv) || Math.abs(pv) < 1e-10) return null;
    if (piv !== col) {
      for (let c = 0; c < 6; c++) {
        const t = A[col * 6 + c];
        A[col * 6 + c] = A[piv * 6 + c];
        A[piv * 6 + c] = t;
      }
      const t = b[col];
      b[col] = b[piv];
      b[piv] = t;
    }
    for (let r = col + 1; r < 6; r++) {
      const k = A[r * 6 + col] / A[col * 6 + col];
      if (k === 0) continue;
      for (let c = col; c < 6; c++) A[r * 6 + c] -= k * A[col * 6 + c];
      b[r] -= k * b[col];
    }
  }
  const x = new Float64Array(6);
  for (let r = 5; r >= 0; r--) {
    let s = b[r];
    for (let c = r + 1; c < 6; c++) s -= A[r * 6 + c] * x[c];
    x[r] = s / A[r * 6 + r];
  }
  if (!Number.isFinite(x[0])) return null;
  return x[0] * radius;
}

/** Thể tích có dấu (chỉ đúng với lưới kín; dùng để báo cáo). */
function volumeOf(pos: Float64Array, tri: Uint32Array): number {
  let v = 0;
  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t] * 3, b = tri[t + 1] * 3, c = tri[t + 2] * 3;
    v +=
      pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1]) -
      pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c]) +
      pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c]);
  }
  return v / 6;
}

/** Trung vị độ dài cạnh — dùng cho `limit`/`reach` tự tính. */
function edgeLengths(m: Welded): number[] {
  const list: number[] = [];
  const nv = m.tri.length;
  const seen = new Set<number>();
  for (let t = 0; t < m.tri.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = m.tri[t + e], b = m.tri[t + ((e + 1) % 3)];
      const k = a < b ? a * nv + b : b * nv + a;
      if (seen.has(k)) continue;
      seen.add(k);
      list.push(Math.hypot(m.pos[a * 3] - m.pos[b * 3], m.pos[a * 3 + 1] - m.pos[b * 3 + 1], m.pos[a * 3 + 2] - m.pos[b * 3 + 2]));
    }
  }
  list.sort((x, y) => x - y);
  return list;
}

export function sand(p: Raw, label: string, inputs: THREE.BufferGeometry[]): OpResult {
  const strength = numParam(p, "strength", label, { def: 0.5, min: 0, max: 1 });
  const lock = numParam(p, "lock", label, { def: 30, min: 0, max: 180 });
  const region = enumParam(p, "region", label, ["all", "near", "keep"] as const, "all");
  const maxTri = Math.round(numParam(p, "maxTriangles", label, { def: 400000, min: 1000, max: 4000000 }));
  if (region !== "all" && inputs.length < 2) {
    throw new AssemblyError(`${label}: region "${region}" cần hình thứ hai — truyền tools: [hình] (vùng mài tính theo hình đó).`);
  }

  const M = weldByPosition(inputs[0], label);
  if (M.tri.length < 3) throw new AssemblyError(`${label}: hình không có tam giác nào để mài.`);

  const edges = edgeLengths(M);
  const med = edges.length ? edges[Math.floor(edges.length / 2)] : 0;
  // cạnh ngắn (phân vị 25 %) — lưới boolean/parametric hay có cạnh dài gấp 10 lần cạnh ngắn,
  // lấy trung vị thì bán kính mài phóng to quá cỡ và ăn cả hình.
  const short = edges.length ? (edges[Math.floor(edges.length * 0.25)] ?? med) : 0;
  const autoLimit = Math.min(0.0005, Math.max(0.00005, 0.05 * med));
  const rLimit = p.limit;
  const limit = typeof rLimit === "number" && Number.isFinite(rLimit) ? rLimit : autoLimit;
  if (!(limit > 0)) throw new AssemblyError(`${label}.limit phải là số > 0 (mét) hoặc bỏ trống để tự tính.`);
  const size = sizeOf(inputs[0]);
  const smallest = Math.min(...size);
  if (limit > 0.25 * smallest) {
    throw new AssemblyError(
      `${label}: limit ${(limit * 1000).toFixed(2)} mm bằng ${((100 * limit) / smallest).toFixed(0)} % kích thước nhỏ nhất (${(smallest * 1000).toFixed(1)} mm) — đây là sửa hình chứ không phải mài. Giảm limit.`,
    );
  }
  const autoReach = Math.max(6 * limit, 3 * med);
  const rReach = p.reach;
  const reach = typeof rReach === "number" && Number.isFinite(rReach) ? rReach : autoReach;
  // bán kính "miếng giấy ráp": gợn ngắn hơn CỠ NÀY thì bị bào, sóng dài hơn thì giữ
  const rRadius = p.radius;
  const radius = typeof rRadius === "number" && Number.isFinite(rRadius) ? rRadius : Math.max(3 * limit, 4 * short);
  // góc mép: hàng xóm lệch pháp tuyến quá góc này thì không tính vào khớp mặt (đừng vắt qua cạnh gãy)
  const normalCut = Math.min(80, Math.max(45, lock));
  const passes = (() => {
    const r = p.passes;
    if (typeof r === "number" && Number.isFinite(r)) return Math.max(1, Math.min(200, Math.round(r)));
    // khớp mặt bậc 2 hội tụ nhanh (mỗi lượt đã lấy trung bình cả vùng bán kính `radius`), 4 lượt là đủ
    return Math.max(1, Math.min(200, Math.round(1 + 5 * strength)));
  })();

  const info: string[] = [];
  const closedBefore = boundaryCount(M.tri) === 0;
  const volBefore = volumeOf(M.pos, M.tri);
  const nrm0 = vertexNormals(M.pos, M.tri, M.nv);

  // ── vùng mài ──
  const w = new Float64Array(M.nv).fill(1);
  if (region !== "all") {
    const other: TMesh = (() => {
      const o = weldByPosition(inputs[1], `${label} (vùng)`);
      return { pos: o.pos, tri: o.tri };
    })();
    const grid = triGrid(other, reach);
    const d = meshDistances(other, grid, M.pos);
    let inRegion = 0;
    for (let i = 0; i < M.nv; i++) {
      const f = smoothstep((reach - d[i]) / reach);
      w[i] = region === "near" ? f : 1 - f;
      if (w[i] > 0) inRegion++;
    }
    if (!inRegion) {
      throw new AssemblyError(
        `Vùng mài rỗng: hình thứ hai không nằm trong ${(reach * 1000).toFixed(1)} mm của "${label}". Tăng reach hoặc bỏ region.`,
      );
    }
    info.push(`vùng ${region}, reach ${(reach * 1000).toFixed(1)} mm: ${inRegion}/${M.nv} đỉnh được mài`);
  }

  // ── khoá cạnh sắc ──
  let locked = 0;
  if (lock < 180) {
    const mask = sharpVertexMask(M, lock);
    for (let i = 0; i < M.nv; i++) {
      if (mask[i]) {
        w[i] = 0;
        locked++;
      }
    }
  }
  let movable = 0;
  for (let i = 0; i < M.nv; i++) {
    if (w[i] > 0) movable++;
  }
  if (!movable) {
    throw new AssemblyError(
      `${label}: không còn đỉnh nào để mài — khoá cạnh > ${lock}° đã khoá ${locked} đỉnh. Hạ lock (ví dụ 60) hoặc dùng lock: 180 nếu muốn mài cả cạnh sắc.`,
    );
  }

  // ── khớp mặt bậc 2 + kẹp trần ──
  // `p0` = vị trí GỐC để kẹp. Nếu hình này đã từng bị mài (gọi sand chồng lên chính nó) thì vẫn kẹp
  // theo gốc cũ, để gọi 2 lần / 5 lần cũng không trôi quá `limit` so với hình ban đầu.
  const prevOrigin = (inputs[0] as SandOriginCarrier).sandOrigin;
  const usable =
    prevOrigin && prevOrigin.pos.length === M.pos.length &&
    prevOrigin.pos.every((v, i) => Math.abs(v - M.pos[i]) <= Math.max(20 * limit, 0.01));
  const p0 = usable ? Float64Array.from(prevOrigin!.pos) : Float64Array.from(M.pos);
  const pos = Float64Array.from(M.pos);
  // hàng xóm trong bán kính `radius` (lấy mẫu thưa còn ≤ 64 điểm: khớp 6 ẩn số, 64 điểm là quá đủ)
  const fitList = neighborsWithin(M.pos, nrm0, M.nv, radius, normalCut).map((list) => {
    if (list.length <= 64) return list;
    const stride = Math.ceil(list.length / 64);
    const out: number[] = [];
    for (let i = 0; i < list.length; i += stride) out.push(list[i]);
    return out;
  });
  let clamped = 0;
  let used = 0;
  let maxNormalMove = 0;
  for (let k = 0; k < passes; k++) {
    const nrm = vertexNormals(pos, M.tri, M.nv);
    clamped = 0;
    let maxMove = 0;
    for (let i = 0; i < M.nv; i++) {
      const wi = w[i];
      if (wi <= 0) continue;
      const list = fitList[i];
      if (list.length < 8) continue;
      const a = fitHeight(pos, i, nrm, list, radius);
      if (a === null) continue;
      // chỉ đẩy theo PHÁP TUYẾN — dời dọc mặt không làm đổi hình (đó là lỗi của bản Taubin đầu)
      let move = a * wi * 0.8;
      if (Math.abs(move) > limit) move = move > 0 ? limit : -limit;
      if (!Number.isFinite(move) || move === 0) continue;
      pos[i * 3] += move * nrm[i * 3];
      pos[i * 3 + 1] += move * nrm[i * 3 + 1];
      pos[i * 3 + 2] += move * nrm[i * 3 + 2];
      const am = Math.abs(move);
      if (am > maxMove) maxMove = am;
    }
    // kẹp |p − p0| ≤ limit
    for (let i = 0; i < M.nv; i++) {
      const dx = pos[i * 3] - p0[i * 3], dy = pos[i * 3 + 1] - p0[i * 3 + 1], dz = pos[i * 3 + 2] - p0[i * 3 + 2];
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > limit * limit) {
        const s = limit / Math.sqrt(d2);
        pos[i * 3] = p0[i * 3] + dx * s;
        pos[i * 3 + 1] = p0[i * 3 + 1] + dy * s;
        pos[i * 3 + 2] = p0[i * 3 + 2] + dz * s;
        clamped++;
      }
    }
    used = k + 1;
    if (maxMove > maxNormalMove) maxNormalMove = maxMove;
    if (maxMove < limit * 0.02) break; // đã bão hoà
  }

  // đẩy theo pháp tuyến ở chỗ cong gắt có thể lật, gấp hoặc ép dẹt tam giác nhỏ: trả các đỉnh đó về hình đầu
  // vào (mài chỉ dời ≤ limit, nên bỏ qua vài đỉnh không để lại bậc thấy được)
  const untangled = untangle(pos, M.tri, M.pos, 40, "revert").bad;

  // độ dời lớn nhất thực tế + trung vị/p95 để báo cáo (dời dọc mặt không đổi hình nên phải
  // báo độ dời THEO PHÁP TUYẾN, không phải tổng)
  let maxDisp = 0;
  const disps: number[] = [];
  for (let i = 0; i < M.nv; i++) {
    const dx = pos[i * 3] - p0[i * 3], dy = pos[i * 3 + 1] - p0[i * 3 + 1], dz = pos[i * 3 + 2] - p0[i * 3 + 2];
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d > maxDisp) maxDisp = d;
    if (d > 1e-9) disps.push(d);
  }
  disps.sort((a, b) => a - b);
  const medDisp = disps.length ? disps[Math.floor(disps.length * 0.5)] : 0;
  const p95Disp = disps.length ? disps[Math.floor(disps.length * 0.95)] : 0;
  const touched = disps.filter((d) => d > 0.1 * limit).length;

  // ── xuất lưới ──
  let geometry: THREE.BufferGeometry;
  if (inputs[0].index) {
    // giữ nguyên index + UV + mọi thuộc tính: chỉ ghi lại vị trí theo bảng ánh xạ
    const g = inputs[0].clone();
    const pa = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < M.map.length; i++) {
      const j = M.map[i];
      pa.setXYZ(i, pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]);
    }
    pa.needsUpdate = true;
    g.computeVertexNormals();
    geometry = g;
  } else {
    // lưới không index (kết quả boolean): xuất lại có index để pháp tuyến liền mạch
    geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(Float32Array.from(pos), 3));
    geometry.setIndex(new THREE.BufferAttribute(Uint32Array.from(M.tri), 1));
    geometry.computeVertexNormals();
  }

  (geometry as SandOriginCarrier).sandOrigin = { pos: Float64Array.from(p0) };

  const tri = (geometry.index?.count ?? geometry.attributes.position.count) / 3;
  const volAfter = volumeOf(pos, M.tri);
  const dv = volBefore > 1e-12 ? (volAfter / volBefore - 1) * 100 : 0;

  info.unshift(
    `mài ${used}/${passes} lượt, bán kính ${(radius * 1000).toFixed(1)} mm, trần ${(limit * 1000).toFixed(2)} mm${typeof rLimit === "number" ? "" : " (tự tính)"}, vùng ${region}` +
      `${locked ? `, khoá ${locked} đỉnh trên cạnh > ${lock}°` : ""}`,
  );
  info.push(
    `dời theo pháp tuyến: trung vị ${(medDisp * 1000).toFixed(3)} mm, p95 ${(p95Disp * 1000).toFixed(3)} mm, sâu nhất ${(maxNormalMove * 1000).toFixed(3)} mm` +
      ` — ${touched}/${movable} đỉnh dời > ${(0.1 * limit * 1000).toFixed(3)} mm, ${clamped} đỉnh chạm trần (nhiều nhất ${(maxDisp * 1000).toFixed(3)} mm), ${tri} tam giác`,
  );
  if (closedBefore) info.push(`thể tích ${+volBefore.toPrecision(6)} → ${+volAfter.toPrecision(6)} m³ (${dv >= 0 ? "+" : ""}${dv.toFixed(2)} %)`);
  else info.push(`hình hở sẵn (không kiểm thể tích)`);

  const boundary = boundaryCount(M.tri);
  if (closedBefore && !boundary && Math.abs(dv) > 2) info.push(`cảnh báo: thể tích đổi ${dv.toFixed(1)} % — mài đang ăn vào cấu trúc, giảm limit hoặc strength`);
  if (movable && clamped > 0.05 * movable && used === passes) {
    info.push(
      `cảnh báo: ${clamped} đỉnh chạm trần (${((100 * clamped) / movable).toFixed(0)} %) — lưới lệch hơn trần ở những chỗ đó, mài thêm với cùng limit cũng không đi tiếp; tăng limit nếu muốn phẳng hơn (hoặc giảm strength nếu muốn nhẹ tay)`,
    );
  }
  if (tri > maxTri) info.push(`cảnh báo: ${tri} tam giác vượt ${maxTri}`);
  if (untangled) info.push(`trả ${untangled} tam giác hỏng (lật, ép dẹt hoặc gấp mép) về hình đầu vào`);
  info.push(...qualityLines(meshStats(pos, M.tri), meshStats(M.pos, M.tri)));

  const anchors: OpResult["anchors"] = {};
  geometry.computeBoundingBox();
  const c = geometry.boundingBox!.getCenter(new THREE.Vector3());
  anchors.mai = point([c.x, c.y, c.z] as V3, [0, 1, 0] as V3, "tâm hình sau khi mài");

  return { geometry, anchors, info };
}
