/** Shared types for the live code bridge: the frontend owns the files the code agents read and write. */

/** Backend -> frontend request (see LiveCodeProtocol.Call on the BE). */
export type LiveCodeCall = {
  callId: string;
  runId: string;
  op: string;
  args: Record<string, unknown> | null;
};

/** Frontend -> backend response (see LiveCodeProtocol.Result on the BE). */
export type LiveCodeResult = {
  callId: string;
  runId: string;
  ok: boolean;
  data: Record<string, unknown>;
  message: string | null;
};

/** One call received from the backend, updated in place as it runs (same id). */
export type CallLogEntry = {
  id: string;
  at: string;
  op: string;
  status: "running" | "ok" | "error";
  ms?: number;
  message?: string;
};

export class LiveCodeError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "LiveCodeError";
  }
}
