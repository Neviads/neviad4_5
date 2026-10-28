// ĐẮP mối nối bộ 3 ống gió bằng shape_bevel (add), trên hình ba ống ĐÂM vào nhau.
// 3 ống ĐẶC (dựng theo đúng chiều dày / chiều dài của ong-gio) → union + đắp cung từng mối → khoét lòng.
// Chạy: node fe/scripts/assembly-bridge/bevel-ong.mjs
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
const kitFile = join(cache, "kit-bevel-ong.mjs");
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
const src = state.assemblies.find((a) => a.id === "ong-gio");
if (!src) throw new Error("Không có bản ong-gio");
const doc = JSON.parse(JSON.stringify(src.doc));

kit.buildShapes(doc);
const solved = kit.solve(doc, kit.registryFor(doc));
const world = (id) => new THREE.Matrix4().fromArray(solved.parts.get(id).world);
const f = (v) => +v.toFixed(5);

const R = 0.014; // bán kính cung đắp ở mối nối
const BEVEL = { mode: "add", radius: R, profile: 0.42, strength: 0.65, detail: +(R / 3.5).toFixed(5), maxTriangles: 400000 };
const SEG = 128;

const ids = ["ong1", "ong2", "ong3"];
const posId = {}, boreId = {};
for (const partId of ids) {
  const part = doc.parts.find((p) => p.id === partId);
  const node = doc.shapes.find((s) => s.id === String(part.type).replace(/^shape:/, ""));
  const pts = node.params.profile.pts;
  // chiều dài và hai bán kính lấy đúng từ hình gốc (ống ngang giờ dài 440 mm, ống chéo 360 mm)
  const half = Math.max(...pts.map((q) => Math.abs(q[1])));
  const rOut = Math.max(...pts.map((q) => q[0]));
  const rIn = Math.min(...pts.map((q) => q[0]));
  // khối đặc: cùng trục, cùng chiều dài
  const SOLID = { pts: [[0, -half], [rOut, -half], [rOut, half], [0, half]], closed: false };
  // lòng: thò ra ngoài miệng 0,5 mm để dao cắt sạch mép
  const BORE = { pts: [[0, -half - 0.0005], [rIn, -half - 0.0005], [rIn, half + 0.0005], [0, half + 0.0005]], closed: false };
  const t = new THREE.Vector3().setFromMatrixPosition(world(partId));
  const rot = node.rotate ? { rotate: [...node.rotate] } : {};
  posId[partId] = `${partId}Pos`;
  boreId[partId] = `${partId}Long`;
  doc.shapes.push({ id: posId[partId], op: "lathe", params: { profile: SOLID, segments: SEG }, offset: t.toArray().map(f), ...rot });
  doc.shapes.push({ id: boreId[partId], op: "lathe", params: { profile: BORE, segments: SEG }, offset: t.toArray().map(f), ...rot });
  console.log(`${partId}: dài ${(half * 2000).toFixed(0)} mm, Ø${(rOut * 2000).toFixed(0)} ngoài / Ø${(rIn * 2000).toFixed(0)} lòng, tâm (${t.toArray().map(f).join(", ")})`);
}

// mối 1: ống ngang dưới + ống chéo;  mối 2: (kết quả) + ống ngang trên
doc.shapes.push({ id: "noi1", op: "bevel", params: BEVEL, inputs: [posId.ong1, posId.ong2] });
doc.shapes.push({ id: "noi2", op: "bevel", params: BEVEL, inputs: ["noi1", posId.ong3] });
doc.shapes.push({
  id: "ongHanSach",
  op: "boolean",
  params: { op: "subtract", smooth: true },
  inputs: ["noi2", boreId.ong1, boreId.ong2, boreId.ong3],
});

const t0 = Date.now();
const built = kit.buildShapes(doc, ["ongHanSach"]);
const g = built.get("ongHanSach").geometry;
g.computeBoundingBox();
console.log(`ongHanSach: ${(g.index?.count ?? g.attributes.position.count) / 3} tam giác, ${Date.now() - t0} ms`);
for (const id of ["noi1", "noi2", "ongHanSach"]) {
  for (const line of built.get(id).info) console.log(`  [${id}] ${line}`);
}

// dời về tâm, đáy chạm sàn
const c = g.boundingBox.getCenter(new THREE.Vector3());
const fin = doc.shapes.find((s) => s.id === "ongHanSach");
fin.offset = [f(-c.x), f(-g.boundingBox.min.y), f(-c.z)];

const keep = [...ids.map((p) => posId[p]), ...ids.map((p) => boreId[p]), "noi1", "noi2", "ongHanSach"];
const docOut = {
  ...doc,
  id: "ong-gio-han",
  title: "Ba ống gió đâm vào nhau — đã đắp mối nối",
  materials: { nhomOng: { preset: "brushedAluminium", overrides: { anisotropy: 0, roughness: 0.5, metalness: 0.7, color: "#c2c8d0" } } },
  shapes: doc.shapes.filter((s) => keep.includes(s.id)),
  parts: [{ id: "ong", type: "shape:ongHanSach", params: {}, material: "nhomOng", place: { kind: "onto", a: "ong.bottom", b: "ground.top", at: [0, 0] } }],
  joints: [],
  routes: [],
};

const chk = kit.buildShapes(doc, ["ongHanSach"]).get("ongHanSach");
chk.geometry.computeBoundingBox();
console.log(`khung bao sau khi dời: ${chk.geometry.boundingBox.min.toArray().map(f)} → ${chk.geometry.boundingBox.max.toArray().map(f)}`);

const prev = state.assemblies.find((a) => a.id === "ong-gio-han");
state.assemblies = state.assemblies.filter((a) => a.id !== "ong-gio-han");
state.assemblies.push({
  ...JSON.parse(JSON.stringify(src)),
  id: "ong-gio-han",
  title: "Ba ống gió đâm vào nhau — đã đắp mối nối",
  rev: (prev?.rev ?? 0) + 1,
  updatedAt: new Date().toISOString(),
  doc: docOut,
});
state.version = (state.version ?? 0) + 1;
writeFileSync(stateFile, JSON.stringify(state));
console.log("Đã ghi bản ong-gio-han.");
