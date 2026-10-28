// Thử lệnh sand (mài bề mặt) ngoài MCP: đóng gói kit như mcp.mjs rồi chạy 6 ca bằng số.
// Chạy: node fe/scripts/assembly-bridge/sand-selftest.mjs
import { build } from "esbuild";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as THREE from "three";

const here = dirname(fileURLToPath(import.meta.url));
const FE_ROOT = resolve(here, "../..");
const dir = join(FE_ROOT, "node_modules/.cache/assembly-bridge");
mkdirSync(dir, { recursive: true });
const kitFile = join(dir, "kit-sand-selftest.mjs");
await build({
  entryPoints: [join(FE_ROOT, "assembly-kit/node.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: kitFile,
  external: ["three", "manifold-3d"],
  logLevel: "error",
});
const kit = await import(pathToFileURL(kitFile).href);
await kit.initKernel(() => import("manifold-3d"));

const line = (s) => console.log(s);
let fails = 0;
const check = (name, ok, text) => {
  if (!ok) fails++;
  line(`    ${ok ? "OK  " : "HỎNG"} ${name}${text ? ` — ${text}` : ""}`);
};

// ── đo lường ──
/** Hàn đỉnh theo vị trí (giống trong sand.ts). */
function weld(g) {
  const attr = g.attributes.position;
  const src = attr.array;
  const index = g.index ? g.index.array : null;
  const key = new Map();
  const map = new Int32Array(attr.count);
  const out = [];
  for (let i = 0; i < attr.count; i++) {
    const k = `${Math.round(src[i * 3] * 1e7)},${Math.round(src[i * 3 + 1] * 1e7)},${Math.round(src[i * 3 + 2] * 1e7)}`;
    let j = key.get(k);
    if (j === undefined) {
      j = out.length / 3;
      key.set(k, j);
      out.push(src[i * 3], src[i * 3 + 1], src[i * 3 + 2]);
    }
    map[i] = j;
  }
  const n = index ? index.length : attr.count;
  const tri = new Uint32Array(n);
  if (index) for (let i = 0; i < n; i++) tri[i] = map[index[i]];
  else for (let i = 0; i < n; i++) tri[i] = map[i];
  return { pos: Float64Array.from(out), tri, nv: out.length / 3 };
}

function adjacency(tri, nv) {
  const sets = Array.from({ length: nv }, () => new Set());
  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t], b = tri[t + 1], c = tri[t + 2];
    sets[a].add(b); sets[a].add(c);
    sets[b].add(a); sets[b].add(c);
    sets[c].add(a); sets[c].add(b);
  }
  return sets.map((s) => [...s]);
}

/** Độ lệch TRUNG VỊ so với mặt chuẩn — đo đúng cái mắt thấy (khác với đo độ đều của lưới). */
function medianOf(vals) {
  if (!vals.length) return 0;
  vals.sort((a, b) => a - b);
  return vals[Math.floor(vals.length / 2)];
}

/** Trụ: |bán kính − 60 mm| trên thân trụ (bỏ hai vành đầu). */
function radiusDev(pos) {
  const v = [];
  for (let i = 0; i < pos.length / 3; i++) {
    if (Math.abs(pos[i * 3 + 1]) > 0.1495) continue;
    v.push(Math.abs(Math.hypot(pos[i * 3], pos[i * 3 + 2]) - 0.06));
  }
  return medianOf(v);
}

/** Tấm dày 2 mm: | |z| − 1 mm |. */
function thicknessDev(pos) {
  const v = [];
  for (let i = 0; i < pos.length / 3; i++) v.push(Math.abs(Math.abs(pos[i * 3 + 1]) - 0.001));
  return medianOf(v);
}

/** Số đỉnh dời quá `thr` (mét) khi so hai lưới cùng thứ tự đỉnh. */
function movedCount(a, b, thr) {
  let c = 0;
  const n = Math.min(a.length, b.length) / 3;
  for (let i = 0; i < n; i++) {
    if (Math.hypot(a[i * 3] - b[i * 3], a[i * 3 + 1] - b[i * 3 + 1], a[i * 3 + 2] - b[i * 3 + 2]) > thr) c++;
  }
  return c;
}

/** Trung vị độ dài cạnh của lưới đã hàn. */
function medianEdge(w) {
  const n = w.tri.length, seen = new Set(), list = [];
  for (let t = 0; t < w.tri.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = w.tri[t + e], b = w.tri[t + ((e + 1) % 3)];
      const k = a < b ? a * n + b : b * n + a;
      if (seen.has(k)) continue;
      seen.add(k);
      list.push(Math.hypot(w.pos[a * 3] - w.pos[b * 3], w.pos[a * 3 + 1] - w.pos[b * 3 + 1], w.pos[a * 3 + 2] - w.pos[b * 3 + 2]));
    }
  }
  list.sort((x, y) => x - y);
  return list[Math.floor(list.length / 2)] ?? 0;
}

