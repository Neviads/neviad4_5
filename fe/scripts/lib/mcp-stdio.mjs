// MCP server tối giản qua stdio (JSON-RPC 2.0, mỗi dòng một thông điệp), không cần thư viện ngoài. Dùng chung cho các cầu nối
// neviad-draw (scripts/draw-bridge) và neviad-code (scripts/code-bridge). Chỉ in thông điệp ra stdout; nhật ký ra stderr.
import { createInterface } from "node:readline";

export const text = (value) => ({ content: [{ type: "text", text: value }] });

/**
 * Chạy server: `tools` là danh sách định nghĩa tool (name, description, inputSchema), `handlers` ánh xạ tên tool sang hàm
 * (đồng bộ hoặc async) trả về `{ content: [...] }`. Lỗi trong tool thành kết quả `isError`, không làm sập server.
 */
export function serveMcp({ server, instructions, tools, handlers }) {
  const send = (message) => process.stdout.write(JSON.stringify({ jsonrpc: "2.0", ...message }) + "\n");

  async function handle(message) {
    const { id, method, params } = message;
    if (id === undefined || id === null) return; // thông báo (notifications/initialized...): không trả lời
    try {
      switch (method) {
        case "initialize":
          return send({ id, result: { protocolVersion: params?.protocolVersion ?? "2025-06-18", capabilities: { tools: { listChanged: false } }, serverInfo: server, instructions } });
        case "ping":
          return send({ id, result: {} });
        case "tools/list":
          return send({ id, result: { tools } });
        case "tools/call": {
          const handler = handlers[params?.name];
          if (!handler) return send({ id, error: { code: -32602, message: `Không có công cụ ${params?.name}.` } });
          try {
            return send({ id, result: await handler(params?.arguments ?? {}) });
          } catch (error) {
            return send({ id, result: { ...text(`Lỗi: ${error instanceof Error ? error.message : String(error)}`), isError: true } });
          }
        }
        default:
          return send({ id, error: { code: -32601, message: `Không hỗ trợ ${method}.` } });
      }
    } catch (error) {
      send({ id, error: { code: -32603, message: error instanceof Error ? error.message : String(error) } });
    }
  }

  createInterface({ input: process.stdin }).on("line", (line) => {
    if (!line.trim()) return;
    let message;
    try { message = JSON.parse(line); } catch { return send({ id: null, error: { code: -32700, message: "JSON không hợp lệ." } }); }
    handle(message).catch((error) => process.stderr.write(`${server.name}: ${error?.stack ?? error}\n`));
  });
}
