// Xưởng tạo vật bằng code giữa trang /free-style-html-create và Claude (MCP server scripts/code-bridge/mcp.mjs).
// Cùng định dạng với fe/.code-bridge/state.json; ảnh chụp của từng vật nằm ở fe/.code-bridge/snapshots/<id>.png.

export type CodeRequestStatus = "pending" | "working" | "done" | "failed";

/** Một yêu cầu người dùng gõ trên trang; người làm nhận, đổi trạng thái, và gắn vật đã làm vào `objectId`. */
export type CodeRequest = { id: string; prompt: string; status: CodeRequestStatus; createdAt: string; updatedAt: string; objectId?: string; note?: string };

/**
 * Một vật: một tài liệu HTML tự đủ (SVG hoặc Canvas, kèm CSS và JS), chạy trong iframe cô lập. `rev` tăng mỗi lần sửa;
 * `snapshotRev` là bản đã được trình duyệt chụp lại cho Claude xem.
 */
export type CodeObject = { id: string; title: string; html: string; rev: number; createdAt: string; updatedAt: string; requestId?: string; snapshotRev?: number; snapshotError?: string };

export type CodeBridgeState = { version: number; requests: CodeRequest[]; objects: CodeObject[] };

/** Khung cố định của ảnh chụp, để Claude luôn xem vật ở cùng một cỡ. */
export const CAPTURE_W = 960;
export const CAPTURE_H = 640;
export const MAX_HTML = 400_000;
