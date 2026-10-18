import { LiveCodeError } from "../live-code/types";

// The browser's copy of the template (fe/neviadlike_structure as loaded into the database, see ./template.ts), one tree per run, kept in IndexedDB. The code agent (backend) reads and writes it
// through the live-code bridge (op names fsRead, fsWrite, fsList, fsAppend, fsSearch); nothing here touches the disk.

const DB_NAME = "neviad-code-fs";
const STORE = "files";

export type CodeFile = { path: string; content: string };
type Row = CodeFile & { id: string; runId: string };

/** Marks the last element of a search result that was cut, as the backend's CodeStore.SearchRules.CUT_MARK. */
export const CUT_MARK = "…";

const rowKey = (runId: string, path: string) => `${runId}:${path}`;
const runRange = (runId: string) => IDBKeyRange.bound(`${runId}:`, `${runId}:￿`);

/** The same rules as the backend's SourceStore.validatePath: safe characters, no way out of the tree. */
export function cleanPath(path: unknown): string {
  if (typeof path !== "string" || !path.trim()) throw new LiveCodeError("BAD_REQUEST", "path là bắt buộc.");
  const value = path.replace(/\\/g, "/");
  if (!/^[A-Za-z0-9_./-]+$/.test(value) || value.startsWith("/") || value.includes("..") || value.includes("//")) {
    throw new LiveCodeError("BAD_PATH", `đường dẫn không hợp lệ: ${path}`);
  }
  return value;
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new LiveCodeError("STORAGE_ERROR", "Lỗi IndexedDB."));
  });
}

function finished(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new LiveCodeError("STORAGE_ERROR", "Lỗi IndexedDB."));
    tx.onabort = () => reject(tx.error ?? new LiveCodeError("STORAGE_ABORTED", "Giao dịch IndexedDB bị hủy."));
  });
}

/** Only touch it from the browser (effects and event handlers), never during SSR. */
export class CodeFsStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(private readonly dbName = DB_NAME) {}

  private open(): Promise<IDBDatabase> {
    if (typeof indexedDB === "undefined") return Promise.reject(new LiveCodeError("NO_STORAGE", "IndexedDB không khả dụng trong môi trường này."));
    this.dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
      const opening = indexedDB.open(this.dbName, 1);
      opening.onupgradeneeded = () => opening.result.createObjectStore(STORE, { keyPath: "id" });
      opening.onsuccess = () => resolve(opening.result);
      opening.onerror = () => {
        this.dbPromise = null;
        reject(opening.error ?? new LiveCodeError("STORAGE_ERROR", "Không mở được IndexedDB."));
      };
    });
    return this.dbPromise;
  }

  /** Replaces the whole tree of a run with these files. */
  async seed(runId: string, files: CodeFile[]): Promise<number> {
    const db = await this.open();
    const tx = db.transaction(STORE, "readwrite");
    const done = finished(tx);
    const objects = tx.objectStore(STORE);
    objects.delete(runRange(runId));
    for (const file of files) objects.put({ id: rowKey(runId, cleanPath(file.path)), runId, path: file.path, content: file.content } satisfies Row);
    await done;
    return files.length;
  }

  async read(runId: string, path: string): Promise<string | null> {
    const db = await this.open();
    const row = await request(db.transaction(STORE, "readonly").objectStore(STORE).get(rowKey(runId, cleanPath(path))));
    return row ? (row as Row).content : null;
  }

  async write(runId: string, path: string, content: string): Promise<void> {
    const clean = cleanPath(path);
    const db = await this.open();
    const tx = db.transaction(STORE, "readwrite");
    const done = finished(tx);
    tx.objectStore(STORE).put({ id: rowKey(runId, clean), runId, path: clean, content } satisfies Row);
    await done;
  }

  /** Adds text to the end of a file (it is created when missing), in one transaction so two appends never lose one. */
  async append(runId: string, path: string, text: string): Promise<void> {
    const clean = cleanPath(path);
    const db = await this.open();
    const tx = db.transaction(STORE, "readwrite");
    const done = finished(tx);
    const objects = tx.objectStore(STORE);
    const existing = (await request(objects.get(rowKey(runId, clean)))) as Row | undefined;
    objects.put({ id: rowKey(runId, clean), runId, path: clean, content: `${existing?.content ?? ""}${text}\n` } satisfies Row);
    await done;
  }

  /** Paths of every file under a folder ("" is the whole tree), sorted. */
  async list(runId: string, folder = ""): Promise<string[]> {
    const db = await this.open();
    const rows = (await request(db.transaction(STORE, "readonly").objectStore(STORE).getAll(runRange(runId)))) as Row[];
    const clean = folder.replace(/\\/g, "/").replace(/\/+$/, "");
    if (clean && (clean.includes("..") || clean.startsWith("/"))) return [];
    const prefix = clean ? `${clean}/` : "";
    return rows.map((row) => row.path).filter((path) => path.startsWith(prefix)).sort();
  }

  /** Case-insensitive search as `path:line: text` lines; at most `max` of them, then CUT_MARK when there were more. */
  async search(runId: string, query: string, folder = "", max = 40, maxLineChars = 160): Promise<string[]> {
    const db = await this.open();
    const rows = (await request(db.transaction(STORE, "readonly").objectStore(STORE).getAll(runRange(runId)))) as Row[];
    const clean = folder.replace(/\\/g, "/").replace(/\/+$/, "");
    const prefix = clean ? `${clean}/` : "";
    const needle = query.toLowerCase();
    const matches: string[] = [];
    for (const row of rows.filter((r) => r.path.startsWith(prefix)).sort((a, b) => a.path.localeCompare(b.path))) {
      let number = 0;
      for (const line of row.content.split("\n")) {
        number += 1;
        if (!line.toLowerCase().includes(needle)) continue;
        if (matches.length >= max) { matches.push(CUT_MARK); return matches; }
        const shown = line.trim();
        matches.push(`${row.path}:${number}: ${shown.length > maxLineChars ? `${shown.slice(0, maxLineChars)}…` : shown}`);
      }
    }
    return matches;
  }

  async clear(runId: string): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(runRange(runId));
    await finished(tx);
  }
}
