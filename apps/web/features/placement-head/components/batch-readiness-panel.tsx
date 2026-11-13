"use client";

import * as React from "react";
import { CheckCircle2, Clock3, Cpu, Loader2, PlayCircle, RefreshCw, TriangleAlert, XCircle } from "lucide-react";
import { NAVY, Panel, PanelState, numberFormat } from "./head-ui";
import { isActive, useBatchRuns, useStartBatchRun, type BatchRun } from "../hooks/use-batch-readiness";
import { cn } from "@/lib/utils";

const ACCEPTANCE_MS = 15 * 60_000;

function duration(ms?: number) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

function scopeLabel(scope?: BatchRun["scope"] | { graduationYear?: number; department?: string } | null) {
  // An "all students" run has no scope values, and MongoDB omits the empty object.
  const parts = [scope?.graduationYear ? `Batch ${scope.graduationYear}` : null, scope?.department || null].filter(Boolean);
  return parts.length ? parts.join(" · ") : "All students";
}

const STATUS: Record<BatchRun["status"], { label: string; className: string; icon: typeof CheckCircle2 }> = {
  QUEUED: { label: "Queued", className: "bg-slate-100 text-slate-600", icon: Clock3 },
  RUNNING: { label: "Running", className: "bg-blue-50 text-blue-700", icon: Loader2 },
  COMPLETED: { label: "Completed", className: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  COMPLETED_WITH_ERRORS: { label: "Completed with errors", className: "bg-amber-50 text-amber-700", icon: TriangleAlert },
  FAILED: { label: "Failed", className: "bg-rose-50 text-rose-700", icon: XCircle },
};

function StatusBadge({ status }: { status: BatchRun["status"] }) {
  const s = STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", s.className)}>
      <s.icon className={cn("h-3 w-3", status === "RUNNING" && "animate-spin")} aria-hidden="true" />
      {s.label}
    </span>
  );
}

/**
 * Batch readiness (REQ-P06-11): recompute readiness for a cohort as a
 * background job and follow its progress. Scope follows the page filters.
 */
export function BatchReadinessPanel({ scope }: { scope: { graduationYear?: number; department?: string } }) {
  const runsQuery = useBatchRuns();
  const start = useStartBatchRun();
  const runs = runsQuery.data ?? [];
  const latest = runs[0];
  const running = isActive(latest);
  const lastCompleted = runs.find((r) => r.status === "COMPLETED" || r.status === "COMPLETED_WITH_ERRORS");

  return (
    <Panel
      title="Batch Readiness"
      description="Recompute readiness for a whole cohort as a background job (target: 5,000+ students in under 15 minutes)."
      icon={Cpu}
      action={
        <button
          type="button"
          disabled={running || start.isPending}
          onClick={() => start.mutate(scope)}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#FF6500] px-4 text-sm font-semibold text-white shadow-[0_10px_22px_-12px_rgba(255,101,0,0.9)] transition hover:bg-[#E25A00] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {start.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <PlayCircle className="h-4 w-4" aria-hidden="true" />}
          {running ? "Run in progress…" : `Recompute: ${scopeLabel(scope)}`}
        </button>
      }
    >
      {running && latest && (
        <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/50 p-4" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-semibold" style={{ color: NAVY }}>
              {scopeLabel(latest.scope)}: {numberFormat.format(latest.processed)} of {numberFormat.format(latest.total)} students
            </span>
            <span className="text-xs text-slate-500">
              Chunk {latest.chunksCompleted}/{latest.totalChunks} · {duration(latest.elapsedMs)} elapsed
            </span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-gradient-to-r from-[#FFB27A] to-[#FF6500] transition-[width] duration-500" style={{ width: `${Math.max(2, latest.progress * 100)}%` }} />
          </div>
        </div>
      )}

      {lastCompleted && !running && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Last run", duration(lastCompleted.durationMs), lastCompleted.durationMs != null && lastCompleted.durationMs < ACCEPTANCE_MS ? "Within the 15-minute target" : "Over the 15-minute target"],
            ["Students", numberFormat.format(lastCompleted.total), scopeLabel(lastCompleted.scope)],
            ["Updated", numberFormat.format(lastCompleted.updated), `${numberFormat.format(lastCompleted.unchanged)} unchanged`],
            ["Failed", numberFormat.format(lastCompleted.failed), lastCompleted.executor === "IN_PROCESS" ? "Ran in-process (no Redis)" : "Ran on the job queue"],
          ].map(([label, value, hint]) => (
            <div key={label} className="rounded-xl bg-slate-50/80 p-3">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-lg font-bold tabular-nums" style={{ color: NAVY }}>{value}</p>
              <p className="truncate text-[11px] text-slate-500" title={hint}>{hint}</p>
            </div>
          ))}
        </div>
      )}

      <PanelState loading={runsQuery.isLoading} error={runsQuery.isError} onRetry={() => void runsQuery.refetch()}
        empty={!runs.length} emptyIcon={RefreshCw} emptyTitle="No batch runs yet"
        emptyText="Start a run to recompute readiness for every student in the selected cohort." height={140}>
        <div className="-mx-4 overflow-x-auto sm:mx-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5 sm:pl-0">Started</th>
                <th className="px-4 py-2.5">Scope</th>
                <th className="px-4 py-2.5 text-right">Students</th>
                <th className="px-4 py-2.5 text-right">Updated</th>
                <th className="px-4 py-2.5 text-right">Failed</th>
                <th className="px-4 py-2.5 text-right">Duration</th>
                <th className="px-4 py-2.5 sm:pr-0">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-slate-50/70">
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600 sm:pl-0">
                    {new Date(run.startedAt ?? run.createdAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-2.5 font-medium" style={{ color: NAVY }}>{scopeLabel(run.scope)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{numberFormat.format(run.total)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{numberFormat.format(run.updated)}</td>
                  <td className={cn("px-4 py-2.5 text-right tabular-nums", run.failed ? "font-semibold text-rose-600" : "text-slate-700")}>{numberFormat.format(run.failed)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{isActive(run) ? duration(run.elapsedMs) : duration(run.durationMs)}</td>
                  <td className="px-4 py-2.5 sm:pr-0"><StatusBadge status={run.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelState>
    </Panel>
  );
}
