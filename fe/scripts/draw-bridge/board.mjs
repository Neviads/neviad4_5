// Lõi của cầu vẽ: đọc ghi bảng chung fe/.draw-bridge/board.json (cùng định dạng với fe/lib/draw-bridge/types.ts), đổi một đường SVG
// thành các nét bút, và dựng bảng thành ảnh PNG theo đúng cách trang /ve-may-khong-duoc-thi-ve-tay vẽ nét (cong bậc hai qua trung điểm).
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const here = dirname(fileURLToPath(import.meta.url));
export const FE_ROOT = resolve(here, "../..");
/** `NEVIAD_DRAW_BOARD` trỏ sang file bảng khác (để thử mà không đụng bảng thật mà trang đang dùng). */
export const BOARD_FILE = process.env.NEVIAD_DRAW_BOARD ? resolve(process.env.NEVIAD_DRAW_BOARD) : join(FE_ROOT, ".draw-bridge/board.json");
export const BOARD_W = 1200;
export const BOARD_H = 800;
export const MAX_STROKES = 5000;
const BACKGROUND = "#0f172a";
const GRID = 40;
/** Khoảng cách giữa hai điểm khi đổi đường cong thành nét, đủ dày để cách vẽ của trang không bo mất góc. */
const STEP = 3;

// ── Bảng ─────────────────────────────────────────────────────────────────────
/** Chưa có file thì là bảng trống. File hỏng thì ném lỗi chứ không coi là trống, để lần ghi sau không đè mất hình. */
export function readBoard() {
  if (!existsSync(BOARD_FILE)) return { version: 0, width: BOARD_W, height: BOARD_H, strokes: [] };
  const board = JSON.parse(readFileSync(BOARD_FILE, "utf8"));
  if (!Array.isArray(board.strokes)) throw new Error(`${BOARD_FILE} không phải bảng vẽ hợp lệ.`);
  return board;
}

export function writeBoard(board) {
  mkdirSync(dirname(BOARD_FILE), { recursive: true });
  const temp = `${BOARD_FILE}.${process.pid}.tmp`;
  writeFileSync(temp, JSON.stringify(board));
  for (let attempt = 0; ; attempt += 1) {
    try { renameSync(temp, BOARD_FILE); return; } catch (error) {
      if (attempt >= 5) throw error; // Windows: trang đang đọc file đúng lúc đó
      const until = Date.now() + 30;
      while (Date.now() < until) { /* chờ rất ngắn rồi thử lại */ }
    }
  }
}

/** Đọc, sửa, ghi trong một lần và tăng `version`, để trang biết có thay đổi. */
export function updateBoard(change) {
  const board = readBoard();
  const result = change(board);
  board.version += 1;
  writeBoard(board);
  return { board, result };
}

export const newStroke = (points, color, width) => ({ id: randomUUID(), by: "claude", color, width, points });

const clampPoint = ([x, y]) => [Math.min(BOARD_W, Math.max(0, x)), Math.min(BOARD_H, Math.max(0, y))];

