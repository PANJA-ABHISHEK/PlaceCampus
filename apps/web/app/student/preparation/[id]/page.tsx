"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, ExternalLink, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Progress } from "@/components/ui/progress";
import { usePreparationPlan, useRegeneratePreparationPlan, useUpdatePreparationItemStatus } from "@/features/preparation/hooks/use-preparation";
import { GapPriority, PreparationItemStatus } from "@placecampus/shared-types";

const priorities = [GapPriority.HIGH, GapPriority.MEDIUM, GapPriority.LOW];

export default function StudentPreparationDetailPage() {
  const { id } = useParams() as { id: string };
  const { data: plan, isLoading, isError, refetch } = usePreparationPlan(id);
  const statusMutation = useUpdatePreparationItemStatus();
  const regenerateMutation = useRegeneratePreparationPlan();

  if (isLoading) return <LoadingState text="Loading preparation plan..." />;
  if (isError || !plan) return <ErrorState title="Preparation plan unavailable" onRetry={() => refetch()} />;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <Link href="/student/preparation" className="inline-flex items-center text-sm text-muted-foreground hover:text-heading"><ArrowLeft className="mr-1 h-4 w-4" /> Back to preparation</Link>
      <div className="rounded-3xl bg-navy-900 p-8 text-white shadow-xl">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-sm text-orange-300">Drive {plan.driveId.slice(-6)}</p><h1 className="mt-2 text-3xl font-bold">Preparation plan</h1><p className="mt-2 text-navy-100">Built from the latest verified skill match.</p></div><div className="flex gap-2"><Badge variant="outline" className="border-white/30 text-white">{plan.status}</Badge><Button variant="outline" className="border-white/30 text-white hover:bg-white/10" disabled={regenerateMutation.isPending} onClick={() => regenerateMutation.mutate(plan.id)}><RefreshCw className="mr-2 h-4 w-4" /> Regenerate</Button></div></div>
        <div className="mt-8"><div className="mb-2 flex justify-between text-sm"><span>Overall progress</span><span className="font-bold">{plan.completionPercentage}%</span></div><Progress value={plan.completionPercentage} className="bg-white/20" /></div>
      </div>

      {priorities.map((priority) => {
        const items = plan.items.filter((item) => item.priority === priority);
        if (!items.length) return null;
        return <section key={priority} className="space-y-4"><div className="flex items-center justify-between"><h2 className="text-xl font-bold text-heading">{priority} priority</h2><span className="text-sm text-muted-foreground">{items.length} action{items.length === 1 ? "" : "s"}</span></div><div className="space-y-4">{items.map((item) => <div key={item.itemId} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex flex-col justify-between gap-4 md:flex-row"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold text-heading">{item.skillName}</h3><Badge variant={item.isOptional ? "secondary" : priority === GapPriority.HIGH ? "destructive" : priority === GapPriority.MEDIUM ? "warning" : "outline"}>{item.isOptional ? "Optional" : priority}</Badge></div><p className="mt-2 text-sm text-muted-foreground">Level {item.currentLevel} currently · Level {item.requiredLevel} required · Gap {item.gapAmount}</p></div><select value={item.status} disabled={statusMutation.isPending} onChange={(event) => statusMutation.mutate({ planId: plan.id, itemId: item.itemId, status: event.target.value as PreparationItemStatus })} className="h-10 rounded-lg border px-3 text-sm"><option value={PreparationItemStatus.TODO}>To do</option><option value={PreparationItemStatus.IN_PROGRESS}>In progress</option><option value={PreparationItemStatus.COMPLETED}>Completed</option><option value={PreparationItemStatus.SKIPPED}>Skipped</option></select></div><p className="mt-4 text-sm text-muted-foreground">{item.explanation}</p><div className="mt-4 rounded-xl bg-orange-50 p-4"><p className="mb-2 text-sm font-semibold text-orange-900">Recommended actions</p><ul className="space-y-2 text-sm text-orange-950">{item.recommendedActions.map((action) => <li key={action} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />{action}</li>)}</ul></div>{item.assessmentCheckpoint && <Link href={`/student/assessments/${item.assessmentCheckpoint.assessmentId}/attempt`} className="mt-4 inline-flex items-center text-sm font-semibold text-orange-700 hover:text-orange-900">Assessment checkpoint: {item.assessmentCheckpoint.title}<ExternalLink className="ml-1 h-4 w-4" /></Link>}</div>)}</div></section>;
      })}
      {plan.items.length === 0 && <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-green-800">No current skill gaps were found for this drive. Your plan is empty and remains at 0% until new matching data creates actions.</div>}
      <p className="text-center text-xs text-muted-foreground">Completing preparation actions does not automatically verify a skill or change readiness. Verified evidence and assessed results continue to flow through the existing systems.</p>
    </div>
  );
}
