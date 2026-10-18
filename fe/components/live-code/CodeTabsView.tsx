"use client";

import { useEffect, useState } from "react";
import type { CodeFsStore } from "@/lib/code-fs/store";
import SourceEditor, { type SourceLanguage } from "./SourceEditor";
import styles from "@/components/lite/lite.module.css";

/** Bản nháp của một file mà agent đang viết (hoặc vừa viết xong). `text` là cả file khi `tool` là write_file, chỉ là đoạn thay thế khi là edit_file. */
export type FileDraft = { text: string; tool: string; streaming: boolean };

/** Khoá của bản nháp mà model chưa nói file nào (nó có thể viết code trước tên file): hiện ở một tab tạm, rồi thành tab của file thật khi tên đã rõ. */
export const PENDING_PATH = "(đang viết…)";

type Props = {
  codeFs: CodeFsStore | null;
  runId: string | null;
  /** Các file đã biết, theo thứ tự hiện tab (không trùng). File đang được viết tự được thêm vào cuối. */
  files: string[];
  /** Bản nháp theo đường dẫn file. */
  drafts: Record<string, FileDraft>;
  /** Đổi giá trị này khi agent có thể đã ghi file, để file đang xem được đọc lại từ bản sao. */
  refreshKey: number;
};

const languageOf = (path: string): SourceLanguage => (path.endsWith(".tsx") ? "tsx" : path.endsWith(".ts") || path.endsWith(".js") ? "ts" : path.endsWith(".html") ? "html" : "text");
const extOf = (path: string) => path.split(".").pop()?.toUpperCase().slice(0, 3) ?? "";
const baseOf = (path: string) => path.split("/").at(-1) ?? path;

/** Nhãn tab: tên file; thêm thư mục cha mờ khi có hai file cùng tên (types.ts của engines và presets). */
function labelsOf(files: string[]): Record<string, { name: string; parent: string }> {
  const count = new Map<string, number>();
  files.forEach((path) => count.set(baseOf(path), (count.get(baseOf(path)) ?? 0) + 1));
  return Object.fromEntries(files.map((path) => {
    const parts = path.split("/");
    return [path, { name: baseOf(path), parent: (count.get(baseOf(path)) ?? 0) > 1 && parts.length > 1 ? parts.at(-2) ?? "" : "" }];
  }));
}

/**
 * Các file mà agent ghi vào bản sao của neviadlike_structure, như thanh tab của một trình soạn code: mỗi file một tab, file đang được viết hiện dần
 * và tab tự chuyển theo nó (trừ khi người dùng vừa tự chọn một tab; có file mới bắt đầu được viết thì lại theo agent).
 */
export default function CodeTabsView({ codeFs, runId, files, drafts, refreshKey }: Props) {
  // Mọi đường dẫn từng có bản nháp: một file vừa viết xong phải còn tab dù tầng chứa nó chưa báo danh sách file.
  const [seen, setSeen] = useState<string[]>([]);
  const draftPaths = Object.keys(drafts);
  const realDrafts = draftPaths.filter((path) => path !== PENDING_PATH);
  if (realDrafts.some((path) => !seen.includes(path))) setSeen([...seen, ...realDrafts.filter((path) => !seen.includes(path))]);
  const tabs = [...files, ...seen.filter((path) => !files.includes(path)), ...(drafts[PENDING_PATH] ? [PENDING_PATH] : [])];

  // Theo agent: file bắt đầu được viết gần nhất. Người dùng chọn tay thì giữ lựa chọn tới khi có file khác bắt đầu được viết.
  const streamingNow = draftPaths.filter((path) => drafts[path].streaming);
  const [followed, setFollowed] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [wasStreaming, setWasStreaming] = useState<string[]>([]);
  if (streamingNow.join("\n") !== wasStreaming.join("\n")) {
    setWasStreaming(streamingNow);
    const started = streamingNow.filter((path) => !wasStreaming.includes(path));
    if (started.length) { setFollowed(started.at(-1) ?? null); setPicked(null); }
  }

  const shown = (picked && tabs.includes(picked) ? picked : null) ?? (followed && tabs.includes(followed) ? followed : null) ?? tabs.at(-1) ?? null;
  const draft = shown ? drafts[shown] : undefined;
  const streaming = !!draft?.streaming;
  const editing = streaming && draft?.tool === "edit_file";

  const [content, setContent] = useState<{ path: string; text: string } | null>(null);
  useEffect(() => {
    if (!codeFs || !runId || !shown || streaming) return;
    let current = true;
    void codeFs.read(runId, shown).then((text) => { if (current) setContent({ path: shown, text: text ?? "" }); });
    return () => { current = false; };
  }, [codeFs, runId, shown, streaming, refreshKey]);

  const text = streaming ? draft?.text || (editing ? "Agent đang sinh đoạn sửa…" : "Agent đang bắt đầu viết…")
    : content && content.path === shown ? content.text
    : draft?.text ?? "";
  const labels = labelsOf(tabs);

  if (!tabs.length) {
    return <div className={styles.codeShell}><p className={styles.codeEmpty}>Chưa có file nào. Code hiện ra ngay khi agent bắt đầu viết.</p></div>;
  }
  return (
    <div className={styles.codeShell}>
      <div className={styles.tabsBar} role="tablist" aria-label="File agent đã ghi">
        {tabs.map((path) => {
          const writing = !!drafts[path]?.streaming;
          return (
            <button key={path} type="button" role="tab" aria-selected={path === shown} title={path} onClick={() => setPicked(path)}
              className={`${styles.codeTab} ${path === shown ? styles.codeTabOn : ""}`}>
              <span className={styles.codeTabIcon}>{path === PENDING_PATH ? "…" : extOf(path)}</span>
              <span>{labels[path].name}</span>
              {labels[path].parent && <span className={styles.codeTabParent}>{labels[path].parent}</span>}
              {writing && <i className={styles.codeTabLive} aria-label="đang viết" />}
            </button>
          );
        })}
      </div>
      <div className={styles.editorBar}>
        <span>{shown}</span>
        <span>{streaming ? `${editing ? "đang sửa · đoạn thay thế" : "đang viết"} · ${(draft?.text ?? "").length.toLocaleString("vi-VN")} ký tự · chưa lưu, chưa kiểm tra` : `${text.length.toLocaleString("vi-VN")} ký tự`}</span>
      </div>
      <div className={styles.editorBody}>
        <SourceEditor value={text} follow={streaming} label={shown ? `Nội dung ${shown}` : "Nội dung file"} language={shown ? languageOf(shown) : "text"} />
      </div>
    </div>
  );
}
