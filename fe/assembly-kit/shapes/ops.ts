/**
 * Các phép dựng hình (cây tính năng): lathe (tiện), extrude (đùn), sweep (quét), mirror (đối xứng), pattern (lặp).
 * Chỉ dùng phần hình học của three (không cần DOM) nên chạy được cả trong Node (MCP) lẫn trình duyệt.
 * Mỗi phép trả về hình học trong khung của hình cùng điểm neo riêng của phép đó; build.ts thêm điểm neo chung.
 */

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { V3 } from "../core/math";
import { AssemblyError } from "../core/solve";
import type { AnchorSpec, Path2D } from "../core/types";
import { axis, point, surface } from "../parts/_common";
import { type P2, preparePath } from "./path2d";

export interface OpResult {
  geometry: THREE.BufferGeometry;
  anchors: Record<string, AnchorSpec>;
  info: string[];
  /** pattern: phép biến đổi của từng bản sao (để đặt điểm neo "<input>[i].<ten>") */
  copies?: THREE.Matrix4[];
}

/** Bo cạnh tối thiểu mặc định: không có cạnh sắc tuyệt đối (docs/car-toolkit-design.md, nguyên tắc 3). */
export const MIN_EDGE_RADIUS = 0.0005;

// ───────── đọc tham số ─────────

type Raw = Record<string, unknown>;

export function numParam(p: Raw, key: string, label: string, opts: { def?: number; min?: number; max?: number } = {}): number {
  const v = p[key] ?? opts.def;
  if (typeof v !== "number" || !Number.isFinite(v)) throw new AssemblyError(`${label}.${key} phải là số${opts.def === undefined ? " (bắt buộc)" : ""}.`);
  if ((opts.min !== undefined && v < opts.min) || (opts.max !== undefined && v > opts.max)) throw new AssemblyError(`${label}.${key} = ${v} ngoài miền [${opts.min ?? "−∞"}, ${opts.max ?? "∞"}].`);
  return v;
}

export function enumParam<T extends string>(p: Raw, key: string, label: string, options: readonly T[], def: T): T {
  const v = (p[key] ?? def) as T;
  if (!options.includes(v)) throw new AssemblyError(`${label}.${key} = ${JSON.stringify(v)}; chọn một trong: ${options.join(", ")}.`);
  return v;
}

export function vecParam(p: Raw, key: string, label: string, def?: V3): V3 {
  const v = p[key] ?? def;
  if (!Array.isArray(v) || v.length !== 3 || !v.every((x) => typeof x === "number" && Number.isFinite(x))) throw new AssemblyError(`${label}.${key} phải là [x, y, z].`);
  return v as V3;
}

function pathParam(p: Raw, key: string, label: string): Path2D {
  const v = p[key];
  if (!v || typeof v !== "object") throw new AssemblyError(`${label}.${key} phải là {pts: [[x, y], …], round?: [...], closed?}.`);
  return v as Path2D;
}

// ───────── tiện ích hình học ─────────

/** Đưa về dạng không index, chỉ giữ position / normal / uv để gộp được với nhau. */
export function normalizeGeometry(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = g.index ? g.toNonIndexed() : g.clone();
  for (const name of Object.keys(out.attributes)) if (!["position", "normal", "uv"].includes(name)) out.deleteAttribute(name);
  if (!out.attributes.normal) out.computeVertexNormals();
  if (!out.attributes.uv) out.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(out.attributes.position.count * 2), 2));
  out.clearGroups();
  return out;
}

export function merge(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(geos.map(normalizeGeometry), false);
  if (!merged) throw new AssemblyError("Không gộp được các hình (thuộc tính hình học không khớp).");
  return merged;
}

const v2 = (pts: P2[]) => pts.map(([x, y]) => new THREE.Vector2(x, y));

// ───────── lathe ─────────

/** Mặt trong lệch vào phía trái chiều đi của biên dạng một khoảng `wall` (nối các góc bằng giao tuyến, có giới hạn). */
function offsetLeft(pts: P2[], wall: number): P2[] {
  const n = pts.length;
  const normals = pts.slice(0, -1).map((p, i) => {
    const d: P2 = [pts[i + 1][0] - p[0], pts[i + 1][1] - p[1]], l = Math.hypot(d[0], d[1]);
    return [-d[1] / l, d[0] / l] as P2;
  });
  return pts.map((p, i) => {
    const a = normals[Math.max(0, i - 1)], b = normals[Math.min(n - 2, i)];
    let m: P2 = [a[0] + b[0], a[1] + b[1]];
    const lm = Math.hypot(m[0], m[1]) || 1;
    m = [m[0] / lm, m[1] / lm];
    const k = Math.min(3, 1 / Math.max(0.2, m[0] * a[0] + m[1] * a[1]));
    return [Math.max(0, p[0] + m[0] * wall * k), p[1] + m[1] * wall * k];
  });
}