function volume(pos, tri) {
  let v = 0;
  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t] * 3, b = tri[t + 1] * 3, c = tri[t + 2] * 3;
    v += pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1]) -
      pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c]) +
      pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c]);
  }
  return v / 6;
}

function boundaryEdges(tri) {
  const seen = new Map();
  const n = tri.length;
  for (let t = 0; t < tri.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = tri[t + e], b = tri[t + ((e + 1) % 3)];
      const k = a < b ? a * n + b : b * n + a;
      seen.set(k, (seen.get(k) ?? 0) + 1);
    }
  }
  let c = 0;
  for (const v of seen.values()) if (v === 1) c++;
  return c;
}

/** So vị trí hai lưới CÙNG thứ tự đỉnh (sand giữ nguyên thứ tự khi input có index). */
function cmpDisp(a, b) {
  let max = 0;
  const n = Math.min(a.length, b.length) / 3;
  for (let i = 0; i < n; i++) {
    const d = Math.hypot(a[i * 3] - b[i * 3], a[i * 3 + 1] - b[i * 3 + 1], a[i * 3 + 2] - b[i * 3 + 2]);
    if (d > max) max = d;
  }
  return max;
}

const bbox = (g) => {
  g.computeBoundingBox();
  return [...g.boundingBox.min.toArray(), ...g.boundingBox.max.toArray()];
};
const sameBox = (a, b, tol = 1e-9) => a.every((v, i) => Math.abs(v - b[i]) <= tol);

/** Nhiễu "giả ngẫu nhiên" nhưng TẤT ĐỊNH theo vị trí: đỉnh trùng vị trí nhận cùng độ dời. */
function roughen(g, amp) {
  const p = g.attributes.position;
  const h = (x, y, z, s) => {
    const v = Math.sin(Math.round(x * 1e6) * 12.9898 + Math.round(y * 1e6) * 78.233 + Math.round(z * 1e6) * 37.719 + s * 91.7) * 43758.5453;
    return (v - Math.floor(v) - 0.5) * 2;
  };
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    p.setXYZ(i, x + h(x, y, z, 1) * amp, y + h(x, y, z, 2) * amp, z + h(x, y, z, 3) * amp);
  }
  p.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

const report = (info) => info.forEach((s) => line(`         ${s}`));

// ── ca 1: trụ Ø120 có gợn nhân tạo ──
const cyl = new THREE.CylinderGeometry(0.06, 0.06, 0.3, 128, 10, false);
roughen(cyl, 0.0003);
const cylW = weld(cyl);
const cylNbr = adjacency(cylW.tri, cylW.nv);
const cylMed = medianEdge(cylW);
const cylDev0 = radiusDev(cylW.pos);
const cylVol0 = volume(cylW.pos, cylW.tri);
line(`    (cạnh trung vị ${(cylMed * 1000).toFixed(2)} mm, ${cylW.nv} đỉnh, lệch bán kính ban đầu ${(cylDev0 * 1000).toFixed(3)} mm)`);
const radiusOf = (pos) => {
  let s = 0, n = 0;
  for (let i = 0; i < pos.length / 3; i++) {
    if (Math.abs(pos[i * 3 + 1]) > 0.1495) continue;
    s += Math.hypot(pos[i * 3], pos[i * 3 + 2]);
    n++;
  }
  return s / Math.max(1, n);
};
const r0 = radiusOf(cylW.pos);

line("[ca 1] trụ Ø120 × 300 mm, nhiễu ±0,3 mm — limit 0,3 mm, strength 0,6");
const sand1 = kit.sand({ strength: 0.6, limit: 0.0003 }, "trụ", [cyl]);
const w1 = weld(sand1.geometry);
const n1 = adjacency(w1.tri, w1.nv);
report(sand1.info);
const dev1 = radiusDev(w1.pos);
check("lệch bán kính giảm ≥ 60 %", dev1 / cylDev0 <= 0.4, `${(cylDev0 * 1000).toFixed(3)} → ${(dev1 * 1000).toFixed(3)} mm (−${((1 - dev1 / cylDev0) * 100).toFixed(0)} %)`);
check("bán kính trung bình đổi ≤ 0,05 mm", Math.abs(radiusOf(w1.pos) - r0) <= 0.00005, `${(r0 * 1000).toFixed(3)} → ${(radiusOf(w1.pos) * 1000).toFixed(3)} mm`);
const vol1 = volume(w1.pos, w1.tri);
check("thể tích đổi ≤ 0,5 %", Math.abs(vol1 / cylVol0 - 1) <= 0.005, `${(vol1 / cylVol0 * 100 - 100).toFixed(2)} %`);
check("không đỉnh nào dời quá limit", cmpDisp(cylW.pos, w1.pos) <= 0.0003 + 1e-6, `${(cmpDisp(cylW.pos, w1.pos) * 1000).toFixed(4)} mm`);

