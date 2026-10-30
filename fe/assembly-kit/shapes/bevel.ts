/**
 * BO / ĐẮP MỐI NỐI (bevel): bo đúng MỘT mối nối giữa hai hình, biết cạnh nào lồi (gọt) cạnh nào lõm (đắp).
 *
 * Thiết kế: docs/assembly-bevel-design.md
 *  - Mối nối của hai khối gộp (union) LUÔN là góc LÕM: hai mặt gặp nhau tạo rãnh. Vì vậy mặc định của
 *    op khi có `other` là `add` — "đắp đất nặn" dọc mối, đúng thứ `weld` không làm được (weld chỉ miết).
 *  - `cut` = đúng ruột "lăn bi" của `roundEdges`, nhưng chỉ trên các cạnh nằm trong dải mối nối.
 *  - Không có `other` thì op chỉ là bí danh của `roundEdges` (bo mọi cạnh gãy hơn `angle`).
 *
 * Thứ tự bắt buộc với ống rỗng: dựng ĐẶC → union → bevel → mới khoét lòng.
 */

import * as THREE from "three";
import type { V3 } from "../core/math";
import { AssemblyError } from "../core/solve";
import { point } from "../parts/_common";
import { fromManifoldIndexed, toManifold } from "./kernel";
import { type OpResult, enumParam, numParam } from "./ops";
import { type IMesh, rollEdgesToArc, roundEdges, sharpInfo } from "./ops-solid";
import { geometryStats, qualityLines, repairFolds, untangle } from "./quality";
import { type TMesh, cellKey, leanMesh, meshDistances, meshOf, neighbors, relax, sizeOf, smoothstep, triGrid } from "./weld";

type Raw = Record<string, unknown>;

/** Pháp tuyến đỉnh (trung bình có trọng số diện tích) — để đẩy dải mối nối ra ngoài khi đắp. */
function vertexNormals(m: TMesh): Float64Array {
  const n = new Float64Array(m.pos.length);
  for (let t = 0; t < m.tri.length; t += 3) {
    const ia = m.tri[t] * 3, ib = m.tri[t + 1] * 3, ic = m.tri[t + 2] * 3;
    const abx = m.pos[ib] - m.pos[ia], aby = m.pos[ib + 1] - m.pos[ia + 1], abz = m.pos[ib + 2] - m.pos[ia + 2];
    const acx = m.pos[ic] - m.pos[ia], acy = m.pos[ic + 1] - m.pos[ia + 1], acz = m.pos[ic + 2] - m.pos[ia + 2];
    const nx = aby * acz - abz * acy, ny = abz * acx - abx * acz, nz = abx * acy - aby * acx;
    n[ia] += nx; n[ia + 1] += ny; n[ia + 2] += nz;
    n[ib] += nx; n[ib + 1] += ny; n[ib + 2] += nz;
    n[ic] += nx; n[ic + 1] += ny; n[ic + 2] += nz;
  }
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i], n[i + 1], n[i + 2]);
    if (l > 1e-15) { n[i] /= l; n[i + 1] /= l; n[i + 2] /= l; }
  }
  return n;
}

/** Các vòng của dải mối nối: gom đỉnh của dải thành từng cụm liên thông, kèm độ dài (để chọn `loop`). */
function seamLoops(m: TMesh, seam: Set<number>): { ids: number[]; length: number }[] {
  const parent = new Map<number, number>();
  const find = (x: number): number => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    return r;
  };
  for (const i of seam) parent.set(i, i);
  const len = new Map<number, number>();
  const tri = m.tri;
  for (let t = 0; t < tri.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = tri[t + e], b = tri[t + ((e + 1) % 3)];
      if (!seam.has(a) || !seam.has(b)) continue;
      const ra = find(a), rb = find(b);
      if (ra !== rb) parent.set(ra, rb);
      const d = Math.hypot(m.pos[a * 3] - m.pos[b * 3], m.pos[a * 3 + 1] - m.pos[b * 3 + 1], m.pos[a * 3 + 2] - m.pos[b * 3 + 2]);
      len.set(ra, (len.get(ra) ?? 0) + d / 2);
    }
  }
  const groups = new Map<number, number[]>();
  for (const i of seam) {
    const r = find(i);
    const g = groups.get(r);
    if (g) g.push(i);
    else groups.set(r, [i]);
  }
  const out = [...groups.entries()].map(([r, ids]) => ({ ids, length: len.get(r) ?? 0 }));
  out.sort((a, b) => b.length - a.length);
  return out;
}

