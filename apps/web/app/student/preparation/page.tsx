"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, Search } from "lucide-react";
import { usePreparationPlans } from "@/features/preparation/hooks/use-preparation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Progress } from "@/components/ui/progress";
import { PreparationPlanStatus } from "@placecampus/shared-types";

export default function StudentPreparationPage() {
  const { data: plans, isLoading, isError, refetch } = usePreparationPlans();
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      plans?.filter((plan) => {
        if (status !== "ALL" && plan.status !== status) return false;
        return `${plan.driveId} ${plan.source}`.toLowerCase().includes(search.toLowerCase());
      }) ?? [],
    [plans, search, status],
  );

  if (isLoading) return <LoadingState text="Loading your preparation plans..." />;
  if (isError) return <ErrorState title="Plans could not be loaded" onRetry={() => refetch()} />;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="rounded-3xl bg-navy-900 p-8 text-white shadow-xl md:p-12">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-orange-300">Personalized preparation</p>
        <h1 className="text-4xl font-bold">Turn skill gaps into progress.</h1>
        <p className="mt-4 max-w-2xl text-navy-100">Work through real drive requirements with prioritized actions and optional assessment checkpoints.</p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search plans..." className="w-full rounded-xl border py-2 pl-10 pr-4 text-sm" />
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border px-3 py-2 text-sm">
          <option value="ALL">All statuses</option>
          {Object.values(PreparationPlanStatus).map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<BookOpen className="h-8 w-8 text-[hsl(var(--muted-foreground))]" />} title="No preparation plans yet" description="Open a placement drive and create a plan from its current skill gaps." action={<Link href="/student/drives"><Button>Browse placement drives</Button></Link>} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filtered.map((plan) => (
            <Link key={plan.id} href={`/student/preparation/${plan.id}`} className="rounded-2xl border bg-white p-6 shadow-sm transition hover:border-orange-200 hover:shadow-md">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Drive {plan.driveId.slice(-6)}</p><h2 className="mt-1 text-xl font-bold text-heading">Preparation plan</h2></div>
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">{plan.status}</span>
              </div>
              <div className="mb-2 flex justify-between text-sm"><span>{plan.items.length} action{plan.items.length === 1 ? "" : "s"}</span><span className="font-semibold">{plan.completionPercentage}%</span></div>
              <Progress value={plan.completionPercentage} />
              <p className="mt-4 text-xs text-muted-foreground">Created {new Date(plan.createdAt).toLocaleDateString()}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
