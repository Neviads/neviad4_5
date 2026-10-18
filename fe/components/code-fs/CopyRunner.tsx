"use client";

import { Component, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import { pickPreset } from "@/lib/code-fs/presets";
import type { CodeFsStore } from "@/lib/code-fs/store";
import type { ExperimentComponent, OpenedCopy, PresetLike } from "@/lib/code-fs/runtime";

// `runtime` kéo theo konva, mà konva cần `window`: chỉ nạp nó (và sucrase) khi người dùng bấm chạy, không nạp lúc Next dựng trang ở server.
const loadRuntime = () => import("@/lib/code-fs/runtime");

// Chạy thí nghiệm ngay từ bản sao trong Chrome (IndexedDB): biên dịch bằng sucrase ở trình duyệt, không qua server.
// Code trong bản sao chạy trực tiếp tại đây: chỉ dùng khi phát triển.

/** Lỗi lúc VẼ của code trong bản sao dừng ở đây, không làm sập cả trang. */
class Boundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(error: unknown) { return { error: error instanceof Error ? error.message : String(error) }; }
  componentDidCatch(error: unknown, info: ErrorInfo) { console.error("Thí nghiệm trong bản sao bị lỗi khi vẽ:", error, info.componentStack); }
  render() {
    if (this.state.error) return <pre style={{ margin: 0, padding: 12, whiteSpace: "pre-wrap", color: "#b91c1c", background: "#fef2f2" }}>Lỗi khi vẽ thí nghiệm: {this.state.error}</pre>;
    return this.props.children;
  }
}

type View = { Experiment: ExperimentComponent; preset: PresetLike };

/**
 * `seed`: puts a fresh copy of the tree into the store; it is called when this run has none yet. The copy belongs to a run id and every
 * new live code session has a new one, so a copy made in an earlier session is not there.
 */
export default function CopyRunner({ codeFs, runId, seed, preferKind, onlyPreferred, autoStart, fill, actions }: {
  codeFs: CodeFsStore | null; runId: string | null; seed?: () => Promise<number>;
  /** Run the preset of this `kind` first (the copy still holds the framework's samples, and `PRESETS[0]` is usually one of them). */
  preferKind?: string;
  /** List only the experiment of `preferKind` (not the framework's samples that every copy still holds). Needs `preferKind`. */
  onlyPreferred?: boolean;
  /** Run once, as soon as the store and the run id are there, without waiting for a click. */
  autoStart?: boolean;
  /** Fill the parent (which must give a height) and lay the experiment out full-bleed, instead of a bordered card. */
  fill?: boolean;
  /** Extra controls shown at the end of the control bar. */
  actions?: ReactNode;
}) {
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState("");
  const [presets, setPresets] = useState<PresetLike[]>([]);
  const [selected, setSelected] = useState("");
  const [view, setView] = useState<View | null>(null);
  const [round, setRound] = useState(0);
  const copy = useRef<OpenedCopy | null>(null);

  async function show(opened: OpenedCopy, preset: PresetLike) {
    // Bọc trong đối tượng: một component là hàm, đưa thẳng vào setState sẽ bị hiểu là hàm cập nhật.
    setView({ Experiment: await opened.componentFor(preset.kind), preset });
    setRound((value) => value + 1);
  }

  async function run() {
    if (!codeFs || !runId) return;
    setPhase("loading");
    setError("");
    try {
      if (seed && (await codeFs.list(runId)).length === 0) await seed();
      const { openCopy } = await loadRuntime();
      const opened = await openCopy(codeFs, runId);
      copy.current = opened;
      const listed = onlyPreferred && preferKind && opened.presets.some((preset) => preset.kind === preferKind)
        ? opened.presets.filter((preset) => preset.kind === preferKind) : opened.presets;
      setPresets(listed);
      const first = pickPreset(listed, preferKind);
      if (!first) throw new Error("presets/index.ts có `PRESETS` rỗng: chưa có thí nghiệm nào để chạy.");
      if (preferKind && first.kind !== preferKind) throw new Error(`Không thấy thí nghiệm \`${preferKind}\` trong PRESETS của bản sao (có: ${opened.presets.map((p) => p.kind).join(", ")}). Agent chưa đăng ký preset?`);
      setSelected(first.id);
      await show(opened, first);
      setPhase("ready");
    } catch (failure) {
      setView(null);
      setError(failure instanceof Error ? failure.message : String(failure));
      setPhase("error");
    }
  }

  // Tự chạy một lần; `run` mới sau mỗi lần vẽ nên gọi qua ref, và qua microtask để không đặt state đồng bộ trong effect.
  const runRef = useRef(run);
  useEffect(() => { runRef.current = run; });
  const started = useRef(false);
  useEffect(() => {
    if (!autoStart || started.current || !codeFs || !runId) return;
    started.current = true;
    queueMicrotask(() => void runRef.current());
  }, [autoStart, codeFs, runId]);

  async function choose(id: string) {
    setSelected(id);
    const preset = presets.find((candidate) => candidate.id === id);
    if (!preset || !copy.current) return;
    try { await show(copy.current, preset); } catch (failure) { setError(failure instanceof Error ? failure.message : String(failure)); setPhase("error"); }
  }

  return (
    <div style={fill ? { display: "flex", flexDirection: "column", height: "100%", minHeight: 0 } : { display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", ...(fill ? { padding: "6px 12px", fontSize: 13, borderBottom: "1px solid #e8e2d9", background: "#fff" } : {}) }}>
        <button type="button" onClick={() => void run()} disabled={!codeFs || !runId || phase === "loading"}>
          {phase === "loading" ? "Đang biên dịch…" : view ? "Chạy lại bản sao" : "Chạy bản sao"}
        </button>
        {presets.length > 1 && (
          <select value={selected} onChange={(event) => void choose(event.target.value)} aria-label="Chọn thí nghiệm trong bản sao">
            {presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.title}</option>)}
          </select>
        )}
        {phase === "ready" && <small>{presets.length} thí nghiệm trong bản sao</small>}
        {actions && <span style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>{actions}</span>}
      </div>
      {phase === "error" && <pre style={{ margin: 0, padding: 12, whiteSpace: "pre-wrap", color: "#b91c1c", background: "#fef2f2" }}>{error}</pre>}
      {view && (
        // Khi `fill`: khung `flex w-full overflow-hidden bg-[#f5f1ec]` chiếm phần còn lại của cha.
        <div className={fill ? "flex min-h-0 w-full flex-1 overflow-hidden bg-[#f5f1ec]" : undefined}
          style={fill ? undefined : { border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <Boundary key={`${view.preset.id}-${round}`}>
            <view.Experiment preset={view.preset} />
          </Boundary>
        </div>
      )}
    </div>
  );
}
