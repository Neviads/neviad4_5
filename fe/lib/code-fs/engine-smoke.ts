// Chạy thử MỘT engine do agent viết (đã nằm trong bản sao) ngay trong trình duyệt: đây là tín hiệu đúng/sai thay cho cổng kiểm tra.
// Thuần: không import tương đối và không API trình duyệt, để Node cũng nạp thẳng được khi kiểm thử.
//
// Kiểm: đủ export theo hợp đồng; state bất biến (đóng băng rồi chạy); pha `idle` đứng yên; start/pause/resume đúng pha; trong khi chạy
// `metrics.values` luôn hữu hạn; với MỖI vật `metrics.objects[<vật>]` có `x`, `y` hữu hạn (vị trí điểm neo, mét) và `parts[<bộ phận>]` hữu hạn,
// nằm trong [min, max] của bộ phận. (Việc bộ phận THẬT SỰ đổi theo thời gian chỉ được báo, chưa bắt buộc: ENFORCE_TRAVEL.)

export type SmokeObject = { id: string; parts: { name: string; min: number; max: number }[] };
export type SmokeResult = { ok: boolean; problems: string[]; report: string[] };
export type Load = (path: string) => Promise<Record<string, unknown>>;

const FRAME_DT = 1 / 60;
const FRAMES = 1200; // 20 s mô phỏng
const SAMPLE_EVERY = 6;
const MIN_TRAVEL = 0.02; // bộ phận phải đi được ít nhất 2% khoảng của nó
// TẠM TẮT: bộ phận đứng yên vẫn được ghi vào báo cáo (dấu ·) nhưng không làm engine rớt. Đặt true để bật.
const ENFORCE_TRAVEL = false;

type Fn = (...args: never[]) => unknown;
type ObjectPose = { x?: unknown; y?: unknown; parts?: Record<string, unknown>; visible?: unknown };
type Item = { kind?: unknown; x?: unknown; y?: unknown };
type Metrics = { phase?: unknown; time?: unknown; values?: Record<string, unknown>; objects?: Record<string, ObjectPose>; items?: unknown };

