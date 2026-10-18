"use client";

import { useEffect, useState } from "react";
import type { AgentActivity } from "@/lib/agents";

// Việc agent đang làm, do backend đẩy về theo runId: tool đang chạy, các bước đã xong, file model đang viết (PROGRESS) và đã im lặng bao lâu.
// Không có tin nào mới thì đồng hồ im lặng tăng dần, để phân biệt agent đang nghĩ với agent đã chết.
const QUIET_AFTER_S = 10;
const DEAD_AFTER_S = 120;

/** Các dòng cần hiện: bước đang chạy (STARTED chưa có FINISHED), bước đã xong, và dòng PROGRESS mới nhất của mỗi agent nếu chưa có tin nào sau nó. */
export function visibleLines(steps: AgentActivity[], limit = 14) {
  const lines = steps.map((step, index) => {
    const later = steps.slice(index + 1).filter((other) => other.agent === step.agent);
    if (step.phase === "PROGRESS") return { step, kind: later.length === 0 ? "progress" : "hidden" } as const;
    const running = step.phase === "STARTED" && !later.some((other) => other.tool === step.tool && other.phase === "FINISHED");
    return { step, kind: running ? "running" : step.phase === "FINISHED" ? "done" : "hidden" } as const;
  });
  return lines.filter((line) => line.kind !== "hidden").slice(-limit);
}

export default function ActivityLog({ steps, showTitle }: { steps: AgentActivity[]; showTitle: boolean }) {
  const last = steps.at(-1);
  const over = !!last && last.tool === "agent" && last.phase === "FINISHED";
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!last || over) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [last, over]);

  if (!steps.length) return <p className="border-t px-3 py-2 text-xs text-[#6b6b6b]">Đang chờ agent bắt đầu…</p>;
  const quiet = last && !over ? Math.max(0, Math.round((now - last.at) / 1000)) : 0;
  return (
    <ul className="space-y-0.5 border-t bg-[#faf9f5] px-3 py-2 font-mono text-xs">
      {visibleLines(steps).map(({ step, kind }, index) => (
        <li key={index} className={kind === "running" || kind === "progress" ? "text-[#171717]" : step.success ? "text-[#6b6b6b]" : "text-red-700"}>
          {kind === "progress" ? "✎" : kind === "running" ? "…" : step.success ? "✓" : "✗"} {showTitle ? `[${step.title}] ` : ""}{step.tool === "agent" ? "agent" : step.tool}{step.message ? ` · ${step.message}` : ""}
        </li>
      ))}
      {last && !over && quiet >= QUIET_AFTER_S && (
        <li className={quiet >= DEAD_AFTER_S ? "text-red-700" : "text-amber-700"}>
          ⏱ chưa có tin mới {quiet}s{quiet >= DEAD_AFTER_S ? " — nhiều khả năng đã bị ngắt, xem log backend" : " (model có thể đang suy luận)"}
        </li>
      )}
    </ul>
  );
}
