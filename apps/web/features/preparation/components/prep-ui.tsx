"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CircleCheck,
  Hourglass,
  Layers,
  Target,
  type LucideIcon,
} from "lucide-react";
import type { PlacementDrive, PreparationPlan } from "@placecampus/shared-types";
import { HeroWaves, lightHeroClassName } from "@/components/brand/hero-waves";
import { cn } from "@/lib/utils";
import {
  PLAN_STATUS_META,
  planCounts,
  planTitle,
  shortDriveId,
} from "../lib/prep-meta";

function StudyIllustration() {
  return (
    <svg viewBox="0 0 250 160" className="h-full w-full drop-shadow-[0_18px_24px_rgba(234,88,12,0.14)]" aria-hidden="true">
      <g stroke="hsl(24 95% 53%)" strokeWidth="4" strokeLinecap="round">
        <path d="M30 40 l-8 -10" /><path d="M24 58 h-12" /><path d="M226 92 l12 -3" /><path d="M222 108 l12 6" />
      </g>
      <rect x="104" y="18" width="104" height="128" rx="12" fill="hsl(222 40% 28%)" />
      <rect x="112" y="28" width="88" height="110" rx="7" fill="#fff" />
      <rect x="136" y="10" width="40" height="16" rx="6" fill="#8EA0C8" />
      {[50, 76, 102].map((y) => (
        <g key={y}>
          <circle cx="126" cy={y} r="8" fill="#22C55E" />
          <path d={`M122 ${y} l3 3 5 -5`} stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <rect x="140" y={y - 4} width="48" height="7" rx="3.5" fill="#C9D4EE" />
        </g>
      ))}
      <g transform="translate(36 104)">
        <rect x="0" y="28" width="96" height="16" rx="4" fill="hsl(20 90% 44%)" />
        <rect x="6" y="14" width="88" height="16" rx="4" fill="hsl(24 95% 53%)" />
        <rect x="0" y="0" width="92" height="16" rx="4" fill="hsl(28 100% 62%)" />
        <rect x="8" y="5" width="60" height="5" rx="2.5" fill="#fff" opacity="0.7" />
      </g>
      <g transform="translate(212 28) rotate(12)">
        <path d="M-30 0 L0 -14 L30 0 L0 14 Z" fill="hsl(222 47% 15%)" />
        <path d="M-18 6 v11 c8 7 28 7 36 0 v-11 l-18 8 z" fill="hsl(222 40% 28%)" />
        <path d="M20 4 v20" stroke="hsl(24 95% 53%)" strokeWidth="3" />
        <circle cx="20" cy="26" r="3.5" fill="hsl(24 95% 53%)" />
      </g>
    </svg>
  );
}

export function PreparationHero() {
  return (
    <section className={lightHeroClassName}>
      <HeroWaves />
      <div className="relative flex items-center justify-between gap-6">
        <div className="max-w-[42rem] space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            <span className="text-[hsl(var(--foreground))]">Personalized </span>
            <span className="text-[hsl(var(--primary))]">Preparation</span>
          </h1>
          <p className="text-[15px] leading-relaxed text-[hsl(var(--foreground)/0.8)] sm:text-base">
            Turn skill gaps into progress with personalized actions designed to improve your placement readiness.
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <CircleCheck className="h-4 w-4" aria-hidden="true" />
              Your Preparation Journey
            </span>
            <span aria-hidden="true" className="hidden h-4 w-px bg-[hsl(var(--border))] sm:block" />
            <span className="text-[hsl(var(--foreground)/0.75)]">Focused plans · Actionable tasks · Measurable progress</span>
          </div>
        </div>
        <div className="pointer-events-none hidden h-[140px] w-[220px] shrink-0 lg:block xl:mr-16">
          <StudyIllustration />
        </div>
      </div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tile,
  delay,
  progress,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tile: string;
  delay: number;
  /** Renders a mini ring instead of the icon (0–100). */
  progress?: number;
}) {
  const [shown, setShown] = React.useState(0);
  React.useEffect(() => {
    if (progress == null) return;
    const frame = requestAnimationFrame(() => setShown(progress));
    return () => cancelAnimationFrame(frame);
  }, [progress]);
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <div
      style={{ "--pc-delay": `${delay}ms` } as React.CSSProperties}
      className="pc-enter flex items-center gap-4 rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
    >
      {progress == null ? (
        <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", tile)}>
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      ) : (
        <svg width="48" height="48" viewBox="0 0 48 48" className="shrink-0 -rotate-90" aria-hidden="true">
          <circle cx="24" cy="24" r={r} fill="none" strokeWidth="6" className="stroke-[hsl(var(--primary)/0.12)]" />
          <circle cx="24" cy="24" r={r} fill="none" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - shown / 100)} className="stroke-[hsl(var(--primary))] transition-[stroke-dashoffset] duration-1000 ease-out" />
        </svg>
      )}
      <div>
        <p className="text-sm font-medium text-[hsl(var(--foreground)/0.75)]">{label}</p>
        <p className="text-2xl font-bold tabular-nums text-[hsl(var(--foreground))]">{value}</p>
      </div>
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = React.useState(0);
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-[hsl(var(--primary)/0.12)]", className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--color-primary-light))] transition-[width] duration-700 ease-out motion-reduce:transition-none"
        style={{ width: `${Math.min(shown, 100)}%` }}
      />
    </div>
  );
}

