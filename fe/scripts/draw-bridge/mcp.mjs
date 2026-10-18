#!/usr/bin/env node
// MCP server "neviad-draw": cầu nối giữa Claude và bảng vẽ tay ở trang /ve-may-khong-duoc-thi-ve-tay.
// Chạy qua stdio (JSON-RPC 2.0, mỗi dòng một thông điệp), không cần thư viện ngoài. Ghi thẳng vào fe/.draw-bridge/board.json,
// nên vẽ được cả khi dev server tắt; trang đang mở sẽ hiện nét trong chưa tới một giây. Chỉ in thông điệp ra stdout; nhật ký ra stderr.
//
//   claude mcp add neviad-draw -- node fe/scripts/draw-bridge/mcp.mjs      (hoặc dùng .mcp.json ở gốc repo)
import { serveMcp, text } from "../lib/mcp-stdio.mjs";
import { BOARD_H, BOARD_W, MAX_STROKES, newStroke, pathToStrokes, readBoard, renderBoard, strokeBox, updateBoard } from "./board.mjs";

const SERVER = { name: "neviad-draw", version: "1.0.0" };
const DEFAULT_COLOR = "#e2e8f0";
const DEFAULT_WIDTH = 3;

const INSTRUCTIONS = `Bảng vẽ tay chung với người dùng ở trang /ve-may-khong-duoc-thi-ve-tay. Dụng cụ duy nhất là cái BÚT: mỗi nét là một đường liền có màu và bề rộng, không tô vùng, không tẩy từng phần.
Toạ độ: bảng ${BOARD_W} × ${BOARD_H} điểm, gốc ở góc trên-trái, y hướng xuống. Nền tối #0f172a với lưới 40 điểm, nên chọn màu nét sáng.
Cách làm tốt: chốt góc nhìn và bố cục trước; vẽ đường bao các khối lớn bằng đường cong (C, Q, A trong \`d\`) rồi mới thêm chi tiết; tạo khối bằng nét đậm ở mép tối và nét mảnh sáng ở mép hứng sáng, gạch bóng song song ở vùng tối; sau mỗi cụm nét gọi board_view để XEM rồi sửa (pen_undo chỉ bỏ nét của bạn).
Nét người dùng vẽ cũng nằm trên bảng (by = "user"): xem bằng board_view trước khi vẽ thêm, và đừng xoá chúng trừ khi được yêu cầu.`;

const strokeSchema = {
  type: "object",
  properties: {
    d: { type: "string", description: "Đường SVG theo toạ độ bảng (M L H V C S Q T A Z; hoa tuyệt đối, thường tương đối). Mỗi M là một lần nhấc bút, nên một chuỗi có thể ra nhiều nét." },
    points: { type: "array", items: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 3 }, description: "Thay cho d: các điểm [x, y] hoặc [x, y, bề rộng tại điểm đó] của một nét (bút vẽ cong mềm qua chúng)." },
    color: { type: "string", description: `Màu hex, mặc định ${DEFAULT_COLOR}.` },
    width: { type: "number", description: `Bề rộng nét (điểm bảng), 0.5 đến 64, mặc định ${DEFAULT_WIDTH}.` },
  },
};

const TOOLS = [
  {
    name: "pen_draw",
    description: "Vẽ một hay nhiều nét bút lên bảng chung. Mỗi nét cho bằng đường SVG `d` hoặc danh sách `points`. Trả về số nét đã vẽ và phiên bản bảng.",
    inputSchema: { type: "object", properties: { strokes: { type: "array", items: strokeSchema, minItems: 1, maxItems: 400 } }, required: ["strokes"] },
  },
  {
    name: "pen_undo",
    description: "Bỏ các nét cuối cùng. Mặc định chỉ bỏ nét của Claude (only_claude = true), để không đụng vào nét người dùng.",
    inputSchema: { type: "object", properties: { count: { type: "integer", minimum: 1, maximum: 500, description: "Số nét cần bỏ, mặc định 1." }, only_claude: { type: "boolean", description: "Mặc định true." } } },
  },
  {
    name: "board_clear",
    description: "Xoá nét trên bảng. scope = \"claude\" (mặc định) chỉ xoá nét của Claude; \"all\" xoá cả nét của người dùng, chỉ dùng khi người dùng yêu cầu.",
    inputSchema: { type: "object", properties: { scope: { type: "string", enum: ["claude", "all"] } } },
  },
  {
    name: "board_view",
    description: "XEM bảng như trang đang hiện: trả về ảnh PNG. `region` để phóng một vùng (toạ độ bảng), `scale` số pixel ảnh trên một điểm bảng (mặc định 1, vùng nhỏ thì tăng để soi chi tiết), `marks` thêm thước toạ độ mỗi 100 điểm.",
    inputSchema: {
      type: "object",
      properties: {
        region: { type: "object", properties: { x: { type: "number" }, y: { type: "number" }, width: { type: "number" }, height: { type: "number" } }, required: ["x", "y", "width", "height"] },
        scale: { type: "number", minimum: 0.25, maximum: 4 },
        grid: { type: "boolean", description: "Mặc định true." },
        marks: { type: "boolean", description: "Mặc định false." },
      },
    },
  },
  {
    name: "board_info",
    description: "Thông tin bảng: khổ, số nét theo người vẽ, khung bao toàn bộ hình, và các nét gần nhất (người vẽ, màu, bề rộng, khung bao).",
    inputSchema: { type: "object", properties: { last: { type: "integer", minimum: 0, maximum: 100, description: "Số nét gần nhất cần liệt kê, mặc định 10." } } },
  },
];

const finite = (v) => typeof v === "number" && Number.isFinite(v);

