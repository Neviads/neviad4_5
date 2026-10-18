"use client";

import { useEffect, useMemo, useRef } from "react";
import CodeMirror, { EditorView, type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";

const theme = EditorView.theme({
  "&": { height: "100%", fontSize: "14px", backgroundColor: "#1b1a1f" },
  ".cm-scroller": { fontFamily: "ui-monospace, Consolas, monospace", lineHeight: "1.65" },
  ".cm-gutters": { backgroundColor: "#1b1a1f", color: "#8a869a", border: "none" },
  ".cm-content": { fontWeight: "500" },
});

export type SourceLanguage = "html" | "tsx" | "ts" | "text";

const languages = { html: [html()], tsx: [javascript({ typescript: true, jsx: true })], ts: [javascript({ typescript: true })], text: [] };

/** Read-only CodeMirror 6 view; follows the end of the document while `follow` is set (streaming draft). */
export default function SourceEditor({ value, follow = false, label, language = "html" }: { value: string; follow?: boolean; label: string; language?: SourceLanguage }) {
  const ref = useRef<ReactCodeMirrorRef>(null);
  const extensions = useMemo(() => [...languages[language], oneDark, theme, EditorView.lineWrapping], [language]);
  useEffect(() => {
    const view = ref.current?.view;
    if (follow && view) view.dispatch({ effects: EditorView.scrollIntoView(view.state.doc.length, { y: "end" }) });
  }, [value, follow]);
  return <CodeMirror ref={ref} value={value} height="100%" style={{ flex: 1, minHeight: 0, overflow: "hidden" }} extensions={extensions} editable={false} readOnly aria-label={label}
    basicSetup={{ foldGutter: true, highlightActiveLine: false, highlightActiveLineGutter: false }} />;
}
