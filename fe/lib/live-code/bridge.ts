import { handleCodeFsCall, isCodeFsOp } from "../code-fs/handler";
import type { CodeFsStore } from "../code-fs/store";
import type { CallLogEntry, LiveCodeCall, LiveCodeResult } from "./types";

/** The slice of the STOMP client the bridge needs (implemented by StompClient in lib/agents.ts). */
export type LiveCodeStompPort = {
  subscribeTopic(destination: string, handler: (body: string) => void): Promise<() => void>;
  send(destination: string, body: unknown): Promise<void>;
};

export const LIVE_CODE_TOPIC_PREFIX = "/topic/agents/livecode/";
export const LIVE_CODE_RESULT_DESTINATION = "/app/agents/livecode/result";

/** Executes one backend call against the browser's copy of the file tree. Exported separately so it can be tested without STOMP. */
export async function handleLiveCodeCall(call: LiveCodeCall, codeFs: CodeFsStore): Promise<LiveCodeResult> {
  if (!isCodeFsOp(call.op)) return { callId: call.callId, runId: call.runId, ok: false, data: {}, message: `UNKNOWN_OP: Thao tác không được hỗ trợ: ${call.op}` };
  return handleCodeFsCall(call, codeFs);
}

/** What a call is about, for the call log: the file of a file operation, the query of a search. */
function describeCall(call: LiveCodeCall): string {
  const args = call.args ?? {};
  if (call.op === "fsSearch" && typeof args.query === "string") return `${call.op} "${args.query}"${typeof args.folder === "string" && args.folder ? ` trong ${args.folder}` : ""}`;
  if (call.op === "fsList") return `${call.op} ${typeof args.folder === "string" && args.folder ? args.folder : "/"}`;
  return typeof args.path === "string" ? `${call.op} ${args.path}` : call.op;
}

/** Subscribes to the run's topic and answers every call; `onCall` hears each call as it starts and ends. Returns a function that stops listening. */
export async function startLiveCodeBridge(port: LiveCodeStompPort, runId: string, codeFs: CodeFsStore, onCall: (entry: CallLogEntry) => void): Promise<() => void> {
  return port.subscribeTopic(`${LIVE_CODE_TOPIC_PREFIX}${encodeURIComponent(runId)}`, (body) => {
    let call: LiveCodeCall;
    try { call = JSON.parse(body) as LiveCodeCall; } catch { return; }
    if (!call || call.runId !== runId || !call.callId) return;
    const started = performance.now();
    const log = (status: "running" | "ok" | "error", message?: string) => onCall({
      id: call.callId, at: new Date().toISOString(), op: describeCall(call), status,
      ms: status === "running" ? undefined : Math.round(performance.now() - started), message,
    });
    log("running");
    handleLiveCodeCall(call, codeFs)
      .then(async (result) => {
        await port.send(LIVE_CODE_RESULT_DESTINATION, result);
        log(result.ok ? "ok" : "error", result.message ?? undefined);
      })
      .catch((error: unknown) => log("error", `Không gửi được kết quả về BE: ${error instanceof Error ? error.message : String(error)}`));
  });
}
