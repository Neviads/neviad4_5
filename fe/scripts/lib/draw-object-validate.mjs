// Kiểm tra MỘT kết quả của skill `draw-object` (JSON đủ trường → token cấm → biên dịch → kiểm tra kiểu với Konva → chạy thử logic
// không cần canvas). Dùng cho scripts/validate-draw-object.mjs (backend gọi qua Node).
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const { runObjectHarness } = await import(pathToFileURL(join(here, "draw-object-harness.mjs")).href);

/** Trả về { validate(id, parsed), dispose() }; `feRoot` là thư mục fe/ (có node_modules với typescript và konva). */
export function createValidator(feRoot) {
  const require = createRequire(join(feRoot, "package.json"));
  const ts = require("typescript");
  const FORBIDDEN = /\b(fetch|eval|XMLHttpRequest|WebSocket|localStorage|sessionStorage|document|window|import|require|setTimeout|setInterval|requestAnimationFrame|globalThis|Function)\b/;

  function transpile(code) {
    const out = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext }, reportDiagnostics: true });
    const errors = (out.diagnostics ?? []).map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"));
    return { js: out.outputText, errors };
  }

  const scratch = mkdtempSync(join(tmpdir(), "draw-object-check-"));
  writeFileSync(join(scratch, "tsconfig.json"), JSON.stringify({
    compilerOptions: { strict: true, noEmit: true, target: "es2020", module: "esnext", moduleResolution: "bundler", skipLibCheck: true, esModuleInterop: true,
      baseUrl: join(feRoot, "node_modules"), paths: { konva: ["konva"] }, typeRoots: [] },
    include: ["*.ts"],
  }));
  const tscBin = join(feRoot, "node_modules/typescript/bin/tsc");
  const TYPE_HEADER = `import Konva from "konva";
  type Vec2 = { x: number; y: number };
  type SmartObject = {
    group: Konva.Group; pixelsPerMeter: number; ports: Record<string, Vec2>;
    joints: Record<string, { a: Vec2; b: Vec2 }>; partAnchors: Record<string, Vec2>;
    inputs: Record<string, { label: string; unit: string; min: number; max: number; default: number }>;
    outputs: Record<string, { label: string; unit: string }>;
    set(values: Record<string, number>): void; get(): Record<string, number>; read(): Record<string, number>;
  };
  declare function getSimulationFontFamily(): string;
  `;

  function typeCheck(id, code) {
    const file = `obj${id}.ts`;
    writeFileSync(join(scratch, file), `${TYPE_HEADER}${code}\nexport {};\n`);
    try {
      execFileSync(process.execPath, [tscBin, "-p", join(scratch, "tsconfig.json")], { encoding: "utf8", stdio: "pipe" });
      return [];
    } catch (err) {
      const text = `${err.stdout ?? ""}${err.stderr ?? ""}`;
      return text.split(/\r?\n/).filter((l) => l.startsWith(file)).map((l) => l.replace(file, "dòng"));
    } finally {
      try { rmSync(join(scratch, file)); } catch { /* ignore */ }
    }
  }

  const isList = (v) => Array.isArray(v) && v.length > 0;

  function validate(id, parsed) {
    const problems = [];
    if (!parsed || typeof parsed !== "object") return { problems: ["Không phải đối tượng JSON."], report: [] };
    for (const k of ["name", "shape", "anchor", "code"]) if (typeof parsed[k] !== "string" || !parsed[k].trim()) problems.push(`Thiếu trường "${k}" (chuỗi).`);
    for (const k of parsed.__static === true ? ["ports"] : ["ports", "inputs", "outputs", "selfTests"]) if (!isList(parsed[k])) problems.push(`Thiếu trường "${k}" (mảng không rỗng).`);
    if (problems.length) return { problems, report: [] };
    const forbidden = parsed.code.match(FORBIDDEN);
    if (forbidden) problems.push(`Code dùng từ bị cấm: ${forbidden[1]}.`);
    const { js, errors } = transpile(parsed.code);
    if (errors.length) problems.push(...errors.map((e) => `Lỗi cú pháp TypeScript: ${e}`));
    parsed.__js = js;
    if (problems.length) return { problems, report: [] };
    const typeErrors = typeCheck(id, parsed.code);
    if (typeErrors.length) return { problems: typeErrors.slice(0, 6).map((e) => `Lỗi kiểu: ${e}`), report: [] };
    return runObjectHarness(js, parsed.name, { inputs: parsed.inputs, outputs: parsed.outputs, ports: parsed.ports, selfTests: parsed.selfTests, static: parsed.__static === true });
  }

  return { validate, dispose: () => rmSync(scratch, { recursive: true, force: true }) };
}
