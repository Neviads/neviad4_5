"use client";

// SHARED — khung trang chi tiết của một thí nghiệm: header, khung canvas (+ toolbar),
// mục tiêu, và panel bên phải có tab Tham số / Phân tích.
// Khung chỉ lo bố cục và tab; nội dung từng ô do thí nghiệm truyền vào qua props.

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { SimulationTabs, type SimulationTab } from "./simulation-tabs";

type Props = {
  title: string;
  /** Chữ trong badge xanh bên phải header, vd. "Dao động & Sóng · Lớp 11". */
  badge: string;
  /** Một câu mục tiêu, hiện dưới khung canvas. */
  objective: string;
  /** Cảnh canvas, lấp đầy khung (absolute inset-0). */
  scene: ReactNode;
  /** Thanh điều khiển nổi trên canvas (SimulationToolbar). */
  toolbar: ReactNode;
  /** Nội dung tab Tham số (khối giải thích + ParamPanel). */
  params: ReactNode;
  /** Nội dung tab Phân tích (lưới Metric, công thức, tiến trình). */
  analysis: ReactNode;
};

/** Thẻ số liệu nhỏ cho tab Phân tích. */
export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[9px] bg-[#faf9f7] p-2">
      <p className="text-[10px] text-[#8a8178]">{label}</p>
      <p className="mt-0.5 text-[12px] font-semibold tabular-nums text-[#171717]">
        {value}
      </p>
    </div>
  );
}

export function ExperimentFrame({
  title,
  badge,
  objective,
  scene,
  toolbar,
  params,
  analysis,
}: Props) {
  const [tab, setTab] = useState<SimulationTab>("params");

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#e8e2d9] bg-white px-4">
        <Link
          href="/mo-phong-vat-ly"
          className="flex items-center gap-1.5 text-[13px] font-medium text-[#6b6b6b] hover:text-[#171717]"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2} />
          Thư viện
        </Link>
        <span className="text-[#d8d1c9]">/</span>
        <span className="truncate text-[14px] font-semibold text-[#171717]">
          {title}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-medium text-emerald-700">
          <span className="size-1.5 rounded-full bg-current" />
          {badge}
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <section className="flex min-h-[360px] min-w-0 flex-1 flex-col overflow-hidden p-2">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[16px] border border-[#e8e2d9] shadow-sm">
            {scene}
            {toolbar}
          </div>
          <p className="mt-3 shrink-0 text-center text-[13px] leading-relaxed text-[#6b6b6b]">
            {objective}
          </p>
        </section>

        <aside className="flex max-h-[58vh] min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-[#e8e2d9] bg-white lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
          <SimulationTabs value={tab} onChange={setTab} />
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
            {tab === "params" ? params : analysis}
          </div>
        </aside>
      </div>
    </div>
  );
}
