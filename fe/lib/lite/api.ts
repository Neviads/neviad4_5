import type { DrawObjectItem } from "@/components/draw-object-skill/types";
import type { ObjectGeometry, ScenarioData } from "@/components/test-litespec/ScenarioCard";

// Các lời gọi be của luồng "lite": tách yêu cầu thành vật, kịch bản, vẽ vật, ba tầng code agent. Mỗi hàm ném Error có thông điệp dùng được khi be trả lỗi.
export const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

/** Một bộ phận nhìn thấy được của dụng cụ: khung mà người vẽ dựng hình theo. */
export type FramePart = { name: string; shape: string; position: string; proportion: string };
/** `reference`: id (đường dẫn file) của vật có sẵn trong kho mà agent chọn dùng lại; có thì không vẽ mới. */
export type ObjectRequest = { id: string; title: string; request: string; hint: string; frame?: FramePart[]; reference?: string | null };
/** Câu hỏi lại của LiteSpec về hình (phong cách, phiên bản dụng cụ, góc nhìn...), kèm các đáp án gợi ý. */
export type ClarificationQuestion = { topic: string; text: string; suggestions: string[] };
/** `question` chỉ có khi NEEDS_CLARIFICATION; `style` (phong cách hình đã chốt với giáo viên) và `objects` chỉ có khi READY. */
export type LiteSpecOutcome = { status: "READY" | "NEEDS_CLARIFICATION" | "UNSUPPORTED"; phenomenon: string; reason: string | null; question: ClarificationQuestion | null; style: string; objects: ObjectRequest[] };
export type CodeLayer = "engine" | "renderer" | "experiment";
export type AgentResult = { status: string; rounds: number; summary: string; ledger: string; notesPath: string; files: string[]; failures?: string[] };
/** Một vật đã vẽ, đưa cho code agent: nơi file của nó, tên hàm và ghi chú của người vẽ (hình học nằm ở kịch bản). */
export type ObjectInfo = { id: string; title: string; file: string; functionName: string; notes: string };

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error ?? `HTTP ${response.status}`);
  return data as T;
}

/** Một thí nghiệm của thư viện `/mo-phong-vat-ly`, gửi kèm để be đối chiếu (be không giữ danh sách này). */
export type CatalogEntry = { id: string; title: string; domain: string; grade: number; desc: string; objective: string };
/** Thí nghiệm có sẵn mà yêu cầu khớp, tốt nhất trước, kèm một câu lý do. */
export type ExperimentMatch = { id: string; reason: string };

export const matchExperiments = (request: string, catalog: CatalogEntry[]) =>
  post<{ matches: ExperimentMatch[] }>("/api/v1/experiment-match", { request, catalog });

/** `runId`: nếu có, be đẩy các tool agent gọi (xem kho vật) về topic hoạt động của run đó trong lúc chờ. */
export const liteSpec = (request: string, runId?: string) => post<LiteSpecOutcome>("/api/v1/lite-spec", { request, runId });

export const createScenario = (request: string, objects: ObjectRequest[]) =>
  post<ScenarioData>("/api/v1/scenario", { request, objects: objects.map((o) => ({ id: o.id, title: o.title, request: o.request, hint: o.hint, frame: o.frame ?? [] })) });

/** Mất vài phút; không đặt thời gian chờ ngắn. */
export const drawObject = (runId: string, object: ObjectRequest, geometry: ObjectGeometry | null, view: string, style: string) =>
  post<DrawObjectItem>("/api/v1/draw-object", { runId, title: object.title, request: object.request, hint: object.hint, geometry, view, style, frame: object.frame ?? [] });

export const runCodeLayer = (layer: CodeLayer, body: { runId: string; slug: string; request: string; scenario: ScenarioData; objects: ObjectInfo[] }) =>
  post<AgentResult>(`/api/v1/codeagent/${layer}`, body);
