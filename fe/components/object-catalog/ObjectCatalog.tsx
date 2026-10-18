"use client";

/**
 * Kho vật thể mô phỏng: duyệt danh mục docs/object-catalog.md theo nhóm, mức ưu tiên và từ khoá. Vật nào đã vẽ (collection "objects" trong DB,
 * xem lib/object-library.ts) thì thẻ hiện hình thật; bấm vào để xem lớn và kéo các bộ phận chuyển động.
 * Giao diện theo trang /mo-phong-vat-ly (header, chip lọc ngang, ô tìm, lưới thẻ).
 */

import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  RotateCcw,
  Atom,
  Cog,
  Flame,
  Gauge,
  Lightbulb,
  Magnet,
  Orbit,
  Search,
  Users,
  Waves,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { getSimulationFontFamily } from "@/components/simulations/shared/typography";
import type { CatalogGroup, CatalogObject, ObjectPriority } from "@/lib/object-catalog";
import { fetchObjectLibrary, type LibraryObject } from "@/lib/object-library";

// Konva chạm DOM nên khung vẽ chỉ tải phía client.
const ObjectStage = dynamic(() => import("./ObjectStage").then((m) => m.ObjectStage), { ssr: false });

const PRIORITIES: ObjectPriority[] = ["P1", "P2", "P3"];

const PRIORITY_HINT: Record<ObjectPriority, string> = {
  P1: "Gặp ở nhiều bài, làm trước",
  P2: "Gặp ở vài bài",
  P3: "Đặc thù một bài hoặc mở rộng",
};

/** Hình và màu của từng nhóm theo số mục trong danh mục. */
const GROUP_LOOK: Record<number, { icon: LucideIcon; color: string }> = {
  1: { icon: Wrench, color: "#94a3b8" },
  2: { icon: Gauge, color: "#38bdf8" },
  3: { icon: Cog, color: "#fb923c" },
  4: { icon: Waves, color: "#22d3ee" },
  5: { icon: Lightbulb, color: "#facc15" },
  6: { icon: Zap, color: "#fbbf24" },
  7: { icon: Magnet, color: "#f87171" },
  8: { icon: Flame, color: "#f97316" },
  9: { icon: Atom, color: "#a78bfa" },
  10: { icon: Orbit, color: "#60a5fa" },
  11: { icon: Users, color: "#34d399" },
};
const FALLBACK_LOOK = { icon: Wrench, color: "#94a3b8" };

/** Tên ngắn cho chip: bỏ phần giải thích trong ngoặc ở cuối. */
const shortTitle = (title: string) => title.replace(/\s*\(.*\)\s*$/, "");

/** Bỏ dấu tiếng Việt để tìm "luc ke" vẫn ra "Lực kế". */
const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

/** Chữ thường xen `code` (đường dẫn, tên hàm) và **đậm** như trong file markdown. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/).map((part, index) =>
        part.startsWith("`") && part.endsWith("`") ? (
          <code key={index} className="rounded bg-[#f5f1ec] px-1 py-0.5 font-mono text-[11px] text-[#4f4943]">
            {part.slice(1, -1)}
          </code>
        ) : (
          <span key={index}>{part.replace(/\*\*/g, "")}</span>
        ),
      )}
    </>
  );
}

