"use client";

import katex from "katex";
import "katex/dist/katex.min.css";

/** "công thức LaTeX — nghĩa của nó" (dấu gạch dài có khoảng trắng hai bên ngăn hai phần); không có dấu đó thì cả mục là công thức. */
export function splitFormula(item: string): { latex: string; meaning: string } {
  const at = item.indexOf(" — ");
  return at < 0 ? { latex: item.trim(), meaning: "" } : { latex: item.slice(0, at).trim(), meaning: item.slice(at + 3).trim() };
}

/** Dựng LaTeX thành HTML của KaTeX; công thức hỏng (hoặc viết thường, không phải LaTeX) thì null để hiện nguyên văn. */
function render(latex: string): string | null {
  try {
    return katex.renderToString(latex, { displayMode: true, throwOnError: true, output: "html" });
  } catch {
    return null;
  }
}

/** Các công thức cốt lõi của kịch bản, cỡ lớn và nổi bật, mỗi công thức một thẻ kèm lời giải thích nhỏ bên dưới. */
export default function FormulaList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">Công thức</h3>
      <ul className="space-y-3">
        {items.map((item) => {
          const { latex, meaning } = splitFormula(item);
          const html = render(latex);
          return (
            <li key={item} className="rounded-[12px] border border-[#e3ddf5] bg-gradient-to-br from-[#f6f3ff] to-white px-4 py-3">
              {html
                ? <div className="overflow-x-auto text-[1.35rem] text-[#2a2146] [&_.katex-display]:my-1" dangerouslySetInnerHTML={{ __html: html }} />
                : <p className="font-mono text-base font-semibold text-[#2a2146]">{latex}</p>}
              {meaning && <p className="mt-1 text-center text-[13px] text-[#6a6478]">{meaning}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
