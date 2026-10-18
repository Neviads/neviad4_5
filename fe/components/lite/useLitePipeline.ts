"use client";

import { useEffect, useRef, useState } from "react";
import type { DrawObjectItem } from "@/components/draw-object-skill/types";
import { useLiveCode, type LiveCodeSession } from "@/components/live-code/useLiveCode";
import type { ScenarioData } from "@/components/test-litespec/ScenarioCard";
import type { Message } from "@/components/workspace/types";
import { agentActivityTopic, createRequestId, StompClient, type AgentActivity } from "@/lib/agents";
import type { SmokeResult } from "@/lib/code-fs/engine-smoke";
import { fetchTemplate } from "@/lib/code-fs/template";
import { subscribeObjectDrafts, type ObjectDraft } from "@/lib/live-code/draft";
import { createScenario, drawObject, liteSpec, type AgentResult, type CodeLayer, type LiteSpecOutcome, type ObjectRequest } from "@/lib/lite/api";
import { CodeStageError, runCodeAgents, type CodeStage } from "@/lib/lite/code-agents";
import { findExperiments, type MatchedExperiment } from "@/lib/lite/experiment-catalog";
import { loadReferenceItem } from "@/lib/object-library";

// Luồng của trang chủ `/`, chạy tự động giữa hai điểm dừng của giáo viên (duyệt kịch bản, nhận thí nghiệm):
// tách yêu cầu thành vật → kịch bản → (xác nhận) → vẽ mọi vật cùng lúc → engine → renderer → experiment → mở thí nghiệm.
// Mọi trạng thái nằm ở đây; giao diện (LiteWorkspace) chỉ đọc và gọi các hàm trả về.

export type LitePhase = "input" | "analyzing" | "confirming" | "drawing" | "coding" | "done";
export type ObjectStatus = "idle" | "drawing" | "ok" | "failed";
export type ObjectState = { status: ObjectStatus; item?: DrawObjectItem; error?: string; startedAt?: number };
export type StepStatus = "todo" | "doing" | "done" | "error";
export type ProgressStep = { label: string; detail: string; state: StepStatus };
/** Code của một vật mà agent vẽ đã viết; `streaming` là đang viết dở; `full` là bản file đầy đủ gần nhất (`text` chỉ là một đoạn sửa khi tool là edit_file). */
export type ObjectCode = ObjectDraft & { full: string };

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const CODE_STAGES: CodeStage[] = ["objects", "engine", "smoke", "renderer", "scene", "experiment"];
const STAGE_LABEL: Record<CodeStage, string> = { objects: "ghi các vật", engine: "viết engine", smoke: "chạy thử engine", renderer: "viết renderer", scene: "nạp renderer", experiment: "viết experiment" };
const idleCode = (): Record<CodeStage, StepStatus> => ({ objects: "todo", engine: "todo", smoke: "todo", renderer: "todo", scene: "todo", experiment: "todo" });

export type LitePipeline = ReturnType<typeof useLitePipeline>;

