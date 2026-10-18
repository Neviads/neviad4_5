// Kiểm tra và xem trước các vật trong fe/object-library (kho vật thể của trang /vat-the-mo-phong), không cần trình duyệt hay backend.
//   node scripts/preview-object-library.mjs --out <thư mục ảnh> [--only a,b] [--per 4] [--fix-size]
// Với mỗi file: chạy cổng kiểm thật (scripts/lib/free-object-check.mjs), so khối OBJECT-META với những gì hàm dựng thật trả ra (bộ phận,
// điểm, kích thước), đối chiếu tên với docs/object-catalog.md, rồi vẽ ba tư thế (nghỉ, giữa, tối đa) vào tấm ảnh PNG, mỗi tấm `--per` vật.
// `--fix-size` ghi lại meta.size theo kích thước đo được. Thoát với mã 1 nếu còn vấn đề.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const feRoot = resolve(here, "..");
const args = process.argv.slice(2);
const option = (name, fallback) => { const i = args.indexOf(`--${name}`); return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback; };
const outDir = option("out", null);
const only = option("only", "").split(",").filter(Boolean);
const per = Number(option("per", "4"));
const fixSize = args.includes("--fix-size");
if (!outDir) { console.error("Cách dùng: node scripts/preview-object-library.mjs --out <thư mục> [--only a,b] [--per 4] [--fix-size]"); process.exit(1); }
mkdirSync(outDir, { recursive: true });

const lib = (f) => pathToFileURL(join(here, "lib", f)).href;
const { createFreeChecker, boundingBox } = await import(lib("free-object-check.mjs"));
const { createFakeKonva } = await import(lib("draw-object-harness.mjs"));
const { translator } = await import(lib("konva-svg.mjs"));
const req = createRequire(join(feRoot, "package.json"));
const ts = req("typescript");
const sharp = req("sharp");
const checker = createFreeChecker(feRoot);

const META = /\/\*\s*OBJECT-META\s*([\s\S]*?)\*\//;
const dir = join(feRoot, "object-library");
const files = readdirSync(dir).filter((f) => f.endsWith(".ts") && (!only.length || only.some((o) => f.includes(o)))).sort();

const catalog = new Set();
for (const line of readFileSync(join(feRoot, "..", "docs/object-catalog.md"), "utf8").split(/\r?\n/)) {
  const cells = line.startsWith("|") ? line.slice(1, -1).split("|").map((c) => c.trim()) : [];
  if (/^P[123]$/.test(cells[4] ?? "")) catalog.add(cells[0]);
}

const DIR = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const near = (a, b, tol) => Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1e-9);

function build(js, name, ppm, fill) {
  const { Konva } = createFakeKonva();
  const ctx = vm.createContext({ Konva, getSimulationFontFamily: () => "Arial" });
  vm.runInContext(`${js}\n;globalThis.__make = ${name};`, ctx, { timeout: 3000 });
  return vm.runInContext(`__make({ x: 0, y: 0 }, ${ppm}, ${JSON.stringify(fill)}, "")`, ctx, { timeout: 3000 });
}

/** Đặt tư thế như shared/object-pose.ts: rotate cộng độ, slide dời theo trục bằng mét × ppm. */
function pose(made, values, ppm) {
  for (const [name, part] of Object.entries(made.parts ?? {})) {
    const v = values[name];
    if (typeof v !== "number") continue;
    const a = part.node.__attrs;
    const value = clamp(v, part.min, part.max);
    if (part.motion === "rotate") a.rotation = (a.rotation ?? 0) + value;
    else { const [dx, dy] = DIR[part.axis ?? "up"]; a.x = (a.x ?? 0) + dx * value * ppm; a.y = (a.y ?? 0) + dy * value * ppm; }
  }
}

const CELL_W = 340, CELL_H = 300, HEAD = 26;
let uid = 0;
const results = [];
const issues = [];
const cards = [];