function Badge({ children, tone = "neutral", title }: { children: ReactNode; tone?: "neutral" | "primary" | "muted" | "success"; title?: string }) {
  const tones: Record<string, string> = {
    neutral: "bg-[#f5f1ec] text-[#6b6b6b]",
    primary: "bg-[#fff4ed] text-[#c96545]",
    muted: "bg-[#f5f1ec] text-[#a39a91]",
    success: "bg-emerald-50 text-emerald-600",
  };
  return (
    <span title={title} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

function FilterChip({ label, count, active, onClick, title }: { label: string; count: number; active: boolean; onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors duration-150 ease-out ${
        active
          ? "border-[#e8724a] bg-[#e8724a] text-white"
          : "border-[#e8e2d9] bg-white text-[#6b6b6b] hover:border-[#d97757] hover:text-[#c96545]"
      }`}
    >
      {label}
      <span className={active ? "text-[11px] text-white/80" : "text-[11px] text-[#b8aea5]"}>{count}</span>
    </button>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="text-[12px] leading-relaxed text-[#6b6b6b]">
      <span className="font-medium text-[#4f4943]">{label}: </span>
      {children}
    </div>
  );
}

function ObjectCard({ object, group, drawn, onOpen }: {
  object: CatalogObject;
  group: CatalogGroup;
  drawn?: LibraryObject;
  onOpen: (drawn: LibraryObject) => void;
}) {
  const look = GROUP_LOOK[group.index] ?? FALLBACK_LOOK;
  const Icon = look.icon;
  const thumb = drawn ? (
    <button type="button" onClick={() => onOpen(drawn)} className="relative block h-full w-full overflow-hidden rounded-[10px] text-left" title="Xem lớn và thử các bộ phận chuyển động">
      <ObjectStage object={drawn} fit={0.8} />
      <span className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm" title="Đã vẽ">
        <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
        <span className="sr-only">Đã vẽ</span>
      </span>
    </button>
  ) : (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-[10px] border border-dashed border-white/10">
      <Icon className="h-12 w-12" style={{ color: look.color }} strokeWidth={1.5} aria-hidden="true" />
      <span className="text-[11px] font-medium uppercase tracking-wide text-[#64748b]">Chưa vẽ</span>
    </div>
  );
  return (
    <article className="group flex flex-col overflow-hidden rounded-[16px] border border-[#e8e2d9] bg-white shadow-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-[#d97757] hover:shadow-md">
      <div className="aspect-[5/3] w-full overflow-hidden bg-[#0f172a] p-2.5">{thumb}</div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={object.priority === "P1" ? "primary" : object.priority === "P2" ? "neutral" : "muted"} title={PRIORITY_HINT[object.priority]}>
            {object.priority}
          </Badge>
          <Badge>{shortTitle(group.title)}</Badge>
          {drawn && <Badge tone="success">Đã vẽ</Badge>}
        </div>
        <h3 className="text-[15px] font-semibold text-[#171717] group-hover:text-[#c96545]">{object.name}</h3>
        <Field label="Dùng ở">{object.usedIn}</Field>
        <Field label="Bộ phận chuyển động">{object.movingParts}</Field>
        <Field label="Điểm neo">{object.anchor}</Field>
        {object.reference && (
          <div className="mt-auto border-t border-[#f0ebe4] pt-2 text-[11px] leading-relaxed text-[#8a8178]">
            Tham khảo: <RichText text={object.reference} />
          </div>
        )}
      </div>
    </article>
  );
}

/** Bảng xem lớn một vật đã vẽ: kéo từng bộ phận chuyển động trong [min, max] như engine sẽ làm. */
function ObjectDetail({ drawn, catalog, onClose }: { drawn: LibraryObject; catalog?: CatalogObject; onClose: () => void }) {
  const { meta } = drawn;
  const rest = () => Object.fromEntries(meta.parts.map((part) => [part.name, Math.min(part.max, Math.max(part.min, 0))]));
  const [pose, setPose] = useState<Record<string, number>>(rest);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/50 p-6" onClick={onClose} role="presentation">
      <div
        className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-[18px] bg-white shadow-xl lg:flex-row"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={meta.title}
      >
        <div className="aspect-[4/3] w-full shrink-0 bg-[#0f172a] lg:aspect-auto lg:h-[600px] lg:w-[62%]">
          <ObjectStage object={drawn} pose={pose} fit={0.7} grid />
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[12px] font-medium text-[#8a8178]">{meta.catalog}</p>
              <h2 className="mt-1 text-lg font-semibold text-[#171717]">{meta.title}</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-full p-1.5 text-[#8a8178] transition-colors hover:bg-[#f5f1ec] hover:text-[#c96545]" aria-label="Đóng">
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>

          <div className="mt-4 space-y-1.5">
            <Field label="Điểm neo">{meta.anchor}</Field>
            <Field label="Khung bao">{meta.size.width} m × {meta.size.height} m</Field>
            {catalog && <Field label="Dùng ở">{catalog.usedIn}</Field>}
            <Field label="File">
              <code className="rounded bg-[#f5f1ec] px-1 py-0.5 font-mono text-[11px] text-[#4f4943]">{drawn.path}</code>
            </Field>
          </div>

          {meta.parts.length > 0 && (
            <section className="mt-5">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-[#171717]">Bộ phận chuyển động</h3>
                <button type="button" onClick={() => setPose(rest())} className="flex items-center gap-1 text-[12px] font-medium text-[#8a8178] hover:text-[#c96545]">
                  <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} /> Tư thế nghỉ
                </button>
              </div>
              <div className="mt-3 space-y-4">
                {meta.parts.map((part) => {
                  const value = pose[part.name] ?? 0;
                  return (
                    <label key={part.name} className="block">
                      <div className="flex items-baseline justify-between gap-2 text-[12px]">
                        <span className="font-medium text-[#4f4943]">
                          {part.label ?? part.name} <code className="font-mono text-[11px] text-[#a39a91]">{part.name}</code>
                        </span>
                        <span className="tabular-nums text-[#6b6b6b]">
                          {part.motion === "rotate" ? `${value.toFixed(0)}°` : `${value.toFixed(3)} m`}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={part.min}
                        max={part.max}
                        step={part.motion === "rotate" ? 1 : (part.max - part.min) / 200}
                        value={value}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          setPose((current) => ({ ...current, [part.name]: next }));
                        }}
                        className="mt-1.5 w-full accent-[#e8724a]"
                      />
                      {part.description && <p className="mt-1 text-[11px] leading-relaxed text-[#8a8178]">{part.description}</p>}
                    </label>
                  );
                })}
              </div>
            </section>
          )}

          {meta.points.length > 0 && (
            <section className="mt-5">
              <h3 className="text-[13px] font-semibold text-[#171717]">Điểm có tên</h3>
              <ul className="mt-2 space-y-1">
                {meta.points.map((point) => (
                  <li key={point.name} className="text-[12px] leading-relaxed text-[#6b6b6b]">
                    <code className="rounded bg-[#f5f1ec] px-1 py-0.5 font-mono text-[11px] text-[#4f4943]">{point.name}</code> {point.description}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {meta.notes && (
            <p className="mt-5 rounded-[12px] border border-[#e8e2d9] bg-[#faf8f5] px-3.5 py-3 text-[12px] leading-relaxed text-[#6b6b6b]">{meta.notes}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ObjectCatalog({ groups, error }: { groups: CatalogGroup[]; error?: string }) {
  const [groupFilter, setGroupFilter] = useState<Set<number>>(() => new Set(groups.map((group) => group.index)));
  const [priorityFilter, setPriorityFilter] = useState<Set<ObjectPriority>>(() => new Set(PRIORITIES));
  const [drawnOnly, setDrawnOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [library, setLibrary] = useState<Map<string, LibraryObject>>(() => new Map());
  const [libraryNote, setLibraryNote] = useState("");
  const [opened, setOpened] = useState<LibraryObject | null>(null);

  // Kho vật đã vẽ nằm trong DB của backend; không tải được thì trang vẫn là danh mục, chỉ báo một dòng.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const Konva = (await import("konva")).default;
        const { objects, errors } = await fetchObjectLibrary(Konva, getSimulationFontFamily);
        if (cancelled) return;
        const names = new Set(groups.flatMap((group) => group.objects.map((object) => object.name)));
        const unmatched = objects
          .filter((object) => !names.has(object.meta.catalog))
          .map((object) => `${object.path}: "${object.meta.catalog}" không có trong danh mục`);
        setLibrary(new Map(objects.filter((object) => names.has(object.meta.catalog)).map((object) => [object.meta.catalog, object])));
        const problems = [...errors, ...unmatched];
        if (problems.length) setLibraryNote(`Một số vật trong kho không hiện được: ${problems.join("; ")}`);
      } catch (reason) {
        if (cancelled) return;
        const message = reason instanceof Error ? reason.message : String(reason);
        setLibraryNote(`Chưa tải được kho vật đã vẽ (${message}). Bật backend rồi chạy npm --prefix fe run push:objects.`);
      }
    })();
    return () => { cancelled = true; };
  }, [groups]);

  const toggle = <T,>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const all = groups.flatMap((group) => group.objects.map((object) => ({ object, group })));
  const q = fold(query.trim());
  const shown = all.filter(({ object, group }) =>
    groupFilter.has(group.index) &&
    priorityFilter.has(object.priority) &&
    (!drawnOnly || library.has(object.name)) &&
    (!q || fold(`${object.name} ${object.usedIn}`).includes(q)));
  const filtered = groupFilter.size < groups.length || priorityFilter.size < PRIORITIES.length || drawnOnly;
  const notes = groups.filter((group) => group.note && groupFilter.has(group.index));

  return (
    <main className="flex h-screen w-full overflow-hidden bg-[#f5f1ec]">
      <Sidebar activeHref="/vat-the-mo-phong" />

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="shrink-0 border-b border-[#e8e2d9] bg-white px-8 py-5">
          <h1 className="font-libertine text-2xl font-normal text-[#171717]">Kho vật thể mô phỏng</h1>
          <p className="mt-1 text-sm text-[#6b6b6b]">
            {shown.length} / {all.length} vật • {library.size} đã vẽ • danh mục dụng cụ và thực thể cần vẽ sẵn cho các thí nghiệm
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {groups.map((group) => (
              <FilterChip
                key={group.index}
                label={shortTitle(group.title)}
                count={group.objects.length}
                active={groupFilter.has(group.index)}
                onClick={() => setGroupFilter((current) => toggle(current, group.index))}
              />
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[12px] font-medium text-[#8a8178]">Ưu tiên</span>
            {PRIORITIES.map((priority) => (
              <FilterChip
                key={priority}
                label={priority}
                title={PRIORITY_HINT[priority]}
                count={all.filter(({ object }) => object.priority === priority).length}
                active={priorityFilter.has(priority)}
                onClick={() => setPriorityFilter((current) => toggle(current, priority))}
              />
            ))}
            <FilterChip label="Đã vẽ" count={library.size} active={drawnOnly} onClick={() => setDrawnOnly((current) => !current)} title="Chỉ hiện vật đã có trong kho" />
            {filtered && (
              <button
                type="button"
                onClick={() => {
                  setGroupFilter(new Set(groups.map((group) => group.index)));
                  setPriorityFilter(new Set(PRIORITIES));
                  setDrawnOnly(false);
                }}
                className="flex items-center gap-1 rounded-full px-2.5 py-2 text-[12px] font-medium text-[#8a8178] transition-colors duration-150 ease-out hover:text-[#c96545]"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
                Bỏ lọc
              </button>
            )}

            <div className="ml-auto flex h-11 w-full max-w-xs items-center gap-2 rounded-[12px] border border-[#e8e2d9] bg-white px-3.5 shadow-[0_1px_2px_rgba(43,41,38,0.04)] transition-colors duration-150 ease-out focus-within:border-[#d97757]">
              <Search className="h-5 w-5 shrink-0 text-[#8a8178]" strokeWidth={2} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm vật thể hoặc bài dùng nó…"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-[#171717] outline-none placeholder:text-[#b8aea5]"
              />
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-8">
          {error && <p className="mb-6 rounded-[12px] border border-[#f3c6bd] bg-[#fff4f1] px-4 py-3 text-[13px] text-[#c2483c]">{error}</p>}
          {libraryNote && <p className="mb-6 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">{libraryNote}</p>}
          {notes.map((group) => (
            <p key={group.index} className="mb-6 rounded-[12px] border border-[#e8e2d9] bg-white px-4 py-3 text-[13px] leading-relaxed text-[#6b6b6b]">
              <span className="font-medium text-[#4f4943]">{shortTitle(group.title)}: </span>
              <RichText text={group.note} />
            </p>
          ))}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map(({ object, group }) => (
              <ObjectCard key={object.id} object={object} group={group} drawn={library.get(object.name)} onOpen={setOpened} />
            ))}

            {shown.length === 0 && !error && (
              <div className="col-span-full flex flex-col items-center justify-center gap-2 rounded-[16px] border border-dashed border-[#e8e2d9] bg-white/60 py-16 text-center">
                <p className="text-sm font-medium text-[#171717]">Không tìm thấy vật thể phù hợp</p>
                <p className="text-xs text-[#8a8178]">Thử đổi từ khoá tìm kiếm hoặc bỏ bớt bộ lọc.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {opened && (
        <ObjectDetail
          drawn={opened}
          catalog={all.find(({ object }) => object.name === opened.meta.catalog)?.object}
          onClose={() => setOpened(null)}
        />
      )}
    </main>
  );
}
