// MÀI bộ ống gió: thêm bước sand sau boolean của ong-gio-han, ghi thành bản MỚI "ong-gio-mai"
// (giữ ong-gio-han nguyên làm bản "trước" để so).
// Chạy: node fe/scripts/assembly-bridge/mai-ong.mjs
import { build } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as THREE from "three";

const here = dirname(fileURLToPath(import.meta.url));
const FE_ROOT = resolve(here, "../..");
const stateFile = join(FE_ROOT, ".assembly-bridge", "state.json");
const cache = join(FE_ROOT, "node_modules/.cache/assembly-bridge");
mkdirSync(cache, { recursive: true });
const kitFile = join(cache, "kit-mai-ong.mjs");
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

const state = JSON.parse(readFileSync(stateFile, "utf8"));
const src = state.assemblies.find((a) => a.id === "ong-gio-han");
if (!src) throw new Error("Không có bản ong-gio-han");
const doc = JSON.parse(JSON.stringify(src.doc));
const f = (v) => +v.toFixed(5);

// lấy mốc để so: hỏng thì dừng
kit.buildShapes(doc, ["ongHanSach"]);
const base = kit.buildShapes(doc, ["ongHanSach"]).get("ongHanSach");
base.geometry.computeBoundingBox();
const volBase = (() => {
  const m = kit.toManifold(base.geometry, "trước khi mài");
  const v = m.volume();
  m.delete();
  return v;
})();

// ── bước mài ──
const SAND = {
  strength: 0.6,
  limit: +(process.env.MAI_LIMIT ?? 0.001),
  radius: +(process.env.MAI_RADIUS ?? 0.02),
  lock: 30,
};
doc.shapes.push({ id: "ongSach", op: "sand", params: SAND, inputs: ["ongHanSach"] });
// bộ phận dùng hình đã mài
doc.parts = doc.parts.map((p) => (String(p.type) === "shape:ongHanSach" ? { ...p, type: "shape:ongSach" } : p));

const sanded = kit.buildShapes(doc, ["ongSach"]).get("ongSach");
const g = sanded.geometry;
g.computeBoundingBox();
console.log(`ongSach: ${(g.index?.count ?? g.attributes.position.count) / 3} tam giác`);
for (const line of sanded.info) console.log(`  ${line}`);
const m = kit.toManifold(g, "sau khi mài");
console.log(`thể tích: ${volBase.toPrecision(6)} → ${m.volume().toPrecision(6)} m³ (${((m.volume() / volBase - 1) * 100).toFixed(2)} %)`);
m.delete();

// dời về tâm, đáy chạm sàn (như bevel-ong)
const c = g.boundingBox.getCenter(new THREE.Vector3());
const fin = doc.shapes.find((s) => s.id === "ongSach");
fin.offset = [f(-c.x), f(-g.boundingBox.min.y), f(-c.z)];

const docOut = {
  ...doc,
  id: "ong-gio-mai",
  title: "Ba ống gió đâm vào nhau — đã đắp mối + mài bề mặt",
  parts: doc.parts.map((p) => (p.id === "ong" ? { ...p, type: "shape:ongSach" } : p)),
  joints: [],
  routes: [],
};

const prev = state.assemblies.find((a) => a.id === "ong-gio-mai");
state.assemblies = state.assemblies.filter((a) => a.id !== "ong-gio-mai");
state.assemblies.push({
  ...JSON.parse(JSON.stringify(src)),
  id: "ong-gio-mai",
  title: docOut.title,
  rev: (prev?.rev ?? 0) + 1,
  updatedAt: new Date().toISOString(),
  doc: docOut,
});
state.version = (state.version ?? 0) + 1;
writeFileSync(stateFile, JSON.stringify(state));
console.log("Đã ghi bản ong-gio-mai.");
