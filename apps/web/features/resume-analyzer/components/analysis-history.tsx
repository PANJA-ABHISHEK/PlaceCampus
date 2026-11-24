"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Briefcase, Eye, FileText, GitCompareArrows, History, Loader2, Trash2 } from "lucide-react";
import type { ResumeAnalysisSummary } from "@placecampus/shared-types";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreBandPill, ScoreDelta } from "./ats-score-ring";
import { formatAnalysisDate, formatDistinctDate, getScoreBand } from "../lib/resume-analyzer-meta";

const cardClassName = "rounded-[20px] border border-[hsl(var(--border))] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6";

/* ───────────── Trend (one series: no legend; hover tooltip; table for screen readers) ───────────── */

function TrendTooltip({ active, payload }: { active?: boolean; payload?: { payload: { score: number; date: string; file: string } }[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-white px-3 py-2 text-xs shadow-[var(--shadow-md)]">
      <p className="font-semibold text-[hsl(var(--foreground))]">{point.score}/100 · {getScoreBand(point.score).label}</p>
      <p className="text-[hsl(var(--muted-foreground))]">{formatAnalysisDate(point.date)}</p>
      <p className="max-w-[200px] truncate text-[hsl(var(--muted-foreground))]">{point.file}</p>
    </div>
  );
}

function ScoreTrend({ rows }: { rows: ResumeAnalysisSummary[] }) {
  const dates = rows.map((row) => row.createdAt);
  const data = [...rows].reverse().map((row) => ({ score: row.overallScore, date: row.createdAt, file: row.fileName, label: formatDistinctDate(row.createdAt, dates) }));
  return (
    <figure>
      <figcaption className="text-sm font-semibold text-[hsl(var(--foreground))]">Estimated ATS score over time</figcaption>
      <div className="mt-3 h-[180px]" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="0" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip content={<TrendTooltip />} cursor={{ stroke: "hsl(var(--muted-foreground) / 0.4)", strokeWidth: 1 }} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, stroke: "white", fill: "hsl(var(--primary))" }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: "white" }}
              isAnimationActive
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Estimated ATS score by analysis date</caption>
        <thead><tr><th>Date</th><th>Score</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.date}><td>{formatAnalysisDate(d.date)}</td><td>{d.score}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

/* ───────────── Compare ───────────── */

