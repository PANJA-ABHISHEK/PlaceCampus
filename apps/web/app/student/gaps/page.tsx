"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CircleAlert,
  PartyPopper,
  RotateCcw,
  SearchX,
  Target,
} from "lucide-react";
import type { GapPriority, SkillGapStatus } from "@placecampus/shared-types";
import { useSkillGaps } from "@/features/skill-gaps/hooks/use-skill-gaps";
import {
  AnalysisNotReady,
  PriorityChip,
  cardClassName,
} from "@/features/skill-gaps/components/gap-sections";
import {
  PRIORITY_META,
  PRIORITY_ORDER,
  STATUS_META,
  STATUS_ORDER,
  levelLabel,
  prepProgressBySkill,
} from "@/features/skill-gaps/lib/gap-meta";
import {
  useCreatePreparationPlan,
  usePreparationPlans,
} from "@/features/preparation/hooks/use-preparation";
import {
  useAssessments,
  useStudentAssessmentHistory,
} from "@/features/assessments/hooks/use-assessments";
import { useStudentProfile } from "@/features/student/hooks/use-student-profile";
import { useMyEvidence } from "@/features/evidence/hooks/use-evidence";
import { getProfileCompletion } from "@/features/student/lib/profile-completion";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Filter<T extends string> = T | "ALL";

function GapsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <span className="sr-only">Loading skill gaps…</span>
      <Skeleton className="h-[420px] rounded-2xl" />
    </div>
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: Filter<T>;
  onChange: (value: Filter<T>) => void;
  options: { value: Filter<T>; label: string }[];
}) {
  const id = `filter-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="flex min-w-[150px] flex-1 flex-col gap-1 sm:flex-none">
      <label htmlFor={id} className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as Filter<T>)}
        className="h-10 rounded-xl border border-[hsl(var(--border))] bg-white px-3 text-sm text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--primary)/0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function SkillGapsPage() {
  const gapsQuery = useSkillGaps();
  const plansQuery = usePreparationPlans();
  const assessmentsQuery = useAssessments();
  const historyQuery = useStudentAssessmentHistory();
  const profileQuery = useStudentProfile();
  const evidenceQuery = useMyEvidence();
  const createPlan = useCreatePreparationPlan();

  const [priority, setPriority] = React.useState<Filter<GapPriority>>("ALL");
  const [status, setStatus] = React.useState<Filter<SkillGapStatus>>("ALL");
  const [category, setCategory] = React.useState<string>("ALL");
  const [creatingFor, setCreatingFor] = React.useState<string | null>(null);

  const analysis = gapsQuery.data;
  const progress = React.useMemo(
    () => prepProgressBySkill(plansQuery.data),
    [plansQuery.data],
  );

  const categories = React.useMemo(
    () =>
      [...new Set((analysis?.gaps ?? []).map((g) => g.category ?? "Uncategorised"))].sort(),
    [analysis],
  );

  const filtered = React.useMemo(
    () =>
      (analysis?.gaps ?? []).filter(
        (g) =>
          (priority === "ALL" || g.priority === priority) &&
          (status === "ALL" || g.status === status) &&
          (category === "ALL" || (g.category ?? "Uncategorised") === category),
      ),
    [analysis, priority, status, category],
  );

  const handleCreatePlan = (driveId: string) => {
    setCreatingFor(driveId);
    createPlan.mutate(driveId, {
      onSuccess: () => toast.success("Preparation plan created. Your tasks are ready in Preparation."),
      onError: (error) =>
        toast.error(error instanceof ApiError ? error.message : "Could not create the preparation plan."),
      onSettled: () => setCreatingFor(null),
    });
  };

  const filtersActive = priority !== "ALL" || status !== "ALL" || category !== "ALL";
  const profileCompletion = profileQuery.data ? getProfileCompletion(profileQuery.data) : undefined;
  const profileStatus = {
    detail: profileQuery.isPending
      ? "Loading profile status…"
      : profileQuery.isError
        ? "Profile status unavailable"
        : `${profileCompletion?.percentage ?? 0}% complete · ${profileCompletion?.filled ?? 0} of ${profileCompletion?.total ?? 0} details`,
    label: profileQuery.isPending ? "Loading" : profileQuery.isError ? "Unavailable" : profileCompletion?.percentage === 100 ? "Complete" : "In progress",
    complete: profileCompletion?.percentage === 100,
  };

  const evidence = evidenceQuery.data ?? [];
  const evidenceVerified = evidence.filter((item) => item.status === "VERIFIED").length;
  const evidenceAwaiting = evidence.filter((item) =>
    ["UNVERIFIED", "PROCESSING", "NEEDS_REVIEW"].includes(item.status),
  ).length;
  const evidenceNeedsAttention = evidence.filter((item) =>
    ["REJECTED", "RESUBMISSION_REQUESTED"].includes(item.status),
  ).length;
  const evidenceStatus = {
    submitted: evidence.length > 0,
    label: evidenceQuery.isPending ? "Loading" : evidenceQuery.isError ? "Unavailable" : evidence.length > 0 ? "Submitted" : "Not started",
    detail: evidenceQuery.isPending
      ? "Loading evidence review status…"
      : evidenceQuery.isError
        ? "Evidence review status unavailable"
        : evidence.length === 0
          ? "No evidence submitted yet"
          : [
              evidenceVerified ? `${evidenceVerified} verified` : null,
              evidenceAwaiting ? `${evidenceAwaiting} awaiting review` : null,
              evidenceNeedsAttention ? `${evidenceNeedsAttention} need attention` : null,
            ].filter(Boolean).join(" · "),
  };

  const assessmentHistory = historyQuery.data ?? [];
  const completedAssessments = assessmentHistory.filter(
    (attempt) => attempt.status === "SUBMITTED" || attempt.status === "EVALUATED",
  ).length;
  const inProgressAssessments = assessmentHistory.filter((attempt) => attempt.status === "IN_PROGRESS").length;
  const availableAssessments = (assessmentsQuery.data ?? []).filter((assessment) => assessment.active !== false).length;
  const assessmentStatus = {
    completed: completedAssessments > 0,
    label: historyQuery.isPending || assessmentsQuery.isPending
      ? "Loading"
      : historyQuery.isError || assessmentsQuery.isError
        ? "Unavailable"
        : completedAssessments
          ? "Complete"
          : inProgressAssessments
            ? "In progress"
            : "Not started",
    detail: historyQuery.isPending || assessmentsQuery.isPending
      ? "Loading assessment status…"
      : historyQuery.isError || assessmentsQuery.isError
        ? "Assessment status unavailable"
        : completedAssessments || inProgressAssessments
          ? `${completedAssessments} completed · ${inProgressAssessments} in progress`
          : availableAssessments
            ? `${availableAssessments} assessment${availableAssessments === 1 ? "" : "s"} available`
            : "No assessments available right now",
  };

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-6">
      <header className="pc-enter flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-[hsl(var(--primary))] ring-1 ring-orange-100">
            <Target className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-[-0.03em] text-[hsl(var(--foreground))] md:text-[30px]">
              Skill Gaps
            </h1>
            <p className="mt-0.5 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              Your verified skills compared with what open placement drives require.
            </p>
          </div>
        </div>
      </header>

      {gapsQuery.isLoading ? (
        <GapsSkeleton />
      ) : gapsQuery.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50/60 px-6 py-12 text-center dark:border-red-500/30 dark:bg-red-500/10">
          <CircleAlert className="h-8 w-8 text-red-600" aria-hidden="true" />
          <div>
            <p className="font-semibold text-red-900 dark:text-red-200">We couldn&apos;t load your skill gaps</p>
            <p className="mt-1 text-sm text-red-800/80 dark:text-red-200/80">
              {gapsQuery.error instanceof Error ? gapsQuery.error.message : "Please try again."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => gapsQuery.refetch()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : !analysis || !analysis.sufficientData ? (
        <AnalysisNotReady
          profileStatus={profileStatus}
          evidenceStatus={evidenceStatus}
          assessmentStatus={assessmentStatus}
        />
      ) : analysis.drivesAnalyzed === 0 ? (
        <section className={cn(cardClassName, "pc-enter flex flex-col items-center gap-3 px-6 py-14 text-center")}>
          <SearchX className="h-8 w-8 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">No drive requirements to compare yet</h2>
          <p className="max-w-[32rem] text-sm text-[hsl(var(--muted-foreground))]">
            You have {analysis.verifiedSkillCount} verified skill{analysis.verifiedSkillCount === 1 ? "" : "s"}, but
            no published placement drive lists skill requirements right now. Gaps will appear here as soon as one does.
          </p>
          <Link
            href="/student/drives"
            className="mt-1 inline-flex h-10 items-center rounded-xl bg-[hsl(var(--primary))] px-5 text-sm font-semibold text-white hover:bg-[hsl(var(--color-primary-600))]"
          >
            Browse Placement Drives
          </Link>
        </section>
      ) : (
        <>
          {analysis.gaps.length === 0 ? (
            <section className={cn(cardClassName, "flex flex-col items-center gap-3 px-6 py-12 text-center")}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <PartyPopper className="h-7 w-7" aria-hidden="true" />
              </span>
              <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">No skill gaps right now</h2>
              <p className="max-w-[32rem] text-sm text-[hsl(var(--muted-foreground))]">
                Your verified skills meet every skill requirement of the {analysis.drivesAnalyzed} open drive
                {analysis.drivesAnalyzed === 1 ? "" : "s"}.
              </p>
            </section>
          ) : (
            <section aria-labelledby="gap-list" className="space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 id="gap-list" className="text-lg font-semibold tracking-tight text-[hsl(var(--foreground))]">Skills to build</h2>
                  <p className="mt-0.5 text-sm text-[hsl(var(--muted-foreground))]">Current proficiency compared with placement requirements.</p>
                </div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]" aria-live="polite">
                  <span className="font-semibold text-[hsl(var(--foreground))]">{filtered.length}</span> of {analysis.gaps.length} skills
                </p>
              </div>
              <div className={cn(cardClassName, "flex flex-wrap items-end gap-3 p-3.5")}>
                <FilterSelect<GapPriority>
                  label="Priority"
                  value={priority}
                  onChange={setPriority}
                  options={[
                    { value: "ALL", label: "All priorities" },
                    ...PRIORITY_ORDER.map((p) => ({ value: p, label: PRIORITY_META[p].label })),
                  ]}
                />
                <FilterSelect<SkillGapStatus>
                  label="Status"
                  value={status}
                  onChange={setStatus}
                  options={[
                    { value: "ALL", label: "All statuses" },
                    ...STATUS_ORDER.map((s) => ({ value: s, label: STATUS_META[s].label })),
                  ]}
                />
                {categories.length > 1 && (
                  <FilterSelect<string>
                    label="Category"
                    value={category}
                    onChange={setCategory}
                    options={[
                      { value: "ALL", label: "All categories" },
                      ...categories.map((c) => ({ value: c, label: c })),
                    ]}
                  />
                )}
                {filtersActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setPriority("ALL");
                      setStatus("ALL");
                      setCategory("ALL");
                    }}
                    className="h-10 self-end rounded-xl px-3 text-sm font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.08)]"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {filtered.length === 0 ? (
                <p className={cn(cardClassName, "px-6 py-10 text-center text-sm text-[hsl(var(--muted-foreground))]")}>
                  No skill gaps match these filters.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {filtered.map((gap, index) => (
                    <li
                      key={gap.skillId}
                      className="pc-enter"
                      style={{ "--pc-delay": `${Math.min(index, 8) * 50}ms` } as React.CSSProperties}
                    >
                      {(() => {
                        const current = gap.currentLevel ?? 0;
                        const required = Math.max(gap.requiredLevel, 1);
                        const currentPct = Math.min(100, Math.round((current / required) * 100));
                        const skillProgress = progress.get(gap.skillId);
                        const planDrive = gap.drives.find((drive) => !drive.isOptional) ?? gap.drives[0];
                        return (
                          <article className="rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white px-4 py-4 shadow-[var(--shadow-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)] sm:px-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                                  <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">{gap.skillName}</h3>
                                  <span className="text-xs text-[hsl(var(--muted-foreground))]">{gap.category ?? "Uncategorised"}</span>
                                </div>
                                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[hsl(var(--muted-foreground))]">
                                  <span>Current: <strong className="font-semibold text-[hsl(var(--foreground))]">{levelLabel(gap.currentLevel)}</strong></span>
                                  <span>Required: <strong className="font-semibold text-[hsl(var(--foreground))]">{levelLabel(gap.requiredLevel)}</strong></span>
                                  <span>{gap.gapLevel > 0 ? `${gap.gapLevel} level${gap.gapLevel === 1 ? "" : "s"} to close` : STATUS_META[gap.status].label}</span>
                                </div>
                                <div className="mt-2 h-1.5 max-w-[360px] overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${currentPct}% of required proficiency`}>
                                  <div className="h-full rounded-full bg-[hsl(var(--primary))] transition-[width] duration-500" style={{ width: `${currentPct}%` }} />
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                                <PriorityChip priority={gap.priority} />
                                <Link
                                  href={skillProgress?.planId ? `/student/preparation/${skillProgress.planId}` : "/student/preparation"}
                                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[hsl(var(--border))] px-3 text-xs font-semibold text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--primary)/0.35)] hover:text-[hsl(var(--primary))]"
                                >
                                  {skillProgress?.planId ? "Continue Preparation" : "Preparation"}
                                  <span aria-hidden="true">→</span>
                                </Link>
                                {!skillProgress?.planId && planDrive && (
                                  <button
                                    type="button"
                                    onClick={() => handleCreatePlan(planDrive.driveId)}
                                    disabled={creatingFor !== null}
                                    className="inline-flex h-9 items-center rounded-xl bg-[hsl(var(--primary))] px-3 text-xs font-semibold text-white transition-colors hover:bg-[hsl(var(--color-primary-600))] disabled:opacity-60"
                                  >
                                    {creatingFor === planDrive.driveId ? "Creating…" : "Create Plan"}
                                  </button>
                                )}
                              </div>
                            </div>
                          </article>
                        );
                      })()}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
