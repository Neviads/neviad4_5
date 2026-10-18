import { simulationDraftTopic, type RunDraft, type StompClient } from "@/lib/agents";

/**
 * Follows the code the model is writing for a run (backend: CodeDraftPublisher / CodeDraftStreamer). `onDraft` gets the
 * whole text so far after every event, with the path of the file being written once the model has said which, and the tool it
 * comes from ("write_file": the whole file; "edit_file": only the piece that replaces the old one):
 * "" when a file starts, the growing text on each DELTA, null when it ends or is dropped (after an end the path stays, naming the file just written). Display only: nothing here is saved or checked.
 * Events of an object being drawn (they carry a `title`) are not for this stream: see `subscribeObjectDrafts`.
 * Resolves to an unsubscribe function.
 */
export async function subscribeCodeDraft(stomp: StompClient, runId: string, onDraft: (draft: string | null, path: string, tool: string) => void): Promise<() => void> {
  let text: string | null = null;
  let path = "";
  let tool = "";
  return stomp.subscribeTopic(simulationDraftTopic(runId), (body) => {
    try {
      const event = JSON.parse(body) as RunDraft;
      if (event.title) return;
      if (event.type === "START") { text = ""; path = event.path ?? ""; tool = event.tool ?? ""; }
      else if (event.type === "DELTA") { text = (text ?? "") + event.text; path = event.path || path; tool = event.tool || tool; }
      // END: the call is complete, so the path is final (a model may write it after the code); the file itself is read from the copy from now on.
      else if (event.type === "END") { text = null; path = event.path || path; tool = event.tool || tool; }
      else { text = null; path = ""; tool = ""; }
      onDraft(text, path, tool);
    } catch { /* ignore a malformed event */ }
  });
}

/** What one object's agent has written so far. */
export type ObjectDraft = { text: string; path: string; tool: string; streaming: boolean };

/**
 * The same, for agents that each draw one object at once on one run: events carry the object's `title`, and a draft is kept for each title.
 * `onChange(title, draft)` gets the draft after every event (`streaming` false once its file is complete), or null when it is dropped.
 */
export async function subscribeObjectDrafts(stomp: StompClient, runId: string, onChange: (title: string, draft: ObjectDraft | null) => void): Promise<() => void> {
  const drafts = new Map<string, ObjectDraft>();
  return stomp.subscribeTopic(simulationDraftTopic(runId), (body) => {
    try {
      const event = JSON.parse(body) as RunDraft;
      const title = event.title;
      if (!title) return;
      const current = drafts.get(title);
      if (event.type === "START") drafts.set(title, { text: "", path: event.path ?? "", tool: event.tool ?? "", streaming: true });
      else if (event.type === "DELTA") drafts.set(title, { text: (current?.text ?? "") + event.text, path: event.path || current?.path || "", tool: event.tool || current?.tool || "", streaming: true });
      // END: the file is complete and its path final; keep it (not streaming) so its tab stays and is read from the copy.
      else if (event.type === "END" && current) drafts.set(title, { ...current, path: event.path || current.path, streaming: false });
      else drafts.delete(title);
      onChange(title, drafts.get(title) ?? null);
    } catch { /* ignore a malformed event */ }
  });
}
