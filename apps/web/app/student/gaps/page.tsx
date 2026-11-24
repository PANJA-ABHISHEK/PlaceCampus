"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowUpRight, ChartNoAxesColumnIncreasing, CircleAlert, PartyPopper, RotateCcw, SearchX, Target } from "lucide-react";
import { useSkillGaps } from "@/features/skill-gaps/hooks/use-skill-gaps";
import { AnalysisNotReady, cardClassName } from "@/features/skill-gaps/components/gap-sections";
import {
  GapCard,
  GapCardSkeleton,
  GapFiltersBar,
  GapSummaryCards,
  learningStatus,
  type GapFilters,
} from "@/features/skill-gaps/components/gap-list";
import { prepProgressBySkill } from "@/features/skill-gaps/lib/gap-meta";
import { useCreatePreparationPlan, usePreparationPlans } from "@/features/preparation/hooks/use-preparation";
import { useAssessments, useStudentAssessmentHistory } from "@/features/assessments/hooks/use-assessments";
import { useStudentProfile } from "@/features/student/hooks/use-student-profile";
import { useMyEvidence } from "@/features/evidence/hooks/use-evidence";
import { getProfileCompletion } from "@/features/student/lib/profile-completion";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const INITIAL_FILTERS: GapFilters = { search: "", priority: "ALL", status: "ALL", category: "ALL" };

function GapsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <span className="sr-only">Loading skill gaps…</span>
      <Skeleton className="h-[86px] rounded-2xl" />
      {Array.from({ length: 3 }, (_, i) => (
        <GapCardSkeleton key={i} />
      ))}
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

  const [filters, setFilters] = React.useState<GapFilters>(INITIAL_FILTERS);
  const [creatingFor, setCreatingFor] = React.useState<string | null>(null);

  const analysis = gapsQuery.data;
  const gaps = React.useMemo(() => analysis?.gaps ?? [], [analysis]);
  const progress = React.useMemo(() => prepProgressBySkill(plansQuery.data), [plansQuery.data]);

  const categories = React.useMemo(
    () => [...new Set(gaps.map((g) => g.category ?? "Uncategorised"))].sort(),
    [gaps],
  );

  const filtered = React.useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return gaps.filter(
      (g) =>
        (!query || g.skillName.toLowerCase().includes(query)) &&
        (filters.priority === "ALL" || g.priority === filters.priority) &&
        (filters.status === "ALL" || learningStatus(progress.get(g.skillId)) === filters.status) &&
        (filters.category === "ALL" || (g.category ?? "Uncategorised") === filters.category),
    );
  }, [gaps, filters, progress]);

  const handleCreatePlan = (driveId: string, skillId: string) => {
    setCreatingFor(skillId);
    createPlan.mutate(driveId, {
      onSuccess: () => toast.success("Learning plan created. Your tasks are ready in Preparation."),
      onError: (error) =>
        toast.error(error instanceof ApiError ? error.message : "Could not create the learning plan."),
      onSettled: () => setCreatingFor(null),
    });
  };

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
    <div className="mx-auto w-full max-w-[1120px] space-y-5">
      <header className="pc-enter relative isolate overflow-hidden rounded-[26px] border border-[#F6DCC7] bg-gradient-to-br from-[#FFF8F1] via-[#FFF1E5] to-[#FFE8D5] p-4 shadow-[0_12px_30px_rgba(153,86,37,0.09)] sm:p-5 lg:p-6">
        <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 z-0 hidden h-36 w-56 text-[#F28A3D]/[0.12] sm:block">
          <ChartNoAxesColumnIncreasing className="absolute bottom-0 right-8 h-28 w-36 stroke-[1.4]" />
          <ArrowUpRight className="absolute right-5 top-1 h-16 w-16 stroke-[1.5]" />
        </div>
        <div className="relative z-10 flex items-center gap-4 sm:gap-5">
          <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#FF8A24] to-[#F05A00] text-white shadow-[0_7px_15px_rgba(240,90,0,0.24)] sm:h-[60px] sm:w-[60px]">
            <Target className="h-8 w-8 stroke-[2.1] sm:h-9 sm:w-9" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-[25px] font-extrabold leading-tight tracking-[-0.035em] text-[#142544] sm:text-[31px] lg:text-[34px]">Skill Gaps</h1>
            <p className="mt-0.5 max-w-2xl text-sm leading-relaxed text-[#536176] sm:text-[15px]">
              Identify the skills you need to improve to become placement-ready.
            </p>
          </div>
        </div>

        {gapsQuery.isLoading ? (
          <div className="relative z-10 mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3" aria-hidden="true">
            {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[88px] rounded-[22px] bg-white/70" />)}
          </div>
        ) : analysis?.sufficientData && analysis.drivesAnalyzed > 0 ? (
          <div className="relative z-10 mt-4">
            <GapSummaryCards
              total={gaps.length}
              high={gaps.filter((g) => g.priority === "HIGH").length}
              completed={analysis.skillsMet ?? 0}
              drives={analysis.drivesAnalyzed}
            />
          </div>
        ) : null}
      </header>

      {gapsQuery.isLoading ? (
        <GapsSkeleton />
      ) : gapsQuery.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50/60 px-6 py-12 text-center">
          <CircleAlert className="h-8 w-8 text-red-600" aria-hidden="true" />
          <div>
            <p className="font-semibold text-red-900">We couldn&apos;t load your skill gaps</p>
            <p className="mt-1 text-sm text-red-800/80">
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
        <AnalysisNotReady profileStatus={profileStatus} evidenceStatus={evidenceStatus} assessmentStatus={assessmentStatus} />
      ) : analysis.drivesAnalyzed === 0 ? (
        <section className={cn(cardClassName, "pc-enter flex flex-col items-center gap-3 px-6 py-14 text-center")}>
          <SearchX className="h-8 w-8 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
          <h2 className="text-xl font-bold text-[#14213D]">No drive requirements to compare yet</h2>
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
          {gaps.length === 0 ? (
            <section className={cn(cardClassName, "flex flex-col items-center gap-3 px-6 py-12 text-center")}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <PartyPopper className="h-7 w-7" aria-hidden="true" />
              </span>
              <h2 className="text-xl font-bold text-[#14213D]">No skill gaps right now</h2>
              <p className="max-w-[32rem] text-sm text-[hsl(var(--muted-foreground))]">
                Your verified skills meet every skill requirement of the {analysis.drivesAnalyzed} open drive
                {analysis.drivesAnalyzed === 1 ? "" : "s"}. Keep an eye on new drives as they are published.
              </p>
              <Link href="/student/drives" className="mt-1 text-sm font-semibold text-[hsl(var(--primary))] hover:underline">
                Browse placement drives →
              </Link>
            </section>
          ) : (
            <section aria-label="Skills to build" className="space-y-3">
              <GapFiltersBar filters={filters} onChange={setFilters} categories={categories} shown={filtered.length} total={gaps.length} />

              {filtered.length === 0 ? (
                <div className={cn(cardClassName, "flex flex-col items-center gap-2 px-6 py-10 text-center")}>
                  <SearchX className="h-7 w-7 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
                  <p className="text-sm font-semibold text-[#14213D]">No skills match these filters</p>
                  <button type="button" onClick={() => setFilters(INITIAL_FILTERS)} className="text-sm font-semibold text-[hsl(var(--primary))] hover:underline">
                    Clear filters
                  </button>
                </div>
              ) : (
                <ul className="space-y-3">
                  {filtered.map((gap) => (
                    <li key={gap.skillId}>
                      <GapCard
                        gap={gap}
                        progress={progress.get(gap.skillId)}
                        onCreatePlan={(driveId) => handleCreatePlan(driveId, gap.skillId)}
                        creating={creatingFor === gap.skillId}
                        disabled={creatingFor !== null}
                      />
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