function pascalOf(slug: string): { pascal: string; camel: string; snake: string } {
  let pascal = slug.split("-").filter(Boolean).map((word) => word[0].toUpperCase() + word.slice(1)).join("");
  if (/^[0-9]/.test(pascal)) pascal = `E${pascal}`;
  return { pascal, camel: pascal[0].toLowerCase() + pascal.slice(1), snake: slug.toUpperCase().replace(/-/g, "_") };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

export async function smokeEngine(load: Load, slug: string, objects: SmokeObject[]): Promise<SmokeResult> {
  const { pascal, camel, snake } = pascalOf(slug);
  const problems: string[] = [];
  const report: string[] = [];
  const need = (module: Record<string, unknown>, file: string, names: string[]) => {
    for (const name of names) if (!(name in module)) problems.push(`${file} thiếu export \`${name}\`.`);
  };

  let engine: Record<string, unknown>;
  try {
    engine = await load(`engines/${slug}/engine.ts`);
  } catch (error) {
    return { ok: false, problems: [error instanceof Error ? error.message : String(error)], report };
  }
  need(engine, "engine.ts", [
    "SIM_DURATION_SECONDS", "PHYSICS_SUBSTEP", "MAX_FRAME_DT", "MAX_HISTORY_POINTS", `DEFAULT_${snake}_PARAMS`,
    `${snake}_PHASE_LABELS`, `transition${pascal}Phase`, `pause${pascal}State`, `resume${pascal}State`,
    `create${pascal}State`, `apply${pascal}Command`, `step${pascal}`, `${camel}Metrics`, "evaluate",
  ]);
  if (problems.length) return { ok: false, problems, report };
  report.push("✓ đủ export theo hợp đồng");

  const create = engine[`create${pascal}State`] as Fn;
  const apply = engine[`apply${pascal}Command`] as (state: unknown, command: string) => Record<string, unknown>;
  const step = engine[`step${pascal}`] as (state: unknown, params: unknown, dt: number) => { state: Record<string, unknown>; completed: boolean };
  const metricsOf = engine[`${camel}Metrics`] as (state: unknown, params: unknown) => Metrics;
  const params = engine[`DEFAULT_${snake}_PARAMS`];

  // Các `kind` đã thấy trong `metrics.items`: hiện tượng do engine sinh ra, để báo lại cho người xem.
  const itemKinds = new Set<string>();

  const check = (metrics: Metrics, label: string, seen: Map<string, { min: number; max: number }>) => {
    if (!metrics || typeof metrics !== "object") { problems.push(`${label}: ${camel}Metrics không trả về đối tượng.`); return; }
    // `items` là tuỳ chọn (thí nghiệm không sinh ra gì thì không có), nhưng có thì phải đúng hình dạng.
    if (metrics.items !== undefined) {
      if (!Array.isArray(metrics.items)) problems.push(`${label}: metrics.items phải là mảng.`);
      else for (const [index, raw] of (metrics.items as Item[]).entries()) {
        const item = raw as Item;
        if (!item || typeof item !== "object") { problems.push(`${label}: metrics.items[${index}] phải là đối tượng.`); continue; }
        if (typeof item.kind !== "string" || !item.kind) problems.push(`${label}: metrics.items[${index}].kind phải là chuỗi tên hiện tượng.`);
        else itemKinds.add(item.kind);
        for (const axis of ["x", "y"] as const) {
          if (typeof item[axis] !== "number" || !Number.isFinite(item[axis])) problems.push(`${label}: metrics.items[${index}].${axis} không hữu hạn (${String(item[axis])}).`);
        }
      }
    }
    const values = metrics.values;
    if (!values || typeof values !== "object") problems.push(`${label}: metrics.values phải là đối tượng id → số.`);
    else for (const [id, value] of Object.entries(values)) if (!Number.isFinite(value)) problems.push(`${label}: metrics.values.${id} không hữu hạn (${String(value)}).`);
    for (const object of objects) {
      const pose = metrics.objects?.[object.id];
      if (!pose || typeof pose !== "object") { problems.push(`${label}: thiếu metrics.objects["${object.id}"] (vị trí điểm neo x, y bằng mét và parts).`); continue; }
      for (const axis of ["x", "y"] as const) if (typeof pose[axis] !== "number" || !Number.isFinite(pose[axis])) problems.push(`${label}: metrics.objects["${object.id}"].${axis} không hữu hạn (${String(pose[axis])}).`);
      if (pose.visible !== undefined && typeof pose.visible !== "boolean") problems.push(`${label}: metrics.objects["${object.id}"].visible phải là true/false hoặc bỏ trống (${String(pose.visible)}).`);
      for (const part of object.parts) {
        const value = pose.parts?.[part.name];
        const key = `${object.id}.${part.name}`;
        if (typeof value !== "number" || !Number.isFinite(value)) { problems.push(`${label}: bộ phận ${key} không hữu hạn (${String(value)}).`); continue; }
        const slack = (part.max - part.min) * 1e-6 + 1e-9;
        if (value < part.min - slack || value > part.max + slack) problems.push(`${label}: bộ phận ${key} = ${value} ngoài khoảng [${part.min}, ${part.max}] của kịch bản.`);
        const range = seen.get(key) ?? { min: value, max: value };
        seen.set(key, { min: Math.min(range.min, value), max: Math.max(range.max, value) });
      }
    }
  };

  try {
    const seen = new Map<string, { min: number; max: number }>();
    const first = deepFreeze(create(params as never) as Record<string, unknown>);
    if (first.phase !== "idle") problems.push(`create${pascal}State: phase phải là "idle", đang là "${String(first.phase)}".`);
    check(metricsOf(first, params), "idle", seen);

    const idle = step(first, params, FRAME_DT);
    if (idle.state !== first || idle.completed) problems.push(`step${pascal} khi chưa chạy phải trả đúng state cũ và completed = false.`);

    let state = deepFreeze(apply(first, "start"));
    if (state.phase !== "running") problems.push(`apply${pascal}Command("start") phải cho phase "running", đang là "${String(state.phase)}".`);
    const paused = deepFreeze(apply(state, "pause"));
    if (paused.phase !== "paused") problems.push(`Lệnh "pause" khi đang chạy phải cho phase "paused", đang là "${String(paused.phase)}".`);
    const resumed = deepFreeze(apply(paused, "resume"));
    if (resumed.phase !== "running") problems.push(`Lệnh "resume" khi đang tạm dừng phải cho phase "running", đang là "${String(resumed.phase)}".`);

    let frames = 0;
    for (; frames < FRAMES; frames += 1) {
      const result = step(state, params, FRAME_DT);
      state = deepFreeze(result.state);
      if (frames % SAMPLE_EVERY === 0 || result.completed) check(metricsOf(state, params), `t=${Number(state.time).toFixed(2)} s`, seen);
      if (result.completed) { frames += 1; break; }
    }
    if (!(Number(state.time) > 0.5)) {
      problems.push(String(state.phase) === "complete"
        ? `Thí nghiệm kết thúc sau ${frames} khung hình, state.time = ${String(state.time)} s: quá nhanh để nhìn thấy. \`time\` là thời gian TRÊN MÀN HÌNH; nếu hiện tượng thật xảy ra quá nhanh (hạt, ánh sáng) hãy dùng một thang thời gian mô hình (hằng số TIME_SCALE) để cả thí nghiệm kéo dài vài giây, còn đại lượng thời gian thật thì báo trong metrics.values.`
        : `Sau ${frames} khung hình state.time = ${String(state.time)}: thời gian không tiến.`);
    }
    report.push(`✓ chạy ${frames} khung hình (${Number(state.time).toFixed(1)} s mô phỏng), phase cuối "${String(state.phase)}"`);

    for (const object of objects) for (const part of object.parts) {
      const range = seen.get(`${object.id}.${part.name}`);
      if (!range) continue;
      const travel = (range.max - range.min) / (part.max - part.min || 1);
      const still = travel < MIN_TRAVEL;
      report.push(`${!still ? "✓" : ENFORCE_TRAVEL ? "✗" : "·"} bộ phận ${object.id}.${part.name}: từ ${range.min.toPrecision(4)} đến ${range.max.toPrecision(4)} (khoảng ${part.min} đến ${part.max})${still && !ENFORCE_TRAVEL ? " — gần như không đổi (chưa bắt buộc)" : ""}`);
      if (still && ENFORCE_TRAVEL) problems.push(`bộ phận ${object.id}.${part.name} gần như không đổi trong ${Number(state.time).toFixed(1)} s mô phỏng: cảnh sẽ đứng yên.`);
    }
    if (!objects.length) report.push("(không có vật để kiểm vị trí)");
    if (itemKinds.size) report.push(`✓ hiện tượng phát qua metrics.items: ${[...itemKinds].join(", ")}`);
    const evaluate = engine.evaluate as (inputs: Record<string, number>) => Record<string, unknown>;
    const outputs = evaluate({});
    if (!outputs || typeof outputs !== "object") problems.push("evaluate({}) phải trả về một đối tượng id → số.");
    else for (const [id, value] of Object.entries(outputs)) if (!Number.isFinite(value)) problems.push(`evaluate({}).${id} không hữu hạn (${String(value)}).`);
  } catch (error) {
    problems.push(`Chạy thử engine bị lỗi (state phải bất biến, không sửa đầu vào): ${error instanceof Error ? error.message : String(error)}`);
  }
  const unique = [...new Set(problems)].slice(0, 12);
  return { ok: unique.length === 0, problems: unique, report };
}
