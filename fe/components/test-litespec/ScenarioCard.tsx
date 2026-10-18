// Thẻ hiển thị KỊCH BẢN của một thí nghiệm (be: POST /api/v1/scenario). Chỉ đọc: văn xuôi cho người xem, không có id hay tên biến.
export type NamedPoint = { name: string; description: string };
export type MovingPart = { name: string; motion: "slide" | "rotate"; axis: string; min: number; max: number; description: string };
/** Hình học của một vật do kịch bản chốt: nguồn duy nhất mà người vẽ, engine và cảnh cùng dùng. Kích thước bằng mét. */
export type ObjectGeometry = { objectId: string; width: number; height: number; anchor: string; points: NamedPoint[]; parts: MovingPart[] };
/** Thứ thí nghiệm TẠO RA theo thời gian và không vật nào sở hữu: mảnh vỡ, hạt, vệt. Engine phát qua `metrics.items`, cảnh vẽ. */
export type Phenomenon = { name: string; description: string; from: string; appearance: string };

export type ScenarioData = {
  summary: string;
  formulas: string[];
  phases: { name: string; description: string }[];
  layout: string;
  /** Góc nhìn chung của cả cảnh (một góc cho mọi vật). */
  view?: string;
  adjustable: string[];
  observable: string[];
  assumptions: string[];
  /** Các phép tính bằng số tác giả kịch bản đã làm với công thức của mình; engine phải cho đúng các kết quả này. */
  workedExamples?: { text: string; expression: string; unit: string; value: number }[];
  objectGeometry: ObjectGeometry[];
  /** Thứ thí nghiệm tạo ra theo thời gian (mảnh vỡ, hạt, vệt); rỗng khi thí nghiệm chỉ có các vật chuyển động. */
  phenomena?: Phenomenon[];
};

import FormulaList from "./FormulaList";

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section>
      <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">{title}</h3>
      <ul className="list-disc space-y-1 pl-5">{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </section>
  );
}

/**
 * `compact`: bản cho giáo viên xem khi duyệt, chỉ tóm tắt, công thức (cỡ lớn, dựng LaTeX) và diễn tiến ngắn. Mọi phần còn lại của kịch bản
 * (bố cục, góc nhìn, tham số, giả định, ví dụ số, hình học) vẫn nằm trong dữ liệu cho agent, chỉ không hiện ở đây.
 */
export default function ScenarioCard({ scenario, compact = false }: { scenario: ScenarioData; compact?: boolean }) {
  if (compact) {
    return (
      <div className="space-y-4 p-4 text-sm leading-relaxed text-[#171717]">
        <p className="text-base font-medium">{scenario.summary}</p>
        <FormulaList items={scenario.formulas} />
        <section>
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">Diễn tiến</h3>
          <ol className="space-y-1.5">
            {scenario.phases.map((phase, index) => (
              <li key={`${index}-${phase.name}`} className="flex gap-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#171717] text-[11px] text-white">{index + 1}</span>
                <span><b>{phase.name}.</b> {phase.description}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    );
  }
  return (
    <div className="space-y-4 p-4 text-sm leading-relaxed text-[#171717]">
      <p className="text-base font-medium">{scenario.summary}</p>
      <FormulaList items={scenario.formulas} />
      <section>
        <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">Diễn tiến</h3>
        <ol className="space-y-2">
          {scenario.phases.map((phase, index) => (
            <li key={`${index}-${phase.name}`} className="flex gap-3">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#171717] text-[11px] text-white">{index + 1}</span>
              <span><b>{phase.name}.</b> {phase.description}</span>
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">Bố cục</h3>
        <p>{scenario.layout}</p>
      </section>
      {scenario.view && (
        <section>
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">Góc nhìn</h3>
          <p>{scenario.view}</p>
        </section>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <List title="Học sinh chỉnh" items={scenario.adjustable} />
        <List title="Học sinh quan sát" items={scenario.observable} />
      </div>
      <List title="Giả định" items={scenario.assumptions} />
      <List title="Ví dụ tính bằng số" items={(scenario.workedExamples ?? []).map((x) => `${x.text} → ${Number(x.value.toPrecision(4))}${x.unit ? ` ${x.unit}` : ""}`)} />
      <List title="Hiện tượng thí nghiệm tạo ra" items={(scenario.phenomena ?? []).map((p) =>
        `${p.name}: ${p.description}${p.from ? ` Ra từ điểm ${p.from}.` : ""}${p.appearance ? ` Trông như: ${p.appearance}` : ""}`)} />
      <List title="Hình học của vật (vật, engine và cảnh cùng dùng)" items={(scenario.objectGeometry ?? []).flatMap((g) => [
        `${g.objectId}: ${g.width} m × ${g.height} m, ${g.anchor ? `neo ở ${g.anchor}` : "neo ở tâm hình bao"}`,
        ...g.points.map((p) => `${g.objectId} · điểm ${p.name}: ${p.description}`),
        ...g.parts.map((p) => `${g.objectId} · bộ phận ${p.name}: ${p.motion === "slide" ? `trượt ${p.axis}, ${p.min} đến ${p.max} m` : `quay ${p.min} đến ${p.max}°`}${p.description ? ` (${p.description})` : ""}`),
      ])} />
    </div>
  );
}
