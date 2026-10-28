// Dựng bản thử "thu-vai": thân áo + 2 tay áo hàn thành MỘT hình, để so ảnh với bản gốc.
// Đồng thời trả lại bộ màu gốc cho cả hai bản (đang bị gán vật liệu "luoi" để xem lưới).
// Chạy: node fe/scripts/assembly-bridge/weld-demo.mjs
import { build } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as THREE from "three";

const here = dirname(fileURLToPath(import.meta.url));
const FE_ROOT = resolve(here, "../..");
const stateFile = join(FE_ROOT, ".assembly-bridge", "state.json");
const backupFile = join(FE_ROOT, ".assembly-bridge", "nguoi-mau.materials.backup.json");

const state = JSON.parse(readFileSync(stateFile, "utf8"));
const backup = JSON.parse(readFileSync(backupFile, "utf8"));
const original = state.assemblies.find((x) => x.id === "nguoi-mau");
if (!original) throw new Error("Không có bản nguoi-mau trong state.json");

/** Trả vật liệu gốc cho mọi hình / bộ phận (bỏ "luoi" sau khi xem lưới). */
function restoreColors(doc) {
  for (const s of doc.shapes ?? []) {
    const m = backup.shapeMaterials[s.id];
    if (m) s.material = m;
    else if (s.material === "luoi") delete s.material;
  }
  for (const p of doc.parts ?? []) {
    const m = backup.partMaterials[p.id];
    if (m) p.material = m;
    else if (p.material === "luoi") delete p.material;
  }
  if (doc.materials?.luoi) delete doc.materials.luoi;
}

restoreColors(original.doc);
original.rev = (original.rev ?? 0) + 1;

// ── bản thử ──
const doc = JSON.parse(JSON.stringify(original.doc));
restoreColors(doc);

// vị trí tay áo trong khung của hình thân áo (shape space ↔ world của bộ phận)
const cache = join(FE_ROOT, "node_modules/.cache/assembly-bridge");
mkdirSync(cache, { recursive: true });
const kitFile = join(cache, "kit-demo.mjs");
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
kit.buildShapes(doc);
const reg = kit.registryFor(doc);
const s = kit.solve(doc, reg);
const thanInv = new THREE.Matrix4().fromArray(s.parts.get("than").world).invert();
const sleeve = doc.shapes.find((n) => n.id === "tayAo");
if (!sleeve) throw new Error("Không có hình tayAo");

const put = (id, partId) => {
  const rel = thanInv.clone().multiply(new THREE.Matrix4().fromArray(s.parts.get(partId).world));
  const p = new THREE.Vector3().setFromMatrixPosition(rel);
  const q = new THREE.Quaternion().setFromRotationMatrix(rel);
  const e = new THREE.Euler().setFromQuaternion(q, "XYZ");
  const deg = [e.x, e.y, e.z].map((v) => +((v * 180) / Math.PI).toFixed(4));
  console.log(`${partId} trong khung thân áo: dịch ${p.toArray().map((v) => +v.toFixed(4))}, xoay ${deg}`);
  doc.shapes.push({
    id,
    op: "lathe",
    params: JSON.parse(JSON.stringify(sleeve.params)),
    offset: p.toArray().map((v) => +v.toFixed(5)),
    ...(deg.some((v) => Math.abs(v) > 1e-3) ? { rotate: deg } : {}),
    material: "ao",
  });
  return id;
};

const left = put("tayAoTrai", "tayAoT");
const right = put("tayAoPhai", "tayAoP");

doc.shapes.push({ id: "vaiWeld1", op: "weld", params: {}, inputs: ["than", left], material: "ao" });
doc.shapes.push({ id: "vaiWeld", op: "weld", params: {}, inputs: ["vaiWeld1", right], material: "ao" });

// bộ phận: thân áo dùng hình đã hàn; bỏ hai tay áo rời (và gấu tay đi kèm)
const drop = new Set(["tayAoT", "tayAoP", "gauAoT", "gauAoP"]);
doc.parts = doc.parts.filter((p) => !drop.has(p.id));
const thanPart = doc.parts.find((p) => p.id === "than");
thanPart.type = "shape:vaiWeld";

doc.id = "thu-vai";
doc.title = "Người mẫu — vai đã hàn (thử)";
doc.shapes = doc.shapes.filter((n, i, arr) => arr.findIndex((x) => x.id === n.id) === i);

const copy = {
  id: "thu-vai",
  title: doc.title,
  rev: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  doc,
};

state.assemblies = state.assemblies.filter((x) => x.id !== "thu-vai");
state.assemblies.push(copy);
state.version = (state.version ?? 0) + 1;
writeFileSync(stateFile, JSON.stringify(state));
console.log(`Đã ghi: nguoi-mau rev ${original.rev} (màu gốc) + thu-vai (thân áo hàn 2 tay áo).`);
