'use client';

import * as React from 'react';
import type { ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, CalendarCheck, Download, RotateCcw, Send, Star, TrendingUp, UsersRound } from 'lucide-react';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { useRecruiterAnalytics } from '@/features/recruiter/hooks/use-recruiter-portal';
import type { RecruiterAnalytics, RecruiterAnalyticsFilters } from '@/features/recruiter/hooks/use-recruiter-portal';
import { applicationStatuses } from '@/features/recruiter/components/recruiter-candidate-directory';

const panel = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5';
const inputClass = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-[#142b4d] outline-none focus:border-[#ff6b1a] focus:ring-2 focus:ring-[#ff6b1a]/15';
const axisTick = { fill: '#64748b', fontSize: 11 };
const ink = { primary: '#142b4d', muted: '#64748b' };
/** Validated categorical palette, assigned to entities in a fixed order (never by rank). */
const series = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6'];
const branchOrder = ['Computer Science Engineering', 'Information Technology', 'Electronics and Communication', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering'];
const branchColor = (branch: string) => series[branchOrder.indexOf(branch)] ?? series[6];
const stageLabel: Record<string, string> = Object.fromEntries(applicationStatuses);
const isoDay = (offsetDays: number) => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
const presets = [
  { label: 'Last 30 days', from: () => isoDay(-30) },
  { label: 'Last 90 days', from: () => isoDay(-90) },
  { label: 'Last 12 months', from: () => isoDay(-365) },
];
const shortDate = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });
const csvCell = (value: string | number | null) => {
  const raw = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
};

