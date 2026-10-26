/**
 * Client MCP tối giản qua stdio cho bộ server @babylonjs/mcp-servers.
 *
 *   const c = await openServer("nge");
 *   await c.call("create_geometry", { name: "X" });
 *   c.close();
 */

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createInterface } from "node:readline";

const require = createRequire(import.meta.url);

export async function openServer(server) {
  const bin = require.resolve(`@babylonjs/mcp-servers/dist/${server}-mcp-server.js`);
  const proc = spawn(process.execPath, [bin], { stdio: ["pipe", "pipe", "ignore"] });
  const pending = new Map();
  let nextId = 0;
  createInterface({ input: proc.stdout }).on("line", (line) => {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }
    pending.get(msg.id)?.(msg);
    pending.delete(msg.id);
  });
  const rpc = (method, params) =>
    new Promise((resolve) => {
      const id = ++nextId;
      pending.set(id, resolve);
      proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    });

  await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "neviad-nge-generator", version: "1" } });
  proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

  return {
    async call(name, args = {}) {
      const res = await rpc("tools/call", { name, arguments: args });
      if (res.error) throw new Error(`${name}: ${JSON.stringify(res.error)}`);
      const text = res.result.content.map((c) => c.text).join("\n");
      if (res.result.isError) throw new Error(`${name}: ${text}`);
      return text;
    },
    close() {
      proc.kill();
    },
  };
}
