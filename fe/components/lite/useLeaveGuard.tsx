"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Warning } from "@phosphor-icons/react";
import styles from "./lite.module.css";

/**
 * Chặn việc vô tình rời trang khi thí nghiệm đang được tạo (mất khá lâu, rất dễ bấm nhầm sang chỗ khác).
 * Next.js không có API chặn điều hướng, nên chặn ba đường: bấm liên kết (bắt ở pha capture rồi bấm lại khi người dùng đồng ý),
 * nút Back (đẩy thêm một mục lịch sử để giữ chân) và đóng/tải lại tab (chỉ có hộp thoại gốc của trình duyệt, không tuỳ biến được).
 * Việc khác sẽ mất tiến trình (ví dụ nút "Thí nghiệm mới") thì bọc qua `ask`.
 */
export function useLeaveGuard(active: boolean): { ask: (action: () => void) => void; dialog: ReactNode } {
  const [pending, setPending] = useState<(() => void) | null>(null);
  const bypass = useRef(false);

  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const onClick = (event: MouseEvent) => {
      if (bypass.current || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || (anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.hash && url.origin === window.location.origin && url.pathname === window.location.pathname && url.search === window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      setPending(() => () => {
        bypass.current = true;
        try { anchor.click(); } finally { bypass.current = false; }
      });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    // Mục đệm: Back chỉ lùi về mục này (vẫn cùng trang), từ đó mới hỏi; đồng ý thì lùi thêm hai mục để ra khỏi trang.
    window.history.pushState(window.history.state, "", window.location.href);
    const onPopState = () => {
      if (bypass.current) { bypass.current = false; return; }
      window.history.pushState(window.history.state, "", window.location.href);
      setPending(() => () => { bypass.current = true; window.history.go(-2); });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [active]);

  const ask = useCallback((action: () => void) => {
    if (active) setPending(() => action);
    else action();
  }, [active]);

  const stay = () => setPending(null);
  const leave = () => {
    const action = pending;
    setPending(null);
    action?.();
  };

  return { ask, dialog: pending ? <LeaveDialog onStay={stay} onLeave={leave} /> : null };
}

function LeaveDialog({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onStay(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onStay]);

  return (
    <div className={styles.leaveBackdrop} onClick={onStay}>
      <div className={styles.leaveModal} role="alertdialog" aria-modal="true" aria-labelledby="leave-title" aria-describedby="leave-desc" onClick={(event) => event.stopPropagation()}>
        <i className={styles.leaveIcon}><Warning weight="fill" /></i>
        <h2 id="leave-title">Thí nghiệm đang được tạo</h2>
        <p id="leave-desc">Việc tạo thí nghiệm mất một lúc. Nếu rời đi bây giờ, phần đã làm sẽ bị dừng và mất, bạn sẽ phải tạo lại từ đầu.</p>
        <div className={styles.leaveActions}>
          <button type="button" className={styles.leaveGhost} onClick={onLeave}>Rời đi</button>
          <button type="button" className={styles.leaveStay} autoFocus onClick={onStay}>Ở lại và chờ</button>
        </div>
      </div>
    </div>
  );
}
