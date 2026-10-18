export type ObjectInputDef = { name: string; label: string; unit: string; min: number; max: number; default: number; description?: string };
export type ObjectOutputDef = { name: string; label: string; unit: string; description?: string };
export type ObjectPortDef = { name: string; description?: string };
export type ObjectSelfTest = { name?: string; set: Record<string, number>; expect: Record<string, number>; tolerance?: number };

export type DrawObjectItem = {
  id: number;
  title: string;
  request: string;
  hint?: string;
  /** "spec": đầu vào là spec do SpecAgent sinh từ một câu của giáo viên; "prose": mô tả và gợi ý do người viết tay. */
  source?: "spec" | "prose" | "lite";
  /** Câu ngắn của giáo viên khi source = "lite" (request và hint do LiteSpecAgent sinh từ câu này). */
  teacher?: string;
  /** Spec (đầu ra của SpecAgent) đã đưa cho skill khi source = "spec". */
  spec?: unknown;
  status: "ok" | "failed";
  attempts: number;
  usage?: { prompt_tokens?: number; completion_tokens?: number } | null;
  name?: string;
  shape?: string | null;
  anchor?: string | null;
  ports?: ObjectPortDef[];
  inputs?: ObjectInputDef[];
  outputs?: ObjectOutputDef[];
  selfTests?: ObjectSelfTest[];
  /** Kết quả chạy thử các ca selfTests ở Node lúc sinh (✓/✗ từng đại lượng). */
  selfTestReport?: string[];
  parts?: string[];
  notes?: string;
  /** Code TypeScript do model viết. */
  code?: string;
  /** Code đã biên dịch sang JavaScript (chạy được trong trình duyệt). */
  js?: string;
  problems?: string[];
  /** Hợp đồng hình (vật không có vật lý): khung bao đo được (mét), bộ phận chuyển động và điểm có tên (mét, so với điểm neo). */
  size?: { width: number; height: number } | null;
  moving?: { name: string; motion: "slide" | "rotate"; axis: string; min: number; max: number }[];
  points?: { name: string; x: number; y: number }[];
};
