// Dựng "ống gió liền — cua cong mềm" cho đúng chữ Z: giữ ba hướng như bản ghép 3 ống
// (ống dưới nằm ngang, ống chéo 42°, ống trên nằm ngang), chỉ hai mối nối thành cua cong.
// Bán kính cua R = 1 × Ø (120 mm) — cua mềm thật thì phải có chỗ, nên đoạn chéo dài ra.
// Ruột ống: quét lại đúng đường tâm đó với bán kính 52 mm rồi trừ đi (thành dày 8 mm).
// Chạy: node fe/scripts/assembly-bridge/sweep-z.mjs
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
const kitFile = join(cache, "kit-sweep-z.mjs");
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

// ---- thông số thật ----
const R_OUT = 0.06; // ống Ø120
const R_IN = 0.052; // lòng Ø104 -> thành 8 mm
const R_BEND = 0.12; // bán kính cua = 1 × Ø
const D = (42 * Math.PI) / 180; // ống chéo 42° so với phương ngang
const A1 = [-0.02, 0.06]; // đỉnh cua dưới (giao hai đường tâm)
const LD = 0.7; // đoạn chéo giữa hai đỉnh cua
const ARM_B = 0.55; // cánh dưới, tính từ đỉnh cua tới miệng tự do
const ARM_T = 0.55; // cánh trên
const EXT = 0.05; // ruột thò ra ngoài hai đầu để miệng ống hở
const A2 = [A1[0] + LD * Math.cos(D), A1[1] + LD * Math.sin(D)];
const T = R_BEND / Math.tan(D / 2); // khoảng từ đỉnh cua tới chỗ bắt đầu cong

const P1 = [A1[0] + T, A1[1]];
const O1 = [P1[0], P1[1] + R_BEND];
const P2 = [A2[0] - T, A2[1]];
const O2 = [P2[0], P2[1] - R_BEND];
const DEG = Math.PI / 180;
const ARC = 180 - 42; // góc lái của mỗi cua: 138°

const arc = (o, a0, n = 80) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = (a0 - ARC * (i / n)) * DEG;
    return [o[0] + R_BEND * Math.cos(a), o[1] + R_BEND * Math.sin(a)];
  });

const straight = (a, b, n) =>
  Array.from({ length: n + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);

const S0 = [A1[0] + ARM_B, A1[1]]; // miệng dưới (bên phải)
const E0 = [A2[0] - ARM_T, A2[1]]; // miệng trên (bên trái)
const P1e = [A1[0] + T * Math.cos(D), A1[1] + T * Math.sin(D)]; // hết cung dưới, vào đoạn chéo
const P2s = [A2[0] - T * Math.cos(D), A2[1] - T * Math.sin(D)]; // hết đoạn chéo, vào cung trên

const pathOuter = [
  ...straight(S0, P1, 3),
  ...arc(O1, -90),
  ...straight(P1e, P2s, 3),
  ...arc(O2, 90),
  ...straight(P2, E0, 3),
];

// ruột: cùng đường tâm, hai đầu thò thêm EXT
const SO = [S0[0] + EXT, S0[1]];
const EO = [E0[0] - EXT, E0[1]];
const pathInner = [
  ...straight(SO, P1, 3),
  ...arc(O1, -90),
  ...straight(P1e, P2s, 3),
  ...arc(O2, 90),
  ...straight(P2, EO, 3),
];

const circle = (r, n = 48) =>
  Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n;
    return [+(r * Math.cos(a)).toFixed(6), +(r * Math.sin(a)).toFixed(6)];
  });
const clamp3 = (pts) => pts.map(([x, y]) => [+x.toFixed(5), +y.toFixed(5), 0]);

const state = JSON.parse(readFileSync(stateFile, "utf8"));
const src = state.assemblies.find((a) => a.id === "ong-gio");
if (!src) throw new Error("Không có bản ong-gio");
const base = JSON.parse(JSON.stringify(src.doc));

