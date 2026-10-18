"use client";

import { useEffect, useState } from "react";
import type { CodeFsStore } from "@/lib/code-fs/store";
import SourceEditor, { type SourceLanguage } from "./SourceEditor";

const languageOf = (path: string): SourceLanguage => (path.endsWith(".tsx") ? "tsx" : path.endsWith(".ts") || path.endsWith(".js") ? "ts" : path.endsWith(".html") ? "html" : "text");

type Props = {
  codeFs: CodeFsStore | null;
  runId: string | null;
  /** Files the agent has written (from the backend's result); the file being streamed joins them as soon as its path is known. */
  files: string[];
  /** `draft` and `draftPath` of useLiveCode: the file the model is writing right now, unsaved and unchecked. */
  draft: string | null;
  draftPath: string;
  /** "edit_file" when the draft is only the replacement of one piece of the file. */
  draftTool?: string;
  /** Changes whenever the agent may have written a file, so the shown file is read again from the copy. */
  refreshKey: number;
  height?: number;
};

/**
 * The files a code agent writes into the browser copy of neviadlike_structure: a list on the left, the selected file on the right.
 * While the model is writing a file its text streams in and the view follows the end of it; otherwise the file is read from the copy.
 */
export default function CodeFilesView({ codeFs, runId, files, draft, draftPath, draftTool = "", refreshKey, height = 380 }: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  // Every path a draft has been seen for, so a file is listed while it is still being written.
  const [streamed, setStreamed] = useState<string[]>([]);
  if (draftPath && !streamed.includes(draftPath)) setStreamed([...streamed, draftPath]);
  // The last draft text, kept until the file has been read back from the copy, so the editor does not blink to the older version.
  const [held, setHeld] = useState<{ path: string; text: string } | null>(null);
  const editing = draft !== null && draftTool === "edit_file";
  if (draft !== null && !editing && draftPath && (held === null || held.text !== draft || held.path !== draftPath)) setHeld({ path: draftPath, text: draft });
  const [content, setContent] = useState<{ path: string; text: string; key: number } | null>(null);

  const all = [...files, ...streamed.filter((path) => !files.includes(path))];
  const drafting = draft !== null;
  const shown = picked ?? (drafting && draftPath ? draftPath : all.at(-1) ?? null);
  const streaming = drafting && (draftPath ? shown === draftPath : picked === null);

  useEffect(() => {
    if (!codeFs || !runId || !shown || streaming) return;
    let current = true;
    void codeFs.read(runId, shown).then((text) => { if (current) setContent({ path: shown, text: text ?? "", key: refreshKey }); });
    return () => { current = false; };
  }, [codeFs, runId, shown, streaming, refreshKey]);

  const text = streaming ? (draft || (editing ? "Agent đang sinh đoạn sửa…" : "Agent đang bắt đầu viết…"))
    : content && content.path === shown && content.key === refreshKey ? content.text
    : held && held.path === shown ? held.text
    : content && content.path === shown ? content.text : "";

  if (!all.length && !drafting) return <p className="border-t px-3 py-2 text-xs text-[#6b6b6b]">Agent chưa ghi file nào vào bản sao.</p>;
  return (
    <div className="flex border-t bg-[#1b1a1f]" style={{ height }}>
      <ul className="w-64 shrink-0 overflow-y-auto border-r border-[#2a2930] py-1 font-mono text-[11px] text-[#b9b5c6]" aria-label="File agent đã ghi">
        {all.map((path) => (
          <li key={path}>
            <button type="button" onClick={() => setPicked(path)} title={path}
              className={`block w-full truncate px-2 py-0.5 text-left hover:bg-[#2a2930] ${path === shown ? "bg-[#2a2930] text-white" : ""}`}>
              {drafting && path === draftPath ? (editing ? "✎ sửa " : "✎ ") : ""}{path}
            </button>
          </li>
        ))}
        {drafting && !draftPath ? <li className="px-2 py-0.5 text-[#8a869a]">✎ đang chọn file…</li> : null}
      </ul>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-3 py-1 text-xs text-[#b9b5c6]">
          <span className="truncate">{shown ?? "…"}</span>
          <span>{streaming ? `${editing ? "đang sửa · đoạn thay thế" : "đang viết"} · ${(draft ?? "").length.toLocaleString("vi-VN")} ký tự · chưa lưu, chưa kiểm tra` : `${text.length.toLocaleString("vi-VN")} ký tự`}</span>
        </div>
        <div className="flex min-h-0 flex-1">
          <SourceEditor value={text} follow={streaming} label={shown ? `Nội dung ${shown}` : "Nội dung file"} language={shown ? languageOf(shown) : "text"} />
        </div>
      </div>
    </div>
  );
}
