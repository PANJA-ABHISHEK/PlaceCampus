"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  Filter,
  GitCompareArrows,
  LineChart as LineChartIcon,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { ApplicationStatus } from "@placecampus/shared-types";
import {
  BarRow,
  FilterField,
  Limitations,
  NAVY,
  PageHero,
  Panel,
  PanelState,
  StatCard,
  formatPercent,
  numberFormat,
  selectClassName,
  type Tone,
} from "@/features/placement-head/components/head-ui";
import { useEvidence, usePlacements, useSkills } from "@/features/placement-head/hooks/use-head-analytics";
import { usePlacementDrives } from "@/features/drives/hooks/use-drives";
import { cn } from "@/lib/utils";

const PIPELINE: { status: string; label: string; tone: Tone }[] = [
  { status: ApplicationStatus.APPLIED, label: "Applied", tone: "blue" },
  { status: ApplicationStatus.UNDER_REVIEW, label: "Under review", tone: "violet" },
  { status: ApplicationStatus.SHORTLISTED, label: "Shortlisted", tone: "green" },
  { status: ApplicationStatus.REJECTED, label: "Rejected", tone: "rose" },
  { status: ApplicationStatus.WITHDRAWN, label: "Withdrawn", tone: "orange" },
];

export default function PlacementOutcomesPage() {
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const filters = { from: from || undefined, to: to || undefined };
  const invalidRange = Boolean(from && to && from > to);

  const placementsQuery = usePlacements(invalidRange ? {} : filters);
  const evidenceQuery = useEvidence();
  const skillsQuery = useSkills();
  const drivesQuery = usePlacementDrives();
  const p = placementsQuery.data;

  const count = (status: string) => p?.byStatus.find((s) => s.status === status)?.count ?? 0;
  const total = p?.byStatus.reduce((sum, s) => sum + s.count, 0) ?? 0;
  const shortlisted = count(ApplicationStatus.SHORTLISTED);
  const decided = shortlisted + count(ApplicationStatus.REJECTED);
  const shortlistRate = decided ? (shortlisted / decided) * 100 : null;

  const driveName = React.useMemo(() => {
    const map = new Map((drivesQuery.data ?? []).map((d) => [d.id, `${d.companyName} · ${d.roleTitle}`]));
    return (id: string) => map.get(id) ?? "Drive no longer available";
  }, [drivesQuery.data]);

  const driveRows = [...(p?.byDrive ?? [])].sort((a, b) => b.count - a.count);
  const activity = (p?.activity ?? []).map((a) => ({
    date: a.date,
    label: new Date(a.date).toLocaleDateString(undefined, { day: "numeric", month: "short" }),
    count: a.count,
  }));
  const gaps = [...(skillsQuery.data?.skills ?? [])].filter((s) => s.supplyGap > 0).sort((a, b) => b.supplyGap - a.supplyGap).slice(0, 6);
  const loading = placementsQuery.isLoading;

  return (
    <div className="-mt-1 space-y-5 sm:-mt-2 lg:-mt-4">
      <PageHero eyebrow="Placement outcomes" title="Placement" highlight="Outcomes" icon={Award}
        description="Track applications through the placement pipeline, drive by drive.">
        <FilterField label="From">
          <input type="date" className={selectClassName} value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} aria-label="Applications from date" />
        </FilterField>
        <FilterField label="To">
          <input type="date" className={selectClassName} value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-label="Applications to date" />
        </FilterField>
        {(from || to) && (
          <button type="button" onClick={() => { setFrom(""); setTo(""); }}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:border-orange-200 hover:text-[#E25A00]">
            <X className="h-4 w-4" aria-hidden="true" /> Clear
          </button>
        )}
      </PageHero>
      {invalidRange && <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">The “From” date must be on or before the “To” date.</p>}

      <section aria-label="Outcome summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Applications" icon={Send} tone="blue" loading={loading}
          value={total ? numberFormat.format(total) : null} detail={from || to ? "In the selected period" : "All recorded applications"} />
        <StatCard title="Shortlisted" icon={BadgeCheck} tone="green" loading={loading}
          value={total ? numberFormat.format(shortlisted) : null} detail={total ? `${Math.round((shortlisted / total) * 100)}% of applications` : "No applications yet"} />
        <StatCard title="Shortlist Rate" icon={GitCompareArrows} tone="violet" loading={loading}
          value={formatPercent(shortlistRate)} detail={decided ? `Of ${numberFormat.format(decided)} decided applications` : "No decisions recorded yet"} />
        <StatCard title="Verified Evidence" icon={ShieldCheck} tone="orange" loading={evidenceQuery.isLoading}
          value={formatPercent(evidenceQuery.data?.verifiedPercentage)}
          detail={evidenceQuery.data?.total ? `${numberFormat.format(evidenceQuery.data.verified)} of ${numberFormat.format(evidenceQuery.data.total)} items verified` : "No evidence submitted yet"} />
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Panel title="Application Pipeline" description="Current status of every application" icon={Filter}>
          <PanelState loading={loading} error={placementsQuery.isError} onRetry={() => void placementsQuery.refetch()}
            empty={!total} emptyIcon={Filter} emptyTitle="No applications yet" emptyText="The pipeline fills in as students apply to published drives.">
            <ul className="space-y-4">
              {PIPELINE.map((stage) => (
                <li key={stage.status}>
                  <BarRow label={stage.label} value={count(stage.status)} max={total} tone={stage.tone}
                    display={`${numberFormat.format(count(stage.status))} · ${total ? Math.round((count(stage.status) / total) * 100) : 0}%`} />
                </li>
              ))}
            </ul>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-violet-50/70 p-3">
                <p className="text-xs text-slate-500">Applied → under review</p>
                <p className="text-lg font-bold tabular-nums" style={{ color: NAVY }}>{formatPercent(p?.conversion.appliedToUnderReview) ?? "—"}</p>
              </div>
              <div className="rounded-xl bg-emerald-50/70 p-3">
                <p className="text-xs text-slate-500">Under review → shortlisted</p>
                <p className="text-lg font-bold tabular-nums" style={{ color: NAVY }}>{formatPercent(p?.conversion.underReviewToShortlisted) ?? "—"}</p>
              </div>
            </div>
          </PanelState>
        </Panel>

        <Panel title="Applications Over Time" description="Applications submitted per day" icon={LineChartIcon}>
          <PanelState loading={loading} error={placementsQuery.isError} onRetry={() => void placementsQuery.refetch()}
            empty={!activity.length} emptyIcon={LineChartIcon} emptyTitle="No application activity" emptyText="Daily application counts appear here." height={260}>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activity} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="outcomesArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF6500" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#FF6500" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 12 }} minTickGap={16} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#94A3B8", fontSize: 12 }} />
                  <Tooltip formatter={(value) => [value, "Applications"]} labelFormatter={(label) => String(label)} />
                  <Area type="monotone" dataKey="count" stroke="#FF6500" strokeWidth={2.5} fill="url(#outcomesArea)" dot={{ r: 3, fill: "#FF6500" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </PanelState>
        </Panel>
      </div>

      <Panel title="Outcomes by Drive" description="Applications and current results for each drive" icon={BriefcaseBusiness}>
        <PanelState loading={loading || drivesQuery.isLoading} error={placementsQuery.isError} onRetry={() => void placementsQuery.refetch()}
          empty={!driveRows.length} emptyIcon={BriefcaseBusiness} emptyTitle="No drive results yet" emptyText="Drives appear here once students apply to them." height={180}>
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5 sm:pl-0">Drive</th>
                  <th className="px-4 py-2.5 text-right">Applications</th>
                  <th className="px-4 py-2.5 text-right">Under review</th>
                  <th className="px-4 py-2.5 text-right">Shortlisted</th>
                  <th className="px-4 py-2.5 text-right">Rejected</th>
                  <th className="px-4 py-2.5 sm:pr-0">Shortlist share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {driveRows.map((d) => {
                  const s = d.statuses ?? {};
                  const share = d.count ? ((s[ApplicationStatus.SHORTLISTED] ?? 0) / d.count) * 100 : 0;
                  return (
                    <tr key={d.driveId} className="transition-colors hover:bg-slate-50/70">
                      <td className="max-w-[280px] truncate px-4 py-3 font-semibold sm:pl-0" style={{ color: NAVY }} title={driveName(d.driveId)}>{driveName(d.driveId)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">{numberFormat.format(d.count)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">{numberFormat.format(s[ApplicationStatus.UNDER_REVIEW] ?? 0)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-700">{numberFormat.format(s[ApplicationStatus.SHORTLISTED] ?? 0)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">{numberFormat.format(s[ApplicationStatus.REJECTED] ?? 0)}</td>
                      <td className="px-4 py-3 sm:pr-0">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${share}%` }} />
                          </div>
                          <span className="tabular-nums text-slate-600">{Math.round(share)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PanelState>
      </Panel>

      <Panel title="Skill Demand vs Supply" description="Skills drives require that too few students have verified" icon={Sparkles}>
        <PanelState loading={skillsQuery.isLoading} error={skillsQuery.isError} onRetry={() => void skillsQuery.refetch()}
          empty={!gaps.length} emptyIcon={Sparkles} emptyTitle="No skill shortfalls found" emptyText="Shortfalls appear when drives require skills that few students have verified." height={160}>
          <ul className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
            {gaps.map((g) => (
              <li key={g.skillId} className={cn("rounded-xl border border-slate-100 p-3")}>
                <BarRow label={g.skillName} value={g.studentsMeetingRequiredLevel} max={Math.max(g.requiredDemand, g.studentsMeetingRequiredLevel, 1)} tone="rose"
                  display={`short by ${numberFormat.format(g.supplyGap)}`}
                  sub={`${numberFormat.format(g.studentsMeetingRequiredLevel)} students meet the required level · needed by ${numberFormat.format(g.driveCount)} drive${g.driveCount === 1 ? "" : "s"}`} />
              </li>
            ))}
          </ul>
        </PanelState>
      </Panel>

      <Limitations items={[...(p?.limitations ?? []), ...(evidenceQuery.data?.limitations ?? []), ...(skillsQuery.data?.limitations ?? [])]} />
    </div>
  );
}