export function lathe(p: Raw, label: string): OpResult {
  const profile = pathParam(p, "profile", label);
  const outer = preparePath({ ...profile, closed: false }, `${label}.profile`, { closed: false });
  if (outer.some(([r]) => r < -1e-9)) throw new AssemblyError(`${label}.profile: bán kính (x) phải ≥ 0; trục quay là x = 0.`);
  const wall = numParam(p, "wall", label, { def: 0, min: 0, max: 1 });
  const lip = enumParam(p, "lip", label, ["round", "flat"] as const, "round");
  const segments = Math.round(numParam(p, "segments", label, { def: 72, min: 6, max: 256 }));
  const angleDeg = numParam(p, "angle", label, { def: 360, min: 1, max: 360 });

  let pts = outer.map(([r, y]) => [Math.max(r, 0), y] as P2);
  if (wall > 0) {
    // vỏ có độ dày: mặt ngoài → miệng → mặt trong đi ngược về (như hàm shell() trong Bàn thí nghiệm.html)
    const inner = offsetLeft(pts, wall);
    const last = pts[pts.length - 1], prev = pts[pts.length - 2], innerLast = inner[inner.length - 1];
    const lipPts: P2[] = [];
    if (lip === "round") {
      const c: P2 = [(last[0] + innerLast[0]) / 2, (last[1] + innerLast[1]) / 2];
      const rad = Math.hypot(last[0] - c[0], last[1] - c[1]);
      const e1: P2 = [(last[0] - c[0]) / rad, (last[1] - c[1]) / rad];
      const tl = Math.hypot(last[0] - prev[0], last[1] - prev[1]);
      const t: P2 = [(last[0] - prev[0]) / tl, (last[1] - prev[1]) / tl];
      for (let k = 1; k < 8; k++) {
        const a = (k / 8) * Math.PI;
        lipPts.push([c[0] + rad * (Math.cos(a) * e1[0] + Math.sin(a) * t[0]), c[1] + rad * (Math.cos(a) * e1[1] + Math.sin(a) * t[1])]);
      }
    }
    pts = [...pts, ...lipPts, ...inner.reverse()];
  }
  const geometry = new THREE.LatheGeometry(v2(pts), segments, 0, (angleDeg * Math.PI) / 180);
  const R = Math.max(...pts.map(([r]) => r));
  const yAtR = pts.find(([r]) => r === R)![1];
  return {
    geometry,
    anchors: {
      axis: axis([0, 0, 0], [0, 1, 0], [0, 0, 1], `trục quay (y), R ${+R.toFixed(5)}`, R),
      surface: surface([0, yAtR, 0], [0, 1, 0], R, [0, 0, 1], `mặt tròn xoay tại bán kính lớn nhất (y = ${+yAtR.toFixed(5)})`),
    },
    info: [`tiện: R lớn nhất ${+R.toFixed(5)} m${wall ? `, thành ${wall} m, miệng ${lip}` : ""}${angleDeg < 360 ? `, quay ${angleDeg}°` : ""}`],
  };
}

// ───────── extrude ─────────

