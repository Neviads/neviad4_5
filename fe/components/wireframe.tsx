"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { wireframeRoutes, type WireframeRoute } from "./wireframe-data";
import { AppIcon, type AppIconName } from "./app-icon";

const navGroups = [
  {
    label: "Không gian chung",
    items: [
      { href: "/wireframe/library", label: "Thư viện của tôi", description: "" },
      { href: "/wireframe/dashboard", label: "Dashboard", description: "" },
    ],
  },
  {
    label: "Nội dung giảng dạy",
    items: [
      { href: "/wireframe/lesson", label: "Tạo giáo án", description: "" },
      { href: "/wireframe/slide", label: "Tạo slide", description: "" },
    ],
  },
  {
    label: "Experiment Agent",
    items: [
      { href: "/wireframe/simu-gen", label: "SimuGen AI", description: "" },
      { href: "/wireframe/experiment/create", label: "Tạo thí nghiệm", description: "" },
      { href: "/wireframe/experiment/review", label: "Review proposal", description: "" },
      { href: "/wireframe/experiment/simulation", label: "Preview", description: "" },
    ],
  },
];

const navIcons: Record<string, AppIconName> = {
  "Thư viện của tôi": "book",
  Dashboard: "grid",
  "Tạo giáo án": "clipboard",
  "Tạo slide": "layout",
  "SimuGen AI": "sparkles",
  "Tạo thí nghiệm": "flask",
  "Review proposal": "clipboard",
  Preview: "atom",
};

export function WireframeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-[var(--ink)]">
      <header className="flex h-14 items-center justify-between border-b border-[#d8d1c9] bg-[#f7f5f2] px-4 md:hidden">
        <button type="button" onClick={() => setMobileOpen(true)} className="flex size-9 items-center justify-center rounded-xl border border-[#d8d1c9] bg-white text-sm" aria-label="Mở menu"><AppIcon name="menu" className="size-4" /></button>
        <Link href="/wireframe" className="flex items-center gap-2"><span className="flex size-7 items-center justify-center rounded-lg bg-[#1f1f1f] text-white"><AppIcon name="sparkles" className="size-4" /></span><span className="text-sm font-semibold">NEVIAD</span></Link>
        <span className="rounded-full border border-[#efc2b0] bg-[var(--accent-soft)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#b85f42]">WF</span>
      </header>

      {mobileOpen && <button type="button" className="fixed inset-0 z-30 bg-black/25 md:hidden" onClick={() => setMobileOpen(false)} aria-label="Đóng menu" />}

      <div className="flex min-h-[calc(100vh-3.5rem)] md:min-h-screen">
        <aside className={`fixed inset-y-0 left-0 z-40 flex w-[264px] min-w-[264px] -translate-x-full flex-col border-r border-black/10 bg-[#f7f5f2] transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 ${mobileOpen ? "translate-x-0" : ""}`}>
          <div className="flex h-16 shrink-0 items-center px-[13px]">
            <Link href="/wireframe" className="flex items-center gap-2.5 rounded-xl" onClick={() => setMobileOpen(false)}>
              <span className="flex size-10 items-center justify-center"><span className="flex size-9 items-center justify-center rounded-[10px] bg-[#1f1f1f] text-white"><AppIcon name="sparkles" className="size-5" /></span></span>
              <span><span className="block text-[15px] font-semibold leading-none tracking-[-0.01em]">NEVIAD</span><span className="mt-1 block text-[10px] uppercase leading-none tracking-[0.12em] text-[#6b6b6b]">AI for Educators</span></span>
            </Link>
          </div>
          <div className="mx-[13px] mb-3 h-px shrink-0 bg-black/10" />

          <nav className="wireframe-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto pb-3" aria-label="Điều hướng wireframe">
            {navGroups.map((group) => (
              <section key={group.label} className="pb-1">
                <div className="flex items-center justify-between rounded-lg px-[17px] py-1.5 text-[10px] font-semibold uppercase leading-4 tracking-[0.11em] text-[#6b6b6b]"><span>{group.label}</span><span className="text-xs">⌄</span></div>
                <div className="mt-1 space-y-px">
                  {group.items.map((item) => {
                    const active = pathname === item.href || (item.href !== "/wireframe/dashboard" && pathname.startsWith(`${item.href}/`));
                    return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} onClick={() => setMobileOpen(false)} className={`mx-[13px] flex h-10 items-center gap-2.5 rounded-[10px] px-2.5 text-[14px] font-medium tracking-[-0.01em] transition-colors ${active ? "bg-[#ebe7e1] text-[#1f1f1f]" : "text-[#6b6b6b] hover:bg-[#edeae5] hover:text-[#1f1f1f]"}`}><span className="flex size-6 shrink-0 items-center justify-center text-[#6b6b6b]"><AppIcon name={navIcons[item.label] ?? "grid"} className="size-[17px]" /></span><span className="truncate">{item.label}</span></Link>;
                  })}
                </div>
              </section>
            ))}
          </nav>

          <div className="mt-auto shrink-0">
            <Link href="/wireframe" className="mx-[13px] flex h-10 items-center gap-2.5 rounded-xl px-3 text-[13px] font-medium text-[#625c55] hover:bg-[#edeae5]"><AppIcon name="help" className="size-[17px]" />Trợ giúp</Link>
            <div className="flex items-center gap-1.5 border-t border-[#d8d1c9] p-[13px]">
              <Link href="/wireframe/dashboard" className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-1.5 py-1.5 hover:bg-[#edeae5]"><span className="relative flex size-[37px] shrink-0 items-center justify-center rounded-xl bg-[#1f1f1f] text-[13px] font-semibold text-white">GV<span className="absolute bottom-0 right-0 size-2 rounded-full border border-white bg-[#80cfa0]" /></span><span className="min-w-0"><span className="block truncate text-[14px] font-medium">Nguyễn Thị Hoa</span><span className="block truncate text-[12px] text-[#6b6b6b]">Giáo viên · Vật lý</span></span></Link>
              <span className="flex size-10 items-center justify-center rounded-xl text-lg text-[#6b6b6b]">♧</span>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <main className="wireframe-scrollbar min-h-screen overflow-x-hidden px-5 py-8 sm:px-8 lg:px-12 lg:py-12">{children}</main>
        </div>
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-5 border-b border-[var(--line)] pb-8 md:flex-row md:items-end">
      <div className="max-w-3xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">{eyebrow}</p>
        <h1 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function WireframeNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 flex gap-3 rounded-xl border border-dashed border-[#e5b7a5] bg-[var(--accent-soft)] p-4 text-sm leading-6 text-[#795548]">
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#f4c6b5] text-xs font-bold text-[#8b513d]">i</span>
      <p>{children}</p>
    </div>
  );
}

