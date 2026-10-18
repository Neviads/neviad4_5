// Lõi của xưởng tạo vật bằng code: đọc ghi trạng thái (cùng định dạng với fe/lib/code-bridge/types.ts) và ảnh chụp mà trình duyệt
// của người dùng gửi lên qua /api/code-bridge. Dùng cho MCP server neviad-code
// (trang /free-style-html-create, thư mục fe/.code-bridge).
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const here = dirname(fileURLToPath(import.meta.url));
export const FE_ROOT = resolve(here, "../..");
/** `NEVIAD_CODE_DIR` trỏ sang thư mục khác (để thử mà không đụng xưởng thật mà trang đang dùng). */
const BASE = process.env.NEVIAD_CODE_DIR ? resolve(process.env.NEVIAD_CODE_DIR) : join(FE_ROOT, ".code-bridge");
export const stateFile = () => join(BASE, "state.json");
export const snapshotFile = (id) => join(BASE, "snapshots", `${id}.png`);
export const CAPTURE_W = 960;
export const CAPTURE_H = 640;
export const MAX_HTML = 400_000;

/** Chưa có file thì là trạng thái trống. File hỏng thì ném lỗi chứ không coi là trống, để lần ghi sau không đè mất vật. */
export function readState() {
  const file = stateFile();
  if (!existsSync(file)) return { version: 0, requests: [], objects: [] };
  const state = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(state.requests) || !Array.isArray(state.objects)) throw new Error(`${file} không phải trạng thái hợp lệ.`);
  return state;
}

function writeState(state) {
  const file = stateFile();
  mkdirSync(dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  writeFileSync(temp, JSON.stringify(state));
  for (let attempt = 0; ; attempt += 1) {
    try { renameSync(temp, file); return; } catch (error) {
      if (attempt >= 5) throw error; // Windows: trang đang đọc file đúng lúc đó
      const until = Date.now() + 30;
      while (Date.now() < until) { /* chờ rất ngắn rồi thử lại */ }
    }
  }
}

/** Đọc, sửa, ghi trong một lần và tăng `version`, để trang biết có thay đổi. */
export function updateState(change) {
  const state = readState();
  const result = change(state);
  state.version += 1;
  writeState(state);
  return { state, result };
}

/** Mã vật dễ đọc: chữ của tiêu đề (bỏ dấu) + 4 ký tự ngẫu nhiên. */
export function newObjectId(title) {
  const slug = String(title ?? "").replace(/đ/g, "d").replace(/Đ/g, "D").normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "vat";
  return `${slug}-${randomBytes(2).toString("hex")}`;
}

/**
 * Trạng thái ảnh chụp của một vật `{ rev, error? }`: file meta riêng do route ghi (snapshots/<id>.json), hoặc với dữ liệu cũ thì các
 * trường snapshotRev/snapshotError trong state. null khi chưa chụp lần nào.
 */
export function snapshotMeta(object) {
  try {
    return JSON.parse(readFileSync(join(BASE, "snapshots", `${object.id}.json`), "utf8"));
  } catch {
    return object.snapshotRev ? { rev: object.snapshotRev, error: object.snapshotError } : null;
  }
}

export function findObject(state, id) {
  const object = state.objects.find((o) => o.id === id);
  if (!object) throw new Error(`Không có vật ${id}.`);
  return object;
}

/**
 * Tạo vật mới hoặc thay toàn bộ code của vật cũ (`id`). `requestId` gắn vật vào yêu cầu đó. Trả `{ object, version, warnings }`.
 * Dùng cho tool object_write của MCP neviad-code.
 */
export function writeObject({ title, html, id, requestId }) {
  if (typeof html !== "string" || !html.trim()) throw new Error("html trống.");
  if (html.length > MAX_HTML) throw new Error(`html dài ${html.length} ký tự, tối đa ${MAX_HTML}.`);
  const warnings = [];
  if (!/<(svg|canvas)\b/i.test(html)) warnings.push("không thấy <svg> hay <canvas>: ảnh chụp sẽ không có hình");
  if (/<(script|link)\b[^>]*\b(src|href)\s*=\s*["']?https?:/i.test(html)) warnings.push("có tải tài nguyên từ mạng: nên viết nội tuyến");
  const now = new Date().toISOString();
  const name = String(title ?? "Vật").slice(0, 120);
  const { state, result } = updateState((s) => {
    let object = id ? s.objects.find((o) => o.id === id) : undefined;
    if (id && !object) throw new Error(`Không có vật ${id} để sửa; bỏ trống id để tạo vật mới.`);
    if (object) Object.assign(object, { title: name, html, rev: object.rev + 1, updatedAt: now });
    else {
      object = { id: newObjectId(name), title: name, html, rev: 1, createdAt: now, updatedAt: now };
      s.objects.push(object);
    }
    if (requestId) {
      const request = s.requests.find((r) => r.id === requestId);
      if (!request) warnings.push(`không có yêu cầu ${requestId}`);
      else { request.objectId = object.id; request.updatedAt = now; if (request.status === "pending") request.status = "working"; object.requestId = request.id; }
    }
    return object;
  });
  return { object: result, version: state.version, warnings };
}