// ── Đường SVG → nét bút ──────────────────────────────────────────────────────
const TOKENS = /[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
const ARGS = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

function sampleLine(out, a, b) {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / STEP));
  for (let i = 1; i <= n; i += 1) out.push([a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
}

function sampleCurve(out, at, roughLength) {
  const n = Math.max(2, Math.ceil(roughLength / STEP));
  for (let i = 1; i <= n; i += 1) out.push(at(i / n));
}

const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Cung elip theo tham số điểm đầu-cuối của SVG (rx ry góc cờ-lớn cờ-quét x y), đổi sang tâm rồi lấy mẫu. */
function sampleArc(out, from, rx, ry, angle, large, sweep, to) {
  if (rx === 0 || ry === 0 || (from[0] === to[0] && from[1] === to[1])) { sampleLine(out, from, to); return; }
  rx = Math.abs(rx); ry = Math.abs(ry);
  const phi = (angle * Math.PI) / 180, cos = Math.cos(phi), sin = Math.sin(phi);
  const dx = (from[0] - to[0]) / 2, dy = (from[1] - to[1]) / 2;
  const x1 = cos * dx + sin * dy, y1 = -sin * dx + cos * dy;
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lambda > 1) { rx *= Math.sqrt(lambda); ry *= Math.sqrt(lambda); }
  const sign = large === sweep ? -1 : 1;
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const coef = sign * Math.sqrt(Math.max(0, num / (rx * rx * y1 * y1 + ry * ry * x1 * x1)));
  const cx1 = (coef * rx * y1) / ry, cy1 = (-coef * ry * x1) / rx;
  const cx = cos * cx1 - sin * cy1 + (from[0] + to[0]) / 2, cy = sin * cx1 + cos * cy1 + (from[1] + to[1]) / 2;
  const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const t1 = ang(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
  let dt = ang((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  if (sweep && dt < 0) dt += 2 * Math.PI;
  sampleCurve(out, (t) => {
    const a = t1 + dt * t;
    return [cx + rx * Math.cos(a) * cos - ry * Math.sin(a) * sin, cy + rx * Math.cos(a) * sin + ry * Math.sin(a) * cos];
  }, Math.abs(dt) * Math.max(rx, ry));
}

/**
 * Đổi dữ liệu đường SVG (M L H V C S Q T A Z, hoa là tuyệt đối, thường là tương đối) thành danh sách nét: mỗi `M` là một lần
 * nhấc bút, nên một chuỗi `d` có thể ra nhiều nét. Ném lỗi khi chuỗi sai cú pháp.
 */
export function pathToStrokes(d) {
  const tokens = String(d).match(TOKENS) ?? [];
  const strokes = [];
  let current = null, pos = [0, 0], start = [0, 0], lastCtrl = null, lastCmd = "", i = 0, cmd = "";
  const num = () => {
    if (i >= tokens.length || /[a-z]/i.test(tokens[i])) throw new Error(`Đường SVG thiếu số sau lệnh "${cmd}".`);
    return Number(tokens[i++]);
  };
  while (i < tokens.length) {
    if (/[a-z]/i.test(tokens[i])) cmd = tokens[i++];
    else if (!cmd) throw new Error("Đường SVG phải bắt đầu bằng M.");
    const upper = cmd.toUpperCase(), rel = cmd !== upper;
    const base = rel ? pos : [0, 0];
    const pt = () => { const x = num(), y = num(); return [base[0] + x, base[1] + y]; };
    if (upper !== "M" && !current) throw new Error("Đường SVG phải bắt đầu bằng M.");
    switch (upper) {
      case "M": {
        pos = pt(); start = pos;
        current = [pos]; strokes.push(current);
        cmd = rel ? "l" : "L"; // các cặp số sau M là L ngầm định
        break;
      }
      case "L": { const p = pt(); sampleLine(current, pos, p); pos = p; break; }
      case "H": { const x = num(); const p = [rel ? pos[0] + x : x, pos[1]]; sampleLine(current, pos, p); pos = p; break; }
      case "V": { const y = num(); const p = [pos[0], rel ? pos[1] + y : y]; sampleLine(current, pos, p); pos = p; break; }
      case "C": case "S": {
        const c1 = upper === "S" ? (lastCtrl && /[CS]/i.test(lastCmd) ? [2 * pos[0] - lastCtrl[0], 2 * pos[1] - lastCtrl[1]] : pos) : pt();
        const c2 = pt(), p = pt(), p0 = pos;
        sampleCurve(current, (t) => {
          const u = 1 - t;
          return [u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p[0],
            u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p[1]];
        }, dist(p0, c1) + dist(c1, c2) + dist(c2, p));
        lastCtrl = c2; pos = p; lastCmd = upper; continue;
      }
      case "Q": case "T": {
        const c = upper === "T" ? (lastCtrl && /[QT]/i.test(lastCmd) ? [2 * pos[0] - lastCtrl[0], 2 * pos[1] - lastCtrl[1]] : pos) : pt();
        const p = pt(), p0 = pos;
        sampleCurve(current, (t) => {
          const u = 1 - t;
          return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p[1]];
        }, dist(p0, c) + dist(c, p));
        lastCtrl = c; pos = p; lastCmd = upper; continue;
      }
      case "A": {
        const rx = num(), ry = num(), angle = num(), large = num() !== 0, sweep = num() !== 0, p = pt();
        sampleArc(current, pos, rx, ry, angle, large, sweep, p); pos = p; break;
      }
      case "Z": {
        if (dist(pos, start) > 0.01) sampleLine(current, pos, start);
        pos = start; break;
      }
      default: throw new Error(`Lệnh "${cmd}" không hỗ trợ.`);
    }
    lastCtrl = null; lastCmd = upper;
  }
  return strokes.map((points) => points.map(clampPoint));
}

// ── Ảnh của bảng ─────────────────────────────────────────────────────────────
const r = (v) => Math.round(v * 100) / 100;
const widthAt = (stroke, p) => p[2] ?? stroke.width;

/** Một nét thành SVG, đúng cách trang vẽ: đoạn thẳng tới trung điểm đầu, cong bậc hai qua từng điểm, đoạn thẳng tới điểm cuối. */
function strokeSvg(stroke) {
  const pts = stroke.points;
  if (pts.length === 1) return `<circle cx="${r(pts[0][0])}" cy="${r(pts[0][1])}" r="${r(widthAt(stroke, pts[0]) / 2)}" fill="${stroke.color}"/>`;
  const mid = (a, b) => `${r((a[0] + b[0]) / 2)} ${r((a[1] + b[1]) / 2)}`;
  const attrs = `fill="none" stroke="${stroke.color}" stroke-linecap="round" stroke-linejoin="round"`;
  if (pts.every((p) => p[2] === undefined)) {
    let d = `M${r(pts[0][0])} ${r(pts[0][1])} L${mid(pts[0], pts[1])}`;
    for (let i = 1; i < pts.length - 1; i += 1) d += ` Q${r(pts[i][0])} ${r(pts[i][1])} ${mid(pts[i], pts[i + 1])}`;
    d += ` L${r(pts[pts.length - 1][0])} ${r(pts[pts.length - 1][1])}`;
    return `<path d="${d}" stroke-width="${r(stroke.width)}" ${attrs}/>`;
  }
  let out = "";
  for (let i = 1; i < pts.length; i += 1) {
    const a = pts[i - 1], b = pts[i], before = i >= 2 ? pts[i - 2] : a;
    out += `<path d="M${mid(before, a)} Q${r(a[0])} ${r(a[1])} ${mid(a, b)}" stroke-width="${r((widthAt(stroke, a) + widthAt(stroke, b)) / 2)}" ${attrs}/>`;
  }
  const a = pts[pts.length - 2], b = pts[pts.length - 1];
  return out + `<path d="M${mid(a, b)} L${r(b[0])} ${r(b[1])}" stroke-width="${r(widthAt(stroke, b))}" ${attrs}/>`;
}

/**
 * Bảng (hoặc một vùng của nó) thành PNG. `region` tính bằng điểm bảng; `scale` là số pixel ảnh trên một điểm bảng;
 * `grid` vẽ lưới như trang; `marks` thêm thước toạ độ mỗi 100 điểm để dễ ước vị trí.
 */
export async function renderBoard(board, { region, scale = 1, grid = true, marks = false } = {}) {
  const sharp = createRequire(join(FE_ROOT, "package.json"))("sharp");
  const box = region ?? { x: 0, y: 0, width: BOARD_W, height: BOARD_H };
  const w = Math.max(1, Math.round(box.width * scale)), h = Math.max(1, Math.round(box.height * scale));
  let lines = "";
  if (grid) {
    for (let x = GRID; x < BOARD_W; x += GRID) lines += `M${x} 0V${BOARD_H}`;
    for (let y = GRID; y < BOARD_H; y += GRID) lines += `M0 ${y}H${BOARD_W}`;
  }
  let ruler = "";
  if (marks) {
    for (let x = 100; x < BOARD_W; x += 100) ruler += `<text x="${x + 3}" y="12" font-size="11" fill="#fdba74" font-family="Arial">${x}</text><path d="M${x} 0V${BOARD_H}" stroke="#fb923c" stroke-opacity=".35" stroke-dasharray="4 6"/>`;
    for (let y = 100; y < BOARD_H; y += 100) ruler += `<text x="3" y="${y - 3}" font-size="11" fill="#fdba74" font-family="Arial">${y}</text><path d="M0 ${y}H${BOARD_W}" stroke="#fb923c" stroke-opacity=".35" stroke-dasharray="4 6"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${box.x} ${box.y} ${box.width} ${box.height}">`
    + `<rect x="0" y="0" width="${BOARD_W}" height="${BOARD_H}" fill="${BACKGROUND}"/>`
    + (lines ? `<path d="${lines}" stroke="#3a4a68" stroke-opacity=".55" stroke-width="1" fill="none"/>` : "")
    + board.strokes.map(strokeSvg).join("") + ruler + `</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Khung bao của một nét, tính cả bề rộng nét. */
export function strokeBox(stroke) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of stroke.points) {
    const half = widthAt(stroke, p) / 2;
    minX = Math.min(minX, p[0] - half); minY = Math.min(minY, p[1] - half);
    maxX = Math.max(maxX, p[0] + half); maxY = Math.max(maxY, p[1] + half);
  }
  return { x: r(minX), y: r(minY), width: r(maxX - minX), height: r(maxY - minY) };
}
