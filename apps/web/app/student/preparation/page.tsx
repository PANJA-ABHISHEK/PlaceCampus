"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowDownUp,
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  CircleAlert,
  CircleCheck,
  ClipboardCheck,
  ClipboardList,
  Code2,
  FilterX,
  Layers,
  ListTodo,
  Loader2,
  RotateCcw,
  Search,
  SearchX,
  Sparkles,
  X,
  ChevronDown,
} from "lucide-react";
import type { PlacementDrive, PreparationPlan } from "@placecampus/shared-types";
import { usePreparationPlans } from "@/features/preparation/hooks/use-preparation";
import { useTaskStatus } from "@/features/preparation/hooks/use-task-status";
import { useDrives } from "@/features/drives/hooks/use-drives";
import { useStudentAssessmentHistory } from "@/features/assessments/hooks/use-assessments";
import {
  PRIORITY_META,
  planCounts,
  planTitle,
  shortDriveId,
  sortItemsForAction,
} from "@/features/preparation/lib/prep-meta";
import {
  PlanCard,
  PreparationHero,
  StatCard,
} from "@/features/preparation/components/prep-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type StatusFilter = "ALL" | PreparationPlan["status"];
type SortOrder = "RECENT" | "PROGRESS" | "DEADLINE";

const ROADMAP_PREVIEW = 4;

const controlClassName =
  "h-11 w-full appearance-none rounded-xl border border-[hsl(var(--input))] bg-white pl-3.5 pr-9 text-sm font-medium shadow-[var(--shadow-xs)] transition-[border-color,box-shadow] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-4 focus:ring-[hsl(var(--primary)/0.12)]";

function RoadmapCategory({
  icon: Icon,
  title,
  description,
  completed,
  total,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  completed: number;
  total: number;
  children: React.ReactNode;
}) {
  const pct = total ? Math.round((completed / total) * 100) : 0;
  return (
    <section className="pc-enter flex min-w-0 flex-col rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-[hsl(var(--foreground))]">{title}</h3>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{description}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="font-semibold text-[hsl(var(--foreground))]">{completed} / {total} completed</span>
        <span className="font-bold tabular-nums">{pct}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
        <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-700" style={{ width: `${pct}%` }} />
      </div>
      <ul className="mt-4 space-y-2">{children}</ul>
    </section>
  );
}

function PreparationSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[90px] rounded-2xl" />)}
      </div>
      <Skeleton className="h-[64px] rounded-2xl" />
      <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[300px] rounded-2xl" />)}
      </div>
    </div>
  );
}

