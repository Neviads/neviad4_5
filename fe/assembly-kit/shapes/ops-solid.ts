/**
 * Các phép cho thân vỏ (docs/car-toolkit-design.md, nhóm khó):
 * - loft: nối mượt nhiều mặt cắt ngang khác dáng (thân xe);
 * - boolean: cộng / trừ / giao bằng lõi manifold (khoét hốc bánh, ô kính);
 * - roundEdges: bo cạnh sắc trên lưới bất kỳ (chia mịn quanh cạnh rồi làm mượt Taubin trong dải bán kính r);
 * - groove: khắc rãnh dọc một đường nằm trên mặt (khe cửa, khe capo);
 * - splitRegion: tách một vùng của mặt thành tấm có độ dày, ôm đúng mặt gốc (kính).
 */

import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { V3 } from "../core/math";
import { AssemblyError } from "../core/solve";
import type { Path2D } from "../core/types";
import { point } from "../parts/_common";
import { fromManifold, fromManifoldIndexed, toManifold } from "./kernel";
import { type OpResult, enumParam, numParam, sweep } from "./ops";
import { type P2, preparePath, signedArea } from "./path2d";

type Raw = Record<string, unknown>;

// ───────── tiện ích lưới ─────────

/** Lưới có index, chỉ vị trí, đỉnh trùng được hàn. */
function welded(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const p = new THREE.BufferGeometry();
  p.setAttribute("position", g.attributes.position.clone());
  if (g.index) p.setIndex(g.index.clone());
  return mergeVertices(p.index ? p.toNonIndexed() : p, 1e-7);
}

function signedVolume(pos: ArrayLike<number>, idx: ArrayLike<number>): number {
  let v = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    v += pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1]) - pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c]) + pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c]);
  }
  return v / 6;
}

// ───────── loft ─────────

/** Lấy mẫu lại một vòng kín thành m điểm cách đều theo độ dài cung, bắt đầu ở đỉnh nóc (y lớn nhất, gần tâm z nhất). */
function resampleLoop(pts: P2[], m: number): P2[] {
  const zc = (Math.max(...pts.map((p) => p[0])) + Math.min(...pts.map((p) => p[0]))) / 2;
  let s = 0;
  pts.forEach((p, i) => {
    if (p[1] - 1e-3 * Math.abs(p[0] - zc) > pts[s][1] - 1e-3 * Math.abs(pts[s][0] - zc)) s = i;
  });
  const loop = [...pts.slice(s), ...pts.slice(0, s), pts[s]];
  const cum = [0];
  for (let i = 1; i < loop.length; i++) cum.push(cum[i - 1] + Math.hypot(loop[i][0] - loop[i - 1][0], loop[i][1] - loop[i - 1][1]));
  const total = cum[cum.length - 1], out: P2[] = [];
  let j = 0;
  for (let k = 0; k < m; k++) {
    const d = (k / m) * total;
    while (j < cum.length - 2 && cum[j + 1] < d) j++;
    const t = (d - cum[j]) / Math.max(1e-12, cum[j + 1] - cum[j]);
    out.push([loop[j][0] + (loop[j + 1][0] - loop[j][0]) * t, loop[j][1] + (loop[j + 1][1] - loop[j][1]) * t]);
  }
  return out;
}

