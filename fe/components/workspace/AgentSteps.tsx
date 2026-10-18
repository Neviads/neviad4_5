"use client";

import { useEffect, useState } from "react";
import type { AgentActivity } from "@/lib/agents";
import { visibleLines } from "@/components/test-litespec/ActivityLog";
import styles from "@/app/workspace.module.css";

// Các bước của một agent (tool đang chạy, tool đã xong, file model đang viết) dưới tin nhắn mở ra việc đó: chữ nhỏ, mờ, như phần "công cụ đã dùng" của một trợ lý code.
const SHOWN = 4;
const QUIET_AFTER_S = 10;

/** `steps` là tin của agent theo thứ tự đến; `showTitle` ghi tên vật/tầng ở đầu dòng khi nhiều agent chạy cùng lúc. `over`: việc đã xong, không đếm giờ im lặng nữa. */
export default function AgentSteps({ steps, showTitle, over = false }: { steps: AgentActivity[]; showTitle: boolean; over?: boolean }) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const last = steps.at(-1);
  useEffect(() => {
    if (!last || over) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [last, over]);

  const all = visibleLines(steps, Infinity);
  if (!all.length) return null;
  const lines = open ? all : all.slice(-SHOWN);
  const quiet = last && !over ? Math.max(0, Math.round((now - last.at) / 1000)) : 0;

  return (
    <div className="mt-1.5 space-y-0.5 font-[inherit] text-[12px] leading-[1.5] text-[#9a95a6]" aria-label="Các bước agent đã làm">
      {all.length > SHOWN && (
        <button type="button" onClick={() => setOpen((value) => !value)} className="text-[12px] text-[#8b8595] underline-offset-2 hover:text-[#5d4ec3] hover:underline">
          {open ? "Thu gọn" : `Xem ${all.length - SHOWN} bước trước`}
        </button>
      )}
      {lines.map(({ step, kind }, index) => (
        <p key={`${step.at}-${index}`} className={`m-0 truncate ${(kind === "running" || kind === "progress") && !over ? styles.stepBlink : step.success ? "" : "text-[#c45353]"}`} title={step.message}>
          {showTitle && step.title ? `${step.title} · ` : ""}{step.tool === "agent" ? "agent" : step.tool}{step.message ? ` · ${step.message}` : ""}
        </p>
      ))}
      {last && !over && quiet >= QUIET_AFTER_S && <p className="m-0 text-[#b08a2e]">⏱ chưa có tin mới {quiet}s (model có thể đang suy luận)</p>}
    </div>
  );
}
