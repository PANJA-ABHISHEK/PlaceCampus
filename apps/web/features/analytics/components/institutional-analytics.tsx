"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  GraduationCap,
  Layers3,
  RefreshCw,
  Users,
} from "lucide-react";
import { ApplicationStatus } from "@placecampus/shared-types";
import type { AnalyticsReadiness } from "@placecampus/shared-types";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";
import { useAnalytics } from "../hooks/use-analytics";

const numberFormat = new Intl.NumberFormat("en-IN");
const orange = "#FF6B1A";
const navy = "#142B4D";
const readinessColors = ["#FF6B1A", "#FFB07F", "#F7D7C5", "#A9B6C8", "#244C7A"];
const statusColors = [orange, navy, "#F28B50", "#6C819E", "#F6C5A8"];

type DepartmentDatum = { group: string; count: number; average: number };
type StatusDatum = { status: string; count: number };

export function InstitutionalAnalytics({ roleLabel }: { roleLabel: string }) {
  const [department, setDepartment] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const filters = {
    department: department || undefined,
    graduationYear: graduationYear ? Number(graduationYear) : undefined,
  };
  const analytics = useAnalytics(filters);
  const queries = Object.values(analytics);
  const isRefreshing = queries.some((query) => query.isFetching);
  const optionsQuery = useQuery({
    queryKey: ["analytics", "readiness", "filter-options"],
    queryFn: () => apiClient.get<AnalyticsReadiness>("/analytics/readiness"),
    enabled: Boolean(department || graduationYear),
    staleTime: 5 * 60_000,
  });

  const overview = analytics.overview.data;
  const readiness = analytics.readiness.data;
  const skills = analytics.skills.data;
  const placements = analytics.placements.data;
  const evidence = analytics.evidence.data;
  const preparation = analytics.preparation.data;
  const errors = queries.filter((query) => query.isError);
  const retry = () => {
    void Promise.all(queries.map((query) => query.refetch()));
    if (optionsQuery.isError) void optionsQuery.refetch();
  };
  const refresh = async () => {
    await Promise.all(queries.map((query) => query.refetch()));
    if (department || graduationYear) await optionsQuery.refetch();
  };

  const globalReadinessOptions = optionsQuery.data ?? readiness;
  const departmentOptions = useMemo(() => unique([
    ...(globalReadinessOptions?.byDepartment ?? []).map((item) => cleanDepartment(item.group)),
    ...(readiness?.byDepartment ?? []).map((item) => cleanDepartment(item.group)),
  ]), [globalReadinessOptions, readiness]);
  const graduationYearOptions = useMemo(() => unique([
    ...(globalReadinessOptions?.byGraduationYear ?? []).map((item) => String(item.graduationYear)),
    ...(readiness?.byGraduationYear ?? []).map((item) => String(item.graduationYear)),
  ]).filter((year) => year !== "Unknown"), [globalReadinessOptions, readiness]);

  const readinessRows: DepartmentDatum[] = aggregateRows(
    readiness?.byDepartment ?? [],
    (item) => cleanDepartment(item.group),
    (item) => item.count,
    (item) => item.average,
  );
  const applicationRows: StatusDatum[] = aggregateRows(
    placements?.byStatus ?? [],
    (item) => item.status,
    (item) => item.count,
  );
  const readinessDistribution = aggregateRows(
    readiness?.byStatus ?? [],
    (item) => item.status,
    (item) => item.count,
  );
  const totalApplications = applicationRows.reduce((sum, item) => sum + item.count, 0);
  const readinessTotal = readinessDistribution.reduce((sum, item) => sum + item.count, 0);
  const maxDataUpdatedAt = Math.max(0, ...queries.map((query) => query.dataUpdatedAt));
  const updatedAt = maxDataUpdatedAt || null;
  const hasFilter = Boolean(department || graduationYear);
  const isInitialLoading = queries.some((query) => query.isLoading);

  const orderedApplications = useMemo(() => {
    const counts = new Map((placements?.byStatus ?? []).map((item) => [item.status, item.count]));
    return Object.values(ApplicationStatus).map((status) => ({ status, count: counts.get(status) ?? 0 }));
  }, [placements?.byStatus]);

  const highestDepartment = readinessRows.length
    ? [...readinessRows].sort((a, b) => b.average - a.average)[0]
    : undefined;
  const leadingReadiness = readinessDistribution.length
    ? [...readinessDistribution].sort((a, b) => b.count - a.count)[0]
    : undefined;

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-8">
      <section className="flex flex-col gap-5 rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-[0_8px_30px_-26px_rgba(20,43,77,0.25)] sm:p-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8B98A9]">Admin <span className="px-1.5 text-[#C4CCD6]">/</span> Institutional Analytics</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#F45D16]">{roleLabel} · Institutional performance</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#142B4D]">Institutional Analytics</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66758A]">Aggregate readiness, demand, evidence, applications, and preparation signals.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[530px] xl:grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_auto] xl:items-end">
          <FilterSelect label="Department" value={department} onValueChange={setDepartment} options={departmentOptions} placeholder="All departments" />
          <FilterSelect label="Graduation year" value={graduationYear} onValueChange={setGraduationYear} options={graduationYearOptions} placeholder="All years" />
          <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-1">
            <span className="hidden h-10 items-center gap-2 whitespace-nowrap rounded-xl border border-[#E7EBF0] bg-[#FAFBFC] px-3 text-[11px] text-[#718096] 2xl:flex"><Clock3 className="h-3.5 w-3.5 text-[#FF6B1A]" />{updatedAt ? `Updated ${new Date(updatedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}` : "Not updated yet"}</span>
            <button type="button" onClick={() => void refresh()} disabled={isRefreshing} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-[#FF6B1A]/35 bg-white px-4 text-sm font-semibold text-[#E85C14] transition hover:bg-[#FFF5EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B1A]/35 disabled:cursor-wait disabled:opacity-60 xl:flex-none"><RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />Refresh</button>
          </div>
          {updatedAt && <span className="text-[11px] text-[#8793A3] sm:col-span-2 2xl:hidden">Last updated {new Date(updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>}
        </div>
      </section>

      {errors.length > 0 && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><span>Some analytics could not be refreshed. Available data is still shown.</span><button type="button" onClick={retry} className="font-semibold underline underline-offset-2">Retry analytics</button></div>}
      {hasFilter && <div className="flex flex-wrap items-center gap-2 text-xs text-[#718096]"><span className="font-semibold text-[#53647A]">Current scope</span>{department && <FilterPill label={department} onRemove={() => setDepartment("")} />}{graduationYear && <FilterPill label={`Class of ${graduationYear}`} onRemove={() => setGraduationYear("")} />}<button type="button" onClick={() => { setDepartment(""); setGraduationYear(""); }} className="ml-1 font-semibold text-[#E85C14] hover:underline">Clear filters</button></div>}

      <section aria-label="Analytics key metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Users} label="Registered Students" value={overview?.students.registered} note="Student accounts in the institution" loading={analytics.overview.isLoading} tone="orange" />
        <Metric icon={GraduationCap} label="Usable Profiles" value={overview?.students.usableProfiles} note={hasFilter ? "Profiles matching the selected scope" : "Profiles ready for institutional reporting"} loading={analytics.overview.isLoading} tone="navy" />
        <Metric icon={BarChart3} label="Average Readiness" value={overview?.readiness.average == null ? undefined : `${overview.readiness.average}%`} note={`${numberFormat.format(overview?.students.withReadinessSnapshots ?? 0)} latest readiness snapshots`} loading={analytics.overview.isLoading} tone="orange" />
        <Metric icon={BriefcaseBusiness} label="Published Drives" value={overview?.drives.published} note="Currently published placement drives" loading={analytics.overview.isLoading} tone="navy" />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ChartCard icon={BarChart3} title="Readiness by Department" description="Average score from each department’s latest valid student snapshots." isLoading={analytics.readiness.isLoading} error={analytics.readiness.isError} onRetry={() => void analytics.readiness.refetch()} empty={!readinessRows.length} emptyText="No readiness snapshots are available for this scope.">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={readinessRows} margin={{ top: 16, right: 14, left: 0, bottom: 10 }}>
              <CartesianGrid vertical={false} stroke="#E7ECF2" strokeDasharray="3 5" />
              <XAxis dataKey="group" tick={{ fill: "#66758A", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "#D9E0E8" }} interval={0} tickFormatter={shortLabel} />
              <YAxis domain={[0, 100]} unit="%" width={45} tick={{ fill: "#7A8798", fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "#FFF5EF" }} content={<DepartmentTooltip />} />
              <Bar dataKey="average" name="Average readiness" fill={orange} radius={[8, 8, 0, 0]} maxBarSize={64} animationDuration={650} />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-1 text-center text-xs font-medium text-[#7A8798]">Department · Average readiness score</p>
        </ChartCard>

        <ChartCard icon={Layers3} title="Application Status" description="Current application records grouped by their latest saved status." isLoading={analytics.placements.isLoading} error={analytics.placements.isError} onRetry={() => void analytics.placements.refetch()} empty={!applicationRows.length} emptyText="No placement applications are available for this scope.">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={applicationRows} layout="vertical" margin={{ top: 6, right: 22, left: 4, bottom: 4 }}>
              <CartesianGrid horizontal={false} stroke="#E7ECF2" strokeDasharray="3 5" />
              <XAxis type="number" allowDecimals={false} tick={{ fill: "#7A8798", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#D9E0E8" }} />
              <YAxis type="category" dataKey="status" width={118} tick={{ fill: "#53647A", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={statusLabel} />
              <Tooltip cursor={{ fill: "#F6F8FA" }} content={<ApplicationTooltip />} />
              <Bar dataKey="count" name="Applications" radius={[0, 8, 8, 0]} maxBarSize={26} animationDuration={650}>
                {applicationRows.map((item, index) => <Cell key={item.status} fill={statusColors[index % statusColors.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-1 text-center text-xs font-medium text-[#7A8798]">Number of applications · Current status</p>
        </ChartCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <PanelCard icon={Activity} title="Student Readiness Distribution" description="Latest status for students with a persisted readiness snapshot." loading={analytics.readiness.isLoading} error={analytics.readiness.isError} onRetry={() => void analytics.readiness.refetch()} empty={!readinessDistribution.length} emptyText="No readiness distribution is available for this scope.">
          <div className="grid items-center gap-4 sm:grid-cols-[minmax(180px,0.9fr)_minmax(0,1.1fr)]">
            <div className="relative h-[235px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={readinessDistribution} dataKey="count" nameKey="status" innerRadius={66} outerRadius={94} paddingAngle={3} stroke="#fff" strokeWidth={3} animationDuration={700}>
                    {readinessDistribution.map((item, index) => <Cell key={`${item.status}-${index}`} fill={readinessColors[index % readinessColors.length]} />)}
                  </Pie>
                  <Tooltip content={<ReadinessTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><strong className="text-2xl font-extrabold tabular-nums text-[#142B4D]">{numberFormat.format(readinessTotal)}</strong><span className="text-xs text-[#718096]">Assessed students</span></div>
            </div>
            <div className="space-y-1">
              {readinessDistribution.map((item, index) => <div key={`${item.status}-${index}`} className="flex items-center justify-between gap-3 border-b border-[#EDF0F4] py-3 last:border-0"><span className="flex min-w-0 items-center gap-2.5 text-sm font-medium text-[#394D66]"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: readinessColors[index % readinessColors.length] }} /><span className="truncate">{statusLabel(item.status)}</span></span><span className="shrink-0 text-right"><strong className="text-sm tabular-nums text-[#142B4D]">{numberFormat.format(item.count)}</strong><span className="ml-2 text-xs tabular-nums text-[#8793A3]">{readinessTotal ? `${((item.count / readinessTotal) * 100).toFixed(1)}%` : "—"}</span></span></div>)}
            </div>
          </div>
          <p className="mt-2 text-[11px] text-[#8793A3]">This distribution reflects existing readiness statuses; unassessed students are excluded by the backend.</p>
        </PanelCard>

        <PanelCard icon={BriefcaseBusiness} title="Placement Application Insights" description="Current application counts under the selected reporting scope." loading={analytics.placements.isLoading} error={analytics.placements.isError} onRetry={() => void analytics.placements.refetch()} empty={!applicationRows.length} emptyText="No application records are available for this scope.">
          <div className="mb-3 flex items-center justify-between rounded-xl bg-[#FFF5EF] px-4 py-3"><span className="flex items-center gap-2 text-sm font-semibold text-[#42556E]"><FileSpreadsheet className="h-4 w-4 text-[#F45D16]" />Total applications</span><strong className="text-xl font-extrabold tabular-nums text-[#142B4D]">{numberFormat.format(totalApplications)}</strong></div>
          <div className="grid gap-2 sm:grid-cols-2">
            {orderedApplications.map((item, index) => <div key={`${item.status}-${index}`} className="flex items-center justify-between gap-2 rounded-xl border border-[#EDF0F4] bg-white px-3.5 py-3 transition hover:border-[#F7D4C0] hover:bg-[#FFFCFA]"><span className="flex min-w-0 items-center gap-2 text-sm text-[#526176]"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: statusColors[index % statusColors.length] }} /><span className="truncate">{statusLabel(item.status)}</span></span><strong className="text-sm tabular-nums text-[#142B4D]">{numberFormat.format(item.count)}</strong></div>)}
          </div>
          <p className="mt-3 text-[11px] text-[#8793A3]">Counts reflect each application’s current saved status, not historical status changes.</p>
        </PanelCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(310px,0.8fr)]">
        <PanelCard icon={GraduationCap} title="Department Comparison" description="Students with current readiness snapshots and average score by department." loading={analytics.readiness.isLoading} error={analytics.readiness.isError} onRetry={() => void analytics.readiness.refetch()} empty={!readinessRows.length} emptyText="No department comparison is available for this scope.">
          <div className="w-full min-w-0 max-w-full overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-left text-sm">
              <thead><tr className="border-b border-[#E8EDF2] text-[11px] font-bold uppercase tracking-wide text-[#8995A5]"><th className="pb-3 pr-4">Department</th><th className="pb-3 pr-4 text-right">Students assessed</th><th className="pb-3 text-right">Average readiness</th></tr></thead>
              <tbody>{[...readinessRows].sort((a, b) => b.average - a.average).map((item, index) => <tr key={`${item.group}-${index}`} className="border-b border-[#F0F2F5] last:border-0"><td className="py-3.5 pr-4 font-semibold text-[#344A64]">{item.group}</td><td className="py-3.5 pr-4 text-right tabular-nums text-[#526176]">{numberFormat.format(item.count)}</td><td className="py-3.5 text-right"><span className="inline-flex min-w-16 items-center justify-center rounded-lg bg-[#FFF1E8] px-2.5 py-1 font-bold tabular-nums text-[#E85C14]">{item.average}%</span></td></tr>)}</tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-[#8793A3]">Registered and usable-profile counts by department are not provided by the current analytics API.</p>
        </PanelCard>

        <PanelCard icon={Activity} title="Key Insights" description="Observations from current aggregated analytics." loading={analytics.readiness.isLoading || analytics.placements.isLoading} error={analytics.readiness.isError || analytics.placements.isError} onRetry={() => { void analytics.readiness.refetch(); void analytics.placements.refetch(); }} empty={!highestDepartment && !leadingReadiness} emptyText="Insights will appear when analytics data is available.">
          <div className="space-y-3">
            {highestDepartment && <Insight icon={ArrowUpRight} title="Highest average readiness" value={`${highestDepartment.group} · ${highestDepartment.average}%`} detail={`${numberFormat.format(highestDepartment.count)} students with snapshots`} />}
            {leadingReadiness && <Insight icon={CheckCircle2} title="Most common readiness status" value={statusLabel(leadingReadiness.status)} detail={`${numberFormat.format(leadingReadiness.count)} students in the current scope`} />}
            {totalApplications > 0 && <Insight icon={ArrowRight} title="Application records" value={numberFormat.format(totalApplications)} detail="Current saved applications in the reporting scope" />}
            {!highestDepartment && !leadingReadiness && totalApplications === 0 && <p className="py-8 text-center text-sm text-[#8793A3]">No notable analytics observations for this scope.</p>}
          </div>
        </PanelCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <PanelCard icon={Layers3} title="Skill Demand and Verified Supply" description="Published-drive skill requirements compared with verified student supply." loading={analytics.skills.isLoading} error={analytics.skills.isError} onRetry={() => void analytics.skills.refetch()} empty={!skills?.skills.length} emptyText="No published-drive skill demand is available for this scope.">
          <div className="divide-y divide-[#EDF0F4]">{skills?.skills.slice(0, 8).map((skill) => <div key={skill.skillId} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"><span className="text-sm font-semibold text-[#344A64]">{skill.skillName}</span><span className="text-right text-xs text-[#718096]">Required {skill.requiredDemand} <span className="px-1 text-[#C4CCD6]">·</span> Optional {skill.optionalDemand} <span className="px-1 text-[#C4CCD6]">·</span> Gap <strong className="text-[#E85C14]">{skill.supplyGap}</strong></span></div>)}</div>
        </PanelCard>
        <PanelCard icon={FileSpreadsheet} title="Evidence and Preparation" description="Verified evidence coverage and active preparation-plan progress." loading={analytics.evidence.isLoading || analytics.preparation.isLoading} error={analytics.evidence.isError || analytics.preparation.isError} onRetry={() => { void analytics.evidence.refetch(); void analytics.preparation.refetch(); }} empty={false}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-[#FAFBFC] p-4"><p className="text-xs font-semibold text-[#718096]">Evidence verified</p><p className="mt-2 text-2xl font-extrabold tabular-nums text-[#142B4D]">{evidence?.verifiedPercentage == null ? "—" : `${evidence.verifiedPercentage}%`}</p><p className="mt-1 text-xs text-[#8793A3]">{numberFormat.format(evidence?.verified ?? 0)} of {numberFormat.format(evidence?.total ?? 0)} evidence records</p></div>
            <div className="rounded-xl bg-[#FAFBFC] p-4"><p className="text-xs font-semibold text-[#718096]">Preparation completion</p><p className="mt-2 text-2xl font-extrabold tabular-nums text-[#142B4D]">{preparation?.averageCompletionPercentage == null ? "—" : `${preparation.averageCompletionPercentage}%`}</p><p className="mt-1 text-xs text-[#8793A3]">Mean persisted plan completion</p></div>
          </div>
        </PanelCard>
      </section>
      {isInitialLoading && <span className="sr-only" role="status">Loading analytics data</span>}
    </div>
  );
}

function FilterSelect({ label, value, onValueChange, options, placeholder }: { label: string; value: string; onValueChange: (value: string) => void; options: string[]; placeholder: string }) {
  return <label className="block min-w-0"><span className="mb-1.5 block text-xs font-semibold text-[#53647A]">{label}</span><Select value={value || "all"} onValueChange={(next) => onValueChange(next === "all" ? "" : next)}><SelectTrigger aria-label={label} className="h-10 rounded-xl border-[#DDE4EC] bg-white text-sm text-[#344A64] shadow-none focus:ring-[#FF6B1A]/25"><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent className="rounded-xl border-[#E5EAF0] bg-white"> <SelectItem value="all">All</SelectItem>{options.map((option, index) => <SelectItem key={`${label}-${option}-${index}`} value={option}>{option}</SelectItem>)}</SelectContent></Select></label>;
}

function Metric({ icon: Icon, label, value, note, loading, tone }: { icon: React.ElementType; label: string; value?: string | number; note: string; loading: boolean; tone: "orange" | "navy" }) {
  const numericValue = typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value) : undefined;
  const suffix = typeof value === "string" && numericValue !== undefined ? value.slice(String(numericValue).length) : "";
  const [animatedValue, setAnimatedValue] = useState(0);
  useEffect(() => {
    if (numericValue === undefined || !Number.isFinite(numericValue)) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let startAt: number | undefined;
    let frame = 0;
    const animate = (time: number) => {
      if (prefersReducedMotion) {
        setAnimatedValue(numericValue);
        return;
      }
      startAt ??= time;
      const progress = Math.min((time - startAt) / 450, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedValue(numericValue * eased);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [numericValue]);
  const iconClass = tone === "orange" ? "bg-[#FFF1E8] text-[#F45D16]" : "bg-[#EEF2F8] text-[#315078]";
  const displayValue = numericValue === undefined || !Number.isFinite(numericValue)
    ? "—"
    : `${numberFormat.format(Number.isInteger(numericValue) ? Math.round(animatedValue) : Math.round(animatedValue * 10) / 10)}${suffix}`;
  return <Card className="group h-full rounded-2xl border-[#E5EAF0] bg-white shadow-[0_6px_25px_-22px_rgba(20,43,77,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#F4D5C3] hover:shadow-[0_14px_30px_-22px_rgba(20,43,77,0.3)]"><CardContent className="flex min-h-[154px] items-start gap-3.5 p-4 sm:p-5"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}><Icon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-[#66758A]">{label}</p>{loading && value === undefined ? <Skeleton className="mt-2 h-8 w-24" /> : <p className="mt-1.5 text-[28px] font-extrabold leading-8 tracking-tight tabular-nums text-[#142B4D]">{displayValue}</p>}<p className="mt-1.5 line-clamp-2 min-h-8 text-[11px] leading-4 text-[#8995A5]">{note}</p></div></CardContent></Card>;
}

function ChartCard({ icon: Icon, title, description, children, isLoading, error, onRetry, empty, emptyText }: { icon: React.ElementType; title: string; description: string; children: React.ReactNode; isLoading: boolean; error: boolean; onRetry: () => void; empty: boolean; emptyText: string }) {
  return <section className="min-w-0 rounded-2xl border border-[#E5EAF0] bg-white p-4 shadow-[0_8px_30px_-26px_rgba(20,43,77,0.25)] sm:p-5"><PanelHeading icon={Icon} title={title} description={description} />{isLoading ? <ChartSkeleton /> : error ? <InlineError onRetry={onRetry} /> : empty ? <InlineEmpty text={emptyText} /> : <div className="mt-4">{children}</div>}</section>;
}

function PanelCard({ icon: Icon, title, description, children, loading, error, onRetry, empty, emptyText }: { icon: React.ElementType; title: string; description: string; children: React.ReactNode; loading: boolean; error: boolean; onRetry: () => void; empty: boolean; emptyText?: string }) {
  return <section className="min-w-0 rounded-2xl border border-[#E5EAF0] bg-white p-4 shadow-[0_8px_30px_-26px_rgba(20,43,77,0.25)] sm:p-5"><PanelHeading icon={Icon} title={title} description={description} />{loading ? <ChartSkeleton /> : error ? <InlineError onRetry={onRetry} /> : empty ? <InlineEmpty text={emptyText ?? "No data is available for this scope."} /> : <div className="mt-4">{children}</div>}</section>;
}

function PanelHeading({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF1E8] text-[#F45D16]"><Icon className="h-[18px] w-[18px]" /></span><div className="min-w-0"><h2 className="text-base font-bold text-[#142B4D] sm:text-[17px]">{title}</h2><p className="mt-1 text-xs leading-5 text-[#7B8797]">{description}</p></div></div>;
}

function DepartmentTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: DepartmentDatum; value?: number }> }) {
  if (!active || !payload?.[0]?.payload) return null;
  const item = payload[0].payload;
  return <TooltipCard title={item.group}><p>Average readiness: <strong>{item.average}%</strong></p><p>Students assessed: <strong>{numberFormat.format(item.count)}</strong></p></TooltipCard>;
}

function ApplicationTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: StatusDatum; value?: number }> }) {
  if (!active || !payload?.[0]?.payload) return null;
  const item = payload[0].payload;
  return <TooltipCard title={statusLabel(item.status)}><p>Applications: <strong>{numberFormat.format(item.count)}</strong></p></TooltipCard>;
}

function ReadinessTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name?: string; value?: number; payload?: { status: string } }> }) {
  if (!active || !payload?.[0]) return null;
  const status = payload[0].payload?.status ?? payload[0].name ?? "Readiness";
  return <TooltipCard title={statusLabel(status)}><p>Students: <strong>{numberFormat.format(payload[0].value ?? 0)}</strong></p></TooltipCard>;
}

function TooltipCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-[#E5EAF0] bg-white px-3 py-2.5 text-xs text-[#526176] shadow-lg"><p className="mb-1.5 font-bold text-[#142B4D]">{title}</p>{children}</div>;
}

function Insight({ icon: Icon, title, value, detail }: { icon: React.ElementType; title: string; value: string; detail: string }) {
  return <div className="flex items-start gap-3 rounded-xl border border-[#EDF0F4] bg-[#FCFCFD] p-3.5"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FFF1E8] text-[#F45D16]"><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[11px] font-semibold text-[#7B8797]">{title}</p><p className="mt-0.5 truncate text-sm font-bold text-[#263B57]">{value}</p><p className="mt-0.5 text-[11px] text-[#8793A3]">{detail}</p></div></div>;
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return <button type="button" onClick={onRemove} className="rounded-full border border-[#F5D3C1] bg-[#FFF6F0] px-2.5 py-1 font-medium text-[#C94F13] transition hover:bg-[#FFEBDD]">{label} <span aria-hidden="true">×</span></button>;
}

function ChartSkeleton() {
  return <div className="mt-5 space-y-4"><Skeleton className="h-5 w-44" /><Skeleton className="h-[250px] rounded-xl" /></div>;
}

function InlineEmpty({ text }: { text: string }) {
  return <div className="mt-5 flex min-h-[235px] items-center justify-center rounded-xl border border-dashed border-[#DFE5EC] bg-[#FCFCFD] px-5 text-center text-sm text-[#8793A3]">{text}</div>;
}

function InlineError({ onRetry }: { onRetry: () => void }) {
  return <div role="alert" className="mt-5 flex min-h-[235px] flex-col items-center justify-center rounded-xl border border-rose-100 bg-rose-50/50 px-5 text-center"><p className="text-sm font-semibold text-[#91443B]">This analytics section could not be loaded.</p><button type="button" onClick={onRetry} className="mt-2 text-sm font-semibold text-[#E85C14] hover:underline">Try again</button></div>;
}

function unique(items: string[]) {
  return [...new Set(items.filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function aggregateRows<T extends { status?: string; count?: number; department?: string; average?: number }>(
  rows: T[],
  getKey: (row: T) => string,
  getCount: (row: T) => number,
  getAverage?: (row: T) => number,
) {
  const totals = new Map<string, { count: number; weightedAverage: number }>();
  for (const row of rows) {
    const key = getKey(row);
    const count = getCount(row);
    const current = totals.get(key) ?? { count: 0, weightedAverage: 0 };
    current.count += count;
    if (getAverage) current.weightedAverage += getAverage(row) * count;
    totals.set(key, current);
  }
  return Array.from(totals, ([key, value]) => ({
    ...(getAverage ? { group: key, average: value.count ? Math.round((value.weightedAverage / value.count) * 10) / 10 : 0 } : { status: key }),
    count: value.count,
  })) as Array<DepartmentDatum & StatusDatum>;
}

function cleanDepartment(value: string) {
  return value && value !== "Unknown" ? value : "Unknown";
}

function shortLabel(value: string) {
  return value.length > 14 ? `${value.slice(0, 12)}…` : value;
}

function statusLabel(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