export function PlanStatusBadge({ status }: { status: PreparationPlan["status"] }) {
  const meta = PLAN_STATUS_META[status];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1", meta.badge)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export function PlanCard({
  plan,
  drive,
  style,
}: {
  plan: PreparationPlan;
  drive?: PlacementDrive;
  style?: React.CSSProperties;
}) {
  const counts = planCounts(plan);
  const skills = plan.items.map((i) => i.skillName);
  const nextItem = plan.items.find((i) => i.status === "TODO" || i.status === "IN_PROGRESS");
  const archived = plan.status === "ARCHIVED";
  return (
    <article
      style={style}
      className="pc-enter group flex h-full min-w-0 flex-col rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/0.35)] hover:shadow-[var(--shadow-card-hover)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Drive {shortDriveId(plan.driveId)}</p>
          <h3 className="mt-1 line-clamp-2 text-lg font-bold leading-snug text-[hsl(var(--foreground))]">{planTitle(drive)}</h3>
        </div>
        <PlanStatusBadge status={plan.status} />
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 font-medium text-[hsl(var(--foreground)/0.85)]">
            <Target className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden="true" />
            {counts.completed} / {counts.total} {counts.total === 1 ? "action" : "actions"}
          </span>
          <span className="font-bold tabular-nums text-[hsl(var(--foreground))]">{plan.completionPercentage}%</span>
        </div>
        <ProgressBar value={plan.completionPercentage} />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-[hsl(var(--foreground)/0.75)]">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          Created {format(new Date(plan.createdAt), "d MMM yyyy")}
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
          {drive?.applicationDeadline ? `Drive deadline ${format(new Date(drive.applicationDeadline), "d MMM yyyy")}` : "No drive deadline"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {skills.length > 0 && (
          <span title={skills.join(", ")} className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
            <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{skills.slice(0, 2).join(", ")}{skills.length > 2 ? ` +${skills.length - 2}` : ""}</span>
          </span>
        )}
        {counts.pending > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
            <Hourglass className="h-3.5 w-3.5" aria-hidden="true" />
            {counts.pending} pending
          </span>
        )}
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
        <Link href={`/student/preparation/${plan.id}`} className="inline-flex h-10 items-center justify-center rounded-xl border border-[hsl(var(--border))] text-sm font-semibold transition-colors hover:border-[hsl(var(--primary)/0.4)] hover:text-[hsl(var(--primary))]">
          View Plan
        </Link>
        {!archived && nextItem ? (
          <Link
            href={`/student/preparation/${plan.id}#task-${nextItem.itemId}`}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] text-sm font-semibold text-white shadow-[0_6px_16px_-8px_hsl(var(--primary)/0.8)] transition-all hover:bg-[hsl(var(--color-primary-600))] active:scale-[0.98]"
          >
            Continue
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        ) : (
          <span className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[hsl(var(--muted))] text-sm font-semibold text-[hsl(var(--muted-foreground))]">
            {archived ? "Archived" : <><CircleCheck className="h-4 w-4" aria-hidden="true" /> All done</>}
          </span>
        )}
      </div>
    </article>
  );
}
