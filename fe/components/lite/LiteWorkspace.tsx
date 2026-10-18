"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, Books, Folder, DotsThree, ArrowsClockwise, Plus, PaperPlaneTilt, SidebarSimple, Flask } from "@phosphor-icons/react";
import styles from "@/app/workspace.module.css";
import { AutoTextarea } from "@/components/auto-textarea";
import CopyRunner from "@/components/code-fs/CopyRunner";
import DrawObjectStatic from "@/components/draw-object-skill/DrawObjectStaticLoader";
import type { DrawObjectItem } from "@/components/draw-object-skill/types";
import type { ObjectRequest } from "@/lib/lite/api";
import type { MatchedExperiment } from "@/lib/lite/experiment-catalog";
import ScenarioCard from "@/components/test-litespec/ScenarioCard";
import AgentSteps from "@/components/workspace/AgentSteps";
import { ChatMessages } from "@/components/workspace/Chat";
import NeviadMark from "@/components/workspace/NeviadMark";
import { ArtifactLoading } from "@/components/workspace/Result";
import StepProgress from "@/components/workspace/StepProgress";
import lite from "./lite.module.css";
import { ChecksPane, CodePane } from "./LiteTabs";
import { TABS, useAutoTab } from "./useAutoTab";
import Stage from "./Stage";
import { useLeaveGuard } from "./useLeaveGuard";
import type { LitePipeline } from "./useLitePipeline";

/** Ảnh thu nhỏ của thư viện, giống hệt thẻ ở `/mo-phong-vat-ly`; nạp khi có thẻ "có phải...?" để trang chủ không kéo cả bộ SVG. */
const Thumb = dynamic(() => import("@/components/simulations/shared/library-thumb").then((module) => module.Thumb));

/**
 * Khung của trang chủ `/` (sidebar, topbar, 3 tab). Preview chiếm cả khung, không chat: các vật đã vẽ
 * (tĩnh, có lớp phủ loading), rồi thí nghiệm đầy đủ. Tab tự chuyển theo luồng chạy (xem `useAutoTab`), người dùng bấm thì theo người dùng. Code và Phiên bản có chat bên trái (tiến trình, tin nhắn và các bước của agent) và nội dung bên phải.
 */
export default function LiteWorkspace({ pipeline }: { pipeline: LitePipeline }) {
  const { view, choose, release } = useAutoTab(pipeline);
  const guard = useLeaveGuard(pipeline.busy);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [prompt, setPrompt] = useState("");
  // Tên của phiên = câu yêu cầu đầu tiên của giáo viên (các câu trả lời hỏi lại được nối sau dòng đầu).
  const requestName = pipeline.request.split("\n")[0].trim() || "Yêu cầu mới";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = prompt.trim();
    if (!value) return;
    setPrompt("");
    release();
    void pipeline.start(value);
  }

  function reset() {
    pipeline.reset();
    release();
    setPrompt("");
  }

  return <main className={`${styles.workspace} ${sidebarCollapsed ? styles.sidebarCollapsed : ""}`}>
    <aside className={`${styles.sidebar} ${lite.rail}`} data-collapsed={sidebarCollapsed}>
      <div className={lite.railHead}>
        <Link className={styles.brand} href="/" onClick={reset}><NeviadMark /><span className={styles.brandName}>neviad4</span></Link>
        <button className={`${styles.workspaceToggle} ${lite.railToggle}`} type="button" onClick={() => setSidebarCollapsed((current) => !current)} aria-label={sidebarCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"} title={sidebarCollapsed ? "Mở rộng" : "Thu gọn"}>{sidebarCollapsed ? <SidebarSimple /> : <SidebarSimple />}</button>
      </div>
      <button className={lite.railNew} onClick={() => guard.ask(reset)}title="Thí nghiệm mới"><Plus /><span>Thí nghiệm mới</span></button>
      <nav className={lite.railNav} aria-label="Thư viện">
        <Link className={lite.railItem} href="/mo-phong-vat-ly" title="Thư viện chung"><Books /><span>Thư viện chung</span></Link>
        <button className={lite.railItem} type="button" disabled title="Thư viện của tôi (sắp có)"><Folder /><span>Thư viện của tôi</span><em>Sắp có</em></button>
      </nav>
      <div className={styles.profile}><i>GV</i><span><strong>Teacher workspace</strong><small>Local session</small></span><DotsThree /></div>
    </aside>
    <section className={styles.content}>
      <header className={styles.topbar}><div className={styles.topbarStart}><div className={`${styles.crumb} ${lite.requestName}`} title={requestName}><strong>{requestName}</strong></div></div></header>
      <nav className={styles.tabs}>{TABS.map((item) => <button key={item} className={view === item ? styles.selected : ""} onClick={() => choose(item)}>{item}</button>)}</nav>
      {!pipeline.scenario || pipeline.phase === "confirming"
        // Giai đoạn đầu (tách yêu cầu, tạo kịch bản, duyệt kịch bản, hoặc báo lỗi/không hỗ trợ): chỉ có đoạn chat ở giữa, kịch bản nối tiếp ngay dưới tin cuối; bấm xác nhận rồi mới vào các tab bên dưới.
        ? <div className={`${styles.studio} ${styles.previewStudio}`} style={{ gridTemplateColumns: "minmax(0, 1080px)", justifyContent: "center" }}>
          <Chat pipeline={pipeline} prompt={prompt} setPrompt={setPrompt} onSubmit={submit} tail={pipeline.phase === "confirming" ? <ScenarioTail pipeline={pipeline} /> : null} />
        </div>
        : view === "Preview"
        ? <section className={lite.previewFull} aria-label="Preview"><PreviewPane pipeline={pipeline} /></section>
        : <div className={`${styles.studio} ${styles.previewStudio}`}>
          <Chat pipeline={pipeline} prompt={prompt} setPrompt={setPrompt} onSubmit={submit} />
          <section className={styles.preview} style={view === "Code" ? { padding: 16 } : undefined}>
            {view === "Code" ? <CodePane pipeline={pipeline} /> : <div className={lite.deck}><ChecksPane pipeline={pipeline} /></div>}
          </section>
        </div>}
    </section>
    {guard.dialog}
  </main>;
}

