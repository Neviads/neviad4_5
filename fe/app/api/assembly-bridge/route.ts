import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Xưởng lắp ráp 3D ở trang /lap-rap-3d: Claude (MCP server fe/scripts/assembly-bridge/mcp.mjs) ghi các bản lắp ráp vào
// fe/.assembly-bridge/state.json. Trang đọc trạng thái và gửi ảnh chụp 4 góc qua đây. Ghi ra đĩa nên chỉ mở khi phát triển.
export const dynamic = "force-dynamic";

const MAX_SNAPSHOT = 16_000_000;
const MAX_GLB = 48_000_000;
const SAFE_ID = /^[A-Za-z0-9_-]{1,40}$/;
const SAFE_KEY = /^[A-Za-z0-9_-]{1,120}$/;

const feRoot = () => (existsSync(join(process.cwd(), "app")) ? process.cwd() : join(process.cwd(), "fe"));
const root = () => join(feRoot(), ".assembly-bridge");

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  // ?mesh=<băm>: lưới nướng sẵn do MCP ghi (tên theo nội dung nên cache được mãi)
  const mesh = new URL(request.url).searchParams.get("mesh");
  if (mesh !== null) {
    const mf = /^[0-9a-f]{16}$/.test(mesh) ? join(root(), "meshes", `${mesh}.bin`) : null;
    if (!mf || !existsSync(mf)) return new Response(null, { status: 404 });
    return new Response(readFileSync(mf), { headers: { "Content-Type": "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable" } });
  }
  const file = join(root(), "state.json");
  const state = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { version: 0, assemblies: [], view: null };
  // Không có ?since= thì luôn trả cả trạng thái (Number(null) là 0, sẽ trùng nhầm phiên bản 0).
  const raw = new URL(request.url).searchParams.get("since");
  const since = raw === null || raw === "" ? NaN : Number(raw);
  if (Number.isFinite(since) && since === state.version) return Response.json({ version: state.version, unchanged: true });
  return Response.json(state);
}

/**
 * Body `{ op: "snapshot", assembly, key, png | glb | error }`: lưu ảnh (data URL PNG) hoặc tệp glTF nhị phân (base64)
 * trình duyệt làm cho yêu cầu `key`.
 * Không ghi state.json (MCP server là bên duy nhất ghi file đó); ảnh và meta {key, error} nằm riêng trong snapshots/.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  const body = (await request.json().catch(() => null)) as { op?: string; assembly?: unknown; key?: unknown; png?: unknown; glb?: unknown; error?: unknown } | null;
  if (body?.op !== "snapshot") return Response.json({ error: "op phải là snapshot." }, { status: 400 });
  const id = typeof body.assembly === "string" && SAFE_ID.test(body.assembly) ? body.assembly : null;
  const key = typeof body.key === "string" && SAFE_KEY.test(body.key) ? body.key : null;
  if (!id || !key) return Response.json({ error: "Thiếu assembly hoặc key." }, { status: 400 });
  const dir = join(root(), "snapshots");
  mkdirSync(dir, { recursive: true });
  const png = typeof body.png === "string" && body.png.startsWith("data:image/png;base64,") && body.png.length < MAX_SNAPSHOT ? body.png : null;
  if (png) writeFileSync(join(dir, `${id}.png`), Buffer.from(png.slice("data:image/png;base64,".length), "base64"));
  const glb = typeof body.glb === "string" && /^[A-Za-z0-9+/=]+$/.test(body.glb.slice(0, 64)) && body.glb.length < MAX_GLB ? body.glb : null;
  if (glb) writeFileSync(join(dir, `${id}.glb`), Buffer.from(glb, "base64"));
  const meta = png || glb ? { key } : { key, error: typeof body.error === "string" ? body.error.slice(0, 500) : "Ảnh chụp không hợp lệ." };
  writeFileSync(join(dir, `${id}.json`), JSON.stringify(meta));
  return Response.json({ ok: true });
}
