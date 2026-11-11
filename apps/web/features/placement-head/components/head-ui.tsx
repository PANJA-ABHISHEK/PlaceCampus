"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Info, RefreshCw, type LucideIcon } from "lucide-react";
import { HeroWaves, lightHeroClassName } from "@/components/brand/hero-waves";
import { cn } from "@/lib/utils";

/** Shared building blocks for the Placement Head portal pages (same look as the dashboard). */
export const NAVY = "#10264A";
export const ORANGE = "#FF6500";
export const numberFormat = new Intl.NumberFormat("en-IN");

export const panelClassName =
  "rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_4px_18px_-12px_rgba(16,38,74,0.22)] sm:p-6";

export type Tone = "orange" | "blue" | "violet" | "green" | "rose";

export const TONES: Record<Tone, { card: string; icon: string; glow: string; bar: string; soft: string; text: string; hex: string }> = {
  orange: { card: "from-orange-50/90 border-orange-100", icon: "text-[#FF6500] ring-orange-100", glow: "bg-orange-200/40", bar: "bg-[#FF6500]", soft: "bg-orange-50/80", text: "text-[#E25A00]", hex: "#FF6500" },
  blue: { card: "from-blue-50/90 border-blue-100", icon: "text-blue-600 ring-blue-100", glow: "bg-blue-200/40", bar: "bg-blue-500", soft: "bg-blue-50/80", text: "text-blue-600", hex: "#3B82F6" },
  violet: { card: "from-violet-50/90 border-violet-100", icon: "text-violet-600 ring-violet-100", glow: "bg-violet-200/40", bar: "bg-violet-500", soft: "bg-violet-50/80", text: "text-violet-600", hex: "#8B5CF6" },
  green: { card: "from-emerald-50/90 border-emerald-100", icon: "text-emerald-600 ring-emerald-100", glow: "bg-emerald-200/40", bar: "bg-emerald-500", soft: "bg-emerald-50/80", text: "text-emerald-600", hex: "#10B981" },
  rose: { card: "from-rose-50/90 border-rose-100", icon: "text-rose-600 ring-rose-100", glow: "bg-rose-200/40", bar: "bg-rose-500", soft: "bg-rose-50/80", text: "text-rose-600", hex: "#F43F5E" },
};

export function formatPercent(value: number | null | undefined, digits = 0) {
  if (value == null || Number.isNaN(value)) return null;
  return `${value.toFixed(digits)}%`;
}

/** The analytics API groups records without a department / graduation year under "Unknown". */
export function isUnknownGroup(value: string | number | null | undefined) {
  return value == null || value === "" || value === "Unknown" || value === "null";
}

export function humanise(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function PageHero({ eyebrow, title, highlight, description, icon: Icon, children }: {
  eyebrow: string; title: string; highlight: string; description: string; icon: LucideIcon; children?: React.ReactNode;
}) {
  return (
    <section className={cn(lightHeroClassName, "rounded-3xl px-5 py-5 sm:px-7 sm:py-6 lg:px-8")}>
      <HeroWaves />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <Link href="/placement-head/dashboard" className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#E25A00]">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Dashboard
          </Link>
          <span className="flex w-fit items-center gap-1.5 rounded-full border border-orange-200/70 bg-orange-50/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#E25A00]">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {eyebrow}
          </span>
          <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl" style={{ color: NAVY }}>
            {title} <span style={{ color: ORANGE }}>{highlight}</span>
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
        {children && <div className="relative flex flex-wrap items-end gap-2.5">{children}</div>}
      </div>
    </section>
  );
}

export function StatCard({ title, value, detail, icon: Icon, tone, loading }: {
  title: string; value: string | null; detail: string; icon: LucideIcon; tone: Tone; loading?: boolean;
}) {
  const t = TONES[tone];
  return (
    <article className={cn("relative h-full overflow-hidden rounded-2xl border bg-gradient-to-br to-white p-5 shadow-[0_4px_18px_-12px_rgba(16,38,74,0.25)]", t.card)}>
      <span aria-hidden="true" className={cn("pointer-events-none absolute -bottom-10 -right-10 h-28 w-28 rounded-full blur-2xl", t.glow)} />
      <div className="relative flex items-start gap-4">
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1", t.icon)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold" style={{ color: NAVY }}>{title}</h2>
          {loading ? (
            <div className="mt-2 h-8 w-20 animate-pulse rounded bg-slate-100" />
          ) : (
            <p className={cn("mt-1 font-bold tracking-tight", value ? "text-[28px] leading-9 tabular-nums" : "text-lg text-slate-400")} style={value ? { color: NAVY } : undefined}>
              {value ?? "No data yet"}
            </p>
          )}
          <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
        </div>
      </div>
    </article>
  );
}

export function Panel({ title, description, icon: Icon, action, className, children }: {
  title: string; description?: string; icon: LucideIcon; action?: React.ReactNode; className?: string; children: React.ReactNode;
}) {
  return (
    <section className={cn(panelClassName, "min-w-0", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#FF6500]">
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-bold leading-8 sm:text-lg" style={{ color: NAVY }}>{title}</h2>
            {description && <p className="-mt-0.5 text-xs leading-5 text-slate-500">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Loading / error / empty wrapper so every panel behaves the same way. */
export function PanelState({ loading, error, empty, emptyIcon: EmptyIcon, emptyTitle, emptyText, onRetry, height = 220, children }: {
  loading: boolean; error: boolean; empty: boolean; emptyIcon: LucideIcon; emptyTitle: string; emptyText: string; onRetry?: () => void; height?: number; children: React.ReactNode;
}) {
  if (loading) {
    return <div className="animate-pulse rounded-xl bg-slate-50" style={{ height }} aria-busy="true" aria-label="Loading" />;
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: height }}>
        <p className="text-sm text-slate-500">This data could not be loaded.</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#E25A00] hover:underline">
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Retry
          </button>
        )}
      </div>
    );
  }
  if (empty) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 text-center" style={{ minHeight: height }}>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-100">
          <EmptyIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <h3 className="mt-3 text-sm font-semibold" style={{ color: NAVY }}>{emptyTitle}</h3>
        <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">{emptyText}</p>
      </div>
    );
  }
  return <>{children}</>;
}

/** Horizontal bar row used for rankings and breakdowns. */
export function BarRow({ label, value, max, display, tone = "orange", sub }: {
  label: string; value: number; max: number; display: string; tone?: Tone; sub?: string;
}) {
  const width = max > 0 ? Math.max(2, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-medium" style={{ color: NAVY }} title={label}>{label}</span>
        <span className="shrink-0 font-semibold tabular-nums" style={{ color: NAVY }}>{display}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full rounded-full transition-[width] duration-700", TONES[tone].bar)} style={{ width: `${width}%` }} />
      </div>
      {sub && <p className="mt-1 text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

export function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      {label}
      {children}
    </label>
  );
}

export const selectClassName =
  "h-10 min-w-[150px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium normal-case tracking-normal text-[#10264A] shadow-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-[#FF6500]/20";

export function Limitations({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-slate-200/80 bg-white/70 p-3 text-xs leading-5 text-slate-500">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      <ul className="space-y-0.5">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}