export function loft(p: Raw, label: string): OpResult {
  const sections = p.sections as { x: number; profile: Path2D }[];
  if (!Array.isArray(sections) || sections.length < 2) throw new AssemblyError(`${label}.sections cần ít nhất 2 mặt cắt {x, profile}.`);
  const symmetric = (p.symmetric ?? false) as boolean;
  const M = Math.round(numParam(p, "points", label, { def: 64, min: 8, max: 512 }) / 2) * 2;
  const S = Math.round(numParam(p, "samples", label, { def: 10, min: 1, max: 60 }));
  const caps = enumParam(p, "caps", label, ["round", "flat", "open"] as const, "round");
  sections.forEach((s, i) => {
    if (typeof s?.x !== "number") throw new AssemblyError(`${label}.sections[${i}].x phải là số.`);
    if (i && s.x <= sections[i - 1].x) throw new AssemblyError(`${label}.sections: x phải tăng dần (mặt cắt ${i} có x = ${s.x} ≤ ${sections[i - 1].x}).`);
  });

  // mỗi mặt cắt: bo góc, (đối xứng thì ghép nửa còn lại), lấy mẫu lại M điểm
  const loops = sections.map((s, i) => {
    const lab = `${label}.sections[${i}].profile`;
    let path: Path2D = s.profile;
    if (symmetric) {
      const half = s.profile.pts;
      if (!half?.length || half.length < 2) throw new AssemblyError(`${lab}: cần nửa biên dạng [[z, y], …] (z ≥ 0) đi từ tâm đáy lên tâm nóc.`);
      if (Math.abs(half[0][0]) > 1e-6 || Math.abs(half[half.length - 1][0]) > 1e-6) throw new AssemblyError(`${lab}: với symmetric, điểm đầu và cuối phải nằm trên trục z = 0 (tâm đáy, tâm nóc).`);
      if (half.some((q) => q[0] < -1e-9)) throw new AssemblyError(`${lab}: với symmetric, mọi z phải ≥ 0.`);
      const r = s.profile.round ?? half.map(() => 0);
      const mid = half.slice(1, -1);
      path = { pts: [...half, ...mid.map(([z, y]) => [-z, y] as [number, number]).reverse()], round: [...r, ...r.slice(1, -1).reverse()], closed: true };
    }
    const pts = preparePath({ ...path, closed: true }, lab, { closed: true });
    return resampleLoop(pts, M);
  });

  // nội suy Catmull-Rom đồng nhất: cùng tham số cho mọi chỉ số điểm nên mỗi vòng trung gian nằm trên một mặt x = const
  const n = sections.length, rings: THREE.Vector3[][] = [];
  const curves = Array.from({ length: M }, (_, k) => new THREE.CatmullRomCurve3(loops.map((l, i) => new THREE.Vector3(sections[i].x, l[k][1], l[k][0])), false, "catmullrom", 0.5));
  const R = (n - 1) * S;
  for (let j = 0; j <= R; j++) rings.push(curves.map((c) => c.getPoint(j / R)));

  const centroid = (ring: THREE.Vector3[]) => ring.reduce((a, q) => a.add(q), new THREE.Vector3()).multiplyScalar(1 / ring.length);
  const endInfo = (ring: THREE.Vector3[]) => {
    const c = centroid(ring);
    const w = Math.max(...ring.map((q) => q.z)) - Math.min(...ring.map((q) => q.z)), h = Math.max(...ring.map((q) => q.y)) - Math.min(...ring.map((q) => q.y));
    return { c, size: Math.min(w, h) };
  };
  const capLen = (size: number) => numParam(p, "capLength", label, { def: size * 0.18, min: 0, max: 10 });
  const head: THREE.Vector3[][] = [], tail: THREE.Vector3[][] = [];
  let noseApex: THREE.Vector3 | null = null, tailApex: THREE.Vector3 | null = null;
  if (caps === "round") {
    const K = 6;
    for (const [end, dir, out] of [[rings[0], -1, head], [rings[R], 1, tail]] as const) {
      const { c, size } = endInfo(end), L = capLen(size);
      for (let q = 1; q < K; q++) {
        const th = (q / K) * (Math.PI / 2), s = Math.cos(th), dx = L * Math.sin(th) * dir;
        out.push(end.map((pt) => new THREE.Vector3(pt.x + dx, c.y + (pt.y - c.y) * s, c.z + (pt.z - c.z) * s)));
      }
      const apex = new THREE.Vector3(c.x + L * dir, c.y, c.z);
      if (dir < 0) noseApex = apex;
      else tailApex = apex;
    }
  }
  const all = [...head.reverse(), ...rings, ...tail];

  // lưới: mỗi vòng M + 1 đỉnh (lặp đỉnh đầu ở đường nối UV)
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  all.forEach((ring) => {
    for (let k = 0; k <= M; k++) {
      const q = ring[k % M];
      pos.push(q.x, q.y, q.z);
      uv.push(k / M, q.x);
    }
  });
  for (let j = 0; j < all.length - 1; j++) for (let k = 0; k < M; k++) {
    const a = j * (M + 1) + k, b = a + M + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const addFan = (ringIdx: number, apex: THREE.Vector3, flip: boolean) => {
    const ai = pos.length / 3;
    pos.push(apex.x, apex.y, apex.z);
    uv.push(0.5, apex.x);
    for (let k = 0; k < M; k++) {
      const a = ringIdx * (M + 1) + k;
      if (flip) idx.push(ai, a + 1, a);
      else idx.push(ai, a, a + 1);
    }
  };
  const addFlat = (ringIdx: number, flip: boolean) => {
    const ring = all[ringIdx].map((q) => new THREE.Vector2(q.z, q.y));
    for (const t of THREE.ShapeUtils.triangulateShape(ring, [])) {
      const [a, b, c] = t.map((k) => ringIdx * (M + 1) + k);
      if (flip) idx.push(a, c, b);
      else idx.push(a, b, c);
    }
  };
  if (caps === "round") {
    addFan(0, noseApex!, false);
    addFan(all.length - 1, tailApex!, true);
  } else if (caps === "flat") {
    addFlat(0, false);
    addFlat(all.length - 1, true);
  }
  // hướng mặt ra ngoài: thể tích có dấu phải dương
  if (caps !== "open" && signedVolume(pos, idx) < 0) for (let t = 0; t < idx.length; t += 3) [idx[t + 1], idx[t + 2]] = [idx[t + 2], idx[t + 1]];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(idx);
  geometry.computeVertexNormals();

  // báo cáo kích thước từng mặt cắt và cảnh báo đổi dáng gắt
  const info: string[] = [`loft ${n} mặt cắt × ${M} điểm, ${S} vòng mỗi đoạn, đầu ${caps}${symmetric ? ", đối xứng qua z = 0" : ""}`];
  const areas = loops.map((l) => Math.abs(signedArea(l)));
  loops.forEach((l, i) => {
    const w = Math.max(...l.map((q) => q[0])) - Math.min(...l.map((q) => q[0])), ys = l.map((q) => q[1]);
    info.push(`  x = ${sections[i].x}: rộng ${+w.toFixed(4)}, y ${+Math.min(...ys).toFixed(4)} → ${+Math.max(...ys).toFixed(4)}`);
    if (i && Math.abs(areas[i] - areas[i - 1]) / Math.max(areas[i], areas[i - 1]) > 0.6) info.push(`  ⚠ mặt cắt ${i - 1} → ${i} đổi diện tích ${Math.round((100 * Math.abs(areas[i] - areas[i - 1])) / Math.max(areas[i], areas[i - 1]))}%: dáng có thể gãy, thêm mặt cắt ở giữa`);
  });
  const anchors: OpResult["anchors"] = {};
  loops.forEach((l, i) => {
    const cz = l.reduce((a, q) => a + q[0], 0) / M, cy = l.reduce((a, q) => a + q[1], 0) / M;
    anchors[`s${i}`] = point([sections[i].x, cy, cz], [1, 0, 0], `tâm mặt cắt ${i} (x = ${sections[i].x})`);
  });
  const c0 = endInfo(rings[0]).c, c1 = endInfo(rings[R]).c;
  anchors.nose = point((noseApex ?? c0).toArray() as V3, [-1, 0, 0], "đầu −x của loft");
  anchors.tail = point((tailApex ?? c1).toArray() as V3, [1, 0, 0], "đầu +x của loft");
  return { geometry, anchors, info };
}

// ───────── boolean ─────────

export function booleanOp(p: Raw, label: string, inputs: THREE.BufferGeometry[]): OpResult {
  const op = enumParam(p, "op", label, ["union", "subtract", "intersect"] as const, "subtract");
  if (inputs.length < 2) throw new AssemblyError(`${label}: cần input và ít nhất một hình trong tools.`);
  let m = toManifold(inputs[0], `${label} (input)`);
  const before = m.volume();
  for (let i = 1; i < inputs.length; i++) {
    const t = toManifold(inputs[i], `${label} (tools[${i - 1}])`);
    const next = op === "union" ? m.add(t) : op === "subtract" ? m.subtract(t) : m.intersect(t);
    m.delete();
    t.delete();
    m = next;
  }
  if (m.isEmpty()) throw new AssemblyError(`${label}: kết quả ${op} rỗng (các hình không chồng nhau hoặc bị trừ hết).`);
  const after = m.volume();
  const geometry = fromManifold(m);
  m.delete();
  return { geometry, anchors: {}, info: [`${op} ${inputs.length - 1} hình: thể tích ${+before.toPrecision(8)} → ${+after.toPrecision(8)} m³`] };
}

// ───────── bo cạnh ─────────

interface IMesh {
  pos: number[];
  tri: number[];
}

function faceNormal(m: IMesh, t: number): THREE.Vector3 {
  const v = (i: number) => new THREE.Vector3(m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2]);
  const a = v(m.tri[t * 3]), b = v(m.tri[t * 3 + 1]), c = v(m.tri[t * 3 + 2]);
  return b.sub(a).cross(c.sub(a)).normalize();
}

