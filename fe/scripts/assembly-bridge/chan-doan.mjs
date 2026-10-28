// Chẩn đoán hình học ba ống: mỗi đầu ống nằm ở đâu so với ống bên kia (chôn trong ống, hay thò ra ngoài).
// Chạy: node fe/scripts/assembly-bridge/chan-doan.mjs
import { build } from "esbuild";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as THREE from "three";

const here = dirname(fileURLToPath(import.meta.url));
const FE_ROOT = resolve(here, "../..");
const cache = join(FE_ROOT, "node_modules/.cache/assembly-bridge");
mkdirSync(cache, { recursive: true });
const kitFile = join(cache, "kit-chan-doan.mjs");
await build({
  entryPoints: [join(FE_ROOT, "assembly-kit/node.ts")],
  bundle: true, platform: "node", format: "esm", outfile: kitFile,
  external: ["three", "manifold-3d"], logLevel: "error",
});
const kit = await import(pathToFileURL(kitFile).href);
await kit.initKernel(() => import("manifold-3d"));

const state = JSON.parse(readFileSync(join(FE_ROOT, ".assembly-bridge/state.json"), "utf8"));
const doc = state.assemblies.find((a) => a.id === "ong-gio").doc;
kit.buildShapes(doc);
const solved = kit.solve(doc, kit.registryFor(doc));

const mm = (v) => `${(v * 1000).toFixed(1)} mm`;
const R = 0.06, HALF = 0.18;

const parts = {};
for (const p of doc.parts) {
  const node = doc.shapes.find((s) => s.id === String(p.type).replace(/^shape:/, ""));
  const m = new THREE.Matrix4().fromArray(solved.parts.get(p.id).world);
  const c = new THREE.Vector3().setFromMatrixPosition(m);
  // trục ống = trục y của hình lathe, xoay theo `rotate` của chính nút hình (bộ phận chỉ dời chỗ)
  const rot = node.rotate ?? [0, 0, 0];
  const axis = new THREE.Vector3(0, 1, 0)
    .applyEuler(new THREE.Euler((rot[0] * Math.PI) / 180, (rot[1] * Math.PI) / 180, (rot[2] * Math.PI) / 180, "XYZ"))
    .normalize();
  parts[p.id] = { c, axis, node: rot };
  console.log(`${p.id}: tâm (${[c.x, c.y, c.z].map((v) => v.toFixed(4)).join(", ")}), trục (${[axis.x, axis.y, axis.z].map((v) => v.toFixed(3)).join(", ")}), rotate ${JSON.stringify(rot)}`);
}

/** Điểm `pt` nằm trong ống `q` không: trả về {trong, dọc, ngang} (dọc = vị trí theo trục, ngang = bán kính). */
function inside(q, pt) {
  const v = pt.clone().sub(q.c);
  const t = v.dot(q.axis);
  const radial = v.clone().addScaledVector(q.axis, -t).length();
  return { trong: Math.abs(t) < HALF && radial < R, doc: t, ngang: radial };
}

console.log("\n──── ĐẦU ỐNG NẰM Ở ĐÂU ────");
const pairs = [["ong1", "ong2"], ["ong2", "ong1"], ["ong2", "ong3"], ["ong3", "ong2"]];
for (const [a, b] of pairs) {
  const A = parts[a], B = parts[b];
  for (const sign of [1, -1]) {
    const end = A.c.clone().addScaledVector(A.axis, sign * HALF);
    const r = inside(B, end);
    const p = [end.x, end.y, end.z].map((v) => v.toFixed(4)).join(", ");
    console.log(
      `  đầu ${sign > 0 ? "+" : "−"} của ${a} ở (${p}): ${r.trong ? "NẰM TRONG" : "Ở NGOÀI"} ${b}` +
        ` — dọc ${r.doc >= 0 ? "+" : ""}${mm(r.doc)}, cách trục ${mm(r.ngang)} (bán kính ${mm(R)})`,
    );
  }
}

// hai trục có cắt nhau không, và khoảng cách giữa hai đầu ống
console.log("\n──── MỐI NỐI ────");
for (const [a, b] of [["ong1", "ong2"], ["ong2", "ong3"]]) {
  const A = parts[a], B = parts[b];
  const w0 = A.c.clone().sub(B.c);
  const cosAB = A.axis.dot(B.axis);
  const d = A.axis.dot(w0), e = B.axis.dot(w0);
  const den = 1 - cosAB * cosAB;
  const s = (cosAB * e - d) / den; // tham số trên trục A của điểm gần nhau nhất
  const t = (e - cosAB * d) / den;
  const pa = A.c.clone().addScaledVector(A.axis, s);
  const pb = B.c.clone().addScaledVector(B.axis, t);
  console.log(`  ${a} ↔ ${b}: góc ${((Math.acos(Math.abs(cosAB)) * 180) / Math.PI).toFixed(1)}°, hai trục cách nhau ${mm(pa.distanceTo(pb))}`);
  console.log(`    điểm giữa hai trục: (${[pa.x, pa.y, pa.z].map((v) => v.toFixed(4)).join(", ")}) — trên ${a} cách tâm ${mm(s)}, trên ${b} cách tâm ${mm(t)}`);
  console.log(`    ${a} dài ${mm(HALF * 2)}, điểm giao nằm ở ${((s + HALF) * 1000).toFixed(0)} mm tính từ đầu − của ${a}`);
}
