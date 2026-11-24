"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, ChartNoAxesColumnIncreasing, CircleCheck, Loader2, Search, TriangleAlert, type LucideIcon } from "lucide-react";
import type { GapPriority, SkillGapItem } from "@placecampus/shared-types";
import { cn } from "@/lib/utils";
import { PRIORITY_META, STATUS_META, levelLabel, type SkillPrepProgress } from "../lib/gap-meta";
import { PriorityChip } from "./gap-sections";

/** Learning progress on a gap, from the student's preparation plans. */
export type LearningStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export const LEARNING_META: Record<LearningStatus, { label: string; className: string }> = {
  NOT_STARTED: { label: "Not started", className: "bg-slate-100 text-slate-600 ring-slate-200" },
  IN_PROGRESS: { label: "In progress", className: "bg-sky-50 text-sky-700 ring-sky-200" },
  COMPLETED: { label: "Plan completed", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
};

export function learningStatus(progress: SkillPrepProgress | undefined): LearningStatus {
  if (!progress || progress.total === 0) return "NOT_STARTED";
  if (progress.completed >= progress.total) return "COMPLETED";
  if (progress.completed > 0 || progress.inProgress > 0) return "IN_PROGRESS";
  return "NOT_STARTED";
}

/** Skill levels run from 1 to 5. */
const MAX_LEVEL = 5;

/* ───────────── Summary ───────────── */

function SummaryCard({ icon: Icon, label, value, hint, tone }: { icon: LucideIcon; label: string; value: number; hint: string; tone: "orange" | "red" | "green" }) {
  const tones = {
    orange: { icon: "bg-[#FFF1E6] text-[#F36B12]", border: "border-b-[#F36B12]" },
    red: { icon: "bg-[#FFF0F1] text-[#E54355]", border: "border-b-[#E54355]" },
    green: { icon: "bg-[#E9FAF2] text-[#12A66A]", border: "border-b-[#12A66A]" },
  } as const;
  return (
    <div className={cn("flex min-h-[88px] items-center gap-3.5 rounded-[22px] border border-white/80 border-b-[3px] bg-white px-4 py-3 shadow-[0_7px_18px_rgba(31,48,73,0.08)] transition-shadow hover:shadow-[0_10px_24px_rgba(31,48,73,0.11)] sm:px-4", tones[tone].border)}>
      <span className={cn("flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full", tones[tone].icon)}>
        <Icon className="h-[22px] w-[22px]" strokeWidth={2.2} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold leading-5 text-[#647086]">{label}</p>
        <p className="text-[27px] font-extrabold leading-[1.02] tracking-[-0.035em] text-[#142544]">{value}</p>
        <p className="mt-0.5 text-[11px] leading-4 text-[#718096]">{hint}</p>
      </div>
    </div>
  );
}

export function GapSummaryCards({ total, high, completed, drives }: { total: number; high: number; completed: number; drives: number }) {
  return (
    <section aria-label="Skill gap summary" className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      <SummaryCard icon={ChartNoAxesColumnIncreasing} tone="orange" label="Total Skill Gaps" value={total} hint={`Across ${drives} open drive${drives === 1 ? "" : "s"}`} />
      <SummaryCard icon={TriangleAlert} tone="red" label="High Priority" value={high} hint={high ? "Focus on these first" : "No urgent gaps"} />
      <SummaryCard icon={CircleCheck} tone="green" label="Skills Completed" value={completed} hint="At the required level for every drive" />
    </section>
  );
}

/* ───────────── Filters ───────────── */

const controlClassName =
  "h-10 w-full rounded-xl border border-[hsl(var(--border))] bg-white px-3 text-sm text-[#14213D] transition-colors hover:border-[hsl(var(--primary)/0.4)] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.15)]";

export interface GapFilters {
  search: string;
  priority: GapPriority | "ALL";
  status: LearningStatus | "ALL";
  category: string;
}

export function GapFiltersBar({
  filters,
  onChange,
  categories,
  shown,
  total,
}: {
  filters: GapFilters;
  onChange: (next: GapFilters) => void;
  categories: string[];
  shown: number;
  total: number;
}) {
  const active = !!filters.search.trim() || filters.priority !== "ALL" || filters.status !== "ALL" || filters.category !== "ALL";
  return (
    <div className="rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white p-3 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search skills</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Search skills"
            className={cn(controlClassName, "pl-9")}
          />
        </label>
        <div className="grid grid-cols-2 gap-2.5 md:flex md:w-auto">
          <label className="md:w-[160px]">
            <span className="sr-only">Priority</span>
            <select value={filters.priority} onChange={(e) => onChange({ ...filters, priority: e.target.value as GapFilters["priority"] })} className={controlClassName}>
              <option value="ALL">All Priorities</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </label>
          <label className="md:w-[160px]">
            <span className="sr-only">Status</span>
            <select value={filters.status} onChange={(e) => onChange({ ...filters, status: e.target.value as GapFilters["status"] })} className={controlClassName}>
              <option value="ALL">All Statuses</option>
              <option value="NOT_STARTED">Not Started</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </label>
          {categories.length > 1 && (
            <label className="col-span-2 md:col-span-1 md:w-[170px]">
              <span className="sr-only">Category</span>
              <select value={filters.category} onChange={(e) => onChange({ ...filters, category: e.target.value })} className={controlClassName}>
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-3 px-1 text-xs text-[hsl(var(--muted-foreground))]">
        <p aria-live="polite">
          Showing <span className="font-semibold text-[#14213D]">{shown}</span> of {total} skill{total === 1 ? "" : "s"}
        </p>
        {active && (
          <button
            type="button"
            onClick={() => onChange({ search: "", priority: "ALL", status: "ALL", category: "ALL" })}
            className="font-semibold text-[hsl(var(--primary))] hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

/* ───────────── Gap card ───────────── */

/** One segment per level: filled = verified level, outlined = still needed, faded = beyond the requirement. */
function LevelTrack({ current, required }: { current: number; required: number }) {
  return (
    <div className="flex items-center gap-1" role="img" aria-label={`Current level ${current} of required level ${required}`}>
      {Array.from({ length: MAX_LEVEL }, (_, i) => {
        const level = i + 1;
        return (
          <span
            key={level}
            className={cn(
              "h-2 flex-1 rounded-full",
              level <= current
                ? "bg-[hsl(var(--primary))]"
                : level <= required
                  ? "border border-dashed border-[hsl(var(--primary)/0.55)] bg-[#FFF2E8]"
                  : "bg-slate-100",
            )}
          />
        );
      })}
    </div>
  );
}

export function GapCard({
  gap,
  progress,
  onCreatePlan,
  creating,
  disabled,
}: {
  gap: SkillGapItem;
  progress: SkillPrepProgress | undefined;
  onCreatePlan: (driveId: string) => void;
  creating: boolean;
  disabled: boolean;
}) {
  const status = learningStatus(progress);
  const current = gap.currentLevel ?? 0;
  const required = Math.min(Math.max(gap.requiredLevel, 1), MAX_LEVEL);
  const remaining = Math.max(gap.gapLevel, 0);
  const planDrive = gap.drives.find((d) => !d.isOptional) ?? gap.drives[0];
  const requiredBy = gap.drives.filter((d) => !d.isOptional);
  const prepHref = progress?.planId ? `/student/preparation/${progress.planId}` : "/student/preparation";

  return (
    <article className="rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white p-4 shadow-[var(--shadow-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)] sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
        {/* Name, category, badges */}
        <div className="min-w-0 lg:w-[230px] lg:shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-[#14213D]">{gap.skillName}</h3>
            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1", LEARNING_META[status].className)}>
              {LEARNING_META[status].label}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{gap.category ?? "Uncategorised"}</p>
          <div className="mt-2">
            <PriorityChip priority={gap.priority} />
          </div>
        </div>

        {/* Proficiency */}
        <div className="min-w-0 flex-1">
          <dl className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <dt className="text-[hsl(var(--muted-foreground))]">Current level</dt>
              <dd className="mt-0.5 text-sm font-semibold text-[#14213D]">{levelLabel(gap.currentLevel)}</dd>
            </div>
            <div>
              <dt className="text-[hsl(var(--muted-foreground))]">Required level</dt>
              <dd className="mt-0.5 text-sm font-semibold text-[#14213D]">{levelLabel(gap.requiredLevel)}</dd>
            </div>
            <div>
              <dt className="text-[hsl(var(--muted-foreground))]">Remaining</dt>
              <dd className={cn("mt-0.5 text-sm font-semibold", remaining > 0 ? PRIORITY_META[gap.priority].text : "text-emerald-600")}>
                {remaining > 0 ? `${remaining} level${remaining === 1 ? "" : "s"} to close` : "Met"}
              </dd>
            </div>
          </dl>
          <div className="mt-3 max-w-[420px]">
            <LevelTrack current={current} required={required} />
          </div>
          <p className="mt-2 text-[11px] text-[hsl(var(--muted-foreground))]">
            {STATUS_META[gap.status].label}
            {requiredBy.length > 0 && ` · Required by ${requiredBy.slice(0, 2).map((d) => d.companyName).join(", ")}${requiredBy.length > 2 ? ` +${requiredBy.length - 2} more` : ""}`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 sm:flex-row lg:w-[200px] lg:shrink-0 lg:flex-col">
          {progress?.planId ? (
            <Link
              href={`/student/preparation/${progress.planId}`}
              className="inline-flex h-10 shrink-0 items-center sm:flex-1 lg:w-full lg:flex-none justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 text-sm font-semibold text-white transition-colors hover:bg-[hsl(var(--color-primary-600))]"
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Open Learning Plan
            </Link>
          ) : planDrive ? (
            <button
              type="button"
              onClick={() => onCreatePlan(planDrive.driveId)}
              disabled={disabled}
              className="inline-flex h-10 shrink-0 items-center sm:flex-1 lg:w-full lg:flex-none justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 text-sm font-semibold text-white transition-colors hover:bg-[hsl(var(--color-primary-600))] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <BookOpen className="h-4 w-4" aria-hidden="true" />}
              {creating ? "Creating…" : "Create Learning Plan"}
            </button>
          ) : null}
          <Link
            href={prepHref}
            className="inline-flex h-10 shrink-0 items-center sm:flex-1 lg:w-full lg:flex-none justify-center gap-1.5 rounded-xl border border-[hsl(var(--border))] bg-white px-4 text-sm font-semibold text-[#14213D] transition-colors hover:border-[hsl(var(--primary)/0.4)] hover:text-[hsl(var(--primary))]"
          >
            View Preparation
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function GapCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white p-5 shadow-[var(--shadow-card)]" aria-hidden="true">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
        <div className="space-y-2 lg:w-[230px]">
          <div className="h-4 w-28 animate-pulse rounded bg-[hsl(var(--muted))]" />
          <div className="h-3 w-20 animate-pulse rounded bg-[hsl(var(--muted))]" />
          <div className="h-5 w-24 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
        </div>
        <div className="flex-1 space-y-3">
          <div className="h-8 w-full max-w-[420px] animate-pulse rounded bg-[hsl(var(--muted))]" />
          <div className="h-2 w-full max-w-[420px] animate-pulse rounded-full bg-[hsl(var(--muted))]" />
        </div>
        <div className="h-10 animate-pulse rounded-xl bg-[hsl(var(--muted))] lg:w-[200px]" />
      </div>
    </div>
  );
}
