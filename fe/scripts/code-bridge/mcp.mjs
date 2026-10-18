#!/usr/bin/env node
// MCP server "neviad-code": cầu nối giữa Claude và xưởng tạo vật bằng code ở trang /free-style-html-create.
// Người dùng gõ yêu cầu trên trang; Claude đọc yêu cầu, viết vật thành một tài liệu HTML tự đủ (SVG hoặc Canvas), rồi XEM ảnh chụp
// mà chính trình duyệt của người dùng chụp lại để sửa. Ghi thẳng vào fe/.code-bridge/state.json; trang đang mở hiện vật trong chưa tới một giây.
//
//   claude mcp add neviad-code -- node fe/scripts/code-bridge/mcp.mjs      (hoặc dùng .mcp.json ở gốc repo)
import { serveMcp, text } from "../lib/mcp-stdio.mjs";
import { CLAUDE_INSTRUCTIONS } from "./instructions.mjs";
import { CAPTURE_H, CAPTURE_W, MAX_HTML, findObject, readState, snapshotMeta, updateState, writeObject } from "./store.mjs";
import { viewObject } from "./view.mjs";

const SERVER = { name: "neviad-code", version: "1.1.0" };
const PAGE = "/free-style-html-create";

const TOOLS = [
  {
    name: "requests_list",
    description: "Liệt kê yêu cầu người dùng gõ trên trang. status = \"open\" (mặc định: đang chờ và đang làm) hoặc \"all\".",
    inputSchema: { type: "object", properties: { status: { type: "string", enum: ["open", "all"] } } },
  },
  {
    name: "request_update",
    description: "Đổi trạng thái một yêu cầu (trang hiện ngay): working khi bắt đầu, done khi xong, failed khi không làm được; note là một câu ngắn cho người dùng.",
    inputSchema: { type: "object", properties: { id: { type: "string" }, status: { type: "string", enum: ["pending", "working", "done", "failed"] }, note: { type: "string" } }, required: ["id", "status"] },
  },
  {
    name: "object_write",
    description: `Tạo vật mới hoặc thay toàn bộ code của vật cũ (truyền id). html là một tài liệu HTML tự đủ, tối đa ${MAX_HTML} ký tự. request_id (tuỳ chọn) gắn vật vào yêu cầu đó. Trả về id và rev; sau đó gọi object_view để xem.`,
    inputSchema: {
      type: "object",
      properties: { title: { type: "string" }, html: { type: "string" }, id: { type: "string", description: "Mã vật cần sửa; bỏ trống để tạo vật mới." }, request_id: { type: "string" } },
      required: ["title", "html"],
    },
  },
  {
    name: "object_read",
    description: "Đọc code hiện tại của một vật (để sửa tiếp).",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
  },
  {
    name: "objects_list",
    description: "Liệt kê các vật: id, tiêu đề, rev, thời điểm sửa, đã có ảnh chụp của bản mới nhất chưa.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "object_view",
    description: `XEM vật: chờ trình duyệt của người dùng chụp bản mới nhất (khung ${CAPTURE_W}×${CAPTURE_H}, độ phân giải ×2) rồi trả ảnh PNG. region (px của khung) để phóng một vùng với đủ chi tiết. Trang đóng hay chụp không kịp thì dựng phần SVG tĩnh (không chạy JS, có thể thiếu CSS) và nói rõ là ảnh thay thế.`,
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        wait_ms: { type: "integer", minimum: 0, maximum: 30000, description: "Thời gian chờ ảnh chụp, mặc định 8000." },
        region: { type: "object", properties: { x: { type: "number" }, y: { type: "number" }, width: { type: "number" }, height: { type: "number" } }, required: ["x", "y", "width", "height"] },
      },
      required: ["id"],
    },
  },
];

function requestsList({ status = "open" }) {
  const { requests } = readState();
  const list = status === "all" ? requests : requests.filter((r) => r.status === "pending" || r.status === "working");
  if (!list.length) return text(status === "all" ? "Chưa có yêu cầu nào." : "Không có yêu cầu nào đang chờ.");
  return text(JSON.stringify(list.map(({ id, prompt, status: s, createdAt, objectId, note }) => ({ id, prompt, status: s, createdAt, objectId, note })), null, 2));
}

function requestUpdate({ id, status, note }) {
  const { result } = updateState((state) => {
    const request = state.requests.find((r) => r.id === id);
    if (!request) throw new Error(`Không có yêu cầu ${id}.`);
    request.status = status;
    request.updatedAt = new Date().toISOString();
    if (typeof note === "string") request.note = note.slice(0, 500);
    return request;
  });
  return text(`Yêu cầu ${result.id}: ${result.status}${result.note ? ` (${result.note})` : ""}.`);
}

function objectWrite({ title, html, id, request_id }) {
  const { object, version, warnings } = writeObject({ title, html, id, requestId: request_id });
  return text(`Đã ghi vật ${object.id} (rev ${object.rev}, ${html.length} ký tự; xưởng phiên bản ${version}).${warnings.length ? ` Lưu ý: ${warnings.join("; ")}.` : ""} Gọi object_view để xem.`);
}

function objectRead({ id }) {
  const object = findObject(readState(), id);
  return text(`<!-- ${object.id} · rev ${object.rev} · ${object.title} -->\n${object.html}`);
}

function snapshotState(object) {
  const meta = snapshotMeta(object);
  return meta?.rev === object.rev ? (meta.error ? `lỗi: ${meta.error}` : "có") : "chưa";
}

function objectsList() {
  const { objects } = readState();
  if (!objects.length) return text("Chưa có vật nào.");
  return text(JSON.stringify(objects.map((o) => ({ id: o.id, title: o.title, rev: o.rev, updatedAt: o.updatedAt, requestId: o.requestId, snapshot: snapshotState(o) })), null, 2));
}

async function objectView({ id, wait_ms = 8000, region }) {
  const seen = await viewObject({ id, waitMs: wait_ms, region, page: PAGE });
  if (!seen.png) return { ...text(seen.text), isError: true };
  return { content: [{ type: "text", text: seen.text }, { type: "image", data: seen.png.toString("base64"), mimeType: "image/png" }] };
}

serveMcp({
  server: SERVER,
  instructions: CLAUDE_INSTRUCTIONS,
  tools: TOOLS,
  handlers: { requests_list: requestsList, request_update: requestUpdate, object_write: objectWrite, object_read: objectRead, objects_list: objectsList, object_view: objectView },
});
process.stderr.write(`neviad-code ${SERVER.version}: khung chụp ${CAPTURE_W}×${CAPTURE_H}, sẵn sàng\n`);
