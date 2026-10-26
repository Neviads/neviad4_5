#!/usr/bin/env node
/**
 * MCP (stdio) cho máy phát điện xoay chiều ở /may-phat-dien-xoay-chieu.
 *
 * `npx renderoni mcp` chỉ mở một thế giới trống; script này nạp đúng mô hình
 * vật lý của trang (generator-sim.ts, đóng gói bằng esbuild) vào một engine
 * Renderoni headless, rồi phục vụ các tool sẵn có: describe, observe, act
 * (generator.drive / generator.switch), step, check.
 *
 *   node scripts/generator-mcp.mjs            → server MCP
 *   node scripts/generator-mcp.mjs --selftest → chạy thử vài kịch bản rồi in kết quả
 */

import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const fe = join(dirname(fileURLToPath(import.meta.url)), "..");
// đặt bản đóng gói trong fe/node_modules để import "three", "renderoni"… tự tìm thấy
const out = join(fe, "node_modules/.cache/generator-mcp");
mkdirSync(out, { recursive: true });
const outfile = join(out, "generator-sim.mjs");
await build({
  entryPoints: [join(fe, "app/may-phat-dien-xoay-chieu/generator-sim.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile,
  // dùng chung bản cài trong fe/node_modules (một bản RAPIER đã init)
  external: ["three", "renderoni", "@dimforge/rapier3d-compat"],
  logLevel: "error",
});
const { buildGenerator } = await import(pathToFileURL(outfile).href);
const { createRenderoni } = await import("renderoni");

async function createGame() {
  const game = await createRenderoni({ mode: "headless", seed: 1, clock: { tickRateHz: 120 } });
  buildGenerator(game, { visual: false });
  return game;
}

if (process.argv.includes("--selftest")) {
  const game = await createGame();
  const s = () => game.entities.get("rotor").state;
  const row = (label) => {
    const st = s();
    console.log(`${label.padEnd(30)} ${st.rpm.toFixed(0).padStart(5)} vòng/phút   e_max≈${(Math.abs(st.emf) > 0 ? peak : 0).toFixed(1)} V   P_đèn=${st.lampPower.toFixed(2)} W`);
  };
  let peak = 0;
  const run = (ticks) => {
    peak = 0;
    for (let i = 0; i < ticks; i++) {
      game.step(1);
      peak = Math.max(peak, Math.abs(s().emf));
    }
  };
  run(600);
  row("τ=0,20 N·m, đèn nối (5 s)");
  const turns = game.events.getRecentEvents("generator.turn").length;
  game.act({ name: "generator.switch", payload: { closed: false } });
  run(600);
  row("hở mạch (Lenz hết cản)");
  game.act({ name: "generator.switch", payload: { closed: true } });
  game.act({ name: "generator.drive", payload: { torque: 0.35 } });
  run(600);
  row("τ=0,35 N·m, đèn nối");
  game.act({ name: "generator.drive", payload: { torque: 0 } });
  run(600);
  row("thả tay quay (5 s)");
  console.log("sự kiện generator.turn gần đây:", turns);
  console.log(
    "check:",
    JSON.stringify(game.check([{ op: "lessThan", path: "entities.rotor.state.rpm", value: 60 }, { op: "noDiagnostics", minimumSeverity: "error" }])),
  );
  game.dispose();
} else {
  const { serveStdio } = await import("renderoni/mcp");
  await serveStdio({ transport: "stdio", createGame });
}