export function useLitePipeline() {
  const live = useLiveCode();
  const liveRef = useRef(live);
  useEffect(() => { liveRef.current = live; });

  const [phase, setPhase] = useState<LitePhase>("input");
  const [request, setRequest] = useState("");
  /** LiteSpec vừa hỏi lại về hình: tin kế tiếp của giáo viên là câu trả lời, không phải yêu cầu mới. */
  const [clarifying, setClarifying] = useState(false);
  const [outcome, setOutcome] = useState<LiteSpecOutcome | null>(null);
  const [scenario, setScenario] = useState<ScenarioData | null>(null);
  const [scenarioBusy, setScenarioBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [states, setStates] = useState<Record<string, ObjectState>>({});
  /** Vật agent chọn từ kho, đã nạp để hiện xem trước ngay trong chat (theo id của vật trong yêu cầu). */
  const [references, setReferences] = useState<Record<string, DrawObjectItem>>({});
  const [objectCode, setObjectCode] = useState<Record<string, ObjectCode>>({});
  const [activity, setActivity] = useState<AgentActivity[]>([]);
  const [layers, setLayers] = useState<Partial<Record<CodeLayer, AgentResult>>>({});
  const [smoke, setSmoke] = useState<SmokeResult | null>(null);
  const [notes, setNotes] = useState("");
  const [codeSteps, setCodeSteps] = useState<Record<CodeStage, StepStatus>>(idleCode);
  const [codeError, setCodeError] = useState("");
  const [final, setFinal] = useState<{ runId: string; slug: string } | null>(null);
  /** Thí nghiệm có sẵn trong thư viện mà yêu cầu vừa gửi khớp, hiện dưới câu "có phải...?"; rỗng khi không có hoặc chưa tìm. */
  const [matches, setMatches] = useState<MatchedExperiment[]>([]);

  // Giá trị mới nhất cho các hàm async (chúng sống lâu hơn lần vẽ mà chúng được tạo ra).
  const latest = useRef({ request, outcome, scenario, states });
  useEffect(() => { latest.current = { request, outcome, scenario, states }; });
  /** Tăng mỗi lần làm lại từ đầu: kết quả của luồng cũ đến muộn thì bị bỏ. */
  const epoch = useRef(0);
  /** Vật đã vẽ đạt, ghi ngay khi có (state chỉ cập nhật sau lần vẽ kế tiếp, mà bước viết code cần chúng tức thì). */
  const drawn = useRef<Record<string, DrawObjectItem>>({});
  const session = useRef<Promise<string> | null>(null);
  const stomp = useRef<StompClient | null>(null);
  useEffect(() => () => { stomp.current?.disconnect(); }, []);

  const add = (role: Message["role"], content: string, group?: Message["group"], suggestions?: string[]) =>
    setMessages((current) => [...current, { role, content, group, suggestions }]);

  /** Mở phiên live code, đưa bản sao template (từ DB) vào IndexedDB và nghe tin của agent; một lần cho cả luồng, trả runId. */
  function ensureSession(): Promise<string> {
    session.current ??= (async () => {
      const runId = createRequestId();
      if (!(await liveRef.current.start(runId))) throw new Error(liveRef.current.error ?? "Không mở được phiên live code (backend có đang chạy không?).");
      // `start` đặt kho file vào state; đợi tới khi lần vẽ kế tiếp đưa nó ra.
      let codeFs = liveRef.current.codeFs;
      for (let waited = 0; !codeFs && waited < 5000; waited += 50) { await wait(50); codeFs = liveRef.current.codeFs; }
      if (!codeFs) throw new Error("Phiên live code đã mở nhưng chưa có kho file của bản sao.");
      await codeFs.seed(runId, await fetchTemplate());
      const client = new StompClient();
      await client.subscribeTopic(agentActivityTopic(runId), (body) => {
        try { setActivity((all) => [...all, JSON.parse(body) as AgentActivity].slice(-400)); } catch { /* bỏ qua một sự kiện hỏng */ }
      });
      await subscribeObjectDrafts(client, runId, (title, draft) => setObjectCode((all) => {
        if (draft) return { ...all, [title]: { ...draft, full: draft.tool === "edit_file" ? all[title]?.full ?? "" : draft.text } };
        return all[title] ? { ...all, [title]: { ...all[title], streaming: false } } : all;
      }));
      stomp.current = client;
      return runId;
    })().catch((error) => { session.current = null; throw error; });
    return session.current;
  }

  function clearAll() {
    epoch.current += 1;
    session.current = null;
    drawn.current = {};
    stomp.current?.disconnect();
    stomp.current = null;
    setOutcome(null); setScenario(null); setScenarioBusy(false); setStates({}); setReferences({}); setObjectCode({}); setActivity([]);
    setLayers({}); setSmoke(null); setNotes(""); setCodeSteps(idleCode()); setCodeError(""); setFinal(null); setMatches([]);
  }

  /**
   * Giáo viên gửi yêu cầu, hoặc trả lời câu LiteSpec vừa hỏi về hình (câu trả lời nối vào yêu cầu gốc thành dòng "Trả lời:").
   * Yêu cầu mới thì trước hết tìm trong thư viện thí nghiệm có sẵn: có thì hỏi "có phải...?" và dừng (xem `skipMatch`); không thì tách như dưới.
   */
  async function start(text: string) {
    const value = text.trim();
    if (!value || phase === "analyzing" || phase === "drawing" || phase === "coding") return;
    const answering = clarifying && !!request;
    const said = answering ? `${request}\nTrả lời: ${value}` : value;
    liveRef.current.stop();
    clearAll();
    const my = epoch.current;
    setRequest(said);
    if (answering) {
      setMessages((current) => [...current, { role: "user", content: value }]);
      await analyze(said, my);
      return;
    }
    setMessages([{ role: "user", content: value }, { role: "progress", content: "Đang tìm trong thư viện thí nghiệm có sẵn..." }]);
    setPhase("analyzing");
    const found = await findExperiments(said);
    if (my !== epoch.current) return;
    if (found.length) {
      setMatches(found);
      setPhase("input");
      add("assistant", found.length === 1
        ? "Có phải thầy/cô muốn thí nghiệm có sẵn này? Bấm vào để mở, hoặc tạo thí nghiệm mới."
        : "Có phải thầy/cô muốn một trong các thí nghiệm có sẵn này? Bấm vào để mở, hoặc tạo thí nghiệm mới.", "match");
      return;
    }
    await analyze(said, my);
  }

  /** Giáo viên không chọn thí nghiệm có sẵn nào: tạo mới từ chính yêu cầu đó. Các thẻ vẫn hiện, chỉ nút bấm ẩn đi (tin này không còn là tin cuối). */
  function skipMatch() {
    const { request: said } = latest.current;
    if (!said || phase !== "input" || !matches.length) return;
    add("user", "Không, tạo thí nghiệm mới");
    void analyze(said, epoch.current);
  }

  /** Tách yêu cầu thành vật, rồi tự tạo kịch bản và dừng ở bước duyệt (hoặc hỏi lại về hình). */
  async function analyze(said: string, my: number) {
    add("progress", "Đang tách yêu cầu thành các vật thể...", "analyzing");
    setPhase("analyzing");
    // Kênh nghe riêng, nhẹ: bước này chưa cần phiên live code. Nghe xong mới gọi be để không lỡ tin đầu.
    const runId = createRequestId();
    const listener = new StompClient();
    // Các bước của lượt này, chốt vào tin "Đang tách..." của nó khi xong: lượt hỏi lại sau xoá `activity`, các tin cũ không được hiện nhật ký của lượt mới.
    const seen: AgentActivity[] = [];
    const freezeSteps = () => setMessages((current) => {
      const index = current.map((message) => message.group).lastIndexOf("analyzing");
      return index < 0 ? current : current.map((message, at) => at === index ? { ...message, steps: [...seen] } : message);
    });
    try {
      try {
        await listener.subscribeTopic(agentActivityTopic(runId), (body) => {
          try {
            if (my !== epoch.current) return;
            const step = JSON.parse(body) as AgentActivity;
            seen.push(step);
            setActivity((all) => [...all, step].slice(-400));
          } catch { /* bỏ qua một sự kiện hỏng */ }
        });
      } catch { /* không nghe được thì chỉ mất phần nhật ký, việc tách vẫn chạy */ }
      let result: LiteSpecOutcome;
      try {
        result = await liteSpec(said, runId);
      } finally {
        listener.disconnect();
        if (my === epoch.current) freezeSteps();
      }
      if (my !== epoch.current) return;
      if (result.status === "NEEDS_CLARIFICATION") {
        setClarifying(true);
        setPhase("input");
        const options = result.question?.suggestions?.filter(Boolean) ?? [];
        add("assistant", `${result.question?.text ?? "Thầy/cô có thể nói rõ hơn hình thí nghiệm mong muốn không?"}\n${options.length ? "Chọn một đáp án bên dưới hoặc nhập câu trả lời khác." : "Trả lời ở ô bên dưới."}`,
          undefined, options);
        return;
      }
      setClarifying(false);
      if (result.status !== "READY") {
        setPhase("input");
        add("assistant", result.reason || "Yêu cầu này chưa mô phỏng được. Hãy thử mô tả một thí nghiệm vật lý khác.");
        return;
      }
      setOutcome(result);
      setStates(Object.fromEntries(result.objects.map((o) => [o.id, { status: "idle" } as ObjectState])));
      const reused = result.objects.filter((o) => o.reference);
      add("progress", `Đã tách thành ${result.objects.length} vật thể${reused.length ? `, trong đó ${reused.length} vật lấy từ kho: ${reused.map((o) => `${o.title} (${o.reference})`).join(", ")}` : ""}. Đang tạo kịch bản...`, reused.length ? "reuse" : undefined);
      for (const o of reused) {
        loadReferenceItem(o.reference as string, o.title, o.request)
          .then((item) => { if (my === epoch.current) setReferences((all) => ({ ...all, [o.id]: item })); })
          .catch(() => { /* không xem trước được thì bước vẽ sẽ báo lỗi của vật đó */ });
      }
      const made = await createScenario(said, result.objects);
      if (my !== epoch.current) return;
      setScenario(made);
      setPhase("confirming");
      add("assistant", `Đã có kịch bản${result.phenomenon ? ` cho ${result.phenomenon}` : ""}. Hãy xem lại rồi bấm “Xác nhận & tạo”.`);
    } catch (failure) {
      if (my !== epoch.current) return;
      setPhase("input");
      add("error", failure instanceof Error ? failure.message : "Không thể phân tích yêu cầu.");
    }
  }

  /** Tạo lại kịch bản (cùng yêu cầu, cùng các vật). */
  async function regenerateScenario() {
    const { request: said, outcome: current } = latest.current;
    if (!current || scenarioBusy || phase !== "confirming") return;
    const my = epoch.current;
    setScenarioBusy(true);
    try {
      const made = await createScenario(said, current.objects);
      if (my === epoch.current) setScenario(made);
    } catch (failure) {
      if (my === epoch.current) add("error", failure instanceof Error ? failure.message : "Không tạo lại được kịch bản.");
    } finally {
      if (my === epoch.current) setScenarioBusy(false);
    }
  }

  /** Vẽ một vật; true khi vật qua kiểm tra, null khi luồng đã bị làm lại giữa chừng. */
  async function drawOne(object: ObjectRequest, made: ScenarioData, my: number): Promise<boolean | null> {
    setStates((all) => ({ ...all, [object.id]: { status: "drawing", startedAt: Date.now() } }));
    try {
      // Vật agent đã chọn từ kho thì dùng lại, không vẽ mới.
      const item = object.reference
        ? await loadReferenceItem(object.reference, object.title, object.request)
        : await drawObject(await ensureSession(), object, made.objectGeometry?.find((g) => g.objectId === object.id) ?? null, made.view ?? "", latest.current.outcome?.style ?? "");
      if (my !== epoch.current) return null;
      const ok = item.status === "ok" && !!item.name && !!item.code;
      if (ok) drawn.current[object.id] = item;
      setStates((all) => ({ ...all, [object.id]: ok ? { status: "ok", item } : { status: "failed", item, error: (item.problems ?? []).join(" | ") || "Vật chưa qua kiểm tra." } }));
      return ok;
    } catch (failure) {
      if (my !== epoch.current) return null;
      setStates((all) => ({ ...all, [object.id]: { status: "failed", error: failure instanceof Error ? failure.message : String(failure) } }));
      return false;
    }
  }

  /** Ba tầng code agent, tự nối nhau; dừng ở tầng hỏng và báo trong chat. */
  async function runCoding(my: number) {
    const { request: said, outcome: current, scenario: made } = latest.current;
    if (!current || !made) return;
    setPhase("coding");
    setCodeError("");
    setCodeSteps(idleCode());
    setLayers({});
    setSmoke(null);
    add("progress", "Các vật đã xong. Agent đang viết engine, renderer và experiment...", "coding");
    let failedStage: CodeStage | null = null;
    try {
      const runId = await ensureSession();
      const codeFs = liveRef.current.codeFs;
      if (!codeFs) throw new Error("Phiên live code chưa có kho file của bản sao.");
      const { slug } = await runCodeAgents({ codeFs, runId, said, phenomenon: current.phenomenon, objects: current.objects, drawn: { ...drawn.current }, scenario: made }, {
        stage: (name, state) => setCodeSteps((steps) => ({ ...steps, [name]: state })),
        layer: (layer, result) => setLayers((current) => ({ ...current, [layer]: result })),
        smoke: setSmoke,
        notes: setNotes,
      });
      if (my !== epoch.current) return;
      setFinal({ runId, slug });
      setPhase("done");
      add("assistant", "Thí nghiệm đã được viết xong và nạp từ bản sao trong trình duyệt. Bạn có thể chạy nó ở khung bên phải.");
    } catch (failure) {
      if (my !== epoch.current) return;
      if (failure instanceof CodeStageError) failedStage = failure.stage;
      const message = failure instanceof Error ? failure.message : String(failure);
      setCodeError(message);
      if (failedStage) setCodeSteps((steps) => ({ ...steps, [failedStage as CodeStage]: "error" }));
      add("error", `Chưa tạo xong thí nghiệm: ${message}`);
    }
  }

  /** Giáo viên duyệt kịch bản: vẽ mọi vật cùng lúc, rồi tự viết code nếu tất cả vật đạt. */
  async function confirm() {
    const { outcome: current, scenario: made, states: all } = latest.current;
    if (!current || !made || phase !== "confirming") return;
    const my = epoch.current;
    setPhase("drawing");
    add("progress", `Đang vẽ ${current.objects.length} vật thể cùng lúc...`, "drawing");
    const results = await Promise.all(current.objects.filter((o) => all[o.id]?.status !== "ok").map((o) => drawOne(o, made, my)));
    if (my !== epoch.current) return;
    if (results.every((ok) => ok === true)) await runCoding(my);
    else add("error", "Có vật chưa vẽ được. Bấm “Vẽ lại” ở vật đó, các bước còn lại sẽ tự chạy khi tất cả vật đạt.");
  }

  /** Vẽ lại một vật lỗi (hoặc làm lại một vật đã xong); khi mọi vật đạt thì tự viết code. */
  async function redraw(id: string) {
    const { outcome: current, scenario: made } = latest.current;
    const object = current?.objects.find((o) => o.id === id);
    if (!current || !made || !object || phase !== "drawing" && phase !== "confirming" && phase !== "coding") return;
    const my = epoch.current;
    const wasDrawing = phase === "drawing";
    const ok = await drawOne(object, made, my);
    if (my !== epoch.current || !ok || !wasDrawing) return;
    if (current.objects.every((o) => drawn.current[o.id])) await runCoding(my);
  }

  /** Chạy lại ba tầng code (các vật giữ nguyên) sau một lỗi. */
  async function retryCoding() {
    if (phase !== "coding" || !codeError) return;
    await runCoding(epoch.current);
  }

  function reset() {
    liveRef.current.stop();
    clearAll();
    setPhase("input");
    setRequest("");
    setClarifying(false);
    setMessages([]);
  }

  const objects = outcome?.objects ?? [];
  const okCount = objects.filter((o) => states[o.id]?.status === "ok").length;
  const anyDrawing = objects.some((o) => states[o.id]?.status === "drawing");
  const anyFailed = objects.some((o) => states[o.id]?.status === "failed");
  const codeStage = CODE_STAGES.find((stage) => codeSteps[stage] === "doing" || codeSteps[stage] === "error");
  const afterDrawing = phase === "coding" || phase === "done";
  const busy = phase === "analyzing" || anyDrawing || (phase === "coding" && !codeError);

  const progress: ProgressStep[] = [
    { label: "Phân tích yêu cầu", detail: outcome ? `${objects.length} vật` : clarifying ? "đang hỏi lại" : "",
      state: (phase === "analyzing" && !outcome) || (phase === "input" && clarifying) ? "doing" : phase === "input" && !outcome ? "todo" : "done" },
    { label: "Tạo kịch bản", detail: "", state: scenario ? "done" : outcome && phase === "analyzing" ? "doing" : "todo" },
    { label: "Vẽ vật", detail: objects.length ? `${okCount}/${objects.length}` : "",
      state: afterDrawing || (objects.length > 0 && okCount === objects.length) ? "done" : anyDrawing ? "doing" : anyFailed ? "error" : "todo" },
    { label: "Viết code", detail: phase === "coding" && codeStage ? STAGE_LABEL[codeStage] : "engine · renderer · experiment",
      state: phase === "done" ? "done" : codeError ? "error" : phase === "coding" ? "doing" : "todo" },
    { label: "Mở thí nghiệm", detail: "", state: phase === "done" ? "done" : "todo" },
  ];

  return {
    live: live as LiveCodeSession, phase, request, clarifying, outcome, scenario, scenarioBusy, messages, objects, states, references, objectCode, activity,
    layers, smoke, notes, codeSteps, codeError, final, busy, progress, matches,
    start, skipMatch, regenerateScenario, confirm, redraw, retryCoding, reset,
  };
}