function CompareAnalyses({ rows, currentId }: { rows: ResumeAnalysisSummary[]; currentId: string }) {
  const current = rows.find((row) => row.id === currentId) ?? rows[0];
  const others = rows.filter((row) => row.id !== current.id);
  const [chosenId, setOtherId] = React.useState<string>(others[0]?.id ?? "");
  // Fall back to the most recent other analysis when the chosen one is gone or is now the one being viewed.
  const other = others.find((row) => row.id === chosenId) ?? others[0];
  const otherId = other?.id ?? "";
  if (!other) return null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[hsl(var(--foreground))]">
          <GitCompareArrows className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden="true" />
          Compare with an earlier analysis
        </h3>
        <label className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
          <span className="sr-only">Earlier analysis</span>
          <select
            value={otherId}
            onChange={(event) => setOtherId(event.target.value)}
            className="h-9 max-w-[260px] rounded-lg border border-[hsl(var(--input))] bg-white px-2.5 text-xs font-medium text-[hsl(var(--foreground))] focus:border-[hsl(var(--primary))] focus:outline-none"
          >
            {others.map((row) => (
              <option key={row.id} value={row.id}>
                {formatAnalysisDate(row.createdAt)} · {row.overallScore}/100
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] text-left text-xs text-[hsl(var(--muted-foreground))]">
              <th className="py-2 pr-3 font-medium">Category</th>
              <th className="py-2 pr-3 text-right font-medium">{formatDistinctDate(other.createdAt, [other.createdAt, current.createdAt])}</th>
              <th className="py-2 pr-3 text-right font-medium">{formatDistinctDate(current.createdAt, [other.createdAt, current.createdAt])}</th>
              <th className="py-2 text-right font-medium">Change</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[hsl(var(--border))] font-semibold">
              <td className="py-2 pr-3">Overall</td>
              <td className="py-2 pr-3 text-right tabular-nums">{other.overallScore}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{current.overallScore}</td>
              <td className="py-2 text-right"><ScoreDelta delta={current.overallScore - other.overallScore} suffix="" /></td>
            </tr>
            {current.categories.map((category) => {
              const before = other.categories.find((c) => c.key === category.key)?.score;
              return (
                <tr key={category.key} className="border-b border-[hsl(var(--border)/0.6)] last:border-0">
                  <td className="py-2 pr-3 text-[hsl(var(--foreground)/0.85)]">{category.label}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-[hsl(var(--muted-foreground))]">{before ?? "–"}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{category.score}</td>
                  <td className="py-2 text-right">{before === undefined ? "–" : <ScoreDelta delta={category.score - before} suffix="" />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
        Comparing the analysis you are viewing ({current.fileName}) with {other.fileName}.
        {current.targetRole !== other.targetRole && ` Note: they were assessed for different roles (${current.targetRole} vs ${other.targetRole}).`}
      </p>
    </div>
  );
}

/* ───────────── Delete dialog ───────────── */

function DeleteAnalysisDialog({
  row,
  isDeleting,
  onConfirm,
  onOpenChange,
}: {
  row: ResumeAnalysisSummary | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <DialogPrimitive.Root open={!!row} onOpenChange={(open) => !isDeleting && onOpenChange(open)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="pc-overlay fixed inset-0 z-[var(--z-overlay)] bg-[hsl(var(--color-navy-dark)/0.45)] backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          role="alertdialog"
          className="pc-modal fixed left-1/2 top-1/2 z-[var(--z-modal)] w-[calc(100vw-2rem)] max-w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-[var(--shadow-2xl)] focus:outline-none"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <Trash2 className="h-6 w-6" aria-hidden="true" />
          </span>
          <DialogPrimitive.Title className="mt-4 text-lg font-bold text-[hsl(var(--foreground))]">Delete this analysis?</DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1.5 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
            The analysis of <strong className="text-[hsl(var(--foreground))]">{row?.fileName}</strong> from{" "}
            {row ? formatAnalysisDate(row.createdAt) : ""} will be permanently removed. Your uploaded resume is not affected.
          </DialogPrimitive.Description>
          <div className="mt-6 flex justify-end gap-2">
            <DialogPrimitive.Close
              disabled={isDeleting}
              className="inline-flex h-10 items-center rounded-xl border border-[hsl(var(--border))] bg-white px-4 text-sm font-semibold text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))] disabled:opacity-50"
            >
              Cancel
            </DialogPrimitive.Close>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="inline-flex h-10 min-w-[110px] items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Delete
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/* ───────────── History ───────────── */

export function AnalysisHistory({
  rows,
  isLoading,
  isError,
  onRetry,
  selectedId,
  onView,
  onDelete,
  deletingId,
}: {
  rows: ResumeAnalysisSummary[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  selectedId: string | null;
  onView: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  deletingId: string | null;
}) {
  const [pendingDelete, setPendingDelete] = React.useState<ResumeAnalysisSummary | null>(null);

  return (
    <section aria-labelledby="history-title" className={cardClassName}>
      <h2 id="history-title" className="flex items-center gap-2 text-lg font-bold text-[hsl(var(--foreground))]">
        <History className="h-5 w-5 text-[hsl(var(--primary))]" aria-hidden="true" />
        Analysis history
      </h2>
      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Every analysis you run is saved here. Only you can see them.</p>

      {isLoading ? (
        <div className="mt-5 space-y-3">
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : isError ? (
        <ErrorState title="Couldn't load your history" description="Check your connection and try again." onRetry={onRetry} className="py-10" />
      ) : !rows?.length ? (
        <EmptyState
          icon={<FileText className="h-8 w-8 text-[hsl(var(--muted-foreground))]" />}
          title="No analyses yet"
          description="Upload your resume and run your first analysis to start tracking your score."
          className="py-10"
        />
      ) : (
        <div className="mt-5 space-y-6">
          {rows.length >= 2 && <ScoreTrend rows={rows} />}

          <ul className="divide-y divide-[hsl(var(--border))] rounded-2xl border border-[hsl(var(--border))]">
            {rows.map((row, index) => {
              const previous = rows[index + 1];
              const isSelected = row.id === selectedId;
              return (
                <li key={row.id} className={cn("flex flex-col gap-3 p-4 sm:flex-row sm:items-center", isSelected && "bg-[hsl(var(--primary)/0.04)]")}>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[hsl(var(--muted)/0.7)]">
                      <span className="text-base font-extrabold leading-none text-[hsl(var(--foreground))]">{row.overallScore}</span>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))]">/100</span>
                    </span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-[hsl(var(--foreground))]" title={row.fileName}>{row.fileName}</span>
                        <ScoreBandPill score={row.overallScore} className="px-2 py-0.5 text-[11px]" />
                        {index === 0 && <span className="rounded-full bg-[hsl(var(--primary)/0.1)] px-2 py-0.5 text-[11px] font-semibold text-[hsl(var(--primary))]">Latest</span>}
                      </p>
                      <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                        {formatAnalysisDate(row.createdAt)} · {row.targetRole}
                        {previous && <> · <ScoreDelta delta={row.overallScore - previous.overallScore} suffix="vs previous" /></>}
                      </p>
                      {row.jobMatchScore !== null && (
                        <p className="mt-1 flex items-start gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                          <Briefcase className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span className="line-clamp-1">
                            Job match {row.jobMatchScore}/100{row.jobTitle ? ` · ${row.jobTitle}` : ""}
                            {row.jobDescriptionExcerpt ? ` · “${row.jobDescriptionExcerpt}”` : ""}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => onView(row.id)}
                      aria-pressed={isSelected}
                      className={cn(
                        "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition-colors",
                        isSelected
                          ? "border-[hsl(var(--primary)/0.4)] bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))]"
                          : "border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]",
                      )}
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      {isSelected ? "Viewing" : "View"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(row)}
                      disabled={deletingId === row.id}
                      aria-label={`Delete analysis of ${row.fileName} from ${formatAnalysisDate(row.createdAt)}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      {deletingId === row.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {rows.length >= 2 && selectedId && <CompareAnalyses rows={rows} currentId={selectedId} />}
        </div>
      )}

      <DeleteAnalysisDialog
        row={pendingDelete}
        isDeleting={!!pendingDelete && deletingId === pendingDelete.id}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await onDelete(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </section>
  );
}
