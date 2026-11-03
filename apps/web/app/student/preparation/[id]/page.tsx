"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  CircleAlert,
  Info,
  ListTodo,
  Loader2,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { GapPriority } from "@placecampus/shared-types";
import {
  usePreparationPlan,
  usePreparationPlans,
  useRegeneratePreparationPlan,
} from "@/features/preparation/hooks/use-preparation";
import { useTaskStatus } from "@/features/preparation/hooks/use-task-status";
import { useDrive } from "@/features/drives/hooks/use-drives";
import {
  PRIORITY_META,
  planCounts,
  planTitle,
  shortDriveId,
} from "@/features/preparation/lib/prep-meta";
import { PlanStatusBadge, ProgressBar } from "@/features/preparation/components/prep-ui";
import { TaskCard } from "@/features/preparation/components/task-card";
import { HeroWaves, lightHeroClassName } from "@/components/brand/hero-waves";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const PRIORITIES: GapPriority[] = [GapPriority.HIGH, GapPriority.MEDIUM, GapPriority.LOW];

export default function StudentPreparationDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { data: plan, isLoading, isError, refetch } = usePreparationPlan(id);
  const { data: plans } = usePreparationPlans();
  const { data: drive } = useDrive(plan?.driveId ?? "");
  const regenerate = useRegeneratePreparationPlan();
  const task = useTaskStatus();
  const [highlight, setHighlight] = React.useState<string | null>(null);

  // "Continue" links target #task-<itemId>; scroll there once the plan loads.
  const scrolled = React.useRef(false);
  React.useEffect(() => {
    if (!plan || scrolled.current) return;
    scrolled.current = true;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlight(hash);
    });
    const timer = window.setTimeout(() => setHighlight(null), 2200);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [plan]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1100px] space-y-5" aria-busy="true">
        <Skeleton className="h-8 w-40 rounded-xl" />
        <Skeleton className="h-[220px] rounded-[20px]" />
        {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[160px] rounded-2xl" />)}
      </div>
    );
  }

  if (isError || !plan) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50/60 px-6 py-12 text-center">
        <CircleAlert className="h-8 w-8 text-red-600" aria-hidden="true" />
        <p className="font-semibold text-red-900">This preparation plan is unavailable</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => refetch()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-red-700 ring-1 ring-red-200"><RotateCcw className="h-4 w-4" aria-hidden="true" /> Retry</button>
          <Link href="/student/preparation" className="inline-flex h-10 items-center rounded-xl bg-white px-4 text-sm font-semibold ring-1 ring-[hsl(var(--border))]">All plans</Link>
        </div>
      </div>
    );
  }

  const counts = planCounts(plan);
  const archived = plan.status === "ARCHIVED";
  const newer = plans?.find((p) => p.previousPlanId === plan.id);

  const refresh = () => {
    if (!confirm("Refresh this plan from your current verified skills?\n\nA new plan is built from your latest skill match and starts fresh. This plan, with its progress, is archived for your history.")) return;
    regenerate.mutate(plan.id, {
      onSuccess: (next) => {
        toast.success("Plan refreshed", { description: `${next.items.length} action${next.items.length === 1 ? "" : "s"} from your latest skill match.` });
        router.replace(`/student/preparation/${next.id}`);
      },
      onError: (error) =>
        toast.error("Couldn't refresh the plan", { description: error instanceof ApiError ? error.message : "Please try again." }),
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6">
      <Link href="/student/preparation" className="inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-[hsl(var(--foreground)/0.75)] hover:bg-white">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All preparation plans
      </Link>

      <section className={lightHeroClassName}>
        <HeroWaves />
        <div className="relative space-y-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Drive {shortDriveId(plan.driveId)}</p>
              <h1 className="text-2xl font-extrabold tracking-tight text-[hsl(var(--foreground))] sm:text-3xl">{planTitle(drive)}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-[hsl(var(--foreground)/0.75)]">
                <PlanStatusBadge status={plan.status} />
                <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" aria-hidden="true" /> Created {format(new Date(plan.createdAt), "d MMM yyyy")}</span>
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="h-4 w-4" aria-hidden="true" />
                  {drive?.applicationDeadline ? `Drive deadline ${format(new Date(drive.applicationDeadline), "d MMM yyyy")}` : "No drive deadline"}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {drive && (
                <Link href={`/student/drives/${drive.id}`} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[hsl(var(--border))] bg-white px-4 text-sm font-semibold hover:border-[hsl(var(--primary)/0.4)] hover:text-[hsl(var(--primary))]">
                  View drive <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}
              {!archived && (
                <button type="button" onClick={refresh} disabled={regenerate.isPending} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-4 text-sm font-semibold text-white hover:bg-[hsl(var(--color-primary-600))] disabled:opacity-60">
                  {regenerate.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
                  Refresh plan
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-white backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-[hsl(var(--foreground))]">Overall progress</span>
              <span className="text-lg font-extrabold tabular-nums text-[hsl(var(--primary))]">{plan.completionPercentage}%</span>
            </div>
            <ProgressBar value={plan.completionPercentage} className="h-2.5" />
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-emerald-200">{counts.completed} completed</span>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800 ring-1 ring-amber-200">{counts.pending} pending</span>
              {counts.skipped > 0 && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 ring-1 ring-slate-200">{counts.skipped} skipped</span>}
            </div>
          </div>
        </div>
      </section>

      {archived && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700">
          <Info className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="flex-1">This plan was archived when it was refreshed. It&apos;s kept for your history and can&apos;t be changed.</span>
          {newer && (
            <Link href={`/student/preparation/${newer.id}`} className="font-semibold text-[hsl(var(--primary))] hover:underline">Open the current plan</Link>
          )}
        </div>
      )}

      {plan.items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[hsl(var(--primary)/0.3)] bg-white px-6 py-10 text-center">
          <ListTodo className="h-8 w-8 text-[hsl(var(--primary))]" aria-hidden="true" />
          <p className="font-semibold text-[hsl(var(--foreground))]">No Actions Available Yet</p>
          <p className="max-w-[30rem] text-sm text-[hsl(var(--muted-foreground))]">
            No skill gaps were found for this drive when the plan was created. New preparation actions will appear as your readiness profile and placement requirements are evaluated.
          </p>
        </div>
      ) : (
        PRIORITIES.map((priority) => {
          const items = plan.items.filter((item) => item.priority === priority);
          if (!items.length) return null;
          return (
            <section key={priority} aria-labelledby={`p-${priority}`} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 id={`p-${priority}`} className="flex items-center gap-2 text-lg font-bold text-[hsl(var(--foreground))]">
                  <span className={cn("h-2.5 w-2.5 rounded-full", priority === "HIGH" ? "bg-red-500" : priority === "MEDIUM" ? "bg-amber-500" : "bg-slate-400")} aria-hidden="true" />
                  {PRIORITY_META[priority].label}
                </h2>
                <span className="text-sm text-[hsl(var(--muted-foreground))]">{items.length} action{items.length === 1 ? "" : "s"}</span>
              </div>
              <div className="space-y-3">
                {items.map((item) => {
                  const anchor = `task-${item.itemId}`;
                  return (
                    <div key={item.itemId} className={cn("rounded-2xl transition-shadow duration-500", highlight === anchor && "ring-2 ring-[hsl(var(--primary)/0.45)] ring-offset-2 ring-offset-[hsl(var(--background))]")}>
                      <TaskCard
                        id={anchor}
                        item={item}
                        readOnly={archived || (task.busy && !task.isUpdating(plan.id, item.itemId))}
                        isUpdating={task.isUpdating(plan.id, item.itemId)}
                        onStatusChange={(status) => task.change(plan.id, item, status)}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}

      <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">
        Completing preparation actions tracks your own progress. It doesn&apos;t verify a skill or change readiness: verified evidence and assessment results still flow through their own systems.
      </p>
    </div>
  );
}
