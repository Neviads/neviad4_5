// Hàn hai mối nối của bộ 3 ống gió — CHỈ làm mượt chỗ nối, không đổi hình, không thêm khớp.
// Vì thành ống 8 mm mỏng, hàn trên ống rỗng bị rách: hàn trên 3 khối ĐẶC rồi khoét lòng Ø104
// xuyên cả 3 ống (lòng ba ống gặp nhau ở góc nên vẫn thông).
// Chạy: node fe/scripts/assembly-bridge/weld-ong2.mjs
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
const kitFile = join(cache, "kit-weld-ong2.mjs");
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

const SOLID = { pts: [[0, -0.18], [0.06, -0.18], [0.06, 0.18], [0, 0.18]], closed: false }; // trụ đặc Ø120 × 360
// lòng Ø104: chỉ thò 0,5 mm ra ngoài miệng — thò nhiều thì dao khoét ăn vào thân ống bên kia ở góc nối
const BORE = { pts: [[0, -0.1805], [0.052, -0.1805], [0.052, 0.1805], [0, 0.1805]], closed: false };
const WELD = { radius: 0.02, strength: 0.65, detail: 0.006, maxTriangles: 200000 };

const ids = ["ong1", "ong2", "ong3"];
const posId = {}, boreId = {};
for (const partId of ids) {
  const part = doc.parts.find((p) => p.id === partId);
  const node = doc.shapes.find((s) => s.id === String(part.type).replace(/^shape:/, ""));
  const t = new THREE.Vector3().setFromMatrixPosition(world(partId));
  const rot = node.rotate ? { rotate: [...node.rotate] } : {};
  posId[partId] = `${partId}Pos`;
  boreId[partId] = `${partId}Long`;
  doc.shapes.push({ id: posId[partId], op: "lathe", params: { profile: SOLID, segments: 64 }, offset: t.toArray().map(f), ...rot });
  doc.shapes.push({ id: boreId[partId], op: "lathe", params: { profile: BORE, segments: 64 }, offset: t.toArray().map(f), ...rot });
}

// hàn: (ong1 + ong2) rồi + ong3
doc.shapes.push({ id: "noi1", op: "weld", params: WELD, inputs: [posId.ong1, posId.ong2] });
doc.shapes.push({ id: "ongHan", op: "weld", params: WELD, inputs: ["noi1", posId.ong3] });
// khoét lòng cả 3 ống cùng lúc
doc.shapes.push({
  id: "ongHanSach",
  op: "boolean",
  params: { op: "subtract" },
  inputs: ["ongHan", boreId.ong1, boreId.ong2, boreId.ong3],
});

const t0 = Date.now();
const built = kit.buildShapes(doc, ["ongHanSach"]);
const g = built.get("ongHanSach").geometry;
g.computeBoundingBox();
console.log(`ongHanSach: ${(g.index?.count ?? g.attributes.position.count) / 3} tam giác, ${Date.now() - t0} ms`);
console.log(`khung bao ${g.boundingBox.min.toArray().map(f)} → ${g.boundingBox.max.toArray().map(f)}`);
for (const line of built.get("ongHanSach").info ?? []) console.log(`  ${line}`);

// dời về tâm, đáy chạm sàn
const c = g.boundingBox.getCenter(new THREE.Vector3());
const fin = doc.shapes.find((s) => s.id === "ongHanSach");
fin.offset = [f(-c.x), f(-g.boundingBox.min.y), f(-c.z)];

const keep = [...ids.map((p) => posId[p]), ...ids.map((p) => boreId[p]), "noi1", "ongHan", "ongHanSach"];
const docOut = {
  ...doc,
  id: "ong-gio-han",
  title: "Ba ống gió — đã hàn (mượt mối nối)",
  shapes: doc.shapes.filter((s) => keep.includes(s.id)),
  parts: [{ id: "ong", type: "shape:ongHanSach", params: {}, place: { kind: "onto", a: "ong.bottom", b: "ground.top", at: [0, 0] } }],
  joints: [],
  routes: [],
};

// dựng lại lần cuối để chắc bản ghi đúng
const chk = kit.buildShapes(doc, ["ongHanSach"]).get("ongHanSach");
chk.geometry.computeBoundingBox();
console.log(`sau khi dời: ${chk.geometry.boundingBox.min.toArray().map(f)} → ${chk.geometry.boundingBox.max.toArray().map(f)}`);

const prev = state.assemblies.find((a) => a.id === "ong-gio-han");
state.assemblies = state.assemblies.filter((a) => a.id !== "ong-gio-han");
state.assemblies.push({
  ...JSON.parse(JSON.stringify(src)),
  id: "ong-gio-han",
  title: "Ba ống gió — đã hàn (mượt mối nối)",
  rev: (prev?.rev ?? 0) + 1,
  updatedAt: new Date().toISOString(),
  doc: docOut,
});
state.version = (state.version ?? 0) + 1;
writeFileSync(stateFile, JSON.stringify(state));
console.log("Đã ghi bản ong-gio-han.");