export default function StudentPreparationPage() {
  const { data, isLoading, isError, refetch } = usePreparationPlans();
  const { data: drivesData } = useDrives();
  const { data: attempts } = useStudentAssessmentHistory();
  const task = useTaskStatus();

  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("ALL");
  const [sort, setSort] = React.useState<SortOrder>("RECENT");
  const [showAll, setShowAll] = React.useState(false);

  const plans = React.useMemo(() => data ?? [], [data]);
  const driveById = React.useMemo(
    () => new Map<string, PlacementDrive>((drivesData ?? []).map((d) => [d.id, d])),
    [drivesData],
  );
  // Archived plans were replaced by a regenerated plan; they don't count.
  const current = plans.filter((p) => p.status !== "ARCHIVED");

  const totals = current.reduce(
    (acc, plan) => {
      const c = planCounts(plan);
      return { total: acc.total + c.total, completed: acc.completed + c.completed };
    },
    { total: 0, completed: 0 },
  );
  const overall = totals.total ? Math.round((totals.completed / totals.total) * 100) : 0;

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const deadline = (p: PreparationPlan) => {
      const d = driveById.get(p.driveId)?.applicationDeadline;
      return d ? new Date(d).getTime() : Number.POSITIVE_INFINITY;
    };
    return plans
      .filter((p) => status === "ALL" || p.status === status)
      .filter((p) => {
        if (!q) return true;
        const haystack = [planTitle(driveById.get(p.driveId)), p.driveId, ...p.items.map((i) => i.skillName)].join(" ").toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) =>
        sort === "PROGRESS"
          ? b.completionPercentage - a.completionPercentage
          : sort === "DEADLINE"
            ? deadline(a) - deadline(b)
            : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [plans, status, search, sort, driveById]);

  // Roadmap: real actions from current plans only.
  const skillActions = sortItemsForAction(
    current.flatMap((plan) => plan.items.map((item) => ({ ...item, plan }))),
  );
  const checkpoints = new Map<string, { assessmentId: string; title: string; skills: string[] }>();
  for (const plan of current) {
    for (const item of plan.items) {
      const cp = item.assessmentCheckpoint;
      if (!cp) continue;
      const entry = checkpoints.get(cp.assessmentId) ?? { ...cp, skills: [] };
      if (!entry.skills.includes(item.skillName)) entry.skills.push(item.skillName);
      checkpoints.set(cp.assessmentId, entry);
    }
  }
  const attemptedAssessments = new Set(
    (attempts ?? []).filter((a) => a.status === "EVALUATED" || a.status === "SUBMITTED").map((a) => String(a.assessmentId)),
  );
  const checkpointList = [...checkpoints.values()];
  const shownSkillActions = showAll ? skillActions : skillActions.slice(0, ROADMAP_PREVIEW);

  const hasFilters = !!search.trim() || status !== "ALL" || sort !== "RECENT";
  const clearFilters = () => {
    setSearch("");
    setStatus("ALL");
    setSort("RECENT");
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      <PreparationHero />

      {isLoading ? (
        <PreparationSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50/60 px-6 py-12 text-center">
          <CircleAlert className="h-8 w-8 text-red-600" aria-hidden="true" />
          <p className="font-semibold text-red-900">We couldn&apos;t load your preparation plans</p>
          <button type="button" onClick={() => refetch()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50">
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Retry
          </button>
        </div>
      ) : plans.length === 0 ? (
        <section className="pc-enter flex flex-col items-center gap-6 rounded-2xl border border-[hsl(var(--border)/0.8)] bg-gradient-to-br from-white to-[hsl(var(--color-primary-50))] px-6 py-10 text-center shadow-[var(--shadow-card)] md:flex-row md:px-10 md:text-left">
          <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl bg-white shadow-[var(--shadow-md)] ring-1 ring-[hsl(var(--primary)/0.15)]">
            <ClipboardList className="h-14 w-14 text-[hsl(var(--primary))]" strokeWidth={1.5} aria-hidden="true" />
            <Sparkles className="absolute -right-2 -top-2 h-7 w-7 text-[hsl(var(--color-primary-light))]" aria-hidden="true" />
          </div>
          <div className="flex-1 space-y-2">
            <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Your Preparation Journey Starts Here</h2>
            <p className="max-w-[38rem] text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
              Your personalized preparation plans will appear here when relevant skill gaps or placement requirements are identified.
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Open a placement drive and create a plan from its skill gaps.</p>
            <Link href="/student/drives" className="mt-2 inline-flex h-11 items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_hsl(var(--primary)/0.8)] hover:bg-[hsl(var(--color-primary-600))]">
              <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
              Explore Placement Drives
            </Link>
          </div>
        </section>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Active Plans" value={String(plans.filter((p) => p.status === "ACTIVE").length)} icon={ClipboardList} tile="bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]" delay={40} />
            <StatCard label="Total Actions" value={String(totals.total)} icon={Layers} tile="bg-blue-50 text-blue-600" delay={80} />
            <StatCard label="Completed Actions" value={String(totals.completed)} icon={CircleCheck} tile="bg-emerald-50 text-emerald-600" delay={120} />
            <StatCard label="Overall Progress" value={`${overall}%`} icon={ListTodo} tile="" progress={overall} delay={160} />
          </div>

          <section aria-labelledby="plans-heading" className="space-y-3">
            <h2 id="plans-heading" className="text-xl font-bold text-[hsl(var(--foreground))]">Your Preparation Plans ({plans.length})</h2>
            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white p-3 shadow-[var(--shadow-card)] sm:grid-cols-2 sm:p-4 lg:grid-cols-[minmax(0,1fr)_180px_200px_auto]">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                <input
                  type="search"
                  aria-label="Search plans"
                  placeholder="Search by company, role, drive or skill…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={cn(controlClassName, "pl-10 font-normal")}
                />
                {search && (
                  <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="relative">
                <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className={controlClassName}>
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
                <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
              </div>
              <div className="relative">
                <ArrowDownUp aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                <select aria-label="Sort plans" value={sort} onChange={(e) => setSort(e.target.value as SortOrder)} className={cn(controlClassName, "pl-10")}>
                  <option value="RECENT">Recently Created</option>
                  <option value="PROGRESS">Most Progress</option>
                  <option value="DEADLINE">Drive Deadline</option>
                </select>
                <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
              </div>
              <button type="button" onClick={clearFilters} disabled={!hasFilters} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[hsl(var(--primary)/0.45)] bg-white px-4 text-sm font-semibold text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(var(--primary)/0.06)] disabled:cursor-not-allowed disabled:border-[hsl(var(--border))] disabled:text-[hsl(var(--muted-foreground))]">
                <FilterX className="h-4 w-4" aria-hidden="true" /> Clear Filters
              </button>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-white px-6 py-10 text-center">
                <SearchX className="mb-3 h-8 w-8 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
                <p className="font-semibold text-[hsl(var(--foreground))]">No plans match your filters</p>
                <button type="button" onClick={clearFilters} className="mt-4 rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-sm font-semibold hover:bg-[hsl(var(--muted))]">Clear filters</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {filtered.map((plan, i) => (
                  <PlanCard key={plan.id} plan={plan} drive={driveById.get(plan.driveId)} style={{ "--pc-delay": `${Math.min(i, 6) * 50}ms` } as React.CSSProperties} />
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="roadmap-heading" className="space-y-3">
            <h2 id="roadmap-heading" className="text-xl font-bold text-[hsl(var(--foreground))]">Your Preparation Roadmap</h2>
            {skillActions.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[hsl(var(--primary)/0.3)] bg-white px-6 py-10 text-center">
                <ListTodo className="h-8 w-8 text-[hsl(var(--primary))]" aria-hidden="true" />
                <p className="font-semibold text-[hsl(var(--foreground))]">No Actions Available Yet</p>
                <p className="max-w-[30rem] text-sm text-[hsl(var(--muted-foreground))]">
                  New preparation actions will appear as your readiness profile and placement requirements are evaluated.
                </p>
              </div>
            ) : (
              <div className={cn("grid grid-cols-1 gap-5", checkpointList.length > 0 && "lg:grid-cols-2")}>
                <RoadmapCategory
                  icon={Code2}
                  title="Technical Skills"
                  description="Close the skill gaps your target drives require."
                  completed={skillActions.filter((a) => a.status === "COMPLETED").length}
                  total={skillActions.length}
                >
                  {shownSkillActions.map((action) => {
                    const done = action.status === "COMPLETED";
                    const archived = action.plan.status === "ARCHIVED";
                    const busy = task.isUpdating(action.plan.id, action.itemId);
                    return (
                      <li key={`${action.plan.id}-${action.itemId}`} className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border)/0.7)] px-3 py-2.5">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={done}
                          aria-label={done ? `Mark ${action.skillName} as pending` : `Mark ${action.skillName} as completed`}
                          disabled={task.busy || archived}
                          onClick={() => task.change(action.plan.id, action, done ? "TODO" : "COMPLETED")}
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors disabled:cursor-not-allowed",
                            done ? "border-emerald-500 bg-emerald-500 text-white" : "border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]",
                          )}
                        >
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[hsl(var(--primary))]" aria-hidden="true" /> : done ? <Check className="pc-pop h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /> : null}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={cn("truncate text-sm font-semibold", done ? "text-[hsl(var(--foreground)/0.55)] line-through" : "text-[hsl(var(--foreground))]")}>
                            Improve {action.skillName} to Level {action.requiredLevel}
                          </p>
                          <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">
                            {planTitle(driveById.get(action.plan.driveId))} · Drive {shortDriveId(action.plan.driveId)}
                          </p>
                        </div>
                        <span className={cn("hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 sm:inline", PRIORITY_META[action.priority].className)}>
                          {action.priority.charAt(0) + action.priority.slice(1).toLowerCase()}
                        </span>
                        <Link href={`/student/preparation/${action.plan.id}#task-${action.itemId}`} aria-label={`Open ${action.skillName} in its plan`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--primary))]">
                          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </li>
                    );
                  })}
                  {skillActions.length > ROADMAP_PREVIEW && (
                    <li>
                      <button type="button" onClick={() => setShowAll((v) => !v)} className="w-full rounded-xl py-2 text-sm font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.06)]">
                        {showAll ? "Show fewer" : `Show all ${skillActions.length} actions`}
                      </button>
                    </li>
                  )}
                </RoadmapCategory>

                {checkpointList.length > 0 && (
                  <RoadmapCategory
                    icon={ClipboardCheck}
                    title="Assessments"
                    description="Checkpoints that validate the skills in your plans."
                    completed={checkpointList.filter((c) => attemptedAssessments.has(c.assessmentId)).length}
                    total={checkpointList.length}
                  >
                    {checkpointList.map((cp) => {
                      const done = attemptedAssessments.has(cp.assessmentId);
                      return (
                        <li key={cp.assessmentId} className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border)/0.7)] px-3 py-2.5">
                          <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2", done ? "border-emerald-500 bg-emerald-500 text-white" : "border-[hsl(var(--border))]")} aria-label={done ? "Attempted" : "Not attempted"}>
                            {done && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[hsl(var(--foreground))]">{cp.title}</p>
                            <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">Validates {cp.skills.join(", ")}</p>
                          </div>
                          <Link href={`/student/assessments/${cp.assessmentId}/attempt`} className="inline-flex h-8 shrink-0 items-center rounded-lg bg-[hsl(var(--primary)/0.1)] px-3 text-xs font-semibold text-[hsl(var(--color-primary-700))] hover:bg-[hsl(var(--primary)/0.16)]">
                            {done ? "Retake" : "Start"}
                          </Link>
                        </li>
                      );
                    })}
                  </RoadmapCategory>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