/** Trọng số theo khoảng cách tới dải mối nối: 1 ở sát mối, 0 ở xa hơn `reach`. */
function bandWeights(m: TMesh, seam: number[], reach: number): Float64Array {
  const w = new Float64Array(m.pos.length / 3);
  const cell = Math.max(reach, 1e-5);
  const map = new Map<string, number[]>();
  for (const i of seam) {
    const k = cellKey(Math.floor(m.pos[i * 3] / cell), Math.floor(m.pos[i * 3 + 1] / cell), Math.floor(m.pos[i * 3 + 2] / cell));
    const l = map.get(k);
    if (l) l.push(i);
    else map.set(k, [i]);
  }
  for (let i = 0; i < w.length; i++) {
    const cx = Math.floor(m.pos[i * 3] / cell), cy = Math.floor(m.pos[i * 3 + 1] / cell), cz = Math.floor(m.pos[i * 3 + 2] / cell);
    let best = Infinity;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const l = map.get(cellKey(cx + dx, cy + dy, cz + dz));
      if (!l) continue;
      for (const j of l) {
        const d = Math.hypot(m.pos[i * 3] - m.pos[j * 3], m.pos[i * 3 + 1] - m.pos[j * 3 + 1], m.pos[i * 3 + 2] - m.pos[j * 3 + 2]);
        if (d < best) best = d;
      }
    }
    w[i] = best >= reach ? 0 : smoothstep(1 - best / reach);
  }
  return w;
}

