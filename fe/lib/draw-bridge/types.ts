// Bảng vẽ chung giữa trang /ve-may-khong-duoc-thi-ve-tay và Claude. Cùng định dạng với file fe/.draw-bridge/board.json
// mà route app/api/draw-bridge và MCP server scripts/draw-bridge/mcp.mjs đọc ghi.

/** Khổ cố định của bảng, đơn vị "điểm bảng"; trang co giãn bảng cho vừa khung, toạ độ không đổi. */
export const BOARD_W = 1200;
export const BOARD_H = 800;

/** `[x, y]`, hoặc `[x, y, w]` khi bề rộng nét đổi theo điểm (lực ấn của bút cảm ứng). Gốc trên-trái, y hướng xuống. */
export type BoardPoint = [number, number, number?];

export type BoardStroke = { id: string; by: "user" | "claude"; color: string; width: number; points: BoardPoint[] };

export type Board = { version: number; width: number; height: number; strokes: BoardStroke[] };
