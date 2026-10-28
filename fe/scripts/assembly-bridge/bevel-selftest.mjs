// Thử lệnh bevel ngoài MCP: đóng gói kit như mcp.mjs rồi dựng vài ca, in số đo.
// Chạy: node fe/scripts/assembly-bridge/bevel-selftest.mjs
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const here = dirname(fileURLToPath(import.meta.url));
const FE_ROOT = resolve(here, "../..");
const dir = join(FE_ROOT, "node_modules/.cache/assembly-bridge");
mkdirSync(dir, { recursive: true });
const kitFile = join(dir, "kit-bevel-selftest.mjs");
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

/** Thể tích + góc gãy lớn nhất (độ) + số cạnh gãy > 30° + có kín không. */
function stats(geoIn) {
  const g = geoIn.index ? geoIn : mergeVertices(geoIn, 1e-6);
  const pos = g.attributes.position.array;
  const idx = g.index.array;
  const nrm = (t) => {
    const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    return [nx / len, ny / len, nz / len];
  };
  const edges = new Map();
  for (let t = 0; t < idx.length / 3; t++) {
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
  let closed = "kín";
  try {
    kit.toManifold(geoIn, "kiểm").delete();
  } catch {
    closed = "KHÔNG kín";
  }
  let vol = NaN;
  try {
    const m = kit.toManifold(geoIn, "thể tích");
    vol = m.volume();
    m.delete();
  } catch {
    /* đã báo ở closed */
  }
  return { tris: idx.length / 3, maxAngle: +maxAngle.toFixed(1), sharp, vol, closed };
}

const show = (name, built, id) => {
  const s = stats(built.get(id).geometry);
  line(`  ${name.padEnd(6)}: ${s.tris} tam giác, thể tích ${s.vol.toPrecision(6)} m³, góc gãy max ${s.maxAngle}°, cạnh >30°: ${s.sharp}, ${s.closed}`);
  for (const msg of built.get(id).info) line(`         ${msg}`);
};

const box = (x0, x1, z0, z1) => ({
  op: "extrude",
  params: { outline: { pts: [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]], closed: true }, plane: "xz", depth: 0.24, edgeRadius: 0.002 },
});

const cyl = (r, h) => ({ pts: [[0, -h / 2], [r, -h / 2], [r, h / 2], [0, h / 2]], closed: false });

// ── ca 1: hai hộp ghép góc L — mode cut ──
{
  const doc = {
    id: "t1", title: "hop L", parts: [], joints: [], routes: [], materials: {},
    shapes: [
      { id: "a", ...box(-0.1, 0.1, 0.0, 0.4) },
      { id: "b", ...box(-0.1, 0.4, -0.1, 0.1) },
      { id: "u", op: "boolean", params: { op: "union" }, inputs: ["a", "b"] },
      { id: "bevCut", op: "bevel", params: { mode: "cut", radius: 0.02 }, inputs: ["a", "b"] },
    ],
  };
  line("[ca 1] hai hộp ghép góc L — cut r = 20 mm");
  const built = kit.buildShapes(doc, ["u", "bevCut"]);
  show("union", built, "u");
  show("bevel", built, "bevCut");
}

// ── ca 2: hai trụ vuông góc (chữ T) — mode add ──
{
  const doc = {
    id: "t2", title: "chu T", parts: [], joints: [], routes: [], materials: {},
    shapes: [
      { id: "a", op: "lathe", params: { profile: cyl(0.03, 0.4), segments: 64 }, offset: [0, 0.2, 0] },
      { id: "b", op: "lathe", params: { profile: cyl(0.03, 0.4), segments: 64 }, rotate: [0, 0, 90], offset: [0.12, 0.2, 0] },
      { id: "u", op: "boolean", params: { op: "union" }, inputs: ["a", "b"] },
      { id: "bevAdd", op: "bevel", params: { mode: "add", radius: 0.015 }, inputs: ["a", "b"] },
    ],
  };
  line("[ca 2] hai trụ Ø60 vuông góc (chữ T) — add r = 15 mm");
  const built = kit.buildShapes(doc, ["u", "bevAdd"]);
  show("union", built, "u");
  show("bevel", built, "bevAdd");
}

// ── ca 3: đúng mối ống gió Ø120, 42° — add r = 12 mm ──
{
  const ang = (42 * Math.PI) / 180;
  const doc = {
    id: "t3", title: "ong gio", parts: [], joints: [], routes: [], materials: {},
    shapes: [
      { id: "a", op: "lathe", params: { profile: cyl(0.06, 0.36), segments: 64 }, rotate: [0, 0, 90], offset: [0.11, 0.06, 0] },
      { id: "b", op: "lathe", params: { profile: cyl(0.06, 0.36), segments: 64 }, rotate: [0, 0, -48], offset: [0.1, 0.2161, 0] },
      { id: "u", op: "boolean", params: { op: "union" }, inputs: ["a", "b"] },
      { id: "bev", op: "bevel", params: { mode: "add", radius: 0.012 }, inputs: ["a", "b"] },
      { id: "weld", op: "weld", params: { radius: 0.015 }, inputs: ["a", "b"] },
    ],
  };
  line("[ca 3] ống gió Ø120, đoạn chéo 42° — add r = 12 mm (so với weld)");
  const built = kit.buildShapes(doc, ["u", "bev", "weld"]);
  show("union", built, "u");
  show("bevel", built, "bev");
  show("weld", built, "weld");
}

// ── ca 4: hai hình không chạm — phải báo lỗi ──
{
  const doc = {
    id: "t4", title: "khong cham", parts: [], joints: [], routes: [], materials: {},
    shapes: [
      { id: "a", ...box(-0.1, 0.1, -0.1, 0.1) },
      { id: "b", ...box(0.35, 0.6, -0.1, 0.1) },
      { id: "bev", op: "bevel", params: { radius: 0.01 }, inputs: ["a", "b"] },
    ],
  };
  line("[ca 4] hai hộp cách nhau 25 cm — phải báo lỗi");
  try {
    kit.buildShapes(doc, ["bev"]);
    line("  SAI: không báo lỗi");
  } catch (e) {
    line(`  đúng: ${e.message.split("\n")[0].slice(0, 160)}`);
  }
}

// ── ca 5: mode add mà chỉ có 1 hình — phải báo lỗi rõ ──
{
  const doc = {
    id: "t5", title: "mot hinh", parts: [], joints: [], routes: [], materials: {},
    shapes: [{ id: "a", ...box(-0.1, 0.1, -0.1, 0.1) }, { id: "bev", op: "bevel", params: { mode: "add" }, inputs: ["a"] }],
  };
  line("[ca 5] mode add mà chỉ có 1 hình — phải báo lỗi");
  try {
    kit.buildShapes(doc, ["bev"]);
    line("  SAI: không báo lỗi");
  } catch (e) {
    line(`  đúng: ${e.message.split("\n")[0].slice(0, 160)}`);
  }
}
