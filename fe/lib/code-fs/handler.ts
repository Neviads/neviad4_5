import { LiveCodeError, type LiveCodeCall, type LiveCodeResult } from "../live-code/types";
import { cleanPath, type CodeFsStore } from "./store";

/** Ops the backend sends for the code agent's file tree (see LiveCodeProtocol.OP_FS_* on the BE). */
export const CODE_FS_OPS = ["fsRead", "fsWrite", "fsList", "fsAppend", "fsSearch"] as const;

export const isCodeFsOp = (op: string): boolean => (CODE_FS_OPS as readonly string[]).includes(op);

const text = (value: unknown, name: string): string => {
  if (typeof value !== "string") throw new LiveCodeError("BAD_REQUEST", `${name} phải là chuỗi.`);
  return value;
};

const count = (value: unknown, fallback: number): number => (typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback);

/** Answers one file operation of the code agent from the browser's copy of the tree. Never throws: a failure is an `ok: false` result. */
export async function handleCodeFsCall(call: LiveCodeCall, fs: CodeFsStore): Promise<LiveCodeResult> {
  const args = call.args ?? {};
  const answer = (ok: boolean, data: Record<string, unknown> = {}, message: string | null = null): LiveCodeResult => ({ callId: call.callId, runId: call.runId, ok, data, message });
  try {
    switch (call.op) {
      case "fsRead": {
        const content = await fs.read(call.runId, cleanPath(args.path));
        // A missing file is an answer, not an error: the backend turns "no content" into an empty Optional.
        return answer(true, content === null ? {} : { content });
      }
      case "fsWrite": {
        await fs.write(call.runId, cleanPath(args.path), text(args.content, "content"));
        return answer(true);
      }
      case "fsList": return answer(true, { files: await fs.list(call.runId, typeof args.folder === "string" ? args.folder : "") });
      case "fsAppend": {
        await fs.append(call.runId, cleanPath(args.path), text(args.text, "text"));
        return answer(true);
      }
      case "fsSearch": {
        const matches = await fs.search(call.runId, text(args.query, "query"), typeof args.folder === "string" ? args.folder : "", count(args.max, 40), count(args.maxLineChars, 160));
        return answer(true, { matches });
      }
      default: return answer(false, {}, `UNKNOWN_OP: Thao tác không được hỗ trợ: ${call.op}`);
    }
  } catch (error) {
    if (error instanceof LiveCodeError) return answer(false, {}, `${error.code}: ${error.message}`);
    return answer(false, {}, `EDITOR_ERROR: ${error instanceof Error ? error.message : "Lỗi không xác định ở kho file."}`);
  }
}