export default function RecruiterAnalyticsPage() {
  const [filters, setFilters] = React.useState<RecruiterAnalyticsFilters>({ from: isoDay(-90), to: isoDay(0) });
  const query = useRecruiterAnalytics(filters);
  const data = query.data;
  const setFilter = (key: keyof RecruiterAnalyticsFilters) => (value: string) => setFilters((current) => ({ ...current, [key]: value || undefined }));

  const exportCsv = (analytics: RecruiterAnalytics) => {
    const headers = ['Company', 'Role', 'Drive status', 'Applicants', 'Shortlisted or later', 'Interviews', 'Offers', 'Selected', 'Rejected'];
    const rows = analytics.drives.map((drive) => [drive.companyName, drive.roleTitle, drive.lifecycle, drive.applicants, drive.shortlisted, drive.interviews, drive.offers, drive.selected, drive.rejected]);
    const content = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`﻿${content}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `placecampus-recruitment-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return <div className="mx-auto max-w-[1440px] space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">Recruiter workspace</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-[#142b4d]">Analytics &amp; reports</h1><p className="mt-1 text-sm text-slate-600">Aggregated from application and interview records on drives assigned to you.</p></div>
      <Button onClick={() => data && exportCsv(data)} disabled={!data?.drives.length} className="h-10 rounded-xl bg-[#ff6b1a] px-4 text-white hover:bg-[#e95b0c]"><Download className="h-4 w-4" />Download drive report</Button>
    </header>

    <section aria-label="Analytics filters" className={`${panel} grid gap-3 md:grid-cols-3 xl:grid-cols-[repeat(2,minmax(130px,0.8fr))_repeat(4,minmax(150px,1fr))_auto] xl:items-end`}>
      <Field label="From"><input type="date" value={filters.from ?? ''} max={filters.to} onChange={(event) => setFilter('from')(event.target.value)} className={inputClass} /></Field>
      <Field label="To"><input type="date" value={filters.to ?? ''} min={filters.from} onChange={(event) => setFilter('to')(event.target.value)} className={inputClass} /></Field>
      <Field label="Company"><select value={filters.company ?? ''} onChange={(event) => setFilters((current) => ({ ...current, company: event.target.value || undefined, driveId: undefined }))} className={inputClass}><option value="">All companies</option>{[...new Set((data?.filterOptions.drives ?? []).map((drive) => drive.companyName))].sort().map((company) => <option key={company}>{company}</option>)}</select></Field>
      <Field label="Placement drive"><select value={filters.driveId ?? ''} onChange={(event) => setFilter('driveId')(event.target.value)} className={inputClass}><option value="">All drives</option>{(data?.filterOptions.drives ?? []).filter((drive) => !filters.company || drive.companyName === filters.company).map((drive) => <option key={drive.driveId} value={drive.driveId}>{drive.companyName} · {drive.roleTitle}</option>)}</select></Field>
      <Field label="Academic branch"><select value={filters.department ?? ''} onChange={(event) => setFilter('department')(event.target.value)} className={inputClass}><option value="">All branches</option>{[...new Set([...branchOrder, ...(data?.filterOptions.departments ?? [])])].map((branch) => <option key={branch}>{branch}</option>)}</select></Field>
      <Field label="Application status"><select value={filters.status ?? ''} onChange={(event) => setFilter('status')(event.target.value)} className={inputClass}><option value="">All statuses</option>{applicationStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
      <div className="flex flex-wrap gap-2 md:col-span-3 xl:col-span-1">
        <Button type="button" variant="ghost" onClick={() => setFilters({ from: isoDay(-90), to: isoDay(0) })} className="h-10 rounded-xl text-slate-500"><RotateCcw className="h-4 w-4" />Reset</Button>
      </div>
      <div className="flex flex-wrap gap-2 md:col-span-3 xl:col-span-7">
        {presets.map((preset) => <button key={preset.label} type="button" onClick={() => setFilters((current) => ({ ...current, from: preset.from(), to: isoDay(0) }))} className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${filters.from === preset.from() && filters.to === isoDay(0) ? 'border-orange-300 bg-orange-50 text-orange-800' : 'border-slate-200 text-slate-600 hover:border-orange-200'}`}>{preset.label}</button>)}
        <button type="button" onClick={() => setFilters((current) => ({ ...current, from: undefined, to: undefined }))} className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${!filters.from && !filters.to ? 'border-orange-300 bg-orange-50 text-orange-800' : 'border-slate-200 text-slate-600 hover:border-orange-200'}`}>All time</button>
        {query.isFetching && !query.isLoading && <span className="self-center text-xs text-slate-400">Updating…</span>}
      </div>
    </section>

    {query.isLoading ? <AnalyticsSkeleton /> : query.isError || !data ? <ErrorState title="Could not load analytics" description="The authorized drive and application aggregates could not be retrieved." onRetry={() => void query.refetch()} /> : !data.filterOptions.drives.length ? <EmptyState icon={<Activity className="h-8 w-8" />} title="No analytics to show yet" description="Drive and applicant reports will appear after a placement officer assigns a drive to your account." /> : <AnalyticsBody data={data} />}
  </div>;
}

function AnalyticsBody({ data }: { data: RecruiterAnalytics }) {
  const { overview, applications, drives, branches } = data;
  const sel = overview.selection;
  const iv = overview.interviews;
  const status = overview.statusShared;
  const points = applications.points.map((point) => ({ ...point, label: shortDate(point.date) }));
  const hasTrend = points.some((point) => point.applications > 0);
  const hasHiring = points.some((point) => point.shortlisted + point.offers + point.selected > 0);
  const driveData = drives.filter((drive) => drive.applicants > 0).map((drive) => ({ ...drive, label: drive.companyName.length > 18 ? `${drive.companyName.slice(0, 17)}…` : drive.companyName }));
  const funnelMax = Math.max(1, ...overview.funnel.stages.map((stage) => stage.reached));
  const branchTotal = branches.items.reduce((sum, item) => sum + item.applications, 0);

  if (overview.totalApplications === 0) {
    return <EmptyState icon={<Activity className="h-8 w-8" />} title="No applications match these filters" description="Widen the date range or clear a filter to see analytics." />;
  }

  return <>
    <section aria-label="Summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard label="Total applications" value={overview.totalApplications.toLocaleString()} detail={`${overview.uniqueApplicants.toLocaleString()} unique students`} icon={<UsersRound className="h-5 w-5" />} />
      <SummaryCard label="Selected candidates" value={status ? sel.selected.toLocaleString() : '—'} detail={status ? `${sel.selectionRate}% selection rate` : 'Status not shared'} icon={<Star className="h-5 w-5" />} />
      <SummaryCard label="Offers released" value={status ? sel.offersReleased.toLocaleString() : '—'} detail={status ? `${sel.offerAcceptanceRate}% accepted (selected)` : 'Status not shared'} icon={<Send className="h-5 w-5" />} />
      <SummaryCard label="Interviews" value={iv.total.toLocaleString()} detail={`${iv.completed} completed · ${iv.upcoming} upcoming`} icon={<CalendarCheck className="h-5 w-5" />} />
    </section>

    <section className="grid gap-5 xl:grid-cols-2">
      <ChartPanel title="Application trends" description={`Applications received per ${applications.bucket} in the selected range.`}>
        {hasTrend ? <ResponsiveContainer width="100%" height="100%"><LineChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: -18 }}><CartesianGrid stroke="#edf0f4" vertical={false} /><XAxis dataKey="label" tick={axisTick} minTickGap={24} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} /><YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} /><Tooltip cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }} formatter={(value) => [value, 'Applications']} labelStyle={{ color: ink.primary, fontWeight: 600 }} /><Line type="monotone" dataKey="applications" stroke={series[0]} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} /></LineChart></ResponsiveContainer> : <NoData text="No applications in this range." />}
      </ChartPanel>
      <ChartPanel title="Hiring trends" description={`Shortlists, offers and selections per ${applications.bucket}, dated by the latest status decision.`}>
        {!status ? <NoData text="Application status is not shared for these drives." /> : hasHiring ? <ResponsiveContainer width="100%" height="100%"><LineChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: -18 }}><CartesianGrid stroke="#edf0f4" vertical={false} /><XAxis dataKey="label" tick={axisTick} minTickGap={24} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} /><YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} /><Tooltip cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }} labelStyle={{ color: ink.primary, fontWeight: 600 }} /><Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: ink.muted }} /><Line name="Shortlisted+" type="monotone" dataKey="shortlisted" stroke={series[0]} strokeWidth={2} dot={false} /><Line name="Offers" type="monotone" dataKey="offers" stroke={series[1]} strokeWidth={2} dot={false} /><Line name="Selected" type="monotone" dataKey="selected" stroke={series[2]} strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer> : <NoData text="No hiring decisions in this range." />}
      </ChartPanel>
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <ChartPanel title="Drive-wise applicants" description="Applications per assigned drive for the current filters.">
        {driveData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={driveData} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }} barCategoryGap={6}><CartesianGrid stroke="#edf0f4" horizontal={false} /><XAxis type="number" allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="label" width={140} tick={axisTick} tickLine={false} axisLine={false} /><Tooltip cursor={{ fill: '#f8fafc' }} formatter={(value) => [value, 'Applicants']} labelFormatter={(_, payload) => { const p = payload?.[0]?.payload; return p ? `${p.companyName} · ${p.roleTitle}` : ''; }} /><Bar dataKey="applicants" fill="#ff6b1a" radius={[0, 4, 4, 0]} maxBarSize={22} label={{ position: 'right', fill: ink.muted, fontSize: 11 }} /></BarChart></ResponsiveContainer> : <NoData text="No drive has applications for these filters." />}
      </ChartPanel>
      <ChartPanel title="Branch-wise distribution" description="Share of applications by academic branch." tall={false}>
        {!branches.shared ? <NoData text="Branch information is not shared for these drives." /> : branches.items.length ? <div className="grid h-full grid-cols-[150px_1fr] items-center gap-4">
          <div className="h-[150px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={branches.items} dataKey="applications" nameKey="branch" innerRadius={46} outerRadius={70} paddingAngle={2} stroke="#fff" strokeWidth={2}>{branches.items.map((item) => <Cell key={item.branch} fill={branchColor(item.branch)} />)}</Pie><Tooltip formatter={(value, _name, item) => [`${value} applications · ${item?.payload?.students ?? 0} students`, item?.payload?.branch]} /></PieChart></ResponsiveContainer></div>
          <ul className="space-y-1.5 text-sm">{branches.items.map((item) => <li key={item.branch} className="flex items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: branchColor(item.branch) }} /><span className="truncate" title={item.branch}>{item.branch}</span></span><span className="shrink-0 tabular-nums font-semibold text-[#142b4d]">{item.applications} <span className="text-xs font-normal text-slate-500">({Math.round((item.applications / branchTotal) * 100)}%)</span></span></li>)}</ul>
        </div> : <NoData text="No branch data for these filters." />}
      </ChartPanel>
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <div className={panel}>
        <h2 className="font-semibold text-[#142b4d]">Recruitment funnel</h2>
        <p className="mt-1 text-xs text-slate-500">Bar = applications that reached each stage; the number in brackets is how many are at that stage now. Rejected applications are shown separately.</p>
        {!status ? <NoData text="Application status is not shared for these drives." /> : <ol className="mt-4 space-y-3">
          {overview.funnel.stages.map((stage, index) => <li key={stage.status}>
            <div className="mb-1 flex items-center justify-between text-sm"><span className="text-slate-600">{stageLabel[stage.status] ?? stage.status}</span><span className="tabular-nums text-[#142b4d]"><b>{stage.reached.toLocaleString()}</b> <span className="text-xs text-slate-500">({stage.count} now{index > 0 ? ` · ${stage.conversionFromPrevious}% from previous` : ''})</span></span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${Math.max(stage.reached ? 2 : 0, (stage.reached / funnelMax) * 100)}%`, backgroundColor: series[0], opacity: 1 - index * 0.11 }} /></div>
          </li>)}
          <li className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm"><span className="text-slate-600">Rejected</span><span className="tabular-nums font-semibold text-[#142b4d]">{overview.funnel.rejected.toLocaleString()} <span className="text-xs font-normal text-slate-500">({overview.funnel.rejectionRate ?? 0}% of applications)</span></span></li>
        </ol>}
      </div>
      <div className="grid gap-5">
        <div className={panel}>
          <h2 className="font-semibold text-[#142b4d]">Selection analytics</h2>
          {status ? <dl className="mt-3 grid grid-cols-2 gap-3">
            <Metric label="Selected" value={sel.selected} /><Metric label="Offers released" value={sel.offersReleased} />
            <Metric label="Selection rate" value={`${sel.selectionRate}%`} /><Metric label="Rejection rate" value={`${sel.rejectionRate}%`} />
            <Metric label="Shortlist rate" value={`${sel.shortlistRate}%`} hint="Reached shortlist or beyond" /><Metric label="Interview conversion" value={`${sel.interviewConversionRate}%`} hint="Interview stage → offer" />
          </dl> : <NoData text="Application status is not shared." />}
        </div>
        <div className={panel}>
          <h2 className="font-semibold text-[#142b4d]">Interview analytics</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            <Metric label="Scheduled (pending)" value={iv.scheduled} hint={`${iv.upcoming} upcoming · ${iv.pendingFeedback} awaiting feedback`} /><Metric label="Completed" value={iv.completed} />
            <Metric label="Total rounds" value={iv.total} /><Metric label="Success rate" value={`${iv.successRate}%`} hint="Completed rounds recommended to advance" />
          </dl>
        </div>
      </div>
    </section>

    <section className={panel}>
      <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-orange-600" /><h2 className="font-semibold text-[#142b4d]">Drive report</h2></div>
      <p className="mt-1 text-xs text-slate-500">Table view of the drive chart. Shortlisted counts include candidates who progressed further.</p>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3 font-semibold">Company &amp; role</th><th className="px-3 py-3 font-semibold">Drive status</th>{['Applicants', 'Shortlisted', 'Interviews', 'Offers', 'Selected', 'Rejected'].map((h) => <th key={h} className="px-3 py-3 text-right font-semibold">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{drives.map((drive) => <tr key={drive.driveId}><td className="px-3 py-3"><p className="font-semibold text-[#142b4d]">{drive.companyName}</p><p className="text-xs text-slate-500">{drive.roleTitle}</p></td><td className="px-3 py-3 capitalize text-slate-600">{drive.lifecycle.toLowerCase()}</td>{[drive.applicants, drive.shortlisted, drive.interviews, drive.offers, drive.selected, drive.rejected].map((value, index) => <td key={index} className="px-3 py-3 text-right tabular-nums text-slate-700">{value ?? 'Not shared'}</td>)}</tr>)}</tbody></table></div>
    </section>
  </>;
}

function ChartPanel({ title, description, children, tall = true }: { title: string; description: string; children: ReactNode; tall?: boolean }) {
  return <div className={panel}><h2 className="font-semibold text-[#142b4d]">{title}</h2><p className="mt-1 text-xs text-slate-500">{description}</p><div className={`mt-4 ${tall ? 'h-[280px]' : 'min-h-[180px]'}`}>{children}</div></div>;
}

function NoData({ text }: { text: string }) {
  return <div className="flex h-full min-h-32 items-center justify-center rounded-xl bg-slate-50 px-5 text-center text-sm text-slate-500">{text}</div>;
}

function Metric({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-0.5 text-xl font-bold tabular-nums text-[#142b4d]">{typeof value === 'number' ? value.toLocaleString() : value}</dd>{hint && <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{hint}</p>}</div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block min-w-0 text-xs font-semibold text-slate-600">{label}<span className="mt-1.5 block">{children}</span></label>;
}

function SummaryCard({ label, value, detail, icon }: { label: string; value: number | string; detail: string; icon: ReactNode }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-700">{icon}</span><span className="text-2xl font-bold tabular-nums text-[#142b4d]">{value}</span></div><h2 className="mt-3 text-sm font-semibold text-[#142b4d]">{label}</h2><p className="mt-0.5 text-xs text-slate-500">{detail}</p></article>;
}

function AnalyticsSkeleton() {
  return <div className="space-y-5" aria-busy="true" aria-label="Loading analytics"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />)}</div><div className="grid gap-5 xl:grid-cols-2">{[0, 1].map((item) => <div key={item} className="h-[360px] animate-pulse rounded-2xl border border-slate-200 bg-white" />)}</div></div>;
}
