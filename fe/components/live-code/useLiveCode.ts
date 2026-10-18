"use client";

import { useCallback, useEffect, useState } from "react";
import { createRequestId, StompClient } from "@/lib/agents";
import { CodeFsStore } from "@/lib/code-fs/store";
import { startLiveCodeBridge } from "@/lib/live-code/bridge";
import { subscribeCodeDraft } from "@/lib/live-code/draft";
import type { CallLogEntry } from "@/lib/live-code/types";

export type LiveCodeSession = {
  runId: string | null;
  connected: boolean;
  error: string | null;
  /** Calls received from the backend, newest last (at most 30). */
  calls: CallLogEntry[];
  /** Unchecked preview of the file the model is writing right now, or null when no draft is streaming. */
  draft: string | null;
  /** The file that draft is for, once the model has said which; after the draft ends it names the file just written. Empty before that and when the backend does not say. */
  draftPath: string;
  /** The tool the draft comes from: "edit_file" means the draft is only the replacement of one piece of the file, not the whole file. */
  draftTool: string;
  /** Opens the STOMP bridge for a run. Without an id a new one is generated; the backend agent must use the same id. Resolves to false when the session could not open. */
  start: (runId?: string) => Promise<boolean>;
  stop: () => void;
  /** The browser's copy of fe/neviadlike_structure that the code agent works on (see lib/code-fs); null until the session is open. */
  codeFs: CodeFsStore | null;
};

type Resources = { codeFs: CodeFsStore; stomp: StompClient; stopBridge: () => void; stopWatching: () => void; stopDraft: () => void };

/** Owns one live-code run: the browser's copy of the file tree, the STOMP bridge and the React state the Code tab renders. */
export function useLiveCode(): LiveCodeSession {
  const [runId, setRunId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calls, setCalls] = useState<CallLogEntry[]>([]);
  const [draft, setDraft] = useState<string | null>(null);
  const [draftPath, setDraftPath] = useState("");
  const [draftTool, setDraftTool] = useState("");
  const [resources, setResources] = useState<Resources | null>(null);

  const release = useCallback((current: Resources | null) => {
    current?.stopWatching();
    try { current?.stopDraft(); } catch { /* the socket may already be closed */ }
    try { current?.stopBridge(); } catch { /* the socket may already be closed */ }
    current?.stomp.disconnect();
  }, []);

  // Replacing or clearing `resources` triggers the effect cleanup below, which is the single place that releases them.
  const stop = useCallback(() => {
    setResources(null);
    setConnected(false);
    setRunId(null);
    setCalls([]);
    setDraft(null);
  }, []);

  const start = useCallback(async (requestedId?: string): Promise<boolean> => {
    const id = requestedId ?? createRequestId();
    setError(null);
    setConnected(false);
    setRunId(id);
    setCalls([]);
    setDraft(null);
    try {
      const stomp = new StompClient();
      const onCall = (entry: CallLogEntry) => setCalls((current) => {
        const index = current.findIndex((item) => item.id === entry.id);
        const next = index >= 0 ? current.map((item, position) => (position === index ? entry : item)) : [...current, entry];
        return next.slice(-30);
      });
      // Reflect the real socket state: it drops when the backend restarts and the client reconnects on its own.
      const stopWatching = stomp.onConnectionChange(setConnected);
      const codeFs = new CodeFsStore();
      const stopBridge = await startLiveCodeBridge(stomp, id, codeFs, onCall);
      const stopDraft = await subscribeCodeDraft(stomp, id, (text, path, tool) => { setDraft(text); setDraftPath(path); setDraftTool(tool); });
      setResources({ codeFs, stomp, stopBridge, stopWatching, stopDraft });
      setConnected(true);
      return true;
    } catch (failure) {
      setResources(null);
      setError(failure instanceof Error ? failure.message : "Không thể mở phiên live code.");
      return false;
    }
  }, []);

  useEffect(() => () => release(resources), [release, resources]);

  return { runId, connected, error, calls, draft, draftPath, draftTool, start, stop, codeFs: resources?.codeFs ?? null };
}
