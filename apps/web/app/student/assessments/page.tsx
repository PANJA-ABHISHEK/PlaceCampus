"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  BookOpen,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  ClipboardList,
  FilterX,
  Layers,
  Play,
  RotateCcw,
  Search,
  SearchX,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import type { AssessmentAttempt } from "@placecampus/shared-types";
import {
  useAssessments,
  useStartAssessment,
  useStudentAssessmentHistory,
} from "@/features/assessments/hooks/use-assessments";
import { useTaxonomy } from "@/features/skills/hooks/use-skills";
import {
  CATEGORY_META,
  MAIN_CATEGORIES,
  SkillIcon,
  type SkillCategory,
} from "@/features/skills/lib/skill-registry";
import {
  DIFFICULTY_META,
  STATUS_META,
  getAssessmentCategory,
  getDifficulty,
  inferAssessmentSkill,
  isFinished,
  summarizeAttempts,
  type DifficultyLabel,
  type StudentAssessmentStatus,
} from "@/features/assessments/lib/assessment-meta";
import { AssessmentsHero } from "@/features/assessments/components/assessments-hero";
import {
  AssessmentCard,
  type AssessmentView,
} from "@/features/assessments/components/assessment-card";
import {
  AssessmentDetailsDialog,
  AssessmentResultDialog,
} from "@/features/assessments/components/assessment-dialogs";
import { formatEvidenceDate } from "@/features/evidence/lib/evidence-meta";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const RESULTS_PREVIEW = 5;

const selectClassName =
  "h-11 w-full appearance-none rounded-xl border border-[hsl(var(--input))] bg-white pl-3.5 pr-9 text-sm font-medium shadow-[var(--shadow-xs)] transition-[border-color,box-shadow] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-4 focus:ring-[hsl(var(--primary)/0.12)]";

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={selectClassName}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  delay,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: "blue" | "orange" | "green";
  delay: number;
}) {
  const tones = {
    blue: { tile: "bg-blue-50 text-blue-600", accent: "text-blue-200" },
    orange: {
      tile: "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]",
      accent: "text-[hsl(var(--primary)/0.25)]",
    },
    green: { tile: "bg-emerald-50 text-emerald-600", accent: "text-emerald-200" },
  }[tone];
  return (
    <div
      style={{ "--pc-delay": `${delay}ms` } as React.CSSProperties}
      className="pc-enter group relative flex items-center gap-5 overflow-hidden rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
    >
      <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl", tones.tile)}>
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-medium text-[hsl(var(--foreground)/0.75)]">{label}</p>
        <p className="text-3xl font-bold tabular-nums text-[hsl(var(--foreground))]">{value}</p>
      </div>
      <Icon
        aria-hidden="true"
        strokeWidth={1.5}
        className={cn(
          "absolute -right-2 top-1/2 h-16 w-16 -translate-y-1/2 transition-transform duration-300 group-hover:scale-110",
          tones.accent,
        )}
      />
    </div>
  );
}

function AssessmentsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only">Loading assessments…</span>
      <Skeleton className="h-[170px] w-full rounded-[20px]" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[98px] rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[80px] rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[210px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function AssessmentsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assessmentsQuery = useAssessments();
  const historyQuery = useStudentAssessmentHistory();
  const { data: taxonomy } = useTaxonomy();
  const startMutation = useStartAssessment();

  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<SkillCategory | "ALL">("ALL");
  const [difficulty, setDifficulty] = React.useState<DifficultyLabel | "ALL">("ALL");
  const [status, setStatus] = React.useState<StudentAssessmentStatus | "ALL">("ALL");
  const [detailsId, setDetailsId] = React.useState<string | null>(null);
  const [resultId, setResultId] = React.useState<string | null>(null);
  const [showAllResults, setShowAllResults] = React.useState(false);
  const [startingId, setStartingId] = React.useState<string | null>(null);

  const assessments = React.useMemo(() => assessmentsQuery.data ?? [], [assessmentsQuery.data]);
  const attempts = React.useMemo(() => historyQuery.data ?? [], [historyQuery.data]);

  const skillNameById = React.useMemo(
    () => new Map((taxonomy ?? []).map((skill) => [skill.id, skill.name])),
    [taxonomy],
  );

  const views: AssessmentView[] = React.useMemo(
    () =>
      assessments.map((assessment) => {
        const skillName = inferAssessmentSkill(assessment, skillNameById);
        return {
          assessment,
          skillName,
          category: getAssessmentCategory(skillName),
          summary: summarizeAttempts(assessment.id, attempts),
        };
      }),
    [assessments, attempts, skillNameById],
  );

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return views.filter(
      (view) =>
        (!query || view.assessment.title.toLowerCase().includes(query)) &&
        (category === "ALL" || view.category === category) &&
        (difficulty === "ALL" || getDifficulty(view.assessment.difficulty) === difficulty) &&
        (status === "ALL" || view.summary.status === status),
    );
  }, [views, search, category, difficulty, status]);

  const results = React.useMemo(
    () =>
      attempts
        .filter(isFinished)
        .sort(
          (a, b) =>
            new Date(b.submittedAt ?? b.updatedAt).getTime() -
            new Date(a.submittedAt ?? a.updatedAt).getTime(),
        ),
    [attempts],
  );

  // Arriving from a just-submitted attempt: /student/assessments?result=<attemptId>
  const resultParam = searchParams.get("result");
  const activeResultId = resultId ?? resultParam;
  const closeResult = () => {
    setResultId(null);
    if (resultParam) router.replace("/student/assessments", { scroll: false });
  };

  const categoryCounts = React.useMemo(() => {
    const counts = Object.fromEntries(MAIN_CATEGORIES.map((c) => [c, 0])) as Record<string, number>;
    for (const view of views) if (view.category in counts) counts[view.category]++;
    return counts;
  }, [views]);

  const stats = {
    available: assessments.length,
    inProgress: views.filter((v) => v.summary.status === "IN_PROGRESS").length,
    completed: views.filter((v) => v.summary.finishedCount > 0).length,
  };

  const hasFilters =
    !!search.trim() || category !== "ALL" || difficulty !== "ALL" || status !== "ALL";
  const clearFilters = () => {
    setSearch("");
    setCategory("ALL");
    setDifficulty("ALL");
    setStatus("ALL");
  };

  const start = (assessmentId: string) => {
    setStartingId(assessmentId);
    startMutation.mutate(assessmentId, {
      onSuccess: () => router.push(`/student/assessments/${assessmentId}/attempt`),
      onError: (error) => {
        setStartingId(null);
        toast.error("Couldn't start the assessment", {
          description: error instanceof ApiError ? error.message : "Please try again.",
        });
      },
    });
  };

  if (assessmentsQuery.isLoading || historyQuery.isLoading) return <AssessmentsSkeleton />;

  const detailsView = views.find((v) => v.assessment.id === detailsId) ?? null;
  const relatedSkills = detailsView
    ? Array.from(
        new Set(
          [
            detailsView.skillName,
            ...(detailsView.assessment.questions ?? []).map((q) =>
              q.skillId ? skillNameById.get(String(q.skillId)) : undefined,
            ),
          ].filter((name): name is string => !!name),
        ),
      )
    : [];

  const resultAttempt: AssessmentAttempt | null =
    results.find((a) => a.id === activeResultId) ?? null;
  const resultAssessment = resultAttempt
    ? assessments.find((a) => a.id === resultAttempt.assessmentId)
    : undefined;
  const titleFor = (attempt: AssessmentAttempt) =>
    assessments.find((a) => a.id === attempt.assessmentId)?.title ??
    attempt.assessment?.title ??
    "Assessment";

  const loadError = assessmentsQuery.error ?? historyQuery.error;

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      <AssessmentsHero />

      {loadError ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50/60 px-6 py-12 text-center">
          <CircleAlert className="h-8 w-8 text-red-600" aria-hidden="true" />
          <p className="font-semibold text-red-900">We couldn&apos;t load your assessments</p>
          <button
            type="button"
            onClick={() => {
              assessmentsQuery.refetch();
              historyQuery.refetch();
            }}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard label="Available Assessments" value={stats.available} icon={Layers} tone="blue" delay={40} />
            <StatCard label="In Progress" value={stats.inProgress} icon={Play} tone="orange" delay={80} />
            <StatCard label="Completed" value={stats.completed} icon={CircleCheck} tone="green" delay={120} />
          </div>

          {assessments.length === 0 ? (
            <section className="pc-enter flex flex-col items-center gap-6 rounded-2xl border border-[hsl(var(--border)/0.8)] bg-gradient-to-br from-white to-[hsl(var(--color-primary-50))] px-6 py-10 text-center shadow-[var(--shadow-card)] md:flex-row md:px-10 md:text-left">
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl bg-white shadow-[var(--shadow-md)] ring-1 ring-[hsl(var(--primary)/0.15)]">
                <ClipboardList className="h-14 w-14 text-[hsl(var(--primary))]" strokeWidth={1.5} aria-hidden="true" />
                <Sparkles className="absolute -right-2 -top-2 h-7 w-7 text-[hsl(var(--color-primary-light))]" aria-hidden="true" />
              </div>
              <div className="flex-1 space-y-2">
                <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">No Active Assessments Yet</h2>
                <p className="max-w-[38rem] text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
                  New assessments will appear here when your institution publishes them. Use this
                  time to strengthen your skills and prepare for upcoming evaluations.
                </p>
                <div className="flex flex-col gap-2 pt-2 sm:flex-row md:justify-start">
                  <Link
                    href="/student/preparation"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_hsl(var(--primary)/0.8)] transition-all hover:bg-[hsl(var(--color-primary-600))] active:scale-[0.98]"
                  >
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    Explore Preparation
                  </Link>
                  <Link
                    href="/student/skills"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-white px-5 text-sm font-semibold text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--primary)/0.4)] hover:text-[hsl(var(--primary))]"
                  >
                    <Layers className="h-4 w-4" aria-hidden="true" />
                    View My Skills
                  </Link>
                </div>
              </div>
            </section>
          ) : (
            <>
              {/* Categories */}
              <section aria-labelledby="assessment-categories-heading" className="space-y-3">
                <h2 id="assessment-categories-heading" className="text-xl font-bold text-[hsl(var(--foreground))]">
                  Assessment Categories
                </h2>
                <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-4">
                  {MAIN_CATEGORIES.map((key) => {
                    const meta = CATEGORY_META[key];
                    const Icon = meta.icon;
                    const active = category === key;
                    const count = categoryCounts[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setCategory(active ? "ALL" : key)}
                        className={cn(
                          "flex min-w-[230px] shrink-0 items-center gap-4 rounded-2xl border px-5 py-4 text-left shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)] md:min-w-0",
                          active
                            ? "border-[hsl(var(--primary)/0.45)] bg-gradient-to-br from-[hsl(var(--color-primary-50))] to-white ring-2 ring-[hsl(var(--primary)/0.2)]"
                            : "border-[hsl(var(--border)/0.8)] bg-white",
                        )}
                      >
                        <Icon className={cn("h-9 w-9 shrink-0", meta.iconClass)} strokeWidth={1.75} aria-hidden="true" />
                        <span>
                          <span className="block font-bold text-[hsl(var(--foreground))]">{meta.label}</span>
                          <span className="text-sm text-[hsl(var(--muted-foreground))]">
                            {count} {count === 1 ? "Assessment" : "Assessments"}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Listing */}
              <section aria-labelledby="available-assessments-heading" className="space-y-3">
                {/* Toolbar needs ~800px for one row, so it only sits beside the heading on wide screens. */}
                <div className="flex flex-col gap-3 min-[1400px]:flex-row min-[1400px]:items-center min-[1400px]:justify-between">
                  <h2 id="available-assessments-heading" className="shrink-0 whitespace-nowrap text-xl font-bold text-[hsl(var(--foreground))]">
                    Available Assessments ({assessments.length})
                  </h2>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_160px_150px_150px_auto] min-[1400px]:max-w-[860px] min-[1400px]:flex-1">
                    <div className="relative sm:col-span-2 xl:col-span-1">
                      <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                      <input
                        type="search"
                        aria-label="Search assessments"
                        placeholder="Search assessments…"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="h-11 w-full rounded-xl border border-[hsl(var(--input))] bg-white pl-10 pr-9 text-sm shadow-[var(--shadow-xs)] transition-[border-color,box-shadow] placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-4 focus:ring-[hsl(var(--primary)/0.12)]"
                      />
                      {search && (
                        <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <FilterSelect label="Filter by category" value={category} onChange={(v) => setCategory(v as SkillCategory | "ALL")}>
                      <option value="ALL">All Categories</option>
                      {MAIN_CATEGORIES.map((key) => (
                        <option key={key} value={key}>{CATEGORY_META[key].label}</option>
                      ))}
                      <option value="OTHER">Other</option>
                    </FilterSelect>
                    <FilterSelect label="Filter by difficulty" value={difficulty} onChange={(v) => setDifficulty(v as DifficultyLabel | "ALL")}>
                      <option value="ALL">All Difficulties</option>
                      {(Object.keys(DIFFICULTY_META) as DifficultyLabel[]).map((key) => (
                        <option key={key} value={key}>{DIFFICULTY_META[key].label}</option>
                      ))}
                    </FilterSelect>
                    <FilterSelect label="Filter by status" value={status} onChange={(v) => setStatus(v as StudentAssessmentStatus | "ALL")}>
                      <option value="ALL">All Statuses</option>
                      {(Object.keys(STATUS_META) as StudentAssessmentStatus[]).map((key) => (
                        <option key={key} value={key}>{STATUS_META[key].label}</option>
                      ))}
                    </FilterSelect>
                    <button
                      type="button"
                      onClick={clearFilters}
                      disabled={!hasFilters}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[hsl(var(--primary)/0.45)] bg-white px-4 text-sm font-semibold text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(var(--primary)/0.06)] disabled:cursor-not-allowed disabled:border-[hsl(var(--border))] disabled:text-[hsl(var(--muted-foreground))] disabled:hover:bg-white"
                    >
                      <FilterX className="h-4 w-4" aria-hidden="true" />
                      Clear Filters
                    </button>
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-white px-6 py-12 text-center">
                    <SearchX className="mb-3 h-8 w-8 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
                    <p className="font-semibold text-[hsl(var(--foreground))]">No assessments match your filters</p>
                    <button type="button" onClick={clearFilters} className="mt-4 rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-sm font-semibold transition-colors hover:bg-[hsl(var(--muted))]">
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                    {filtered.map((view, index) => (
                      <AssessmentCard
                        key={view.assessment.id}
                        view={view}
                        style={{ "--pc-delay": `${Math.min(index, 6) * 50}ms` } as React.CSSProperties}
                        onOpen={() => setDetailsId(view.assessment.id)}
                        onStart={() => start(view.assessment.id)}
                        isStarting={startingId === view.assessment.id}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {/* History */}
          {results.length > 0 && (
            <section aria-labelledby="results-heading" className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 id="results-heading" className="text-xl font-bold text-[hsl(var(--foreground))]">
                  Recent Assessment Results
                </h2>
                {results.length > RESULTS_PREVIEW && (
                  <button
                    type="button"
                    onClick={() => setShowAllResults((v) => !v)}
                    className="text-sm font-semibold text-[hsl(var(--primary))] hover:underline"
                  >
                    {showAllResults ? "Show recent" : `View all (${results.length})`}
                  </button>
                )}
              </div>
              <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white shadow-[var(--shadow-card)]">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left">
                    <thead>
                      <tr className="border-b border-[hsl(var(--border)/0.8)] text-sm text-[hsl(var(--muted-foreground))]">
                        <th scope="col" className="px-6 py-3.5 font-medium">Assessment</th>
                        <th scope="col" className="px-4 py-3.5 font-medium">Category</th>
                        <th scope="col" className="px-4 py-3.5 font-medium">Score</th>
                        <th scope="col" className="px-4 py-3.5 font-medium">Result</th>
                        <th scope="col" className="px-4 py-3.5 font-medium">Completed On</th>
                        <th scope="col" className="px-6 py-3.5 text-right font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[hsl(var(--border)/0.6)]">
                      {(showAllResults ? results : results.slice(0, RESULTS_PREVIEW)).map((attempt) => {
                        const view = views.find((v) => v.assessment.id === attempt.assessmentId);
                        const total = view?.assessment.questions?.length;
                        const passed = !!attempt.passed;
                        return (
                          <tr key={attempt.id} className="transition-colors hover:bg-[hsl(var(--primary)/0.03)]">
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-3">
                                {view?.skillName ? (
                                  <SkillIcon name={view.skillName} size="sm" />
                                ) : (
                                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
                                    <ClipboardList className="h-4 w-4" aria-hidden="true" />
                                  </span>
                                )}
                                <span className="font-semibold text-[hsl(var(--foreground))]">{titleFor(attempt)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              {view && view.category !== "OTHER" ? (
                                <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold ring-1", CATEGORY_META[view.category].badge)}>
                                  {CATEGORY_META[view.category].label}
                                </span>
                              ) : (
                                <span className="text-sm text-[hsl(var(--muted-foreground))]">—</span>
                              )}
                            </td>
                            <td className={cn("px-4 py-3.5 font-semibold tabular-nums", passed ? "text-emerald-700" : "text-red-700")}>
                              {total != null ? `${attempt.score ?? 0} / ${total} ` : ""}({attempt.percentage ?? 0}%)
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1", passed ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-red-50 text-red-700 ring-red-200")}>
                                {passed ? "Passed" : "Not passed"}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-sm text-[hsl(var(--foreground)/0.8)]">
                              {formatEvidenceDate(attempt.submittedAt, "d MMM yyyy") ?? "—"}
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => setResultId(attempt.id)}
                                className="inline-flex h-9 items-center rounded-lg border border-[hsl(var(--primary)/0.45)] px-3.5 text-sm font-semibold text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(var(--primary)/0.06)]"
                              >
                                View Result
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      <AssessmentDetailsDialog
        view={detailsView}
        relatedSkills={relatedSkills}
        onOpenChange={(open) => !open && setDetailsId(null)}
        onStart={() => detailsView && start(detailsView.assessment.id)}
        isStarting={!!detailsView && startingId === detailsView.assessment.id}
      />
      <AssessmentResultDialog
        attempt={resultAttempt}
        title={resultAttempt ? titleFor(resultAttempt) : ""}
        totalQuestions={resultAssessment?.questions?.length ?? null}
        canRetake={!!resultAssessment}
        onRetake={() => {
          if (!resultAssessment) return;
          closeResult();
          start(resultAssessment.id);
        }}
        onOpenChange={(open) => !open && closeResult()}
      />
    </div>
  );
}

export default function AssessmentsPage() {
  return (
    <React.Suspense fallback={<AssessmentsSkeleton />}>
      <AssessmentsView />
    </React.Suspense>
  );
}
