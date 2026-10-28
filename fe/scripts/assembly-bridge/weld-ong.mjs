// Áp dụng weld cho 3 ống gió.
// Cách làm: hàn trên khối ĐẶC (vách ống mỏng làm mối hàn bị rách khi làm mượt), rồi khoét lòng ống
// ở hai đầu tự do — nhìn vẫn là ống hở, mà mối nối sạch.
// Chạy: node fe/scripts/assembly-bridge/weld-ong.mjs
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
const kitFile = join(cache, "kit-weld-ong.mjs");
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

const SOLID = { pts: [[0, -0.18], [0.06, -0.18], [0.06, 0.18], [0, 0.18]], closed: false }; // trụ đặc Ø120 × 360
const BORE = { pts: [[0, -0.14], [0.052, -0.14], [0.052, 0.14], [0, 0.14]], closed: false }; // lòng Ø104 × 280

// 1. bản đặc của từng đoạn, đặt sẵn ở toạ độ thế giới
const posIds = {};
for (const [i, partId] of ["ong1", "ong2", "ong3"].entries()) {
  const part = doc.parts.find((p) => p.id === partId);
  const node = doc.shapes.find((s) => s.id === String(part.type).replace(/^shape:/, ""));
  const t = new THREE.Vector3().setFromMatrixPosition(world(partId));
  const id = `ong${i + 1}Pos`;
  posIds[partId] = id;
  doc.shapes.push({
    id,
    op: "lathe",
    params: { profile: SOLID, segments: 64 },
    offset: t.toArray().map((v) => +v.toFixed(5)),
    ...(node.rotate ? { rotate: [...node.rotate] } : {}),
  });
}

// 2. hàn: (ong1 + ong2) + ong3 — khối đặc nên chỉ còn một mối nối ngoài
const WELD = { radius: 0.02, strength: 0.65, detail: 0.01, maxTriangles: 120000 };
doc.shapes.push({ id: "noi1", op: "weld", params: WELD, inputs: [posIds.ong1, posIds.ong2] });
doc.shapes.push({ id: "ongHan", op: "weld", params: WELD, inputs: ["noi1", posIds.ong3] });

// 3. khoét lòng ở hai đầu tự do (ống dưới hở đầu +x, ống trên hở đầu -x)
const p1 = new THREE.Vector3().setFromMatrixPosition(world("ong1"));
const p3 = new THREE.Vector3().setFromMatrixPosition(world("ong3"));
const f = (v) => +v.toFixed(5);
doc.shapes.push({
  id: "longDuoi",
  op: "lathe",
  params: { profile: BORE, segments: 64 },
  rotate: [0, 0, -90],
  offset: [f(p1.x + 0.05), f(p1.y), 0],
});
doc.shapes.push({
  id: "longTren",
  op: "lathe",
  params: { profile: BORE, segments: 64 },
  rotate: [0, 0, -90],
  offset: [f(p3.x - 0.05), f(p3.y), 0],
});
doc.shapes.push({ id: "ongHan2", op: "boolean", params: { op: "subtract" }, inputs: ["ongHan", "longDuoi", "longTren"] });

// 4. dựng thử trong Node trước khi ghi
const t0 = Date.now();
const built = kit.buildShapes(doc, ["ongHan2"]);
const g = built.get("ongHan2").geometry;
g.computeBoundingBox();
const bb = g.boundingBox;
console.log(`ongHan2: ${(g.index?.count ?? g.attributes.position.count) / 3} tam giác, ${Date.now() - t0} ms`);
console.log(`khung bao ${bb.min.toArray().map((v) => +v.toFixed(4))} → ${bb.max.toArray().map((v) => +v.toFixed(4))}`);
for (const line of built.get("ongHan2").info ?? []) console.log(`  ${line}`);

// 5. dời cả cụm về tâm để đặt lại bằng onto(ground.top)
const c = bb.getCenter(new THREE.Vector3());
const fin = doc.shapes.find((s) => s.id === "ongHan2");
fin.offset = [f(-c.x), 0, f(-c.z)];

// 6. bản mới chỉ còn một bộ phận dùng hình đã hàn + khoét
const keep = ["ong1Pos", "ong2Pos", "ong3Pos", "noi1", "ongHan", "longDuoi", "longTren", "ongHan2"];
const docOut = {
  ...doc,
  id: "ong-gio-han",
  title: "Ba ống gió — đã hàn",
  shapes: doc.shapes.filter((s) => keep.includes(s.id)),
  parts: [{ id: "ong", type: "shape:ongHan2", place: { kind: "onto", a: "ong.bottom", b: "ground.top", at: [0, 0] } }],
  joints: [],
  routes: [],
};

state.assemblies = state.assemblies.filter((a) => a.id !== "ong-gio-han");
state.assemblies.push({ ...JSON.parse(JSON.stringify(src)), id: "ong-gio-han", title: "Ba ống gió — đã hàn", rev: 1, updatedAt: new Date().toISOString(), doc: docOut });
state.version = (state.version ?? 0) + 1;
writeFileSync(stateFile, JSON.stringify(state));
console.log("Đã ghi bản ong-gio-han.");