function penDraw({ strokes }) {
  if (!Array.isArray(strokes) || !strokes.length) throw new Error("Cần ít nhất một nét trong `strokes`.");
  const made = [];
  const notes = [];
  strokes.forEach((spec, index) => {
    const color = typeof spec?.color === "string" && /^#[0-9a-f]{3,8}$/i.test(spec.color) ? spec.color : DEFAULT_COLOR;
    const width = finite(spec?.width) ? Math.min(64, Math.max(0.5, spec.width)) : DEFAULT_WIDTH;
    if (typeof spec?.d === "string" && spec.d.trim()) {
      for (const points of pathToStrokes(spec.d)) if (points.length) made.push(newStroke(points, color, width));
    } else if (Array.isArray(spec?.points) && spec.points.length) {
      const points = spec.points.filter((p) => Array.isArray(p) && finite(p[0]) && finite(p[1]))
        .map((p) => {
          const x = Math.min(BOARD_W, Math.max(0, p[0])), y = Math.min(BOARD_H, Math.max(0, p[1]));
          return finite(p[2]) ? [x, y, Math.min(64, Math.max(0.3, p[2]))] : [x, y];
        });
      if (points.length) made.push(newStroke(points, color, width));
      else notes.push(`nét ${index + 1}: không có điểm hợp lệ, bỏ qua`);
    } else notes.push(`nét ${index + 1}: thiếu cả d lẫn points, bỏ qua`);
  });
  if (!made.length) throw new Error(`Không có nét nào vẽ được. ${notes.join("; ")}`);
  const { board } = updateBoard((b) => {
    if (b.strokes.length + made.length > MAX_STROKES) throw new Error(`Bảng chỉ chứa tối đa ${MAX_STROKES} nét (đang có ${b.strokes.length}).`);
    b.strokes.push(...made);
  });
  return text(`Đã vẽ ${made.length} nét (bảng phiên bản ${board.version}, tổng ${board.strokes.length} nét).${notes.length ? ` Lưu ý: ${notes.join("; ")}.` : ""} Gọi board_view để xem.`);
}

function penUndo({ count = 1, only_claude = true }) {
  const n = Math.max(1, Math.min(500, Math.floor(count)));
  const { board, result } = updateBoard((b) => {
    let removed = 0;
    for (let i = b.strokes.length - 1; i >= 0 && removed < n; i -= 1) {
      if (only_claude && b.strokes[i].by !== "claude") continue;
      b.strokes.splice(i, 1);
      removed += 1;
    }
    return removed;
  });
  return text(`Đã bỏ ${result} nét${only_claude ? " của Claude" : ""}; còn ${board.strokes.length} nét.`);
}

function boardClear({ scope = "claude" }) {
  const { board, result } = updateBoard((b) => {
    const before = b.strokes.length;
    b.strokes = scope === "all" ? [] : b.strokes.filter((s) => s.by !== "claude");
    return before - b.strokes.length;
  });
  return text(`Đã xoá ${result} nét${scope === "all" ? "" : " của Claude"}; còn ${board.strokes.length} nét.`);
}

async function boardView({ region, scale = 1, grid = true, marks = false }) {
  const board = readBoard();
  let box;
  if (region) {
    const x = Math.max(0, Math.min(BOARD_W - 1, region.x)), y = Math.max(0, Math.min(BOARD_H - 1, region.y));
    box = { x, y, width: Math.max(1, Math.min(BOARD_W - x, region.width)), height: Math.max(1, Math.min(BOARD_H - y, region.height)) };
  }
  const png = await renderBoard(board, { region: box, scale: Math.min(4, Math.max(0.25, scale)), grid, marks });
  const byClaude = board.strokes.filter((s) => s.by === "claude").length;
  return {
    content: [
      { type: "text", text: `Bảng phiên bản ${board.version}: ${board.strokes.length} nét (${byClaude} của Claude, ${board.strokes.length - byClaude} của người dùng)${box ? `, vùng x=${box.x} y=${box.y} ${box.width}×${box.height}` : ""}.` },
      { type: "image", data: png.toString("base64"), mimeType: "image/png" },
    ],
  };
}

function boardInfo({ last = 10 }) {
  const board = readBoard();
  const byClaude = board.strokes.filter((s) => s.by === "claude").length;
  let all = null;
  for (const s of board.strokes) {
    const b = strokeBox(s);
    all = all ? { x: Math.min(all.x, b.x), y: Math.min(all.y, b.y), right: Math.max(all.right, b.x + b.width), bottom: Math.max(all.bottom, b.y + b.height) }
      : { x: b.x, y: b.y, right: b.x + b.width, bottom: b.y + b.height };
  }
  const recent = board.strokes.slice(-Math.max(0, Math.min(100, last))).map((s, i, arr) => ({
    index: board.strokes.length - arr.length + i, by: s.by, color: s.color, width: s.width, points: s.points.length, box: strokeBox(s),
  }));
  return text(JSON.stringify({
    board: { width: BOARD_W, height: BOARD_H, version: board.version },
    strokes: { total: board.strokes.length, claude: byClaude, user: board.strokes.length - byClaude },
    bounds: all && { x: all.x, y: all.y, width: Math.round((all.right - all.x) * 100) / 100, height: Math.round((all.bottom - all.y) * 100) / 100 },
    recent,
  }, null, 2));
}

const HANDLERS = { pen_draw: penDraw, pen_undo: penUndo, board_clear: boardClear, board_view: boardView, board_info: boardInfo };

serveMcp({ server: SERVER, instructions: INSTRUCTIONS, tools: TOOLS, handlers: HANDLERS });
process.stderr.write(`neviad-draw ${SERVER.version}: bảng ${BOARD_W}×${BOARD_H}, sẵn sàng\n`);