// ── ca 2: bộ ống gió thật (ong-gio-han) ──
line("[ca 2] ống gió Ø120 đã đắp mối nối (ong-gio-han) — limit 1 mm (lưới boolean 2,4 mm)");
{
  const state = JSON.parse(readFileSync(join(FE_ROOT, ".assembly-bridge/state.json"), "utf8"));
  const asm = state.assemblies.find((a) => a.id === "ong-gio-han");
  if (!asm) throw new Error("Không có bản ong-gio-han trong state.json");
  const t0 = Date.now();
  const g = kit.buildShapes(asm.doc, ["ongHanSach"]).get("ongHanSach").geometry;
  const srcW = weld(g);
  const srcNbr = adjacency(srcW.tri, srcW.nv);
  const srcMed = medianEdge(srcW);
  const volBefore = volume(srcW.pos, srcW.tri);
  const boxBefore = bbox(g);
  const t1 = Date.now();
  const res = kit.sand({ strength: 0.6, limit: 0.001, lock: 30 }, "ong", [g]);
  const t2 = Date.now();
  const outW = weld(res.geometry);
  const volAfter = volume(outW.pos, outW.tri);
  report(res.info);
  line(`         (dựng ${t1 - t0} ms, mài ${t2 - t1} ms, ${srcW.nv} đỉnh, cạnh trung vị ${(srcMed * 1000).toFixed(2)} mm)`);
  const moved = movedCount(srcW.pos, outW.pos, 0.0001);
  check("có bào chỗ gợn (0,5–30 % đỉnh dời > 0,1 mm)", moved > 0.005 * srcW.nv && moved < 0.3 * srcW.nv, `${moved}/${srcW.nv} đỉnh`);
  check("thể tích giảm ≤ 2 %", Math.abs(volAfter / volBefore - 1) <= 0.02, `${(volAfter / volBefore * 100 - 100).toFixed(2)} %`);
  const dbox = Math.max(...boxBefore.map((v, i) => Math.abs(v - bbox(res.geometry)[i])));
  check("khung bao đổi ≤ limit (miệng ống còn sắc)", dbox <= 0.001 + 1e-6, `${(dbox * 1000).toFixed(4)} mm`);
}

// ── ca 3: hộp 100³ — lock phải giữ 12 cạnh sắc ──
line("[ca 3] hộp 100 × 100 × 100 mm (chia 20) — lock 30°, limit 0,5 mm, strength 1");
{
  const g = new THREE.BoxGeometry(0.1, 0.1, 0.1, 20, 20, 20);
  const w = weld(g);
  const volBefore = volume(w.pos, w.tri);
  const boxBefore = bbox(g);
  const res = kit.sand({ strength: 1, limit: 0.0005, lock: 30 }, "hộp", [g]);
  report(res.info);
  const outW = weld(res.geometry);
  const volAfter = volume(outW.pos, outW.tri);
  check("thể tích đổi < 0,1 %", Math.abs(volAfter / volBefore - 1) < 0.001, `${(volAfter / volBefore * 100 - 100).toFixed(4)} %`);
  check("khung bao giữ nguyên (cạnh không bị bo)", sameBox(boxBefore, bbox(res.geometry), 1e-9));
  check("không đỉnh nào dời quá limit", cmpDisp(w.pos, outW.pos) <= 0.0005 + 1e-9, `${(cmpDisp(w.pos, outW.pos) * 1000).toFixed(3)} mm`);
}

// ── ca 4: tấm dày 2 mm có gợn, mài cả cạnh sắc — không được ăn thủng ──
line("[ca 4] tấm 100 × 100 × 2 mm có gợn — lock 180 (mài cả cạnh), limit 0,5 mm");
{
  const g = roughen(new THREE.BoxGeometry(0.1, 0.002, 0.1, 40, 1, 40), 0.0003);
  const w = weld(g);
  const volBefore = volume(w.pos, w.tri);
  const med = medianEdge(w);
  const dev0 = thicknessDev(w.pos);
  const res = kit.sand({ strength: 0.6, limit: 0.0005, lock: 180 }, "tấm", [g]);
  report(res.info);
  const outW = weld(res.geometry);
  const volAfter = volume(outW.pos, outW.tri);
  const dev1 = thicknessDev(outW.pos);
  check("vẫn kín (0 cạnh biên)", boundaryEdges(outW.tri) === 0);
  check("thể tích giảm < 8 %", volAfter / volBefore - 1 > -0.08, `${(volAfter / volBefore * 100 - 100).toFixed(2)} %`);
  line("         (tấm 2 mm có nhiễu ±0,3 mm: san phẳng làm thể tích giảm vài % là đúng — nhiễu lồi lõm"
    + " từng mặt cộng lại thành thể tích dư; đây không phải ăn thủng)");
  check("dày đều hơn (lệch giảm ≥ 50 %)", dev1 / dev0 <= 0.5, `${(dev0 * 1000).toFixed(3)} → ${(dev1 * 1000).toFixed(3)} mm (−${((1 - dev1 / dev0) * 100).toFixed(0)} %)`);
}

