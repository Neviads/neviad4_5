// Đọc, biên dịch và chạy thử một file vật thể (objects/<slug>-<n>.ts) bằng Konva giả, không cần canvas.
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createFakeKonva } from "./draw-object-harness.mjs";

const readRel = (ctx, rel) => readFileSync(join(ctx.struct, rel), "utf8").replace(/\r\n/g, "\n");

export const objectFile = (ctx, index) => `objects/${ctx.slug}-${index}.ts`;
export const BEGIN = "// ---- BEGIN CODE";
export const END = "// ---- END CODE";

/** @returns {{ ok: true, source, meta, code } | { ok: false, findings }} */
export function readObjectFile(ctx, index) {
  const file = objectFile(ctx, index);
  let source;
  try { source = readRel(ctx, file); } catch { return { ok: false, findings: [{ code: "MISSING_FILE", file, message: `Thiếu file ${file}.` }] }; }
  const findings = [];
  const metaMatch = source.match(/\/\*\s*OBJECT-META\s*([\s\S]*?)\*\//);
  let meta = null;
  if (!metaMatch) findings.push({ code: "META", file, message: "Thiếu khối chú thích `/* OBJECT-META { ...JSON... } */` ở đầu file (ports, joints, partAnchors, inputs, outputs, selfTests...)." });
  else { try { meta = JSON.parse(metaMatch[1]); } catch (e) { findings.push({ code: "META", file, message: `OBJECT-META không phải JSON hợp lệ: ${e.message}` }); } }
  const b = source.indexOf(BEGIN);
  const e = source.indexOf(END);
  if (b < 0 || e < b) findings.push({ code: "MARKERS", file, message: `Thiếu cặp dòng đánh dấu \`${BEGIN}\` và \`${END}\` bao quanh hàm vẽ.` });
  if (findings.length) return { ok: false, findings };
  return { ok: true, source, meta, code: source.slice(b + BEGIN.length, e) };
}

export function transpile(ctx, code) {
  const out = ctx.ts.transpileModule(code, { compilerOptions: { target: ctx.ts.ScriptTarget.ES2020, module: ctx.ts.ModuleKind.ESNext }, reportDiagnostics: true });
  return { js: out.outputText, errors: (out.diagnostics ?? []).map((d) => ctx.ts.flattenDiagnosticMessageText(d.messageText, "\n")) };
}

/** Dựng vật thể trong vm. `call(method, arg)` gọi phương thức của vật. */
export function instantiate(js, name, radius = 30) {
  const { Konva, registry } = createFakeKonva();
  const context = vm.createContext({ Konva, getSimulationFontFamily: () => "Arial", console: { log() {}, warn() {}, error() {} } });
  vm.runInContext(`${js}\n;globalThis.__make = ${name};`, context, { timeout: 2000 });
  const obj = vm.runInContext(`__make({ x: 0, y: 0 }, ${radius}, "#f472b6", "m")`, context, { timeout: 2000 });
  const call = (method, arg) => { context.__obj = obj; context.__arg = arg; return vm.runInContext("__obj." + method + "(__arg)", context, { timeout: 2000 }); };
  return { obj, registry, call };
}

const finite = (v) => typeof v === "number" && Number.isFinite(v);

/** Khoảng cách lớn nhất giữa hai điểm của mọi khớp, hoặc danh sách lỗi. */
export function jointProblems(obj, tolerance = 1) {
  const problems = [];
  for (const [name, joint] of Object.entries(obj.joints ?? {})) {
    if (!joint || !finite(joint.a?.x) || !finite(joint.a?.y) || !finite(joint.b?.x) || !finite(joint.b?.y)) { problems.push(`khớp "${name}" phải là {a:{x,y}, b:{x,y}} hữu hạn`); continue; }
    const d = Math.hypot(joint.a.x - joint.b.x, joint.a.y - joint.b.y);
    if (d > tolerance) problems.push(`khớp "${name}" hở ${d.toFixed(1)} px (hai điểm nối a và b phải trùng nhau, tối đa ${tolerance} px)`);
  }
  return problems;
}

/** Lưới giá trị bậc tự do để quét: tối đa 5 giá trị mỗi dof, tối đa 25 tổ hợp. */
export function dofGrid(dof) {
  const steps = [0, 0.25, 0.5, 0.75, 1];
  let combos = [{}];
  for (const q of dof.slice(0, 2)) combos = combos.flatMap((c) => steps.map((s) => ({ ...c, [q.name]: q.min + (q.max - q.min) * s })));
  return combos;
}