export function Panel({
  title,
  description,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_2px_8px_rgba(43,41,38,0.035)] sm:p-6 ${className}`}>
      {(title || description) && (
        <div className="mb-5">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {description && <p className="mt-1 text-sm leading-5 text-[var(--muted)]">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

export function FakeField({
  label,
  value,
  multiline = false,
  required = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold text-[#504a45]">
        {label} {required && <span className="text-[var(--accent)]">*</span>}
      </label>
      <div className={`rounded-xl border border-[#d9d2ca] bg-[#fcfbfa] px-3.5 text-sm text-[#8a827b] ${multiline ? "min-h-28 py-3 leading-6" : "h-11 flex items-center"}`}>
        {value}
      </div>
    </div>
  );
}

export function StatusBadge({ tone, children }: { tone: "neutral" | "info" | "success" | "warning" | "danger"; children: React.ReactNode }) {
  const tones = {
    neutral: "border-[#ded7d0] bg-[#f8f6f3] text-[#6f6861]",
    info: "border-[#c9ddec] bg-[var(--blue-soft)] text-[#467296]",
    success: "border-[#c5e3d0] bg-[var(--green-soft)] text-[#3f7a55]",
    warning: "border-[#ebd899] bg-[var(--amber-soft)] text-[#8c6a20]",
    danger: "border-[#e7c2bc] bg-[var(--danger-soft)] text-[#a34f43]",
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${tones[tone]}`}>{children}</span>;
}

export function Stepper({ current }: { current: number }) {
  const steps = ["Mô tả", "Làm rõ", "Tạo proposal", "Review", "Lưu"];
  return (
    <div className="flex flex-wrap items-center gap-y-2">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const done = stepNumber < current;
        const active = stepNumber === current;
        return (
          <div key={step} className="flex items-center">
            <div className="flex items-center gap-2">
              <span className={`flex size-7 items-center justify-center rounded-full border text-xs font-bold ${done ? "border-[#aad3b8] bg-[var(--green-soft)] text-[#3f7a55]" : active ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white text-[var(--muted)]"}`}>
                {done ? "✓" : stepNumber}
              </span>
              <span className={`text-xs font-medium ${active ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>{step}</span>
            </div>
            {index < steps.length - 1 && <span className="mx-3 text-[#c5bdb5]">=</span>}
          </div>
        );
      })}
    </div>
  );
}

export function PlaceholderAction({ href, children, secondary = false }: { href: string; children: React.ReactNode; secondary?: boolean }) {
  return (
    <Link href={href} className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition ${secondary ? "border border-[var(--line)] bg-white text-[var(--ink)] hover:bg-[#faf7f3]" : "bg-[#2b2825] text-white hover:bg-[#49423b]"}`}>
      {children}
    </Link>
  );
}

export function RouteCard({ route }: { route: WireframeRoute }) {
  return (
    <Link href={route.href} className="group rounded-2xl border border-[var(--line)] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#e5b39d] hover:shadow-[0_12px_26px_rgba(43,41,38,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent)]">{route.label.slice(0, 1)}</span>
        <span className="rounded-full border border-[var(--line)] px-2 py-1 text-[10px] font-semibold text-[var(--muted)]">Placeholder</span>
      </div>
      <h3 className="mt-5 font-semibold group-hover:text-[var(--accent)]">{route.label}</h3>
      <p className="mt-2 text-sm leading-5 text-[var(--muted)]">{route.description}</p>
      <p className="mt-5 text-xs font-semibold text-[var(--accent)]">Mở wireframe {"=>"}</p>
    </Link>
  );
}

export function DescriptionRows({ rows }: { rows: Array<{ label: string; value: string }> }) {
  return (
    <dl className="divide-y divide-[#eee9e4]">
      {rows.map((row) => (
        <div key={row.label} className="grid gap-1 py-3 sm:grid-cols-[150px_1fr] sm:gap-5">
          <dt className="text-xs font-semibold text-[#5c554e]">{row.label}</dt>
          <dd className="text-sm leading-5 text-[var(--muted)]">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-[#d9d0c8] bg-[#fcfbfa] px-6 text-center">
      <span className="flex size-10 items-center justify-center rounded-full border border-[var(--line)] bg-white text-lg text-[#aba29a]">+</span>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-xs leading-5 text-[var(--muted)]">{description}</p>
    </div>
  );
}
