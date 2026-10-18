"use client";

import { useEffect, useState } from "react";
import type { LitePipeline } from "./useLitePipeline";

export const TABS = ["Preview", "Code", "Phiên bản"] as const;
export type Tab = (typeof TABS)[number];

/** Một vật vừa vẽ xong: Preview hiện cho người dùng thấy nó chừng này lâu rồi quay lại Code. */
const PEEK_MS = 3000;

/**
 * Tab nào hiện ra trong lúc luồng chạy, để màn hình luôn có chuyển động:
 * - chờ duyệt kịch bản, và khi có thí nghiệm hoàn chỉnh: Preview;
 * - đang vẽ vật và viết code: Code, trừ {@link PEEK_MS} ms sau mỗi vật vừa xong thì sang Preview xem vật đó;
 * - có vật vẽ lỗi hoặc tầng code lỗi: Preview, vì nút "Vẽ lại" / "Thử lại" nằm ở đó.
 * Người dùng bấm một tab thì lựa chọn của họ thắng, cho tới khi lần chạy mới bắt đầu (bấm xác nhận kịch bản) hoặc `release`.
 */
export function useAutoTab(pipeline: LitePipeline) {
  const { phase, scenario, objects, states, codeError } = pipeline;
  const [picked, setPicked] = useState<Tab | null>(null);

  const finished = objects.filter((object) => states[object.id]?.status === "ok").length;
  const [seenFinished, setSeenFinished] = useState(0);
  const [peekId, setPeekId] = useState(0);
  const [peeking, setPeeking] = useState(false);
  const [lastPhase, setLastPhase] = useState(phase);

  // Cập nhật ngay khi vẽ (không qua effect) để lần vẽ đầu tiên sau thay đổi đã đúng tab.
  if (finished !== seenFinished) {
    setSeenFinished(finished);
    if (finished > seenFinished) { setPeekId(peekId + 1); setPeeking(true); }
  }
  if (phase !== lastPhase) {
    setLastPhase(phase);
    // Bấm "Xác nhận & tạo": các tab đã bấm lúc xem kịch bản không còn tính.
    if (phase === "drawing") setPicked(null);
  }
  useEffect(() => {
    if (!peekId) return;
    const timer = setTimeout(() => setPeeking(false), PEEK_MS);
    return () => clearTimeout(timer);
  }, [peekId]);

  const drawing = objects.some((object) => states[object.id]?.status === "drawing");
  const failedObject = !drawing && objects.some((object) => states[object.id]?.status === "failed");
  const auto: Tab = !scenario || phase === "confirming" || phase === "done" || failedObject || (phase === "coding" && !!codeError) || peeking ? "Preview" : "Code";

  return {
    view: picked ?? auto,
    /** Người dùng bấm một tab (khi chưa có kịch bản thì chưa có tab nào để chọn). */
    choose: (tab: Tab) => { if (scenario) setPicked(tab); },
    /** Quay về tự chuyển (làm mới hoặc gửi yêu cầu mới). */
    release: () => setPicked(null),
  };
}