export function bevel(p: Raw, label: string, inputs: THREE.BufferGeometry[]): OpResult {
  if (inputs.length < 1 || inputs.length > 2) throw new AssemblyError(`${label}: bevel cần 1 hình (input) hoặc 2 hình (input + tools[0]).`);
  const hasOther = inputs.length === 2;
  const modeArg = enumParam(p, "mode", label, ["cut", "add", "auto"] as const, "auto");
  // có hình thứ hai thì mối nối là góc lõm (rãnh) → mặc định ĐẮP; chỉ một hình thì bo cạnh như round_edges
  const mode = modeArg === "auto" ? (hasOther ? "add" : "cut") : modeArg;
  const profile = numParam(p, "profile", label, { def: 0.5, min: 0, max: 1 });
  const strength = numParam(p, "strength", label, { def: 0.6, min: 0, max: 1 });
  const angle = numParam(p, "angle", label, { def: 40, min: 1, max: 179 });
  const loopPick = Math.round(numParam(p, "loop", label, { def: 0, min: 0, max: 32 }));
  const maxTri = Math.round(numParam(p, "maxTriangles", label, { def: 300000, min: 1000, max: 3000000 }));

  if (!hasOther) {
    if (mode === "add") throw new AssemblyError(`${label}: mode "add" cần hình thứ hai (tools: [hìnhB]) — phải có mối nối hai khối mới đắp được. Nếu chỉ muốn bo cạnh thì bỏ mode (mặc định "cut").`);
    // một hình: đúng việc của round_edges, chỉ khác tên
    return roundEdges({ ...p, angle, maxTriangles: maxTri }, label, inputs[0]);
  }

  const thick = Math.min(...sizeOf(inputs[0]), ...sizeOf(inputs[1]));
  const autoR = Math.min(0.03, Math.max(0.003, 0.35 * thick));
  const rGiven = p.radius;
  const radius = typeof rGiven === "number" && Number.isFinite(rGiven) ? rGiven : autoR;
  if (!(radius > 0)) throw new AssemblyError(`${label}.radius phải là số > 0 (hoặc bỏ trống để tự tính).`);
  const detailGiven = p.detail;
  const detail = typeof detailGiven === "number" && detailGiven > 0 ? detailGiven : Math.max(0.0015, radius / 4);
  const info: string[] = [];
  if (radius > 0.4 * thick) info.push(`cảnh báo: bán kính ${(radius * 1000).toFixed(1)} mm > 0,4 × bề dày ${(thick * 1000).toFixed(1)} mm — nếu là vỏ mỏng thì hãy bo trên khối ĐẶC rồi mới khoét lòng`);

  const A = meshOf(inputs[0], `${label} (a)`);
  const B = meshOf(inputs[1], `${label} (b)`);

  // 1. gộp hai khối
  const mA = toManifold(inputs[0], `${label} (a)`);
  const mB = toManifold(inputs[1], `${label} (b)`);
  const mu = mA.add(mB);
  mA.delete();
  mB.delete();
  if (mu.isEmpty()) throw new AssemblyError(`${label}: hai hình không chồng nhau nên gộp ra rỗng — không có mối nối để bo.`);
  const volBefore = mu.volume();
  const triU = mu.numTri();

  // 2. chia mịn trong cả lưới để dải mối nối đủ đỉnh
  let mU = mu;
  if (typeof mu.refineToLength === "function" && triU * 6 <= maxTri * 3) {
    try {
      const fine = mu.refineToLength(detail);
      if (!fine.isEmpty() && fine.numTri() <= Math.max(maxTri, triU * 4)) {
        mu.delete();
        mU = fine;
        info.push(`chia mịn ${(detail * 1000).toFixed(1)} mm: ${triU} → ${mU.numTri()} tam giác`);
      } else fine.delete();
    } catch {
      /* chia mịn là tuỳ chọn */
    }
  }
  const U = meshOf(fromManifoldIndexed(mU), `${label} (gộp)`);

  // 3. dải mối nối: đỉnh nằm sát CẢ HAI mặt ban đầu
  const eps = Math.max(radius, detail * 2);
  const dA = meshDistances(A, triGrid(A, eps), U.pos);
  const dB = meshDistances(B, triGrid(B, eps), U.pos);
  const seam: number[] = [];
  for (let i = 0; i < dA.length; i++) if (dA[i] < eps && dB[i] < eps) seam.push(i);
  if (!seam.length) {
    throw new AssemblyError(
      `${label}: không tìm được dải mối nối giữa input và hình thứ hai — hai hình chỉ chạm một đường hoặc không chạm. ` +
        `Đẩy chúng cắm vào nhau ≥ ${((radius + 0.005) * 1000).toFixed(0)} mm (part_update / offset) rồi gọi lại.`,
    );
  }
  const loops = seamLoops(U, new Set(seam));
  const pick = Math.min(loopPick, loops.length - 1);
  if (loops.length > 1) {
    info.push(`mối nối có ${loops.length} vòng (${loops.map((l) => (l.length * 1000).toFixed(0)).join(" / ")} mm) — đang dùng vòng ${pick}`);
  }
  const seamUse = loopPick > 0 && loops[pick] ? loops[pick].ids : seam;

  let pos: Float64Array;
  let moved = 0;

  if (mode === "add") {
    // 4a. ĐẮP: đẩy dải ra ngoài theo pháp tuyến (đất nặn), rồi miết Taubin để hoà vào thân
    const amp = radius * 1.2 * profile;
    const nrm = vertexNormals(U);
    const w0 = bandWeights(U, seamUse, radius);
    const w = Float64Array.from(w0);
    const nbr = neighbors(U.tri, w.length);
    // làm mượt TRƯỜNG TRỌNG SỐ: mật độ đỉnh dọc mối không đều, đẩy thẳng theo w thì gờ bị gợn sóng.
    // Sau khi mượt phải GIỮ ĐÚNG vùng đỡ ban đầu (nhân mặt nạ w0 > 0), nếu không đỉnh ngoài dải
    // (mép miệng ống, mặt vuông góc) bị đẩy lệch pháp tuyến và làm thủng/gấp lưới.
    for (let k = 0; k < 20; k++) {
      const src = Float64Array.from(w);
      for (let i = 0; i < w.length; i++) {
        const l = nbr[i];
        if (!l.length) continue;
        let s = 0;
        for (const j of l) s += src[j];
        w[i] = 0.5 * src[i] + 0.5 * (s / l.length);
      }
    }
    for (let i = 0; i < w.length; i++) if (!(w0[i] > 0)) w[i] = 0;
    // miết trên dải RỘNG GẤP ĐÔI: nếu chỉ miết trong dải hẹp thì mép dải bị ghim tại chỗ,
    // tạo gờ gợn quanh mối (đúng vết lởm chởm ở bản đầu)
    const wSmooth = bandWeights(U, seamUse, radius * 2);
    pos = Float64Array.from(U.pos);
    for (let i = 0; i < w.length; i++) {
      const wi = w[i];
      if (wi <= 1e-4) continue;
      moved++;
      pos[i * 3] += nrm[i * 3] * amp * wi;
      pos[i * 3 + 1] += nrm[i * 3 + 1] * amp * wi;
      pos[i * 3 + 2] += nrm[i * 3 + 2] * amp * wi;
    }
    const rounds = Math.max(0, Math.round(40 + 80 * strength));
    for (let k = 0; k < rounds; k++) {
      relax(pos, nbr, wSmooth, 0.5);
      relax(pos, nbr, wSmooth, -0.53);
    }
    info.push(`đắp: ${moved} đỉnh trong dải, nhô ${(amp * 1000).toFixed(1)} mm, ${rounds} vòng Taubin`);
  } else {
    // 4b. GỌT: đúng thuật toán lăn bi, chỉ trên các cạnh gãy nằm trong dải mối nối
    const mI: IMesh = { pos: Array.from(U.pos), tri: Array.from(U.tri) };
    const all = sharpInfo(mI, angle);
    const mids = new Float64Array(all.length * 3);
    all.forEach((e, i) => {
      mids[i * 3] = (e.a.x + e.b.x) / 2;
      mids[i * 3 + 1] = (e.a.y + e.b.y) / 2;
      mids[i * 3 + 2] = (e.a.z + e.b.z) / 2;
    });
    const edA = all.length ? meshDistances(A, triGrid(A, eps), mids) : new Float64Array(0);
    const edB = all.length ? meshDistances(B, triGrid(B, eps), mids) : new Float64Array(0);
    const keep = all.filter((_, i) => edA[i] < eps && edB[i] < eps);
    if (!keep.length) {
      pos = Float64Array.from(U.pos);
      info.push(`không có cạnh gãy nào nằm trên mối nối (hai mặt gần như cùng mặt phẳng) — giữ nguyên hình`);
    } else {
      pos = Float64Array.from(rollEdgesToArc(mI, keep, radius, angle, detail));
      moved = keep.length;
      info.push(`gọt: ${keep.length}/${all.length} cạnh gãy nằm trên mối nối`);
    }
  }

  // đẩy dải ra rồi miết (hoặc lăn bi) trên lưới chia mịn có thể lật tam giác nhỏ ở mép sắc: kéo về lưới gộp
  const fixed = untangle(pos, U.tri, U.pos).bad;
  if (fixed) info.push(`gỡ ${fixed} tam giác hỏng (lật, ép dẹt hoặc gấp mép) bằng làm mượt tại chỗ`);

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(Float32Array.from(pos), 3));
  g.setIndex(new THREE.BufferAttribute(Uint32Array.from(U.tri), 1));

  let mOut = toManifold(g, `${label} (sau khi bevel)`);
  const volAfter = mOut.volume();
  mOut = leanMesh(mOut, detail, maxTri, info);
  const tris = mOut.numTri();
  // pháp tuyến mượt toàn phần: toCreasedNormals tách nét ở các cạnh lưới lởm chởm do chia mịn
  // (đúng vệt răng cưa thấy trên ống ở bản đầu) — ở đây dải bo đã mượt nên không cần crease
  const geometry = fromManifoldIndexed(mOut);
  const refolded = repairFolds(geometry);
  if (refolded) info.push(`sửa ${refolded} tam giác gấp mép hoặc dẹt sau khi gom lưới`);
  geometry.computeVertexNormals();
  const status = typeof mOut.status === "function" ? mOut.status() : 0;
  mOut.delete();
  if (mU !== mu) mU.delete();

  // 5. điểm neo ở tâm mối nối
  const chosen = loops[pick] ?? { ids: seamUse, length: 0 };
  const centre = new THREE.Vector3();
  for (const i of chosen.ids) centre.add(new THREE.Vector3(U.pos[i * 3], U.pos[i * 3 + 1], U.pos[i * 3 + 2]));
  centre.multiplyScalar(1 / Math.max(1, chosen.ids.length));
  geometry.computeBoundingBox();
  const c0 = geometry.boundingBox!.getCenter(new THREE.Vector3());
  const dir = centre.clone().sub(c0);
  if (dir.lengthSq() < 1e-12) dir.set(0, 1, 0);
  dir.normalize();

  const delta = volBefore > 0 ? (volAfter / volBefore - 1) * 100 : 0;
  info.unshift(
    `bevel (${mode}) bán kính ${(radius * 1000).toFixed(1)} mm${typeof rGiven === "number" ? "" : " (tự tính)"}, ` +
      `${loops.length} vòng, dải ${seam.length} đỉnh, lưới ${triU} → ${tris} tam giác, ` +
      `thể tích ${+volBefore.toPrecision(6)} → ${+volAfter.toPrecision(6)} m³ (${delta >= 0 ? "+" : ""}${delta.toFixed(2)} %)` +
      (status ? `, lõi báo trạng thái ${status}` : ""),
  );
  if (mode === "add" && delta < 0.2) info.push(`cảnh báo: đắp mà thể tích gần như không đổi (${delta.toFixed(2)} %) — thử tăng radius hoặc profile`);
  if (mode === "add" && delta > 40) info.push(`cảnh báo: thể tích tăng ${delta.toFixed(0)} % — bán kính quá lớn, hình bị phình`);
  if (tris > maxTri) info.push(`cảnh báo: ${tris} tam giác vẫn vượt giới hạn ${maxTri}`);
  info.push(...qualityLines(geometryStats(geometry)));

  return {
    geometry,
    anchors: { seam: point(centre.toArray() as V3, dir.toArray() as V3, "tâm mối nối (chỗ vừa bo)") },
    info,
  };
}
