// Thử lệnh weld ngoài MCP: đóng gói kit như mcp.mjs rồi dựng vài ca, in số đo.
// Chạy: node fe/scripts/assembly-bridge/weld-selftest.mjs
import { build } from "esbuild";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const here = dirname(fileURLToPath(import.meta.url));
const FE_ROOT = resolve(here, "../..");
// phải nằm trong fe/ để Node tìm thấy three và manifold-3d trong node_modules
const dir = join(FE_ROOT, "node_modules/.cache/assembly-bridge");
mkdirSync(dir, { recursive: true });
const kitFile = join(dir, "kit-selftest.mjs");
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

/** Góc gãy lớn nhất giữa hai mặt kề (độ) + số cạnh gãy > 30°. */
function dihedral(geoIn) {
  const g = geoIn.index ? geoIn : mergeVertices(geoIn, 1e-6);
  const pos = g.attributes.position.array;
  const idx = g.index.array;
  const tris = idx.length / 3;
  const nrm = (t) => {
    const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    return [nx / len, ny / len, nz / len];
  };
  const edges = new Map();
  for (let t = 0; t < tris; t++) {
    for (let e = 0; e < 3; e++) {
      const a = idx[t * 3 + e], b = idx[t * 3 + ((e + 1) % 3)];
      const k = a < b ? `${a}_${b}` : `${b}_${a}`;
      const l = edges.get(k);
      if (l) l.push(t);
      else edges.set(k, [t]);
    }
  }
  let maxAngle = 0, sharp = 0;
  for (const [, fs] of edges) {
    if (fs.length !== 2) continue;
    const [n1, n2] = [nrm(fs[0]), nrm(fs[1])];
    const dot = Math.min(1, Math.max(-1, n1[0] * n2[0] + n1[1] * n2[1] + n1[2] * n2[2]));
    const ang = (Math.acos(dot) * 180) / Math.PI;
    if (ang > maxAngle) maxAngle = ang;
    if (ang > 30) sharp += 1;
  }
  return { tris, maxAngle: +maxAngle.toFixed(1), sharp };
}

const semi = (r) => ({
  pts: Array.from({ length: 17 }, (_, i) => {
    const t = (Math.PI * i) / 16;
    return [+(r * Math.sin(t)).toFixed(5), +(-r * Math.cos(t)).toFixed(5)];
  }),
});

const line = (s) => console.log(s);

// ── ca 1: hai quả cầu chồng nhau ──
{
  const doc = {
    id: "t1", title: "hai cau", parts: [], joints: [], routes: [], materials: {},
    shapes: [
      { id: "b1", op: "lathe", params: { profile: semi(0.05), segments: 48 } },
      { id: "b2", op: "lathe", params: { profile: semi(0.05), segments: 48 }, offset: [0.08, 0, 0] },
      { id: "u", op: "boolean", params: { op: "union" }, inputs: ["b1", "b2"] },
      { id: "w", op: "weld", params: { radius: 0.02 }, inputs: ["b1", "b2"] },
    ],
  };
  const built = kit.buildShapes(doc, ["u", "w"]);
  const u = dihedral(built.get("u").geometry), w = dihedral(built.get("w").geometry);
  line(`[ca 1] hai cầu Ø100 mm chồng 20 mm`);
  line(`  union  : ${u.tris} tam giác, góc gãy lớn nhất ${u.maxAngle}°, cạnh >30°: ${u.sharp}`);
  line(`  weld   : ${w.tris} tam giác, góc gãy lớn nhất ${w.maxAngle}°, cạnh >30°: ${w.sharp}`);
  line(`  ${built.get("w").info.join("\n  ")}`);
}