export function extrude(p: Raw, label: string): OpResult {
  const outline = preparePath(pathParam(p, "outline", label), `${label}.outline`, { closed: true });
  const holesRaw = (p.holes ?? []) as Path2D[];
  if (!Array.isArray(holesRaw)) throw new AssemblyError(`${label}.holes phải là mảng đường kín.`);
  const holes = holesRaw.map((h, i) => preparePath(h, `${label}.holes[${i}]`, { closed: true }).reverse());
  const depth = numParam(p, "depth", label, { min: 0.0001, max: 50 });
  const plane = enumParam(p, "plane", label, ["xy", "xz", "zy"] as const, "xy");
  const taper = numParam(p, "taper", label, { def: 1, min: 0.01, max: 10 });
  const xs = outline.map((q) => q[0]), ys = outline.map((q) => q[1]);
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
  const asked = numParam(p, "edgeRadius", label, { def: MIN_EDGE_RADIUS, min: 0, max: 1 });
  const r = Math.min(asked, depth * 0.45, w * 0.3, h * 0.3);

  const shape = new THREE.Shape(v2(outline));
  shape.holes = holes.map((hp) => new THREE.Path(v2(hp)));
  // bevelOffset = −r giữ mép ngoài đúng đường bao khai báo; độ dày tổng đúng bằng depth
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(1e-5, depth - 2 * r),
    bevelEnabled: r > 0,
    bevelThickness: r,
    bevelSize: r,
    bevelOffset: -r,
    bevelSegments: 3,
    curveSegments: 12,
  });
  geometry.translate(0, 0, -(depth - 2 * r) / 2);
  if (taper !== 1) {
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const k = 1 + (taper - 1) * ((pos.getZ(i) + depth / 2) / depth);
      pos.setXY(i, cx + (pos.getX(i) - cx) * k, cy + (pos.getY(i) - cy) * k);
    }
    geometry.computeVertexNormals();
  }
  // đường bao vẽ trong mặt `plane`, đùn theo trục còn lại, đối xứng quanh 0
  if (plane === "xz") geometry.rotateX(Math.PI / 2);
  if (plane === "zy") geometry.rotateY(-Math.PI / 2);
  const ext: V3 = plane === "xy" ? [0, 0, 1] : plane === "xz" ? [0, -1, 0] : [1, 0, 0];
  return {
    geometry,
    anchors: {
      extrudeAxis: axis([0, 0, 0], ext, plane === "xz" ? [0, 0, 1] : [0, 1, 0], "trục đùn qua gốc đường bao"),
    },
    info: [`đùn: ${+w.toFixed(5)} × ${+h.toFixed(5)} trong mặt ${plane}, dày ${depth} m, bo cạnh ${+r.toFixed(5)} m${r < asked ? ` (thu từ ${asked} vì vật mỏng)` : ""}${holes.length ? `, ${holes.length} lỗ` : ""}`],
  };
}

// ───────── sweep ─────────

