import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { BOARD_H, BOARD_W, type Board, type BoardPoint, type BoardStroke } from "@/lib/draw-bridge/types";

// Bảng vẽ chung giữa trang /ve-may-khong-duoc-thi-ve-tay và Claude (MCP server fe/scripts/draw-bridge/mcp.mjs).
// Cả hai đọc ghi cùng một file fe/.draw-bridge/board.json; mỗi lần đổi thì `version` tăng, trang hỏi `?since=` để biết có gì mới.
// Ghi ra đĩa nên chỉ mở khi phát triển.
export const dynamic = "force-dynamic";

const MAX_STROKES = 5000;

const boardFile = () => {
  const rel = ".draw-bridge/board.json";
  return existsSync(join(process.cwd(), "app")) ? join(process.cwd(), rel) : join(process.cwd(), "fe", rel);
};

/** Chưa có file thì là bảng trống. File hỏng thì ném lỗi chứ không coi là trống, để lần ghi sau không đè mất hình. */
function readBoard(): Board {
  const file = boardFile();
  if (!existsSync(file)) return { version: 0, width: BOARD_W, height: BOARD_H, strokes: [] };
  const board = JSON.parse(readFileSync(file, "utf8")) as Board;
  if (!Array.isArray(board.strokes)) throw new Error(`${file} không phải bảng vẽ hợp lệ.`);
  return board;
}

function writeBoard(board: Board) {
  const file = boardFile();
  mkdirSync(dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  writeFileSync(temp, JSON.stringify(board));
  renameSync(temp, file);
}

const finite = (value: unknown) => typeof value === "number" && Number.isFinite(value);

/** Nét do trang gửi lên: giữ đúng các trường cần, bỏ điểm hỏng, kẹp vào khổ bảng. */
function cleanStroke(input: unknown): BoardStroke | null {
  const raw = input as Partial<BoardStroke> | null;
  if (!raw || !Array.isArray(raw.points)) return null;
  const width = finite(raw.width) ? Math.min(64, Math.max(0.5, raw.width as number)) : 4;
  const points: BoardPoint[] = [];
  for (const p of raw.points) {
    if (!Array.isArray(p) || !finite(p[0]) || !finite(p[1])) continue;
    const x = Math.min(BOARD_W, Math.max(0, p[0])), y = Math.min(BOARD_H, Math.max(0, p[1]));
    points.push(finite(p[2]) ? [x, y, Math.min(64, Math.max(0.3, p[2] as number))] : [x, y]);
  }
  if (!points.length) return null;
  const color = typeof raw.color === "string" && /^#[0-9a-f]{3,8}$/i.test(raw.color) ? raw.color : "#e2e8f0";
  return { id: typeof raw.id === "string" ? raw.id.slice(0, 40) : crypto.randomUUID(), by: "user", color, width, points };
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  const board = readBoard();
  // Không có ?since= thì luôn trả cả trạng thái (Number(null) là 0, sẽ trùng nhầm phiên bản 0).
  const raw = new URL(request.url).searchParams.get("since");
  const since = raw === null || raw === "" ? NaN : Number(raw);
  if (Number.isFinite(since) && since === board.version) return Response.json({ version: board.version, unchanged: true });
  return Response.json(board);
}

/** `{ op: "add", stroke }` thêm một nét của người dùng; `{ op: "undo" }` bỏ nét cuối (của bất kỳ ai); `{ op: "clear" }` xoá bảng. */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  const body = (await request.json().catch(() => null)) as { op?: string; stroke?: unknown } | null;
  const board = readBoard();
  if (body?.op === "add") {
    const stroke = cleanStroke(body.stroke);
    if (!stroke) return Response.json({ error: "Nét không hợp lệ." }, { status: 400 });
    if (board.strokes.length >= MAX_STROKES) return Response.json({ error: `Bảng đã đủ ${MAX_STROKES} nét.` }, { status: 409 });
    board.strokes.push(stroke);
  } else if (body?.op === "undo") {
    board.strokes.pop();
  } else if (body?.op === "clear") {
    board.strokes = [];
  } else {
    return Response.json({ error: "op phải là add, undo hoặc clear." }, { status: 400 });
  }
  board.version += 1;
  writeBoard(board);
  return Response.json({ version: board.version, count: board.strokes.length });
}