/** Chat bên trái (tab Code và Phiên bản): tiến trình, tin nhắn; dưới tin mở ra một việc của agent là các bước nhỏ mờ của việc đó. */
function Chat({ pipeline, prompt, setPrompt, onSubmit, tail }: { pipeline: LitePipeline; prompt: string; setPrompt: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; tail?: ReactNode }) {
  const open = pipeline.phase === "input";
  const waiting = open && !!pipeline.clarifying;
  const editable = open && !waiting;
  const titles = new Set(pipeline.objects.map((object) => object.title));
  const drawingOver = !pipeline.objects.some((object) => pipeline.states[object.id]?.status === "drawing");
  const codingOver = pipeline.phase === "done" || !!pipeline.codeError;
  return <section className={styles.chat}><header><strong><Flask /> NEVIAD4 builder</strong></header>
    {pipeline.phase !== "input" || pipeline.outcome ? <StepProgress title="Quy trình tạo thí nghiệm" steps={pipeline.progress} /> : null}
    <ChatMessages messages={pipeline.messages} disabled={pipeline.busy} tail={tail} onPick={open ? (option) => void pipeline.start(option) : undefined} onAnswer={open && pipeline.clarifying ? (text) => void pipeline.start(text) : undefined} after={(message, index) => {
      if (message.group === "match") return <MatchedExperiments matches={pipeline.matches} onSkip={open && index === pipeline.messages.length - 1 ? pipeline.skipMatch : undefined} />;
      if (message.group === "reuse") return <ReusedPreview objects={pipeline.objects.filter((o) => o.reference)} items={pipeline.references} />;
      if (message.group === "analyzing") return <AgentSteps steps={message.steps ?? pipeline.activity.filter((step) => step.agent === "litespec")} showTitle={false} over={!!message.steps || pipeline.phase !== "analyzing"} />;
      if (message.group === "drawing") return <AgentSteps steps={pipeline.activity.filter((step) => titles.has(step.title))} showTitle over={drawingOver} />;
      if (message.group === "coding") return <AgentSteps steps={pipeline.activity.filter((step) => step.agent !== "litespec" && !titles.has(step.title))} showTitle over={codingOver} />;
      return null;
    }} />
    <form className={editable ? styles.prompt : `${styles.prompt} ${lite.promptRow}`} onSubmit={onSubmit}><AutoTextarea submitOnEnter rows={editable ? 3 : 1} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={editable ? "Mô tả yêu cầu của bạn..." : waiting ? "Trả lời câu hỏi ở trên..." : "Các bước chạy ở khung Preview..."} disabled={!editable} /><div><span>{pipeline.busy ? "NEVIAD4 đang xử lý" : waiting ? "NEVIAD4 đang chờ câu trả lời" : editable ? "↵ để gửi · Shift+↵ xuống dòng" : "Theo dõi ở Preview, Code và Phiên bản"}</span><button className={styles.send} type="submit" aria-label={pipeline.busy ? "NEVIAD4 đang xử lý" : waiting ? "NEVIAD4 đang chờ câu trả lời" : "Gửi yêu cầu"} disabled={!editable || !prompt.trim()}>{pipeline.busy || waiting ? <span className={lite.sendSpinner} /> : <PaperPlaneTilt />}</button></div></form>
  </section>;
}

/**
 * Thí nghiệm có sẵn trong thư viện mà yêu cầu khớp, dưới câu "có phải...?": mỗi thẻ mở thí nghiệm đó ở `/mo-phong-vat-ly/<id>`.
 * `onSkip` chỉ có khi câu hỏi còn là tin cuối (chưa chọn tạo mới).
 */