export function sweep(p: Raw, label: string): OpResult {
  const sectionRaw = pathParam(p, "section", label);
  const section = preparePath({ ...sectionRaw, closed: sectionRaw.closed ?? true }, `${label}.section`, { closed: sectionRaw.closed ?? true });
  const sectionClosed = sectionRaw.closed ?? true;
  const pathRaw = p.path as { pts?: unknown; smooth?: boolean; closed?: boolean } | undefined;
  if (!pathRaw || !Array.isArray(pathRaw.pts) || pathRaw.pts.length < 2) throw new AssemblyError(`${label}.path phải là {pts: [[x, y, z], …] (≥ 2 điểm), smooth?, closed?}.`);
  const pathPts = (pathRaw.pts as unknown[]).map((q, i) => {
    if (!Array.isArray(q) || q.length !== 3 || !q.every(Number.isFinite)) throw new AssemblyError(`${label}.path.pts[${i}] phải là [x, y, z].`);
    return new THREE.Vector3(...(q as V3));
  });
  const closedPath = !!pathRaw.closed;
  const smooth = pathRaw.smooth ?? true;
  const twist = (numParam(p, "twist", label, { def: 0 }) * Math.PI) / 180;
  const scaleEnd = numParam(p, "scaleEnd", label, { def: 1, min: 0.01, max: 100 });
  const caps = (p.caps ?? true) as boolean;

  const curve: THREE.Curve<THREE.Vector3> = smooth && pathPts.length > 2
    ? new THREE.CatmullRomCurve3(pathPts, closedPath, "centripetal")
    : (() => {
        const cp = new THREE.CurvePath<THREE.Vector3>();
        const all = closedPath ? [...pathPts, pathPts[0]] : pathPts;
        for (let i = 0; i < all.length - 1; i++) cp.add(new THREE.LineCurve3(all[i], all[i + 1]));
        return cp;
      })();
  const length = curve.getLength();
  if (length < 1e-6) throw new AssemblyError(`${label}.path dài bằng 0.`);
  const sectionSize = Math.max(...section.map((q) => Math.hypot(q[0], q[1])));
  const N = Math.round(numParam(p, "samples", label, { def: Math.min(400, Math.max(24, Math.ceil((length / Math.max(sectionSize, 1e-4)) * 4))), min: 2, max: 2000 }));

  // khung xoay nhỏ nhất (double reflection, Wang 2008): mặt cắt không bị xoắn vô cớ dọc đường
  const C: THREE.Vector3[] = [], T: THREE.Vector3[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    C.push(curve.getPointAt(u));
    T.push(curve.getTangentAt(u).normalize());
  }
  const ref = Math.abs(T[0].y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const Nrm: THREE.Vector3[] = [ref.clone().sub(T[0].clone().multiplyScalar(ref.dot(T[0]))).normalize()];
  for (let i = 0; i < N; i++) {
    const v1 = C[i + 1].clone().sub(C[i]), c1 = v1.dot(v1);
    if (c1 < 1e-18) {
      Nrm.push(Nrm[i].clone());
      continue;
    }
    const rL = Nrm[i].clone().sub(v1.clone().multiplyScalar((2 / c1) * v1.dot(Nrm[i])));
    const tL = T[i].clone().sub(v1.clone().multiplyScalar((2 / c1) * v1.dot(T[i])));
    const v2v = T[i + 1].clone().sub(tL), c2 = v2v.dot(v2v);
    Nrm.push(c2 < 1e-18 ? rL.normalize() : rL.sub(v2v.multiplyScalar((2 / c2) * v2v.dot(rL))).normalize());
  }

  // mặt cắt [u, v]: v theo pháp tuyến N (lên trên với đường nằm ngang), u theo B = T × N
  const ring = sectionClosed ? [...section, section[0]] : section;
  const perim: number[] = [0];
  for (let k = 1; k < ring.length; k++) perim.push(perim[k - 1] + Math.hypot(ring[k][0] - ring[k - 1][0], ring[k][1] - ring[k - 1][1]));
  const m = ring.length, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const frame = (i: number) => {
    const t = i / N, ang = twist * t, s = 1 + (scaleEnd - 1) * t;
    const n0 = Nrm[i], b0 = T[i].clone().cross(n0);
    const n = n0.clone().multiplyScalar(Math.cos(ang)).add(b0.clone().multiplyScalar(Math.sin(ang)));
    const b = b0.clone().multiplyScalar(Math.cos(ang)).sub(n0.clone().multiplyScalar(Math.sin(ang)));
    return { n, b, s };
  };
  for (let i = 0; i <= N; i++) {
    const { n, b, s } = frame(i);
    for (let k = 0; k < m; k++) {
      const [su, sv] = ring[k];
      const q = C[i].clone().add(b.clone().multiplyScalar(su * s)).add(n.clone().multiplyScalar(sv * s));
      pos.push(q.x, q.y, q.z);
      uv.push(perim[k] / perim[m - 1], (i / N) * length);
    }
  }
  for (let i = 0; i < N; i++) for (let k = 0; k < m - 1; k++) {
    const a = i * m + k, b = a + m;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const body = new THREE.BufferGeometry();
  body.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  body.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  body.setIndex(idx);
  body.computeVertexNormals();
  const parts = [body];

  if (caps && sectionClosed && !closedPath) {
    const tris = THREE.ShapeUtils.triangulateShape(v2(section), []);
    // mặt thân quay ra ngoài hay vào trong (tuỳ chiều mặt cắt): nắp phải quay cùng kiểu thì khối mới kín và đúng hướng
    const p0 = new THREE.Vector3(pos[0], pos[1], pos[2]), p1 = new THREE.Vector3(pos[m * 3], pos[m * 3 + 1], pos[m * 3 + 2]), p2 = new THREE.Vector3(pos[3], pos[4], pos[5]);
    const outward = p1.clone().sub(p0).cross(p2.clone().sub(p0)).dot(p0.clone().sub(C[0])) > 0;
    for (const end of [0, N]) {
      const { n, b, s } = frame(end);
      const cp: number[] = [];
      const want = T[end].clone().multiplyScalar((end === 0 ? -1 : 1) * (outward ? 1 : -1));
      const q0 = (k: number) => C[end].clone().add(b.clone().multiplyScalar(section[k][0] * s)).add(n.clone().multiplyScalar(section[k][1] * s));
      for (const tri of tris) {
        const nt = q0(tri[1]).sub(q0(tri[0])).cross(q0(tri[2]).sub(q0(tri[0])));
        const order = nt.dot(want) >= 0 ? tri : [tri[0], tri[2], tri[1]];
        for (const k of order) {
          const [su, sv] = section[k];
          const q = C[end].clone().add(b.clone().multiplyScalar(su * s)).add(n.clone().multiplyScalar(sv * s));
          cp.push(q.x, q.y, q.z);
        }
      }
      const cap = new THREE.BufferGeometry();
      cap.setAttribute("position", new THREE.Float32BufferAttribute(cp, 3));
      cap.computeVertexNormals();
      parts.push(cap);
    }
  }
  const geometry = parts.length > 1 ? merge(parts) : body;
  const tEnd = T[N], tStart = T[0];
  return {
    geometry,
    anchors: {
      start: point([C[0].x, C[0].y, C[0].z], [-tStart.x, -tStart.y, -tStart.z], "đầu đường quét, hướng ra ngoài", [Nrm[0].x, Nrm[0].y, Nrm[0].z]),
      end: point([C[N].x, C[N].y, C[N].z], [tEnd.x, tEnd.y, tEnd.z], "cuối đường quét, hướng ra ngoài", [Nrm[N].x, Nrm[N].y, Nrm[N].z]),
    },
    info: [`quét: dài ${+length.toFixed(5)} m, ${N} đoạn${twist ? `, xoắn ${+((twist * 180) / Math.PI).toFixed(2)}°` : ""}${scaleEnd !== 1 ? `, cuối ×${scaleEnd}` : ""}`],
  };
}

// ───────── mirror / pattern ─────────

const AXES = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) } as const;

