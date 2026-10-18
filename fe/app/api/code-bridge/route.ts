import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { CodeBridgeState } from "@/lib/code-bridge/types";

// Xưởng tạo vật bằng code ở trang /free-style-html-create: Claude (MCP server fe/scripts/code-bridge/mcp.mjs) ghi vật thẳng vào
// fe/.code-bridge. Trang gửi yêu cầu và ảnh chụp qua đây. Ghi ra đĩa nên chỉ mở khi phát triển.
export const dynamic = "force-dynamic";

const MAX_PROMPT = 4000;
const MAX_SNAPSHOT = 12_000_000;
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

const feRoot = () => (existsSync(join(process.cwd(), "app")) ? process.cwd() : join(process.cwd(), "fe"));
const root = () => join(feRoot(), ".code-bridge");
const stateFile = () => join(root(), "state.json");
const snapshotFile = (id: string) => join(root(), "snapshots", `${id}.png`);
/** Trạng thái ảnh chụp của một vật nằm ở file riêng, để việc lưu ảnh không phải đọc-sửa-ghi state.json mà MCP server cũng đang ghi. */
const snapshotMetaFile = (id: string) => join(root(), "snapshots", `${id}.json`);

function withSnapshots(state: CodeBridgeState): CodeBridgeState {
  return { ...state, objects: state.objects.map((o) => {
    try {
      const meta = JSON.parse(readFileSync(snapshotMetaFile(o.id), "utf8")) as { rev: number; error?: string };
      return { ...o, snapshotRev: meta.rev, snapshotError: meta.error };
    } catch {
      return o;
    }
  }) };
}

/** Chưa có file thì là trạng thái trống. File hỏng thì ném lỗi chứ không coi là trống, để lần ghi sau không đè mất vật. */
function readState(): CodeBridgeState {
  const file = stateFile();
  if (!existsSync(file)) return { version: 0, requests: [], objects: [] };
  const state = JSON.parse(readFileSync(file, "utf8")) as CodeBridgeState;
  if (!Array.isArray(state.requests) || !Array.isArray(state.objects)) throw new Error(`${file} không phải trạng thái hợp lệ.`);
  return state;
}

function writeState(state: CodeBridgeState) {
  const file = stateFile();
  mkdirSync(dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  writeFileSync(temp, JSON.stringify(state));
  renameSync(temp, file);
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  const state = readState();
  // Không có ?since= thì luôn trả cả trạng thái (Number(null) là 0, sẽ trùng nhầm phiên bản 0).
  const raw = new URL(request.url).searchParams.get("since");
  const since = raw === null || raw === "" ? NaN : Number(raw);
  if (Number.isFinite(since) && since === state.version) return Response.json({ version: state.version, unchanged: true });
  return Response.json(withSnapshots(state));
}

/**
 * Body có `op`: `request` (kèm `prompt`) gửi một yêu cầu; `delete-request`, `delete-object` (kèm `id`); `snapshot` (kèm `id`, `rev`, `png` hoặc `error`) lưu ảnh trình duyệt chụp bản `rev` của vật.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  const body = (await request.json().catch(() => null)) as { op?: string; prompt?: unknown; id?: unknown; rev?: unknown; png?: unknown; error?: unknown } | null;
  const state = readState();
  const now = new Date().toISOString();
  const id = typeof body?.id === "string" && SAFE_ID.test(body.id) ? body.id : null;

  switch (body?.op) {
    case "request": {
      const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
      if (!prompt) return Response.json({ error: "Yêu cầu trống." }, { status: 400 });
      state.requests.push({ id: crypto.randomUUID().slice(0, 8), prompt: prompt.slice(0, MAX_PROMPT), status: "pending", createdAt: now, updatedAt: now });
      break;
    }
    case "delete-request":
      state.requests = state.requests.filter((r) => r.id !== id);
      break;
    case "delete-object":
      if (!id) return Response.json({ error: "Thiếu id." }, { status: 400 });
      state.objects = state.objects.filter((o) => o.id !== id);
      rmSync(snapshotFile(id), { force: true });
      rmSync(snapshotMetaFile(id), { force: true });
      break;
    case "snapshot": {
      // Ảnh chụp không đổi `version` và không ghi state.json: ảnh và file meta {rev, error} nằm riêng; MCP server đọc thẳng.
      const object = id ? state.objects.find((o) => o.id === id) : undefined;
      if (!object || object.rev !== body.rev) return Response.json({ stale: true });
      mkdirSync(join(root(), "snapshots"), { recursive: true });
      const png = typeof body.png === "string" && body.png.startsWith("data:image/png;base64,") && body.png.length < MAX_SNAPSHOT ? body.png : null;
      if (png) writeFileSync(snapshotFile(object.id), Buffer.from(png.slice("data:image/png;base64,".length), "base64"));
      const meta = png ? { rev: object.rev } : { rev: object.rev, error: typeof body.error === "string" ? body.error.slice(0, 500) : "Ảnh chụp không hợp lệ." };
      writeFileSync(snapshotMetaFile(object.id), JSON.stringify(meta));
      return Response.json({ ok: true });
    }
    default:
      return Response.json({ error: "op phải là request, delete-request, delete-object hoặc snapshot." }, { status: 400 });
  }
  state.version += 1;
  writeState(state);
  return Response.json({ version: state.version });
}