function MatchedExperiments({ matches, onSkip }: { matches: MatchedExperiment[]; onSkip?: () => void }) {
  return <div className={lite.matches}>
    <div className={lite.reuse}>{matches.map((match) => <Link key={match.id} className={lite.matchCard} href={`/mo-phong-vat-ly/${match.id}`}>
      <div className={lite.matchFrame}><Thumb id={match.id} /></div>
      <strong>{match.title}</strong>
      <small>{match.domain} · Lớp {match.grade}</small>
      {match.reason ? <p>{match.reason}</p> : null}
      <span className={lite.matchOpen}>Mở thí nghiệm này <ArrowRight /></span>
    </Link>)}</div>
    {onSkip ? <button className={lite.regen} type="button" onClick={onSkip}><Plus /> Không, tạo thí nghiệm mới</button> : null}
  </div>;
}

/** Các vật lấy từ kho, hiện ngay dưới dòng báo tìm được: hình thật của vật, không phải ảnh chụp. */
function ReusedPreview({ objects, items }: { objects: ObjectRequest[]; items: Record<string, DrawObjectItem> }) {
  return <div className={lite.reuse}>{objects.map((object) => <figure key={object.id}>
    <div className={lite.reuseFrame}>{items[object.id] ? <DrawObjectStatic item={items[object.id]} /> : <span>Đang nạp hình…</span>}</div>
    <figcaption>{object.title} · <code>{object.reference}</code></figcaption>
  </figure>)}</div>;
}

/** Kịch bản chờ duyệt, nối tiếp đoạn chat: tóm tắt, công thức và diễn tiến ngắn; phần còn lại của kịch bản chỉ dành cho agent. */
function ScenarioTail({ pipeline }: { pipeline: LitePipeline }) {
  const { scenario, outcome, objects } = pipeline;
  if (!scenario || !outcome) return null;
  if (pipeline.scenarioBusy) return <p className={lite.tailNote}><span className={lite.spinner} />Đang tạo lại kịch bản…</p>;
  return <article className={styles.scenarioCard} style={{ width: "100%" }}>
    <header className={styles.scenarioHeader}><div><small>SIMULATION PLAN</small><h2>{outcome.phenomenon || "Kịch bản thí nghiệm"}</h2></div><span className={styles.aiBadge}>Bản AI</span></header>
    <ScenarioCard scenario={scenario} compact />
    <div className={lite.chips}>{objects.map((object) => <span className={lite.chip} key={object.id}>{object.title}</span>)}</div>
    <div className={lite.confirm}>
      <p>Xem kịch bản rồi bắt đầu: {objects.length} vật sẽ được vẽ cùng lúc, sau đó agent viết code thí nghiệm.</p>
      <div className={lite.confirmButtons}>
        <button className={lite.regen} type="button" onClick={() => void pipeline.regenerateScenario()}><ArrowsClockwise /> Tạo lại</button>
        <button className={lite.go} type="button" onClick={() => void pipeline.confirm()}>Xác nhận &amp; tạo <ArrowRight /></button>
      </div>
    </div>
  </article>;
}

function Loading({ status }: { status: string }) {
  return <div className={lite.loadingFill}><ArtifactLoading /><div className={lite.loadingNote}><span className={lite.spinner} />{status}</div></div>;
}

/** Preview (đã có kịch bản): không chat, nên mọi trạng thái, kể cả lỗi của các tầng code, phải hiện ngay ở đây. */
function PreviewPane({ pipeline }: { pipeline: LitePipeline }) {
  const { phase, scenario, outcome, objects, states, final, live, codeError, progress } = pipeline;

  if (phase === "done" && final) {
    return <div className={lite.runner}><CopyRunner key={final.runId} codeFs={live.codeFs} runId={final.runId} preferKind={final.slug} onlyPreferred autoStart fill /></div>;
  }

  if (phase === "drawing" || phase === "coding") {
    const done = objects.filter((object) => states[object.id]?.status === "ok").length;
    const drawing = objects.some((object) => states[object.id]?.status === "drawing");
    const stage = progress[3]?.detail;
    const status = phase === "drawing"
      ? drawing ? `Đang vẽ ${done}/${objects.length} vật…` : "Có vật chưa vẽ được. Bấm “Vẽ lại” ở vật đó, các bước còn lại sẽ tự chạy."
      : `Agent đang ${stage || "viết code"}…`;
    return <Stage objects={objects} states={states} status={status} busy={phase === "coding" || drawing} onRedraw={(id) => void pipeline.redraw(id)}
      error={phase === "coding" ? codeError : ""} onRetry={() => void pipeline.retryCoding()} />;
  }

  return <Loading status="Đang chuẩn bị…" />;
}
