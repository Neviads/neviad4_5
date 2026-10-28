// Trạng thái của xưởng lắp ráp 3D: các bản lắp ráp (JSON theo assembly-kit/core/types.ts) và yêu cầu xem ảnh.
// MCP server neviad-assembly ghi; trang /lap-rap-3d đọc qua /api/assembly-bridge và gửi ảnh chụp về snapshots/.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const FE_ROOT = resolve(here, "../..");
/** `NEVIAD_ASSEMBLY_DIR` trỏ sang thư mục khác (để thử mà không đụng xưởng thật). */
const BASE = () => (process.env.NEVIAD_ASSEMBLY_DIR ? resolve(process.env.NEVIAD_ASSEMBLY_DIR) : join(FE_ROOT, ".assembly-bridge"));
export const stateFile = () => join(BASE(), "state.json");
export const snapshotFile = (id) => join(BASE(), "snapshots", `${id}.png`);
export const snapshotMetaFile = (id) => join(BASE(), "snapshots", `${id}.json`);
export const snapshotGlbFile = (id) => join(BASE(), "snapshots", `${id}.glb`);
/** Lưới nướng sẵn của một hình (tên = băm khoá nội dung), trang tải về thay vì tự dựng lại. */
export const meshFile = (hash) => join(BASE(), "meshes", `${hash}.bin`);
/** Mô hình vật lý đã tính của một tài liệu (tên = physicsKey), trang tải về để chạy bộ giải. */
export const physicsFile = (hash) => join(BASE(), "physics", `${hash}.json`);

/** Chưa có file thì là trạng thái trống. File hỏng thì ném lỗi chứ không coi là trống, để lần ghi sau không đè mất dữ liệu. */
export function readState() {
  const file = stateFile();
  if (!existsSync(file)) return { version: 0, assemblies: [], view: null };
  const state = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(state.assemblies)) throw new Error(`${file} không phải trạng thái hợp lệ.`);
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

/** Đọc, sửa, ghi trong một lần và tăng `version`. `change` ném lỗi thì không ghi gì. */
export function updateState(change) {
  const state = readState();
  const result = change(state);
  state.version += 1;
  writeState(state);
  return result;
}

export function findAssembly(state, id) {
  const a = state.assemblies.find((x) => x.id === id);
  if (!a) throw new Error(`Không có bản lắp ráp "${id}". Có: ${state.assemblies.map((x) => x.id).join(", ") || "(chưa có, gọi assembly_create)"}.`);
  return a;
}

export function readSnapshotMeta(id) {
  try { return JSON.parse(readFileSync(snapshotMetaFile(id), "utf8")); } catch { return null; }
}
