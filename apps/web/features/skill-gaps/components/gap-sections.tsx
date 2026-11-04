"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Circle,
  ClipboardList,
  FileUp,
  Loader2,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import type {
  Assessment,
  GapPriority,
  SkillGapAnalysis,
  SkillGapItem,
} from "@placecampus/shared-types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  PRIORITY_META,
  PRIORITY_ORDER,
  STATUS_META,
  levelLabel,
  type SkillPrepProgress,
} from "../lib/gap-meta";

export const cardClassName =
  "rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white shadow-[var(--shadow-card)]";

const primaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 text-sm font-semibold text-white transition-colors hover:bg-[hsl(var(--color-primary-600))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)] disabled:opacity-60";
const secondaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-white px-4 text-sm font-semibold text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--primary)/0.4)] hover:bg-[hsl(var(--primary)/0.05)] hover:text-[hsl(var(--primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)]";

/** True one frame after mount, so bars can animate from zero. */
function useEntered() {
  const [entered, setEntered] = React.useState(false);
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return entered;
}

export function PriorityChip({ priority }: { priority: GapPriority }) {
  const meta = PRIORITY_META[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
        meta.chip,
      )}
    >
      <meta.icon className="h-3.5 w-3.5" aria-hidden="true" />
      {meta.label} priority
    </span>
  );
}

/* ------------------------------------------------------------------------ */
/* Not-ready state                                                          */
/* ------------------------------------------------------------------------ */

export function AnalysisNotReady({
  profileStatus,
  evidenceStatus,
  assessmentStatus,
}: {
  profileStatus: { detail: string; label: string; complete: boolean };
  evidenceStatus: { detail: string; label: string; submitted: boolean };
  assessmentStatus: { detail: string; label: string; completed: boolean };
}) {
  const steps = [
    {
      title: "Complete Your Profile",
      detail: profileStatus.detail,
      state: profileStatus.label,
      done: profileStatus.complete,
      href: "/student/profile",
      cta: "Complete Profile",
      icon: UserRound,
    },
    {
      title: "Submit Evidence",
      detail: evidenceStatus.detail,
      state: evidenceStatus.label,
      done: evidenceStatus.submitted,
      href: "/student/evidence/new",
      cta: "Upload Evidence",
      icon: FileUp,
    },
    {
      title: "Complete an Assessment",
      detail: assessmentStatus.detail,
      state: assessmentStatus.label,
      done: assessmentStatus.completed,
      href: "/student/assessments",
      cta: "Take Assessment",
      icon: ClipboardList,
    },
  ];

  return (
    <section
      className={cn(
        cardClassName,
        "pc-enter overflow-hidden bg-gradient-to-b from-white to-[hsl(var(--muted)/0.3)] px-5 py-7 sm:px-8 sm:py-9",
      )}
      aria-labelledby="gaps-not-ready"
    >
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[hsl(var(--primary))] ring-1 ring-orange-100">
          <Target className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 id="gaps-not-ready" className="mt-4 text-xl font-bold tracking-tight text-[hsl(var(--foreground))] sm:text-2xl">
          Your Skill Gap Analysis Is Not Ready Yet
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          Your skill gap analysis will be available once your skills are verified and sufficient placement data is available.
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-4xl">
        <h3 className="mb-3 text-center text-base font-semibold tracking-tight text-[hsl(var(--foreground))]">
          Complete These Steps
        </h3>
      <ol className="grid gap-2.5">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="group flex min-h-[76px] flex-col gap-3 rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white/90 p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all duration-200 hover:border-[hsl(var(--primary)/0.22)] hover:shadow-[0_6px_18px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:gap-4 sm:px-4"
          >
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                index === 0
                  ? "bg-orange-50 text-orange-600"
                  : index === 1
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-violet-50 text-violet-600",
              )}
            >
              <step.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                <span className="mr-1.5 text-xs font-medium text-[hsl(var(--muted-foreground))]">0{index + 1}</span>
                {step.title}
              </p>
              <p className="mt-0.5 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{step.detail}</p>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span
                className={cn(
                  "inline-flex min-w-[100px] items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                  step.done ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
                )}
              >
                {step.done ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Circle className="h-3.5 w-3.5" aria-hidden="true" />}
                {step.state}
              </span>
              <Link
                href={step.href}
                className={cn(primaryButton, "h-9 min-w-[164px] px-3.5 text-xs sm:h-10 sm:text-sm")}
              >
                {step.cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
          </li>
        ))}
      </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/* Summary                                                                  */