for (const file of files) {
  const path = join(dir, file);
  let code = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  const problems = [];
  let meta;
  try { meta = JSON.parse(META.exec(code)[1]); } catch { issues.push(`${file}: thiếu hay hỏng khối OBJECT-META`); continue; }
  const result = checker.check(code, null);
  for (const p of result.problems) problems.push(p);
  if (!catalog.has(meta.catalog)) problems.push(`tên "${meta.catalog}" không có trong docs/object-catalog.md`);

  let made = null, name = null, js = null;
  if (!result.problems.length) {
    name = result.meta.name;
    js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
    made = build(js, name, 100, meta.fill ?? "#60758b");
    const gotParts = Object.entries(made.parts ?? {});
    for (const want of meta.parts ?? []) {
      const got = made.parts?.[want.name];
      if (!got) problems.push(`meta có bộ phận "${want.name}" nhưng code không trả về`);
      else if (got.motion !== want.motion || got.min !== want.min || got.max !== want.max || (want.motion === "slide" && got.axis !== want.axis)) problems.push(`bộ phận "${want.name}" khác meta (motion/axis/min/max)`);
    }
    for (const [key] of gotParts) if (!(meta.parts ?? []).some((p) => p.name === key)) problems.push(`code trả bộ phận "${key}" chưa khai trong meta`);
    for (const want of meta.points ?? []) if (!made.points?.[want.name]) problems.push(`meta có điểm "${want.name}" nhưng code không trả về`);
    for (const key of Object.keys(made.points ?? {})) if (!(meta.points ?? []).some((p) => p.name === key)) problems.push(`code trả điểm "${key}" chưa khai trong meta`);
    if (result.meta.size && meta.size) {
      const w = result.meta.size.width, h = result.meta.size.height;
      if (!near(w, meta.size.width, 0.12) || !near(h, meta.size.height, 0.12)) {
        if (fixSize) {
          const round = (v) => Math.round(v * 1000) / 1000;
          // Chỉ thay dòng "size" để giữ nguyên cách trình bày của khối meta.
          const next = code.replace(/"size":\s*\{[^}]*\}/, `"size": { "width": ${round(w)}, "height": ${round(h)} }`);
          code = next; writeFileSync(path, next);
          meta = JSON.parse(META.exec(code)[1]);
        } else problems.push(`meta.size ${meta.size.width}×${meta.size.height} khác đo được ${w.toFixed(3)}×${h.toFixed(3)} (chạy với --fix-size)`);
      }
    }
  }
  if (problems.length) issues.push(`${file}:\n    - ${problems.join("\n    - ")}`);
  results.push({ file, meta, js, name, ok: Boolean(made), size: result.meta?.size });
}

// ── Ảnh ─────────────────────────────────────────────────────────────────────────
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
function cell(item, label, values, col) {
  const { meta } = item;
  const ppm = Math.min((0.7 * CELL_W) / Math.max(meta.size.width, 1e-6), (0.66 * (CELL_H - HEAD)) / Math.max(meta.size.height, 1e-6));
  const made = build(item.js, item.name, ppm, meta.fill ?? "#60758b");
  pose(made, values, ppm);
  const box = boundingBox(made.group);
  const tr = translator();
  const body = tr.node(made.group);
  if (!box) return { svg: "", defs: "" };
  const standing = Math.abs(box.maxY) <= 0.04 * box.height;
  const cx = col * CELL_W + CELL_W / 2 - (box.minX + box.maxX) / 2;
  const cy = standing ? HEAD + (CELL_H - HEAD) * 0.5 + box.height / 2 : HEAD + (CELL_H - HEAD) / 2 - (box.minY + box.maxY) / 2;
  const floor = standing ? `<path d="M${col * CELL_W + 14} ${r(cy)}H${(col + 1) * CELL_W - 14}" stroke="#64748b" stroke-width="2"/>` : "";
  // Mọi ô nằm trong cùng một SVG, nên id gradient và filter (g0, f1, ...) phải khác nhau giữa các ô.
  const unique = (text) => text.replace(/(id="|url\(#)([gf]\d+)/g, `$1c${uid}_$2`);
  uid += 1;
  return {
    defs: unique(tr.defs()),
    svg: unique(`${floor}<g transform="translate(${r(cx)} ${r(cy)})">${body}</g><text x="${col * CELL_W + 10}" y="${HEAD + 14}" font-size="12" font-family="Arial" fill="#94a3b8">${esc(label)}</text>`),
  };
}
const r = (v) => Math.round(v * 100) / 100;

const poseSets = (meta) => {
  const parts = meta.parts ?? [];
  if (!parts.length) return [["nghỉ", {}]];
  const rest = Object.fromEntries(parts.map((p) => [p.name, clamp(0, p.min, p.max)]));
  const mid = Object.fromEntries(parts.map((p) => [p.name, (p.min + p.max) / 2]));
  const top = Object.fromEntries(parts.map((p) => [p.name, p.max]));
  return [["nghỉ", rest], ["giữa", mid], ["tối đa", top]];
};

const ready = results.filter((x) => x.ok);
for (let s = 0; s * per < ready.length; s += 1) {
  const group = ready.slice(s * per, (s + 1) * per);
  const rows = group.length;
  const W = CELL_W * 3, H = rows * CELL_H;
  let defs = "", body = "";
  group.forEach((item, row) => {
    const poses = poseSets(item.meta);
    let layer = "";
    poses.forEach(([label, values], col) => {
      try { const c = cell(item, `${item.meta.catalog} — ${label}`, values, col); defs += c.defs; layer += c.svg; }
      catch (error) { layer += `<text x="${col * CELL_W + 10}" y="60" font-size="12" fill="#fca5a5" font-family="Arial">${esc(String(error.message))}</text>`; }
    });
    body += `<g transform="translate(0 ${row * CELL_H})">${layer}<path d="M0 ${CELL_H}H${W}" stroke="#1e293b"/></g>`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${defs}</defs><rect width="${W}" height="${H}" fill="#0f172a"/>${body}</svg>`;
  const out = join(outDir, `sheet-${String(s + 1).padStart(2, "0")}.png`);
  await sharp(Buffer.from(svg)).png().toFile(out);
  console.log(`${out}: ${group.map((g) => g.file).join(", ")}`);
}

console.log(`\n${files.length} file, ${results.filter((x) => x.ok).length} dựng được, ${issues.length} có vấn đề`);
if (issues.length) { console.log(issues.join("\n")); process.exit(1); }
