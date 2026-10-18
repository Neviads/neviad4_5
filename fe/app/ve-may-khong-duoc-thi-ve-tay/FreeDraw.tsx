"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Download, Pen, Redo2, Trash2, Undo2 } from "lucide-react";
import { BOARD_H, BOARD_W, type Board, type BoardPoint, type BoardStroke } from "@/lib/draw-bridge/types";

// Bảng vẽ tay tự do, dụng cụ duy nhất là cái bút. Bảng có khổ cố định BOARD_W × BOARD_H và được co cho vừa khung, nên
// người dùng và Claude (qua MCP server scripts/draw-bridge/mcp.mjs) vẽ chung một hệ toạ độ. Nguồn sự thật là file bảng
// sau /api/draw-bridge; trang hỏi thay đổi định kỳ. Không nối được thì vẫn vẽ được, chỉ là không chung với Claude.

const BACKGROUND = "#0f172a";
const GRID = 40;
const POLL_MS = 700;
const COLORS: [string, string][] = [
  ["Trắng", "#e2e8f0"],
  ["Thép", "#94a3b8"],
  ["Xanh trời", "#38bdf8"],
  ["Ngọc", "#2dd4bf"],
  ["Hổ phách", "#fbbf24"],
  ["Cam", "#fb923c"],
  ["Đỏ", "#ef4444"],
];

type Sync = "connecting" | "online" | "offline";

/** Bút cảm ứng có lực ấn thì nét to nhỏ theo lực; chuột và ngón tay giữ đúng cỡ đã chọn. */
const widthOf = (event: PointerEvent | ReactPointerEvent, size: number) =>
  event.pointerType === "pen" && event.pressure > 0 ? size * (0.35 + event.pressure * 1.3) : size;

const widthAt = (stroke: BoardStroke, p: BoardPoint) => p[2] ?? stroke.width;

function paintBackground(context: CanvasRenderingContext2D) {
  context.fillStyle = BACKGROUND;
  context.fillRect(0, 0, BOARD_W, BOARD_H);
  context.strokeStyle = "rgba(58, 74, 104, 0.55)";
  context.lineWidth = 1;
  context.beginPath();
  for (let x = GRID; x < BOARD_W; x += GRID) { context.moveTo(x, 0); context.lineTo(x, BOARD_H); }
  for (let y = GRID; y < BOARD_H; y += GRID) { context.moveTo(0, y); context.lineTo(BOARD_W, y); }
  context.stroke();
}

/**
 * Vẽ đoạn nét quanh điểm `i` bằng đường cong bậc hai qua trung điểm hai bên, để nét mềm thay vì gãy khúc.
 * Cùng cách vẽ với bản render của MCP server, nên ảnh Claude xem khớp với trang.
 */
function paintSegment(context: CanvasRenderingContext2D, stroke: BoardStroke, i: number) {
  const pts = stroke.points;
  context.strokeStyle = stroke.color;
  context.fillStyle = stroke.color;
  context.lineCap = "round";
  context.lineJoin = "round";
  if (pts.length === 1) {
    context.beginPath();
    context.arc(pts[0][0], pts[0][1], widthAt(stroke, pts[0]) / 2, 0, Math.PI * 2);
    context.fill();
    return;
  }
  if (i < 1) return;
  const a = pts[i - 1], b = pts[i];
  const before = i >= 2 ? pts[i - 2] : a;
  context.lineWidth = (widthAt(stroke, a) + widthAt(stroke, b)) / 2;
  context.beginPath();
  context.moveTo((before[0] + a[0]) / 2, (before[1] + a[1]) / 2);
  context.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  context.stroke();
}

function paintStroke(context: CanvasRenderingContext2D, stroke: BoardStroke) {
  const pts = stroke.points;
  if (pts.length === 1) { paintSegment(context, stroke, 0); return; }
  for (let i = 1; i < pts.length; i += 1) paintSegment(context, stroke, i);
  // Nối nốt nửa đoạn cuối, từ trung điểm cuối tới điểm nhấc bút.
  const a = pts[pts.length - 2], b = pts[pts.length - 1];
  context.lineWidth = widthAt(stroke, b);
  context.beginPath();
  context.moveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  context.lineTo(b[0], b[1]);
  context.stroke();
}