const ekey = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`);

interface SharpEdge {
  a: THREE.Vector3;
  b: THREE.Vector3;
  n1: THREE.Vector3;
  n2: THREE.Vector3;
  /** điểm trong mặt 2 (để biết cạnh lồi hay lõm) */
  c2: THREE.Vector3;
}

/** Cạnh sắc kèm pháp tuyến hai mặt kề. */
function sharpInfo(m: IMesh, angleDeg: number): SharpEdge[] {
  const map = new Map<string, number[]>();
  for (let t = 0; t < m.tri.length / 3; t++) for (let e = 0; e < 3; e++) {
    const k = ekey(m.tri[t * 3 + e], m.tri[t * 3 + ((e + 1) % 3)]);
    const l = map.get(k);
    if (l) l.push(t);
    else map.set(k, [t]);
  }
  const v = (i: number) => new THREE.Vector3(m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2]);
  const cos = Math.cos((angleDeg * Math.PI) / 180), out: SharpEdge[] = [];
  for (const [k, fs] of map) {
    if (fs.length !== 2) continue;
    const n1 = faceNormal(m, fs[0]), n2 = faceNormal(m, fs[1]);
    if (n1.dot(n2) >= cos) continue;
    const [a, b] = k.split("_").map(Number);
    const t2 = fs[1] * 3, c2 = v(m.tri[t2]).add(v(m.tri[t2 + 1])).add(v(m.tri[t2 + 2])).multiplyScalar(1 / 3);
    out.push({ a: v(a), b: v(b), n1, n2, c2 });
  }
  return out;
}

/** Cạnh sắc: cạnh có đúng hai mặt kề, góc giữa hai pháp tuyến lớn hơn ngưỡng (bỏ qua mặt nhỏ hơn minArea: mảnh vụn của boolean). */
function sharpEdges(m: IMesh, angleDeg: number, minArea = 0): [number, number][] {
  const map = new Map<string, number[]>();
  for (let t = 0; t < m.tri.length / 3; t++) for (let e = 0; e < 3; e++) {
    const k = ekey(m.tri[t * 3 + e], m.tri[t * 3 + ((e + 1) % 3)]);
    const l = map.get(k);
    if (l) l.push(t);
    else map.set(k, [t]);
  }
  const cos = Math.cos((angleDeg * Math.PI) / 180), out: [number, number][] = [];
  for (const [k, fs] of map) {
    if (fs.length !== 2) continue;
    if (minArea && (faceArea(m, fs[0] * 3) < minArea || faceArea(m, fs[1] * 3) < minArea)) continue;
    if (faceNormal(m, fs[0]).dot(faceNormal(m, fs[1])) < cos) out.push(k.split("_").map(Number) as [number, number]);
  }
  return out;
}

function faceArea(m: IMesh, t: number): number {
  const v = (i: number) => new THREE.Vector3(m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2]);
  const a = v(m.tri[t]), b = v(m.tri[t + 1]), c = v(m.tri[t + 2]);
  return b.sub(a).cross(c.sub(a)).length() / 2;
}

/** Khoảng cách từ mỗi đỉnh tới đoạn cạnh sắc gần nhất (chỉ tính trong `reach`, ngoài đó = Infinity), dùng lưới băm. */
function distanceToSegments(m: IMesh, segs: [number[], number[]][], reach: number): Float64Array {
  const cell = reach, grid = new Map<string, number[]>();
  segs.forEach(([pa, pb], s) => {
    const lo = pa.map((v, i) => Math.floor((Math.min(v, pb[i]) - reach) / cell)), hi = pa.map((v, i) => Math.floor((Math.max(v, pb[i]) + reach) / cell));
    for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) {
      const k = `${x},${y},${z}`;
      const l = grid.get(k);
      if (l) l.push(s);
      else grid.set(k, [s]);
    }
  });
  const nv = m.pos.length / 3, d = new Float64Array(nv).fill(Infinity);
  for (let i = 0; i < nv; i++) {
    const q = [m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2]], cands = grid.get(q.map((v) => Math.floor(v / cell)).join(","));
    if (!cands) continue;
    for (const s of cands) {
      const [pa, pb] = segs[s];
      const ab = pb.map((v, k) => v - pa[k]), aq = q.map((v, k) => v - pa[k]);
      const t = Math.max(0, Math.min(1, (ab[0] * aq[0] + ab[1] * aq[1] + ab[2] * aq[2]) / Math.max(1e-18, ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2)));
      const dd = Math.hypot(aq[0] - ab[0] * t, aq[1] - ab[1] * t, aq[2] - ab[2] * t);
      if (dd < d[i]) d[i] = dd;
    }
  }
  return d;
}

export function roundEdges(p: Raw, label: string, input: THREE.BufferGeometry): OpResult {
  const radius = numParam(p, "radius", label, { def: 0.004, min: 1e-5, max: 1 });
  const angle = numParam(p, "angle", label, { def: 30, min: 1, max: 179 });
  const maxTri = Math.round(numParam(p, "maxTriangles", label, { def: 600000, min: 1000, max: 3000000 }));
  const w0 = welded(input);
  const m0: IMesh = { pos: Array.from(w0.attributes.position.array), tri: Array.from(w0.index!.array) };
  const edges = sharpInfo(m0, angle);
  if (!edges.length) return { geometry: input.clone(), anchors: {}, info: [`bo cạnh: không có cạnh nào gãy hơn ${angle}°, giữ nguyên`] };
  // chia mịn đều cả lưới (manifold giữ mặt phẳng phẳng); cạnh không ngắn hơn mức mà ngân sách tam giác cho phép
  let area = 0;
  for (let t = 0; t < m0.tri.length; t += 3) area += faceArea(m0, t);
  const h = Math.max(radius / 3, Math.sqrt((4 * area) / (Math.sqrt(3) * maxTri)) * 1.05);
  const mf = toManifold(input, label).refineToLength(h);
  const g2 = fromManifoldIndexed(mf);
  mf.delete();
  const m: IMesh = { pos: Array.from(g2.attributes.position.array), tri: Array.from(g2.index!.array) };

  // "lăn bi": với cạnh giữa hai mặt (pháp tuyến n1, n2), trục mặt bo song song cạnh, cách cả hai mặt đúng r.
  // Đỉnh nằm trên mặt 1 cách cạnh s < T = r·tan(θ/2) được đưa lên cung tròn bán kính r quanh trục đó.
  const reach = radius * 3, cell = reach, grid = new Map<string, number[]>();
  edges.forEach((e, k) => {
    const lo = [0, 1, 2].map((i) => Math.floor((Math.min(e.a.getComponent(i), e.b.getComponent(i)) - reach) / cell));
    const hi = [0, 1, 2].map((i) => Math.floor((Math.max(e.a.getComponent(i), e.b.getComponent(i)) + reach) / cell));
    for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) {
      const key = `${x},${y},${z}`;
      const l = grid.get(key);
      if (l) l.push(k);
      else grid.set(key, [k]);
    }
  });
  const V = new THREE.Vector3(), out = new Float64Array(m.pos);
  for (let i = 0; i < m.pos.length / 3; i++) {
    V.set(m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2]);
    const cands = grid.get([V.x, V.y, V.z].map((c) => Math.floor(c / cell)).join(","));
    if (!cands) continue;
    // cạnh gần nhất mà đỉnh nằm trong dải bo của nó; ghi lại các cạnh lồi chứa đỉnh để xử lý góc
    let best: { p: THREE.Vector3; d: number } | null = null;
    const hits: SharpEdge[] = [];
    for (const k of cands) {
      const e = edges[k], t = e.b.clone().sub(e.a);
      const L = t.length();
      t.normalize();
      const along = V.clone().sub(e.a).dot(t);
      if (along < -1e-9 || along > L + 1e-9) continue;
      const foot = e.a.clone().addScaledVector(t, along);
      const c = Math.max(-0.999, Math.min(0.999, e.n1.dot(e.n2)));
      const T = radius * Math.tan(Math.acos(c) / 2);
      const off = V.clone().sub(foot);
      // đỉnh nằm trên mặt nào: khoảng cách tới mặt nhỏ hơn
      const on1 = Math.abs(off.dot(e.n1)) <= Math.abs(off.dot(e.n2));
      const n = on1 ? e.n1 : e.n2;
      const s = off.clone().addScaledVector(n, -off.dot(n)).length();
      if (s >= T || Math.abs(off.dot(n)) > h * 0.5) continue;
      const convex = e.c2.clone().sub(e.a).dot(e.n1) < 0;
      const bis = e.n1.clone().add(e.n2).normalize();
      const sign = convex ? -1 : 1;
      const axisPt = foot.clone().addScaledVector(e.n1.clone().add(e.n2), (sign * radius) / (1 + c));
      // hướng từ trục ra điểm trên cung: từ n (ở tiếp điểm, s = T) tới phân giác (ở cạnh, s = 0)
      const dir = n.clone().lerp(bis, 1 - s / T).normalize().multiplyScalar(-sign);
      const p = axisPt.addScaledVector(dir, radius);
      if (convex) hits.push(e);
      // khối lồi bo tròn = giao của các khối bo từng cạnh, nên lấy ứng viên lún vào sâu nhất
      const depthIn = convex ? p.distanceTo(V) : -s;
      if (!best || depthIn > best.d) best = { p, d: depthIn };
    }
    // góc (ba mặt trở lên gặp nhau): đưa đỉnh lên mặt cầu bán kính r tiếp xúc mọi mặt đó
    if (hits.length >= 2) {
      const planes: { n: THREE.Vector3; p: THREE.Vector3 }[] = [];
      for (const e of hits) for (const n of [e.n1, e.n2]) if (!planes.some((q) => q.n.dot(n) > Math.cos((angle * Math.PI) / 180))) planes.push({ n, p: e.a });
      if (planes.length >= 3) {
        // tâm cầu c: n·(c − p) = −r với mọi mặt (bình phương tối thiểu)
        const A = new THREE.Matrix3().set(0, 0, 0, 0, 0, 0, 0, 0, 0), bv = new THREE.Vector3();
        const ae = A.elements;
        for (const { n, p } of planes) {
          const rhs = n.dot(p) - radius;
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) ae[c * 3 + r] += n.getComponent(r) * n.getComponent(c);
            bv.setComponent(r, bv.getComponent(r) + n.getComponent(r) * rhs);
          }
        }
        if (Math.abs(A.determinant()) > 1e-6) {
          const c = bv.applyMatrix3(A.invert());
          const off = V.clone().sub(c);
          if (planes.every(({ n }) => off.dot(n) > 0)) {
            const p = c.addScaledVector(off.normalize(), radius);
            if (!best || p.distanceTo(V) > best.d) best = { p, d: p.distanceTo(V) };
          }
        }
      }
    }
    if (best) {
      out[i * 3] = best.p.x;
      out[i * 3 + 1] = best.p.y;
      out[i * 3 + 2] = best.p.z;
    }
  }
  m.pos = Array.from(out);
  const left = sharpEdges(m, angle, (h * h) / 20).length;
  const sharp0 = edges;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(m.pos, 3));
  geometry.setIndex(m.tri);
  geometry.computeVertexNormals();
  return { geometry, anchors: {}, info: [`bo cạnh r ≈ ${radius} m: ${sharp0.length} cạnh gãy > ${angle}° → còn ${left} (không tính mảnh vụn); ${m.tri.length / 3} tam giác`] };
}

// ───────── groove ─────────

interface SurfPt {
  p: THREE.Vector3;
  n: THREE.Vector3;
}

const AX = { x: 0, y: 1, z: 2 } as const;

/** Giao của mặt hình với mặt phẳng trục = at: nối các đoạn thành đường, trả về đường dài nhất (trong hộp within). */
function planeCurve(g: THREE.BufferGeometry, axis: "x" | "y" | "z", at: number, within: [V3, V3] | null): SurfPt[] {
  const w = welded(g), P = w.attributes.position.array, I = w.index!.array, a = AX[axis];
  const pt = (i: number) => new THREE.Vector3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
  // mỗi đoạn nối hai điểm nằm trên hai cạnh; điểm trên cạnh xác định bởi khoá cạnh
  const segs: { a: string; b: string; pa: THREE.Vector3; pb: THREE.Vector3; n: THREE.Vector3 }[] = [];
  for (let t = 0; t < I.length; t += 3) {
    const v = [I[t], I[t + 1], I[t + 2]], d = v.map((i) => P[i * 3 + a] - at);
    const hits: { k: string; q: THREE.Vector3 }[] = [];
    for (let e = 0; e < 3; e++) {
      const i0 = v[e], i1 = v[(e + 1) % 3], d0 = d[e], d1 = d[(e + 1) % 3];
      if ((d0 < 0 && d1 >= 0) || (d0 >= 0 && d1 < 0)) hits.push({ k: ekey(i0, i1), q: pt(i0).lerp(pt(i1), d0 / (d0 - d1)) });
    }
    if (hits.length !== 2) continue;
    const n = pt(v[1]).sub(pt(v[0])).cross(pt(v[2]).sub(pt(v[0]))).normalize();
    const mid = hits[0].q.clone().add(hits[1].q).multiplyScalar(0.5);
    if (within && ![0, 1, 2].every((k) => mid.getComponent(k) >= within[0][k] && mid.getComponent(k) <= within[1][k])) continue;
    segs.push({ a: hits[0].k, b: hits[1].k, pa: hits[0].q, pb: hits[1].q, n });
  }
  if (!segs.length) throw new AssemblyError(`mặt phẳng ${axis} = ${at} không cắt hình${within ? " trong vùng within" : ""}.`);
  const byKey = new Map<string, number[]>();
  segs.forEach((s, i) => {
    for (const k of [s.a, s.b]) byKey.set(k, [...(byKey.get(k) ?? []), i]);
  });
  const used = new Set<number>();
  let best: SurfPt[] = [];
  for (let s0 = 0; s0 < segs.length; s0++) {
    if (used.has(s0)) continue;
    // đi về hai phía từ đoạn s0
    const chain: SurfPt[] = [{ p: segs[s0].pa, n: segs[s0].n }, { p: segs[s0].pb, n: segs[s0].n }];
    used.add(s0);
    for (const forward of [true, false]) {
      let key = forward ? segs[s0].b : segs[s0].a;
      for (;;) {
        const next = (byKey.get(key) ?? []).find((i) => !used.has(i));
        if (next === undefined) break;
        used.add(next);
        const s = segs[next], other = s.a === key ? s.b : s.a, q = s.a === key ? s.pb : s.pa;
        if (forward) chain.push({ p: q, n: s.n });
        else chain.unshift({ p: q, n: s.n });
        key = other;
      }
    }
    const len = chain.reduce((acc, c, i) => acc + (i ? c.p.distanceTo(chain[i - 1].p) : 0), 0);
    const bestLen = best.reduce((acc, c, i) => acc + (i ? c.p.distanceTo(best[i - 1].p) : 0), 0);
    if (len > bestLen) best = chain;
  }
  return best;
}

/** Chiếu các điểm lên mặt hình theo hướng dir (raycast), có chèn điểm dày dọc đường. */
function projectCurve(g: THREE.BufferGeometry, pts: V3[], dir: V3, step: number): SurfPt[] {
  const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  mesh.updateMatrixWorld(true);
  const d = new THREE.Vector3(...dir).normalize(), ray = new THREE.Raycaster();
  const dense: THREE.Vector3[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = new THREE.Vector3(...pts[i]);
    if (i) {
      const b = new THREE.Vector3(...pts[i - 1]), k = Math.max(1, Math.ceil(a.distanceTo(b) / step));
      for (let s = 1; s < k; s++) dense.push(b.clone().lerp(a, s / k));
    }
    dense.push(a);
  }
  const out: SurfPt[] = [];
  for (const q of dense) {
    ray.set(q.clone().addScaledVector(d, -10), d);
    const hit = ray.intersectObject(mesh, false)[0];
    if (!hit?.face) throw new AssemblyError(`điểm [${q.toArray().map((v) => +v.toFixed(4)).join(", ")}] chiếu theo [${dir.join(", ")}] không chạm mặt hình.`);
    const n = hit.face.normal.clone();
    if (n.dot(d) > 0) n.negate();
    out.push({ p: hit.point, n });
  }
  return out;
}

export function groove(p: Raw, label: string, input: THREE.BufferGeometry): OpResult {
  const width = numParam(p, "width", label, { def: 0.0035, min: 0.0002, max: 0.2 });
  const depth = numParam(p, "depth", label, { def: 0.004, min: 0.0002, max: 0.5 });
  const curve = p.curve as { plane?: { axis: "x" | "y" | "z"; at: number }; pts?: V3[]; project?: V3 } | undefined;
  const within = (p.within ?? null) as [V3, V3] | null;
  let line: SurfPt[];
  if (curve?.plane) {
    if (!["x", "y", "z"].includes(curve.plane.axis) || typeof curve.plane.at !== "number") throw new AssemblyError(`${label}.curve.plane phải là {axis: "x" | "y" | "z", at: số}.`);
    line = planeCurve(input, curve.plane.axis, curve.plane.at, within);
  } else if (curve?.pts && curve.project) {
    line = projectCurve(input, curve.pts, curve.project, width);
  } else throw new AssemblyError(`${label}.curve phải là {plane: {axis, at}} hoặc {pts: [[x, y, z], …], project: [dx, dy, dz]}.`);
  // bỏ điểm trùng
  line = line.filter((c, i) => !i || c.p.distanceTo(line[i - 1].p) > 1e-6);
  if (line.length < 2) throw new AssemblyError(`${label}: đường khắc quá ngắn.`);
  const length = line.reduce((acc, c, i) => acc + (i ? c.p.distanceTo(line[i - 1].p) : 0), 0);

  // rãnh = chồng các ống tròn bán kính width/2 từ mặt xuống đáy (sâu depth), trừ khỏi hình
  const r = width / 2, layers = Math.max(1, Math.ceil(Math.max(0, depth - r) / r) + 1);
  const section = { pts: Array.from({ length: 12 }, (_, k) => [r * Math.cos((k * Math.PI) / 6), r * Math.sin((k * Math.PI) / 6)] as [number, number]) };
  const closed = line[0].p.distanceTo(line[line.length - 1].p) < width;
  const tubes = Array.from({ length: layers }, (_, L) => {
    const sink = layers === 1 ? depth - r : ((depth - r) * L) / (layers - 1);
    const pts = (closed ? line.slice(0, -1) : line).map((c) => c.p.clone().addScaledVector(c.n, -sink).toArray());
    return sweep({ section, path: { pts, smooth: false, closed }, caps: true }, `${label} (ống rãnh)`).geometry;
  });
  // mỗi ống trừ riêng: gộp lưới các ống chồng nhau sẽ không còn là khối kín
  const cut = booleanOp({ op: "subtract" }, label, [input, ...tubes]);
  return { geometry: cut.geometry, anchors: {}, info: [`rãnh dài ${+length.toFixed(4)} m, rộng ${width}, sâu ${depth}${closed ? " (vòng kín)" : ""}; ${cut.info[0]}`] };
}

// ───────── split region ─────────

type Bary = [number, number, number];

/** Cắt đa giác (theo toạ độ trọng tâm) bằng nửa mặt phẳng trái của cạnh a → b (đường bao lồi, ngược kim đồng hồ). */
function clipHalf(poly: { uv: P2; w: Bary }[], a: P2, b: P2) {
  const side = (q: P2) => (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]);
  const out: { uv: P2; w: Bary }[] = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i], prev = poly[(i + poly.length - 1) % poly.length];
    const sc = side(cur.uv), sp = side(prev.uv);
    if (sc >= 0) {
      if (sp < 0) out.push(lerpV(prev, cur, sp / (sp - sc)));
      out.push(cur);
    } else if (sp >= 0) out.push(lerpV(prev, cur, sp / (sp - sc)));
  }
  return out;
}
const lerpV = (p: { uv: P2; w: Bary }, q: { uv: P2; w: Bary }, t: number) => ({
  uv: [p.uv[0] + (q.uv[0] - p.uv[0]) * t, p.uv[1] + (q.uv[1] - p.uv[1]) * t] as P2,
  w: [0, 1, 2].map((k) => p.w[k] + (q.w[k] - p.w[k]) * t) as Bary,
});

export function splitRegion(p: Raw, label: string, input: THREE.BufferGeometry): OpResult {
  const plane = enumParam(p, "plane", label, ["xy", "xz", "zy"] as const, "zy");
  const outline = preparePath({ ...(p.outline as Path2D), closed: true }, `${label}.outline`, { closed: true });
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length], c = outline[(i + 2) % outline.length];
    if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) < -1e-12) throw new AssemblyError(`${label}.outline phải lồi (lõm tại điểm ${(i + 1) % outline.length}). Chia vùng lõm thành vài vùng lồi.`);
  }
  const thickness = numParam(p, "thickness", label, { def: 0.004, min: 0.0001, max: 0.5 });
  const offset = numParam(p, "lift", label, { def: 0, min: -0.5, max: 0.5 });
  const range = (p.range ?? null) as [number, number] | null;
  const [iu, iv, ip] = plane === "xy" ? [0, 1, 2] : plane === "xz" ? [0, 2, 1] : [2, 1, 0];

  const g = input.index ? input : mergeVertices(input.clone().deleteAttribute("uv").deleteAttribute("normal"), 1e-7);
  if (!g.attributes.normal) g.computeVertexNormals();
  const P = g.attributes.position.array, N = g.attributes.normal.array, I = g.index!.array;
  const top: number[] = [], nrm: number[] = [];
  let area = 0;
  for (let t = 0; t < I.length; t += 3) {
    const v = [I[t], I[t + 1], I[t + 2]];
    const along = v.reduce((s, i) => s + P[i * 3 + ip], 0) / 3;
    if (range && (along < range[0] || along > range[1])) continue;
    let poly = v.map((i, k) => ({ uv: [P[i * 3 + iu], P[i * 3 + iv]] as P2, w: [k === 0 ? 1 : 0, k === 1 ? 1 : 0, k === 2 ? 1 : 0] as Bary }));
    // tam giác chiếu ngược chiều thì đảo để phép cắt nửa mặt phẳng vẫn đúng chiều
    const flip = signedArea(poly.map((q) => q.uv)) < 0;
    if (flip) poly = poly.reverse();
    for (let e = 0; e < outline.length && poly.length; e++) poly = clipHalf(poly, outline[e], outline[(e + 1) % outline.length]);
    if (poly.length < 3) continue;
    if (flip) poly = poly.reverse();
    const lift = (w: Bary) => [0, 1, 2].map((c) => w[0] * P[v[0] * 3 + c] + w[1] * P[v[1] * 3 + c] + w[2] * P[v[2] * 3 + c]);
    // pháp tuyến đỉnh nội suy (mặt cong); lệch xa pháp tuyến mặt (đỉnh dùng chung với mặt gãy góc) thì dùng pháp tuyến mặt
    const fnrm = new THREE.Vector3(P[v[1] * 3] - P[v[0] * 3], P[v[1] * 3 + 1] - P[v[0] * 3 + 1], P[v[1] * 3 + 2] - P[v[0] * 3 + 2])
      .cross(new THREE.Vector3(P[v[2] * 3] - P[v[0] * 3], P[v[2] * 3 + 1] - P[v[0] * 3 + 1], P[v[2] * 3 + 2] - P[v[0] * 3 + 2])).normalize();
    const liftN = (w: Bary) => {
      const n = new THREE.Vector3(...[0, 1, 2].map((c) => w[0] * N[v[0] * 3 + c] + w[1] * N[v[1] * 3 + c] + w[2] * N[v[2] * 3 + c])).normalize();
      return (n.dot(fnrm) < Math.cos((20 * Math.PI) / 180) ? fnrm : n).toArray();
    };
    const P3 = poly.map((q) => lift(q.w)), N3 = poly.map((q) => liftN(q.w));
    for (let k = 1; k < poly.length - 1; k++) {
      for (const j of [0, k, k + 1]) {
        top.push(...P3[j]);
        nrm.push(...N3[j]);
      }
      const a = new THREE.Vector3(...P3[0]), b = new THREE.Vector3(...P3[k]), c = new THREE.Vector3(...P3[k + 1]);
      area += b.sub(a).cross(c.sub(a)).length() / 2;
    }
  }
  if (!top.length) throw new AssemblyError(`${label}: đường bao không phủ lên mặt nào của hình${range ? " trong range" : ""}. Kiểm tra plane và toạ độ đường bao.`);

  // hàn đỉnh, làm dày vào trong theo pháp tuyến, khâu viền thành tấm kín
  // hàn theo vị trí (pháp tuyến cộng dồn rồi chuẩn hoá) để các mảnh cắt từ tam giác kề nhau thành một tấm liền
  const keyOf = (i: number) => `${Math.round(top[i * 3] * 1e6)},${Math.round(top[i * 3 + 1] * 1e6)},${Math.round(top[i * 3 + 2] * 1e6)}`;
  const slot = new Map<string, number>(), SP: number[] = [], acc: number[] = [], SI: number[] = [];
  for (let i = 0; i < top.length / 3; i++) {
    const k = keyOf(i);
    let j = slot.get(k);
    if (j === undefined) {
      j = SP.length / 3;
      slot.set(k, j);
      SP.push(top[i * 3], top[i * 3 + 1], top[i * 3 + 2]);
      acc.push(0, 0, 0);
    }
    acc[j * 3] += nrm[i * 3];
    acc[j * 3 + 1] += nrm[i * 3 + 1];
    acc[j * 3 + 2] += nrm[i * 3 + 2];
    SI.push(j);
  }
  const nv = SP.length / 3, SN: number[] = [];
  for (let i = 0; i < nv; i++) {
    const l = Math.hypot(acc[i * 3], acc[i * 3 + 1], acc[i * 3 + 2]) || 1;
    SN.push(acc[i * 3] / l, acc[i * 3 + 1] / l, acc[i * 3 + 2] / l);
  }
  const pos: number[] = [];
  for (let i = 0; i < nv; i++) pos.push(SP[i * 3] + SN[i * 3] * offset, SP[i * 3 + 1] + SN[i * 3 + 1] * offset, SP[i * 3 + 2] + SN[i * 3 + 2] * offset);
  for (let i = 0; i < nv; i++) pos.push(pos[i * 3] - SN[i * 3] * thickness, pos[i * 3 + 1] - SN[i * 3 + 1] * thickness, pos[i * 3 + 2] - SN[i * 3 + 2] * thickness);
  for (let t = SI.length - 3; t >= 0; t -= 3) if (SI[t] === SI[t + 1] || SI[t + 1] === SI[t + 2] || SI[t] === SI[t + 2]) SI.splice(t, 3);
  const idx: number[] = [...SI];
  for (let t = 0; t < SI.length; t += 3) idx.push(SI[t] + nv, SI[t + 2] + nv, SI[t + 1] + nv);
  const count = new Map<string, number>(), dirEdge = new Map<string, [number, number]>();
  for (let t = 0; t < SI.length; t += 3) for (let e = 0; e < 3; e++) {
    const a = SI[t + e], b = SI[t + ((e + 1) % 3)], k = ekey(a, b);
    count.set(k, (count.get(k) ?? 0) + 1);
    dirEdge.set(k, [a, b]);
  }
  for (const [k, c] of count) {
    if (c !== 1) continue;
    const [a, b] = dirEdge.get(k)!;
    idx.push(b, a, a + nv, b, a + nv, b + nv);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geometry.setIndex(idx);
  geometry.computeVertexNormals();
  return { geometry, anchors: {}, info: [`tách vùng: diện tích ${+area.toFixed(5)} m², dày ${thickness} m${offset ? `, nâng ${offset} m theo pháp tuyến` : ""}, ${idx.length / 3} tam giác`] };
}