/** Lật hình qua mặt phẳng vuông góc trục `plane` tại 0, đảo thứ tự đỉnh để mặt vẫn quay ra ngoài. */
function reflect(g: THREE.BufferGeometry, plane: "x" | "y" | "z"): THREE.BufferGeometry {
  const out = normalizeGeometry(g);
  const s = new THREE.Vector3(plane === "x" ? -1 : 1, plane === "y" ? -1 : 1, plane === "z" ? -1 : 1);
  out.scale(s.x, s.y, s.z);
  for (const name of ["position", "normal", "uv"] as const) {
    const a = out.attributes[name], size = a.itemSize, arr = a.array as Float32Array;
    for (let t = 0; t < a.count; t += 3) for (let c = 0; c < size; c++) {
      const i1 = (t + 1) * size + c, i2 = (t + 2) * size + c;
      [arr[i1], arr[i2]] = [arr[i2], arr[i1]];
    }
    a.needsUpdate = true;
  }
  return out;
}

export function mirror(p: Raw, label: string, input: THREE.BufferGeometry): OpResult {
  const plane = enumParam(p, "plane", label, ["x", "y", "z"] as const, "z");
  const keep = (p.keepOriginal ?? true) as boolean;
  const flipped = reflect(input, plane);
  return { geometry: keep ? merge([input, flipped]) : flipped, anchors: {}, info: [`đối xứng qua mặt ${plane} = 0${keep ? " (giữ bản gốc)" : ""}`] };
}

export function pattern(p: Raw, label: string, input: THREE.BufferGeometry): OpResult {
  const kind = enumParam(p, "kind", label, ["linear", "radial"] as const, "radial");
  const count = Math.round(numParam(p, "count", label, { min: 1, max: 500 }));
  const copies: THREE.BufferGeometry[] = [];
  if (kind === "linear") {
    const step = vecParam(p, "step", label);
    const mats = Array.from({ length: count }, (_, i) => new THREE.Matrix4().makeTranslation(step[0] * i, step[1] * i, step[2] * i));
    for (const m of mats) copies.push(normalizeGeometry(input).applyMatrix4(m));
    return { geometry: merge(copies), anchors: {}, info: [`lặp thẳng ${count} bản, bước [${step.join(", ")}]`], copies: mats };
  }
  const ax = enumParam(p, "axis", label, ["x", "y", "z"] as const, "y");
  const stepDeg = numParam(p, "stepAngle", label, { def: 360 / count });
  const center = vecParam(p, "center", label, [0, 0, 0]);
  const mats: THREE.Matrix4[] = [];
  for (let i = 0; i < count; i++) {
    const m = new THREE.Matrix4().makeTranslation(center[0], center[1], center[2])
      .multiply(new THREE.Matrix4().makeRotationAxis(AXES[ax], (stepDeg * i * Math.PI) / 180))
      .multiply(new THREE.Matrix4().makeTranslation(-center[0], -center[1], -center[2]));
    mats.push(m);
    copies.push(normalizeGeometry(input).applyMatrix4(m));
  }
  return {
    geometry: merge(copies),
    anchors: { patternAxis: axis(center, AXES[ax].toArray() as V3, ax === "y" ? [0, 0, 1] : [0, 1, 0], `trục lặp vòng (${ax})`) },
    copies: mats,
    info: [`lặp vòng ${count} bản quanh trục ${ax}, mỗi bản ${+stepDeg.toFixed(4)}°`],
  };
}
