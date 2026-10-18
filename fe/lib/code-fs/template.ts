import type { CodeFile } from "./store";

// The template tree the code agent works on (fe/neviadlike_structure), as loaded into the database by `npm --prefix fe run push:template`.
// The browser seeds each run's copy (CodeFsStore.seed) with it.

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

/** Every file of the template, from GET /api/v1/source/template; throws when the backend fails or the template was never loaded. */
export async function fetchTemplate(): Promise<CodeFile[]> {
  const response = await fetch(`${apiBaseUrl}/api/v1/source/template`);
  if (!response.ok) throw new Error(`Không tải được template từ DB (HTTP ${response.status}).`);
  const { files } = await response.json() as { files: CodeFile[] };
  if (!files?.length) throw new Error("Template chưa có trong DB: chạy npm --prefix fe run push:template.");
  return files;
}