/* ------------------------------------------------------------------------ */

export function GapSummary({
  analysis,
  prepCompleted,
  prepTotal,
}: {
  analysis: SkillGapAnalysis;
  prepCompleted: number;
  prepTotal: number;
}) {
  const entered = useEntered();
  const counts = PRIORITY_ORDER.map((priority) => ({
    priority,
    count: analysis.gaps.filter((g) => g.priority === priority).length,
  }));
  const total = analysis.gaps.length;
  const metPct = analysis.requirementsTotal
    ? Math.round((analysis.requirementsMet / analysis.requirementsTotal) * 100)
    : 0;
  const prepPct = prepTotal ? Math.round((prepCompleted / prepTotal) * 100) : 0;

  const tiles = [
    { label: "Skill gaps", value: total, hint: `across ${analysis.drivesAnalyzed} drive${analysis.drivesAnalyzed === 1 ? "" : "s"}` },
    { label: "Verified skills", value: analysis.verifiedSkillCount, hint: "in your skill profile" },
    {
      label: "Requirements met",
      value: `${analysis.requirementsMet}/${analysis.requirementsTotal}`,
      hint: "required drive skills",
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <section className={cn(cardClassName, "p-6 lg:col-span-7")} aria-labelledby="gap-overview">
        <h2 id="gap-overview" className="text-base font-bold text-[hsl(var(--foreground))]">
          Gap overview
        </h2>
        <dl className="mt-4 grid grid-cols-3 gap-3">
          {tiles.map((tile) => (
            <div key={tile.label} className="rounded-xl bg-[hsl(var(--muted)/0.6)] p-3.5">
              <dt className="text-xs font-medium text-[hsl(var(--muted-foreground))]">{tile.label}</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums text-[hsl(var(--foreground))]">{tile.value}</dd>
              <dd className="text-[11px] text-[hsl(var(--muted-foreground))]">{tile.hint}</dd>
            </div>
          ))}
        </dl>

        {total > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
              By priority
            </p>
            {/* Segmented bar: 2px surface gaps between segments; legend below names each. */}
            <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label={counts.map((c) => `${PRIORITY_META[c.priority].label}: ${c.count}`).join(", ")}>
              {counts
                .filter((c) => c.count > 0)
                .map((c) => (
                  <Tooltip key={c.priority}>
                    <TooltipTrigger asChild>
                      <span
                        className={cn("h-full transition-[width] duration-700 ease-out first:rounded-l-full last:rounded-r-full", PRIORITY_META[c.priority].bar)}
                        style={{ width: entered ? `${(c.count / total) * 100}%` : "0%" }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      {PRIORITY_META[c.priority].label} priority: {c.count} skill{c.count === 1 ? "" : "s"}
                    </TooltipContent>
                  </Tooltip>
                ))}
            </div>
            <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1">
              {counts.map((c) => (
                <li key={c.priority} className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                  <span className={cn("h-2 w-2 rounded-full", PRIORITY_META[c.priority].dot)} aria-hidden="true" />
                  {PRIORITY_META[c.priority].label}
                  <span className="font-semibold tabular-nums text-[hsl(var(--foreground))]">{c.count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className={cn(cardClassName, "flex flex-col p-6 lg:col-span-5")} aria-labelledby="gap-progress">
        <h2 id="gap-progress" className="text-base font-bold text-[hsl(var(--foreground))]">
          Improvement progress
        </h2>
        <ProgressRow
          label="Drive requirements met"
          value={metPct}
          detail={`${analysis.requirementsMet} of ${analysis.requirementsTotal} required skills verified at the required level`}
          entered={entered}
        />
        <ProgressRow
          label="Preparation tasks completed"
          value={prepPct}
          detail={
            prepTotal
              ? `${prepCompleted} of ${prepTotal} tasks for these gaps in your active plans`
              : "No preparation plan covers these gaps yet"
          }
          entered={entered}
        />
        <Link href="/student/preparation" className={cn(primaryButton, "mt-auto self-start")}>
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          Go to Preparation
        </Link>
      </section>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  detail,
  entered,
}: {
  label: string;
  value: number;
  detail: string;
  entered: boolean;
}) {
  return (
    <div className="my-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-[hsl(var(--foreground))]">{label}</span>
        <span className="text-sm font-bold tabular-nums text-[hsl(var(--foreground))]">{value}%</span>
      </div>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--primary)/0.15)]"
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-[hsl(var(--primary))] transition-[width] duration-700 ease-out"
          style={{ width: entered ? `${value}%` : "0%" }}
        />
      </div>
      <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">{detail}</p>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Skill gap card                                                           */
/* ------------------------------------------------------------------------ */

export function SkillGapCard({
  gap,
  progress,
  assessments,
  onCreatePlan,
  creatingFor,
}: {
  gap: SkillGapItem;
  progress?: SkillPrepProgress;
  assessments: Assessment[];
  onCreatePlan: (driveId: string) => void;
  creatingFor: string | null;
}) {
  const entered = useEntered();
  const current = gap.currentLevel ?? 0;
  const currentPct = Math.min(100, (current / Math.max(gap.requiredLevel, 1)) * 100);
  const prepPct = progress?.total ? Math.round((progress.completed / progress.total) * 100) : 0;
  const requiredDrives = gap.drives.filter((d) => !d.isOptional);
  const planDrive = requiredDrives[0] ?? gap.drives[0];

  return (
    <article className={cn(cardClassName, "flex h-full flex-col p-5 transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)]")}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-[hsl(var(--foreground))]">{gap.skillName}</h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {gap.category ?? "Uncategorised"} · {STATUS_META[gap.status].label}
          </p>
        </div>
        <PriorityChip priority={gap.priority} />
      </header>

      {/* Current vs. required level */}
      <div className="mt-4">
        <div className="flex justify-between text-xs">
          <span className="text-[hsl(var(--muted-foreground))]">
            Current: <span className="font-semibold text-[hsl(var(--foreground))]">{levelLabel(gap.currentLevel)}</span>
          </span>
          <span className="text-[hsl(var(--muted-foreground))]">
            Required: <span className="font-semibold text-[hsl(var(--foreground))]">Level {gap.requiredLevel}</span>
          </span>
        </div>
        <div
          className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--muted))]"
          role="img"
          aria-label={`${levelLabel(gap.currentLevel)} of required Level ${gap.requiredLevel}`}
        >
          <div
            className="h-full rounded-full bg-[hsl(var(--primary))] transition-[width] duration-700 ease-out"
            style={{ width: entered ? `${currentPct}%` : "0%" }}
          />
        </div>
        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
          {gap.gapLevel > 0 ? `${gap.gapLevel} level${gap.gapLevel === 1 ? "" : "s"} to close` : STATUS_META[gap.status].description}
        </p>
      </div>

      {/* Drives asking for it */}
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
          Needed for
        </p>
        <ul className="mt-1.5 space-y-1">
          {gap.drives.slice(0, 3).map((drive) => (
            <li key={drive.driveId} className="flex items-center gap-2 text-sm">
              <Briefcase className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
              <Link
                href={`/student/drives/${drive.driveId}`}
                className="truncate text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] hover:underline"
              >
                {drive.companyName} · {drive.roleTitle}
              </Link>
              <span className="ml-auto shrink-0 text-xs text-[hsl(var(--muted-foreground))]">
                L{drive.requiredLevel}{drive.isOptional ? " · optional" : ""}
              </span>
            </li>
          ))}
          {gap.drives.length > 3 && (
            <li className="text-xs text-[hsl(var(--muted-foreground))]">+{gap.drives.length - 3} more drives</li>
          )}
        </ul>
      </div>

      {/* Preparation progress and recommendations */}
      <div className="mt-4 rounded-xl bg-[hsl(var(--muted)/0.6)] p-3.5">
        {progress ? (
          <>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[hsl(var(--foreground))]">Preparation progress</span>
              <span className="tabular-nums text-[hsl(var(--muted-foreground))]">
                {progress.completed}/{progress.total} done
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[hsl(var(--primary)/0.15)]">
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width] duration-700 ease-out"
                style={{ width: entered ? `${prepPct}%` : "0%" }}
              />
            </div>
            {progress.actions.length > 0 && (
              <ul className="mt-2.5 space-y-1">
                {progress.actions.slice(0, 2).map((action) => (
                  <li key={action} className="flex gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                    <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-[hsl(var(--primary))]" aria-hidden="true" />
                    {action}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            No preparation plan covers this skill yet. Create one from a drive that needs it to get
            a step-by-step plan.
          </p>
        )}
        {assessments.length > 0 && (
          <p className="mt-2.5 flex items-center gap-1.5 text-xs text-[hsl(var(--foreground))]">
            <ClipboardList className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--primary))]" aria-hidden="true" />
            Assessment available:{" "}
            <Link href="/student/assessments" className="font-semibold text-[hsl(var(--primary))] hover:underline">
              {assessments[0].title}
            </Link>
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 pt-1">
        {progress?.planId ? (
          <Link href={`/student/preparation/${progress.planId}`} className={cn(primaryButton, "h-9 px-3.5")}>
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Continue plan
          </Link>
        ) : planDrive ? (
          <button
            type="button"
            onClick={() => onCreatePlan(planDrive.driveId)}
            disabled={creatingFor !== null}
            className={cn(primaryButton, "h-9 px-3.5")}
          >
            {creatingFor === planDrive.driveId ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <BookOpen className="h-4 w-4" aria-hidden="true" />
            )}
            Create plan for {planDrive.companyName}
          </button>
        ) : null}
        <Link href="/student/evidence/new" className={cn(secondaryButton, "h-9 px-3.5")}>
          <FileUp className="h-4 w-4" aria-hidden="true" />
          Submit evidence
        </Link>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------------ */
/* Drive coverage chart                                                     */
/* ------------------------------------------------------------------------ */

export function DriveCoverage({ analysis }: { analysis: SkillGapAnalysis }) {
  const entered = useEntered();
  const rows = [...analysis.driveCoverage].sort(
    (a, b) => b.requiredSkillCoverage - a.requiredSkillCoverage,
  );
  if (!rows.length) return null;

  return (
    <section className={cn(cardClassName, "p-6")} aria-labelledby="drive-coverage">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="drive-coverage" className="text-base font-bold text-[hsl(var(--foreground))]">
          Required-skill coverage by drive
        </h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          Share of each drive&apos;s required skills you meet today
        </p>
      </div>
      <ul className="mt-4 space-y-3">
        {rows.map((row) => (
          <li key={row.driveId}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={`/student/drives/${row.driveId}`}
                  className="group block rounded-lg py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)]"
                >
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))]">
                      {row.companyName} <span className="text-[hsl(var(--muted-foreground))]">· {row.roleTitle}</span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-[hsl(var(--foreground))]">
                      {Math.round(row.requiredSkillCoverage)}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                    <div
                      className="h-full rounded-full bg-[hsl(var(--primary))] transition-[width] duration-700 ease-out"
                      style={{ width: entered ? `${row.requiredSkillCoverage}%` : "0%" }}
                    />
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                {row.satisfiedCount} of {row.requiredCount} required skills met
              </TooltipContent>
            </Tooltip>
          </li>
        ))}
      </ul>
    </section>
  );
}
