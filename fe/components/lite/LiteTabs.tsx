"use client";

import CodeTabsView, { PENDING_PATH, type FileDraft } from "@/components/live-code/CodeTabsView";
import styles from "./lite.module.css";
import type { LitePipeline } from "./useLitePipeline";

/** Tab Code: mọi file mà các agent ghi vào bản sao (file của từng vật, rồi file các tầng) thành các tab như một trình soạn code. */
export function CodePane({ pipeline }: { pipeline: LitePipeline }) {
  const { objects, objectCode, live, layers, activity } = pipeline;
  const objectFiles = objects.map((o) => objectCode[o.title]?.path).filter((path): path is string => !!path);
  const layerFiles = (["engine", "renderer", "experiment"] as const).flatMap((layer) => layers[layer]?.files ?? []);
  const files = [...new Set([...objectFiles, ...layerFiles])];

  const drafts: Record<string, FileDraft> = {};
  for (const o of objects) {
    const code = objectCode[o.title];
    if (code?.path) drafts[code.path] = { text: code.streaming ? code.text : code.full, tool: code.tool, streaming: code.streaming };
  }
  // Sau khi bản nháp kết thúc, draftPath còn là file vừa viết xong: giữ tab của nó dù tầng chứa nó chưa báo danh sách file.
  if (live.draftPath) drafts[live.draftPath] = { text: live.draft ?? "", tool: live.draftTool, streaming: live.draft !== null };
  else if (live.draft !== null) drafts[PENDING_PATH] = { text: live.draft, tool: live.draftTool, streaming: true };

  const lastWrite = activity.findLast((step) => /^(write|edit)_file$/.test(step.tool) && step.phase === "FINISHED")?.at ?? 0;
  return <div className={styles.codeHolder}><CodeTabsView codeFs={live.codeFs} runId={live.runId} files={files} drafts={drafts} refreshKey={lastWrite + files.length} /></div>;
}

/** Tab Phiên bản: kết quả kiểm tra của từng vật, chạy thử engine và ba tầng code. */
export function ChecksPane({ pipeline }: { pipeline: LitePipeline }) {
  const { objects, states, smoke, layers } = pipeline;
  const any = objects.some((o) => states[o.id]?.item) || smoke || Object.keys(layers).length > 0;
  return (
    <article className={styles.card}>
      <header className={styles.cardHeader}><div><small>KẾT QUẢ KIỂM TRA</small><h2>Các kiểm tra tự động</h2></div></header>
      {!any && <p className={styles.empty}>Chưa có kết quả kiểm tra. Chúng xuất hiện khi các vật được vẽ và các tầng code chạy.</p>}
      <div className={styles.checks}>
        {objects.map((o) => {
          const item = states[o.id]?.item;
          if (!item) return null;
          return (
            <section className={styles.checkBlock} key={o.id}>
              <h3>{o.title} · {item.status === "ok" ? "đạt" : "không đạt"}{item.attempts > 1 ? ` (${item.attempts} lần)` : ""}</h3>
              {item.size && <p>Kích thước đo được {item.size.width} m × {item.size.height} m · {item.moving?.length ?? 0} bộ phận chuyển động · {item.points?.length ?? 0} điểm có tên</p>}
              {item.problems?.length ? <ul>{item.problems.map((p) => <li key={p} className={styles.bad}>✗ {p}</li>)}</ul> : null}
              {item.selfTestReport?.length ? <ul>{item.selfTestReport.map((line) => <li key={line} className={line.startsWith("✗") ? styles.bad : ""}>{line}</li>)}</ul> : null}
            </section>
          );
        })}
        {smoke && (
          <section className={styles.checkBlock}>
            <h3>Chạy thử engine · {smoke.ok ? "đạt" : "chưa đạt"}</h3>
            <ul>{smoke.report.map((line) => <li key={line}>{line}</li>)}{smoke.problems.map((p) => <li key={p} className={styles.bad}>✗ {p}</li>)}</ul>
          </section>
        )}
        {(["engine", "renderer", "experiment"] as const).map((layer) => {
          const result = layers[layer];
          if (!result) return null;
          return (
            <section className={styles.checkBlock} key={layer}>
              <h3>Agent {layer} · {result.status === "finished" ? "đã xong" : "chưa xong"} sau {result.rounds} lượt</h3>
              {result.summary && <p>{result.summary}</p>}
              <ul>{result.files.map((file) => <li key={file}>{file}</li>)}</ul>
            </section>
          );
        })}
      </div>
    </article>
  );
}