/** Thể tích có dấu: âm nghĩa là lưới bị lộn mặt (nhìn thấy mặt trong ống). */
function signedVolume(g) {
  const p = g.attributes.position.array;
  const idx = g.index ? g.index.array : null;
  const n = idx ? idx.length : p.length / 3;
  let v = 0;
  for (let i = 0; i < n; i += 3) {
    const a = idx ? idx[i] * 3 : i * 3, b = idx ? idx[i + 1] * 3 : i * 3 + 3, c = idx ? idx[i + 2] * 3 : i * 3 + 6;
    const ax = p[a], ay = p[a + 1], az = p[a + 2];
    const bx = p[b], by = p[b + 1], bz = p[b + 2];
    const cx = p[c], cy = p[c + 1], cz = p[c + 2];
    v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  return v;
}

const makeDoc = (flip) => ({
  ...base,
  id: "ong-z-mem",
  title: "Ba ống gió — cua cong mềm (chữ Z)",
  shapes: [
    {
      id: "voOng",
      op: "sweep",
      params: { section: { pts: circle(R_OUT), closed: true }, path: { pts: clamp3(pathOuter), smooth: false }, caps: true, samples: 700 },
      material: "brushedAluminium",
    },
    {
      id: "longOng",
      op: "sweep",
      params: { section: { pts: circle(R_IN), closed: true }, path: { pts: clamp3(pathInner), smooth: false }, caps: true, samples: 700 },
      ...(flip ? { offset: [0, 0, 0] } : {}),
    },
    { id: "ongZ", op: "boolean", params: { op: "subtract" }, inputs: ["voOng", "longOng"], material: "brushedAluminium" },
  ],
  parts: [{ id: "ong", type: "shape:ongZ", params: {}, place: { kind: "onto", a: "ong.bottom", b: "ground.top", at: [0, 0] } }],
  joints: [],
  routes: [],
});
let doc = makeDoc(false);
{
  const probe = kit.buildShapes(doc, ["voOng", "longOng", "ongZ"]);
  const vol = (id) => signedVolume(probe.get(id).geometry);
  console.log(`thử chiều mặt cắt: vỏ ${vol("voOng").toFixed(5)}, lòng ${vol("longOng").toFixed(5)}, kết quả ${vol("ongZ").toFixed(5)}`);
  if (vol("ongZ") < 0) {
    // lộn mặt -> đảo chiều mặt cắt (quét vòng ngược) rồi dựng lại
    doc = makeDoc(true);
    doc.shapes[0].params.section.pts = circle(R_OUT).reverse();
    doc.shapes[1].params.section.pts = circle(R_IN).reverse();
    const probe2 = kit.buildShapes(doc, ["voOng", "longOng", "ongZ"]);
    const vol2 = (id) => signedVolume(probe2.get(id).geometry);
    console.log(`đảo chiều: vỏ ${vol2("voOng").toFixed(5)}, lòng ${vol2("longOng").toFixed(5)}, kết quả ${vol2("ongZ").toFixed(5)}`);
    if (vol2("ongZ") < 0) throw new Error("Cả hai chiều đều lộn mặt — cần xem lại kiểu quét.");
  }
}

const t0 = Date.now();
const built = kit.buildShapes(doc, ["ongZ"]);
const g = built.get("ongZ").geometry;
g.computeBoundingBox();
const bb = g.boundingBox;
const tris = (g.index?.count ?? g.attributes.position.count) / 3;
console.log(`ongZ: ${tris} tam giác, ${Date.now() - t0} ms`);
console.log(`khung bao ${bb.min.toArray().map((v) => +v.toFixed(4))} → ${bb.max.toArray().map((v) => +v.toFixed(4))}`);
for (const line of built.get("ongZ").info ?? []) console.log(`  ${line}`);
console.log(`dài đường tâm ~ ${(-(bb.min.x) + bb.max.x).toFixed(3)} × ${(-(bb.min.y) + bb.max.y).toFixed(3)} m`);

// dời về tâm, đáy chạm sàn
const c = bb.getCenter(new THREE.Vector3());
const f = (v) => +v.toFixed(5);
doc.shapes.find((s) => s.id === "ongZ").offset = [f(-c.x), f(-bb.min.y), 0];

const check = kit.buildShapes(doc, ["ongZ"]).get("ongZ");
const bg = check.geometry;
bg.computeBoundingBox();
console.log(`sau khi dời: ${bg.boundingBox.min.toArray().map(f)} → ${bg.boundingBox.max.toArray().map(f)}`);

state.assemblies = state.assemblies.filter((a) => a.id !== "ong-z-mem");
state.assemblies.push({
  ...JSON.parse(JSON.stringify(src)),
  id: "ong-z-mem",
  title: "Ba ống gió — cua cong mềm (chữ Z)",
  rev: 1,
  updatedAt: new Date().toISOString(),
  doc,
});
state.version = (state.version ?? 0) + 1;
writeFileSync(stateFile, JSON.stringify(state));
console.log("Đã ghi bản ong-z-mem.");
