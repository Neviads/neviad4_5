// Dùng chung cho weld-/bevel-/sand-selftest: đóng gói kit như mcp.mjs, đếm ca hỏng, đo chất lượng lưới.
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const FE_ROOT = resolve(here, "../..");

/** Đóng gói assembly-kit vào node_modules/.cache (để "three" và "manifold-3d" tự tìm thấy) rồi nạp lõi. */
export async function loadKit(name) {
  const dir = join(FE_ROOT, "node_modules/.cache/assembly-bridge");
  mkdirSync(dir, { recursive: true });
  const kitFile = join(dir, `kit-${name}.mjs`);
  await build({
    entryPoints: [join(FE_ROOT, "assembly-kit/node.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: kitFile,
    external: ["three", "manifold-3d"],
    logLevel: "error",
  });
  const kit = await import(`${pathToFileURL(kitFile).href}?t=${Date.now()}`);
  await kit.initKernel(() => import("manifold-3d"));
  return kit;
}

export const line = (s) => console.log(s);

/** Bộ đếm ca hỏng; `done()` in tổng kết và thoát với mã 1 nếu có ca hỏng. */
export function checker() {
  let fails = 0;
  return {
    check(name, ok, text) {
      if (!ok) fails++;
      line(`    ${ok ? "OK  " : "HỎNG"} ${name}${text ? ` — ${text}` : ""}`);
    },
    done() {
      line(fails ? `\n${fails} ca HỎNG` : "\ntất cả ca đạt");
      process.exit(fails ? 1 : 0);
    },
  };
}

/** Số đo một hình: chất lượng lưới (kit.geometryStats), kín hay không, thể tích. */
export function measure(kit, g) {
  const q = kit.geometryStats(g);
  let vol = NaN, closed = true;
  try {
    const m = kit.toManifold(g, "đo");
    vol = m.volume();
    m.delete();
  } catch {
    closed = false;
  }
  return { ...q, closed, vol };
}

export const fmt = (s) => `${s.tris} tam giác, ${s.folds} gấp mép, ${s.slivers} dẹt, ${s.closed ? "kín" : "HỞ"}, thể tích ${s.vol.toPrecision(6)} m³`;