// ── ca 5: gọi 5 lần liên tiếp — phải dừng đúng ở limit ──
line("[ca 5] mài 5 lần liên tiếp trên trụ ở ca 1 (limit 0,3 mm)");
{
  let cur = cyl;
  const disps = [];
  for (let k = 0; k < 5; k++) {
    const res = kit.sand({ strength: 0.6, limit: 0.0003 }, `lần ${k + 1}`, [cur]);
    cur = res.geometry;
    disps.push(cmpDisp(cylW.pos, weld(cur).pos));
  }
  const last = weld(cur);
  const total = cmpDisp(cylW.pos, last.pos);
  check("tổng độ dời sau 5 lần ≤ limit", total <= 0.0003 + 1e-6, `${(total * 1000).toFixed(3)} mm`);
  check("đã bão hoà (lần 5 không dời thêm > 5 % so với lần 1)", disps[4] / disps[0] <= 1.05, `${(disps[0] * 1000).toFixed(3)} → ${(disps[4] * 1000).toFixed(3)} mm`);
}

// ── ca 6: vùng near — đỉnh ngoài reach phải ĐỨNG YÊN ──
line("[ca 6] vùng near: hộp 200³ + hộp nhỏ cách mặt 5 mm — reach 10 mm, limit 0,2 mm");
{
  const a = roughen(new THREE.BoxGeometry(0.2, 0.2, 0.2, 20, 20, 20), 0.0002);
  const b = new THREE.BoxGeometry(0.02, 0.02, 0.02);
  b.computeBoundingBox();
  b.translate(0, 0.11, 0);
  const res = kit.sand({ strength: 0.8, limit: 0.0002, region: "near", reach: 0.01, lock: 180 }, "hộp A", [a, b]);
  report(res.info);
  // hộp B: y 0,1 … 0,12, x/z −0,01 … 0,01 → khoảng cách tới hộp B
  const dist = (x, y, z) => {
    const dx = Math.max(Math.abs(x) - 0.01, 0);
    const dz = Math.max(Math.abs(z) - 0.01, 0);
    const dy = Math.max(0.1 - y, y - 0.12, 0);
    return Math.hypot(dx, dy, dz);
  };
  const before = a.attributes.position;
  const out = res.geometry.attributes.position;
  let outsideMoved = 0;
  let insideMoved = 0;
  for (let i = 0; i < before.count; i++) {
    const disp = Math.hypot(out.getX(i) - before.getX(i), out.getY(i) - before.getY(i), out.getZ(i) - before.getZ(i));
    const d0 = dist(before.getX(i), before.getY(i), before.getZ(i));
    if (d0 >= 0.01 && disp > 1e-12) outsideMoved++;
    if (d0 < 0.005 && disp > 1e-9) insideMoved++;
  }
  check("đỉnh ngoài reach KHÔNG dời (0 đỉnh)", outsideMoved === 0, `${outsideMoved} đỉnh`);
  check("đỉnh trong vùng có dời (mài có tác dụng)", insideMoved > 0, `${insideMoved} đỉnh`);
}

// ── ca 7: lỗi phải rõ ràng ──
line("[ca 7] lỗi");
{
  const t = (fn) => {
    try {
      fn();
      return "(không ném lỗi)";
    } catch (e) {
      return e.message;
    }
  };
  const g = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  line(`    region near thiếu hình 2: ${t(() => kit.sand({ region: "near" }, "x", [g]))}`);
  line(`    limit quá lớn: ${t(() => kit.sand({ limit: 0.05 }, "x", [g]))}`);
  line(`    lock 180 nhưng vùng rỗng: ${t(() => kit.sand({ region: "near", reach: 0.0001 }, "x", [g, new THREE.BoxGeometry(0.01, 0.01, 0.01).translate(1, 1, 1)]))}`);
}

line("");
line(fails ? `${fails} ca HỎNG` : "tất cả ca đạt");
process.exit(fails ? 1 : 0);
