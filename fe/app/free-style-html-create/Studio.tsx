"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Code2, Download, Image as ImageIcon, RotateCw, Send, Trash2, X } from "lucide-react";
import { withCapture } from "@/lib/code-bridge/capture";
import { CAPTURE_H, CAPTURE_W, type CodeBridgeState, type CodeObject, type CodeRequest } from "@/lib/code-bridge/types";

// Xưởng tạo vật bằng code: Claude làm qua MCP server scripts/code-bridge/mcp.mjs. Người làm viết vật thành một tài liệu HTML tự đủ;
// trang hỏi thay đổi định kỳ và chạy vật trong iframe cô lập. Mỗi bản mới của vật được chạy thêm một lần trong iframe chụp
// (đúng khung CAPTURE_W × CAPTURE_H) để gửi ảnh lại cho người làm xem.

const POLL_MS = 700;
const CAPTURE_TIMEOUT_MS = 20_000;
const EMPTY: CodeBridgeState = { version: -1, requests: [], objects: [] };

type Sync = "connecting" | "online" | "offline";

async function post(body: object) {
  try {
    const response = await fetch("/api/code-bridge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return response.ok;
  } catch {
    return false;
  }
}

const status = (request: CodeRequest, worker: string): [string, string] => ({
  pending: [`Chờ ${worker}`, "bg-amber-100 text-amber-800"],
  working: [`${worker} đang làm`, "bg-sky-100 text-sky-800"],
  done: ["Xong", "bg-emerald-100 text-emerald-800"],
  failed: ["Không làm được", "bg-red-100 text-red-700"],
} satisfies Record<CodeRequest["status"], [string, string]>)[request.status];

type Props = {
  /** Ai làm vật, dùng trong nhãn trạng thái ("Claude"). */
  worker: string;
  /** Ghi chú dưới ô yêu cầu: yêu cầu tới người làm bằng cách nào. */
  note: ReactNode;
  /** Câu hiện khi chưa có vật nào. */
  emptyHint: string;
};

const time = (iso: string) => new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

export default function Studio({ worker, note, emptyHint }: Props) {
  const [state, setState] = useState<CodeBridgeState>(EMPTY);
  const [sync, setSync] = useState<Sync>("connecting");
  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [tab, setTab] = useState<"view" | "code">("view");
  const [reload, setReload] = useState(0);
  const versionRef = useRef(-1);

  // Hỏi trạng thái định kỳ: vật người làm vừa ghi hiện lên trong chưa tới một giây.
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const response = await fetch(`/api/code-bridge?since=${versionRef.current}`, { cache: "no-store" });
        if (!response.ok) throw new Error(String(response.status));
        const data = (await response.json()) as CodeBridgeState | { version: number; unchanged: true };
        if (!stopped && !("unchanged" in data)) { versionRef.current = data.version; setState(data); }
        if (!stopped) setSync("online");
      } catch {
        if (!stopped) setSync("offline");
      }
      if (!stopped) timer = setTimeout(tick, POLL_MS);
    };
    tick();
    return () => { stopped = true; clearTimeout(timer); };
  }, []);

  // Người dùng chưa chọn vật nào thì luôn theo vật vừa được sửa gần nhất, để thấy ngay việc người làm đang làm.
  const latest = useMemo(() => [...state.objects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0], [state.objects]);
  const selected = state.objects.find((o) => o.id === picked) ?? latest;

  // ── Chụp ảnh cho người làm: mỗi (vật, rev) chưa có ảnh được chạy một lần trong iframe chụp ──
  const captureRef = useRef<HTMLIFrameElement>(null);
  const attempted = useRef(new Set<string>());
  const [capturing, setCapturing] = useState<CodeObject | null>(null);

  useEffect(() => {
    if (capturing) return;
    const next = state.objects.find((o) => o.snapshotRev !== o.rev && !attempted.current.has(`${o.id}@${o.rev}`));
    if (next) setCapturing(next);
  }, [state.objects, capturing]);

  const finishCapture = useCallback(async (object: CodeObject, result: { png?: string; error?: string }) => {
    attempted.current.add(`${object.id}@${object.rev}`);
    await post({ op: "snapshot", id: object.id, rev: object.rev, ...result });
    setCapturing((current) => (current?.id === object.id && current.rev === object.rev ? null : current));
  }, []);

  useEffect(() => {
    if (!capturing) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { __codeBridge?: string; id?: string; rev?: number; png?: string; error?: string } | null;
      if (!data || data.__codeBridge !== "snapshot" || event.source !== captureRef.current?.contentWindow) return;
      if (data.id !== capturing.id || data.rev !== capturing.rev) return;
      void finishCapture(capturing, typeof data.png === "string" ? { png: data.png } : { error: data.error ?? "Không rõ lỗi." });
    };
    window.addEventListener("message", onMessage);
    const timer = setTimeout(() => void finishCapture(capturing, { error: `Hết ${CAPTURE_TIMEOUT_MS / 1000} giây mà vật chưa tự chụp xong.` }), CAPTURE_TIMEOUT_MS);
    return () => { window.removeEventListener("message", onMessage); clearTimeout(timer); };
  }, [capturing, finishCapture]);

  const captureDoc = useMemo(() => (capturing ? withCapture(capturing.html, capturing.id, capturing.rev) : ""), [capturing]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const text = prompt.trim();
    if (!text || sending) return;
    setSending(true);
    if (await post({ op: "request", prompt: text })) setPrompt("");
    else setSync("offline");
    setSending(false);
  };

  const download = (object: CodeObject) => {
    const link = document.createElement("a");
    link.download = `${object.id}.html`;
    link.href = URL.createObjectURL(new Blob([object.html], { type: "text/html" }));
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const requests = [...state.requests].reverse();
  const objects = [...state.objects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const chip = "rounded-full px-2 py-0.5 text-[10px] font-semibold";
  const tool = "flex items-center gap-1.5 rounded-md border border-[#e8e2d9] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#4f4943] hover:bg-[#f7f3ee] disabled:opacity-40";

  return <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[340px_1fr]">
    <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto border-b border-[#e8e2d9] bg-white p-4 lg:border-b-0 lg:border-r">
      <form onSubmit={send} className="space-y-2">
        <label htmlFor="prompt" className="text-[12px] font-semibold text-[#171717]">Yêu cầu cho {worker}</label>
        <textarea id="prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} maxLength={4000}
          onKeyDown={(event) => { if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) void send(event); }}
          placeholder="Ví dụ: một chiếc cân đĩa Roberval bằng đồng, nhìn ngang, có kim chỉ và thang chia"
          className="w-full resize-y rounded-md border border-[#e8e2d9] bg-[#faf9f7] p-2.5 text-[13px] text-[#171717] outline-none focus:border-[#e8724a]" />
        <div className="flex items-center gap-2">
          <button type="submit" disabled={!prompt.trim() || sending || sync === "offline"}
            className="flex items-center gap-1.5 rounded-md bg-[#e8724a] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#d9653e] disabled:opacity-40">
            <Send size={14} aria-hidden /> Gửi
          </button>
          <span className="text-[11px] text-[#8a8178]">Ctrl+Enter</span>
          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-[#8a8178]" aria-live="polite">
            <span className={`size-2 rounded-full ${sync === "online" ? "bg-emerald-500" : sync === "offline" ? "bg-red-500" : "bg-amber-400"}`} aria-hidden />
            {sync === "online" ? "Đã nối xưởng" : sync === "offline" ? "Mất kết nối" : "Đang nối…"}
          </span>
        </div>
        <p className="text-[11px] leading-relaxed text-[#8a8178]">{note}</p>
      </form>

      <section>
        <h2 className="mb-2 text-[12px] font-semibold text-[#171717]">Yêu cầu</h2>
        {requests.length ? <ul className="space-y-2">
          {requests.map((request) => <li key={request.id} className="rounded-md border border-[#e8e2d9] p-2.5 text-[12px]">
            <div className="flex items-center gap-2">
              <span className={`${chip} ${status(request, worker)[1]}`}>{status(request, worker)[0]}</span>
              <span className="text-[10px] text-[#8a8178]">{time(request.createdAt)}</span>
              <button type="button" onClick={() => void post({ op: "delete-request", id: request.id })} className="ml-auto text-[#8a8178] hover:text-red-600" title="Bỏ yêu cầu này" aria-label="Bỏ yêu cầu này"><X size={14} /></button>
            </div>
            <p className="mt-1.5 whitespace-pre-wrap text-[#171717]">{request.prompt}</p>
            {request.note ? <p className="mt-1 text-[#6b6b6b]">{worker}: {request.note}</p> : null}
            {request.objectId && state.objects.some((o) => o.id === request.objectId)
              ? <button type="button" onClick={() => { setPicked(request.objectId!); setTab("view"); }} className="mt-1 text-[11px] font-semibold text-[#c96545] hover:underline">Xem vật →</button> : null}
          </li>)}
        </ul> : <p className="text-[12px] text-[#8a8178]">Chưa có yêu cầu nào.</p>}
      </section>

      <section>
        <h2 className="mb-2 text-[12px] font-semibold text-[#171717]">Vật đã tạo</h2>
        {objects.length ? <ul className="space-y-1">
          {objects.map((object) => <li key={object.id}>
            <button type="button" onClick={() => setPicked(object.id)}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12px] ${selected?.id === object.id ? "bg-[#fbe9e2] text-[#171717]" : "text-[#4f4943] hover:bg-[#f7f3ee]"}`}>
              <span className="min-w-0 flex-1 truncate font-medium">{object.title}</span>
              <span className="shrink-0 text-[10px] text-[#8a8178]">rev {object.rev} · {time(object.updatedAt)}</span>
            </button>
          </li>)}
        </ul> : <p className="text-[12px] text-[#8a8178]">Chưa có vật nào.</p>}
      </section>
    </aside>

    <section className="flex min-h-[480px] min-w-0 flex-col bg-[#f5f1ec]">
      {selected ? <>
        <div className="flex flex-wrap items-center gap-2 border-b border-[#e8e2d9] bg-white px-4 py-2.5">
          <strong className="min-w-0 truncate text-[14px] text-[#171717]">{selected.title}</strong>
          <span className="text-[11px] text-[#8a8178]">{selected.id} · rev {selected.rev}</span>
          <span className="text-[11px] text-[#8a8178]">
            {capturing?.id === selected.id ? `· đang chụp cho ${worker}…` : selected.snapshotRev === selected.rev ? (selected.snapshotError ? `· chụp lỗi: ${selected.snapshotError}` : `· ${worker} đã có ảnh`) : ""}
          </span>
          <span className="ml-auto flex flex-wrap gap-1.5">
            <button type="button" className={tool} onClick={() => setTab(tab === "view" ? "code" : "view")}>
              {tab === "view" ? <><Code2 size={14} aria-hidden /> Xem code</> : <><ImageIcon size={14} aria-hidden /> Xem hình</>}
            </button>
            <button type="button" className={tool} onClick={() => setReload((n) => n + 1)} title="Chạy lại vật từ đầu"><RotateCw size={14} aria-hidden /> Chạy lại</button>
            <button type="button" className={tool} onClick={() => download(selected)}><Download size={14} aria-hidden /> Tải .html</button>
            <button type="button" className={tool} onClick={() => { if (confirm(`Xoá vật “${selected.title}”?`)) { void post({ op: "delete-object", id: selected.id }); setPicked(null); } }}><Trash2 size={14} aria-hidden /> Xoá</button>
          </span>
        </div>
        {tab === "view"
          ? <div className="flex min-h-0 flex-1 items-center justify-center p-4">
            <iframe key={`${selected.id}@${selected.rev}#${reload}`} title={selected.title} srcDoc={selected.html} sandbox="allow-scripts"
              className="aspect-[3/2] w-full max-w-[1200px] rounded-[12px] border-0 bg-[#0f172a] shadow-[0_10px_30px_#4c477122]" />
          </div>
          : <pre className="min-h-0 flex-1 overflow-auto bg-[#1b1a1f] p-4 text-[12px] leading-[1.55] text-[#e8e6ef]">{selected.html}</pre>}
      </> : <div className="flex flex-1 items-center justify-center p-8 text-center text-[13px] text-[#8a8178]">{emptyHint}</div>}
    </section>

    {/* Iframe chụp: nằm trong khung nhìn nhưng trong suốt, vì Chrome tạm dừng vẽ trong iframe khác nguồn gốc nằm ngoài màn hình. */}
    {capturing ? <iframe ref={captureRef} key={`${capturing.id}@${capturing.rev}`} srcDoc={captureDoc} sandbox="allow-scripts" aria-hidden tabIndex={-1} title={`Chụp vật cho ${worker}`}
      style={{ position: "fixed", left: 0, top: 0, width: CAPTURE_W, height: CAPTURE_H, border: 0, opacity: 0, pointerEvents: "none", zIndex: -1 }} /> : null}
  </div>;
}