async function post(body: object): Promise<{ version: number } | null> {
  try {
    const response = await fetch("/api/draw-bridge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

export default function FreeDraw() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scaleRef = useRef(1);
  const currentRef = useRef<BoardStroke | null>(null);
  const versionRef = useRef(-1);
  /** Số lần ghi đang chờ: trong lúc đó bỏ qua kết quả hỏi định kỳ, để nét vừa vẽ không nhấp nháy mất rồi hiện lại. */
  const pendingRef = useRef(0);
  const [strokes, setStrokes] = useState<BoardStroke[]>([]);
  const strokesRef = useRef(strokes);
  const [undone, setUndone] = useState<BoardStroke[]>([]);
  const [color, setColor] = useState(COLORS[0][1]);
  const [size, setSize] = useState(4);
  const [sync, setSync] = useState<Sync>("connecting");

  const redraw = useCallback(() => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    paintBackground(context);
    for (const stroke of strokesRef.current) paintStroke(context, stroke);
    if (currentRef.current) paintStroke(context, currentRef.current);
  }, []);

  useEffect(() => { strokesRef.current = strokes; redraw(); }, [strokes, redraw]);

  // Bảng co cho vừa khung, giữ tỉ lệ; nét sắc trên màn hình mật độ cao.
  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const resize = () => {
      const scale = Math.max(0.1, Math.min(host.clientWidth / BOARD_W, host.clientHeight / BOARD_H));
      const ratio = window.devicePixelRatio || 1;
      scaleRef.current = scale;
      canvas.width = Math.round(BOARD_W * scale * ratio);
      canvas.height = Math.round(BOARD_H * scale * ratio);
      canvas.style.width = `${BOARD_W * scale}px`;
      canvas.style.height = `${BOARD_H * scale}px`;
      canvas.getContext("2d")?.setTransform(scale * ratio, 0, 0, scale * ratio, 0, 0);
      redraw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    return () => observer.disconnect();
  }, [redraw]);

  // Hỏi bảng chung định kỳ: nét Claude vẽ hiện lên trong chưa tới một giây.
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const response = await fetch(`/api/draw-bridge?since=${versionRef.current}`, { cache: "no-store" });
        if (!response.ok) throw new Error(String(response.status));
        const data = (await response.json()) as Board | { version: number; unchanged: true };
        if (!stopped && pendingRef.current === 0 && !("unchanged" in data)) {
          versionRef.current = data.version;
          setStrokes(data.strokes);
        }
        if (!stopped) setSync("online");
      } catch {
        if (!stopped) setSync((current) => (current === "online" ? "offline" : current === "connecting" ? "offline" : current));
      }
      if (!stopped) timer = setTimeout(tick, POLL_MS);
    };
    tick();
    return () => { stopped = true; clearTimeout(timer); };
  }, []);

  /** Ghi lên bảng chung; xong thì lần hỏi kế tiếp đồng bộ lại. Mất kết nối thì giữ thay đổi ở trang. */
  const write = useCallback(async (body: object) => {
    pendingRef.current += 1;
    const result = await post(body);
    pendingRef.current -= 1;
    if (!result) setSync("offline");
  }, []);

  const pointOf = (event: PointerEvent | ReactPointerEvent): BoardPoint => {
    const box = canvasRef.current!.getBoundingClientRect();
    const scale = scaleRef.current;
    const x = Math.min(BOARD_W, Math.max(0, (event.clientX - box.left) / scale));
    const y = Math.min(BOARD_H, Math.max(0, (event.clientY - box.top) / scale));
    return event.pointerType === "pen" ? [x, y, widthOf(event, size)] : [x, y];
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const stroke: BoardStroke = { id: crypto.randomUUID(), by: "user", color, width: size, points: [pointOf(event)] };
    currentRef.current = stroke;
    const context = canvasRef.current?.getContext("2d");
    if (context) paintSegment(context, stroke, 0);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const stroke = currentRef.current;
    const context = canvasRef.current?.getContext("2d");
    if (!stroke || !context) return;
    // Lấy cả các điểm trình duyệt gộp lại giữa hai lần gọi, để nét nhanh vẫn mịn.
    const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? [];
    for (const e of coalesced.length ? coalesced : [event.nativeEvent]) {
      const point = pointOf(e);
      const last = stroke.points[stroke.points.length - 1];
      if (Math.hypot(point[0] - last[0], point[1] - last[1]) < 0.8 / scaleRef.current) continue;
      stroke.points.push(point);
      paintSegment(context, stroke, stroke.points.length - 1);
    }
  };

  const finish = () => {
    const stroke = currentRef.current;
    currentRef.current = null;
    if (!stroke) return;
    setStrokes((all) => [...all, stroke]);
    setUndone([]);
    void write({ op: "add", stroke });
  };

  const undo = useCallback(() => {
    if (!strokes.length) return;
    setUndone([...undone, strokes[strokes.length - 1]]);
    setStrokes(strokes.slice(0, -1));
    void write({ op: "undo" });
  }, [strokes, undone, write]);

  const redo = useCallback(() => {
    if (!undone.length) return;
    const stroke = undone[undone.length - 1];
    setStrokes([...strokes, stroke]);
    setUndone(undone.slice(0, -1));
    void write({ op: "add", stroke: { ...stroke, by: "user" } });
  }, [strokes, undone, write]);

  const clear = () => {
    if (!strokes.length) return;
    setUndone([]);
    setStrokes([]);
    void write({ op: "clear" });
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `ve-tay-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // Ctrl/⌘+Z hoàn tác, Ctrl/⌘+Shift+Z hoặc Ctrl+Y làm lại.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) { event.preventDefault(); undo(); }
      else if ((key === "z" && event.shiftKey) || key === "y") { event.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const byClaude = strokes.filter((stroke) => stroke.by === "claude").length;
  const button = "flex items-center gap-1.5 rounded-md border border-[#e8e2d9] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#4f4943] hover:bg-[#f7f3ee] disabled:cursor-not-allowed disabled:opacity-40";

  return <div className="flex min-h-0 flex-1 flex-col">
    <section className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[#e8e2d9] bg-white px-4 py-2.5 text-[12px] text-[#4f4943] sm:px-6">
      <span className="flex items-center gap-1.5 rounded-md bg-[#e8724a] px-2.5 py-1.5 font-semibold text-white" title="Dụng cụ đang dùng">
        <Pen size={14} aria-hidden /> Bút
      </span>
      <span className="flex items-center gap-1.5" role="radiogroup" aria-label="Màu bút">
        {COLORS.map(([label, value]) => <button key={value} type="button" role="radio" aria-checked={color === value} title={label} aria-label={label}
          onClick={() => setColor(value)} style={{ background: value }}
          className={`size-6 rounded-full border-2 ${color === value ? "border-[#171717]" : "border-white shadow"}`} />)}
      </span>
      <label className="flex items-center gap-2">Cỡ nét
        <input type="range" min={1} max={24} step={1} value={size} onChange={(event) => setSize(Number(event.target.value))} className="accent-[#e8724a]" />
        <span className="flex size-7 items-center justify-center rounded-md bg-[#0f172a]" aria-hidden>
          <span className="rounded-full" style={{ width: Math.min(22, size), height: Math.min(22, size), background: color }} />
        </span>
      </label>
      <span className="flex items-center gap-1.5 text-[11px] text-[#8a8178]" aria-live="polite">
        <span className={`size-2 rounded-full ${sync === "online" ? "bg-emerald-500" : sync === "offline" ? "bg-red-500" : "bg-amber-400"}`} aria-hidden />
        {sync === "online" ? `Bảng chung với Claude · ${strokes.length} nét${byClaude ? ` (${byClaude} của Claude)` : ""}`
          : sync === "offline" ? "Không nối được bảng chung: chỉ vẽ ở trang này" : "Đang nối bảng chung…"}
      </span>
      <span className="ml-auto flex flex-wrap items-center gap-1.5">
        <button type="button" className={button} onClick={undo} disabled={!strokes.length} title="Hoàn tác nét cuối, của bất kỳ ai (Ctrl+Z)"><Undo2 size={14} aria-hidden /> Hoàn tác</button>
        <button type="button" className={button} onClick={redo} disabled={!undone.length} title="Làm lại (Ctrl+Shift+Z)"><Redo2 size={14} aria-hidden /> Làm lại</button>
        <button type="button" className={button} onClick={clear} disabled={!strokes.length} title="Xoá hết các nét"><Trash2 size={14} aria-hidden /> Xoá hết</button>
        <button type="button" className={button} onClick={download} title="Tải hình về dạng PNG"><Download size={14} aria-hidden /> Tải PNG</button>
      </span>
    </section>

    <div ref={hostRef} className="relative flex min-h-[420px] flex-1 items-center justify-center overflow-hidden bg-[#0b1220]">
      <canvas ref={canvasRef} className="block cursor-crosshair touch-none select-none shadow-[0_10px_40px_#00000066]"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={finish} onPointerCancel={finish}
        aria-label="Bảng vẽ: giữ chuột hoặc chạm rồi kéo để vẽ" />
      {!strokes.length ? <p className="pointer-events-none absolute inset-x-0 top-6 text-center text-[13px] text-slate-400">Giữ chuột (hoặc chạm, hoặc dùng bút cảm ứng) rồi kéo để vẽ.</p> : null}
    </div>
  </div>;
}