// ── ca 2: ống cắm vào hộp (giống tay áo cắm vào thân) ──
{
  const box = {
    pts: [[0.0, -0.2], [0.19, -0.2], [0.19, 0.2], [0.0, 0.2], [0.0, -0.2]],
  };
  const doc = {
    id: "t2", title: "ong vao hop", parts: [], joints: [], routes: [], materials: {},
    shapes: [
      { id: "hop", op: "extrude", params: { outline: { pts: [[-0.19, -0.2], [0.19, -0.2], [0.19, 0.2], [-0.19, 0.2], [-0.19, -0.2]], closed: true }, plane: "xz", depth: 0.45, edgeRadius: 0.01 } },
      { id: "ong", op: "lathe", params: { profile: semi(0.057), segments: 48 }, offset: [0.19, 0.25, 0.0] },
      { id: "u2", op: "boolean", params: { op: "union" }, inputs: ["hop", "ong"] },
      { id: "w2", op: "weld", params: { radius: 0.03 }, inputs: ["hop", "ong"] },
    ],
  };
  const built = kit.buildShapes(doc, ["u2", "w2"]);
  const u = dihedral(built.get("u2").geometry), w = dihedral(built.get("w2").geometry);
  line(`[ca 2] ống Ø114 cắm vào hộp dày 380`);
  line(`  union  : ${u.tris} tam giác, góc gãy lớn nhất ${u.maxAngle}°, cạnh >30°: ${u.sharp}`);
  line(`  weld   : ${w.tris} tam giác, góc gãy lớn nhất ${w.maxAngle}°, cạnh >30°: ${w.sharp}`);
  line(`  ${built.get("w2").info.join("\n  ")}`);
}

// ── ca 3: hình thật — thân áo + tay áo ──
{
  const file = join(FE_ROOT, ".assembly-bridge", "state.json");
  const state = JSON.parse(readFileSync(file, "utf8"));
  const doc = state.assemblies.find((a) => a.id === "nguoi-mau").doc;
  const test = {
    ...doc,
    shapes: [...doc.shapes, { id: "vaiWeldTest", op: "weld", params: {}, inputs: ["than", "tayAo"] }],
  };
  try {
    // chẩn đoán: lưới tay áo có kín không, và có kín sau khi hàn đỉnh ở 0,2 mm không
    const only = kit.buildShapes(doc, ["than", "tayAo"]);
    for (const id of ["than", "tayAo"]) {
      const g = only.get(id).geometry;
      let raw = "kín";
      try { kit.toManifold(g, id).delete(); } catch { raw = "KHÔNG kín"; }
      let loose = "kín";
      try { kit.toManifold(mergeVertices(g.index ? g.toNonIndexed() : g, 2e-4), id).delete(); } catch { loose = "KHÔNG kín"; }
      line(`  chẩn đoán ${id}: dung sai 1µm → ${raw}; dung sai 0,2 mm → ${loose}`);
    }
    {
      // đếm cạnh hở (chỉ 1 mặt kề) để biết lỗ ở đâu
      const g0 = only.get("tayAo").geometry;
      const m = mergeVertices(g0.index ? g0.toNonIndexed() : g0, 1e-6);
      const P = m.attributes.position.array, I = m.index.array;
      const edges = new Map();
      for (let t = 0; t < I.length; t += 3) {
        for (let e = 0; e < 3; e++) {
          const a = I[t + e], b = I[t + ((e + 1) % 3)];
          const k = a < b ? `${a}_${b}` : `${b}_${a}`;
          edges.set(k, (edges.get(k) ?? 0) + 1);
        }
      }
      const open = [...edges].filter(([, c]) => c === 1);
      const bb = g0.clone(); bb.computeBoundingBox();
      const flat = [...Array(P.length / 3)].filter((_, i) => Math.abs(P[i * 3]) < 1e-9).length;
      line(`  tayAo: ${m.attributes.position.count} đỉnh, ${I.length / 3} tam giác, ${open.length} cạnh hở, khung ${bb.boundingBox.min.toArray().map((v) => v.toFixed(4))} → ${bb.boundingBox.max.toArray().map((v) => v.toFixed(4))}, đỉnh x≈0: ${flat}`);
      for (const [k] of open.slice(0, 8)) {
        const [a, b] = k.split("_").map(Number);
        line(`    hở: ${[0, 1, 2].map((c) => P[a * 3 + c].toFixed(5)).join(", ")} ↔ ${[0, 1, 2].map((c) => P[b * 3 + c].toFixed(5)).join(", ")}`);
      }
    }
    const t0 = Date.now();
    const built = kit.buildShapes(test, ["vaiWeldTest"]);
    const g = built.get("vaiWeldTest").geometry;
    const d = dihedral(g);
    line(`[ca 3] thân áo + tay áo (hình thật)`);
    line(`  weld : ${d.tris} tam giác, góc gãy lớn nhất ${d.maxAngle}°, cạnh >30°: ${d.sharp}, ${Date.now() - t0} ms`);
    line(`  ${built.get("vaiWeldTest").info.join("\n  ")}`);
  } catch (e) {
    line(`[ca 3] LỖI: ${e.message}`);
  }
}
