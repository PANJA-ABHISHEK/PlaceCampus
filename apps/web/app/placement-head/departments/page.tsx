"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownUp, Award, Building2, ChartColumn, Scale, TrendingDown, TrendingUp, UsersRound } from "lucide-react";
import {
  FilterField,
  Limitations,
  NAVY,
  ORANGE,
  PageHero,
  Panel,
  PanelState,
  StatCard,
  isUnknownGroup,
  numberFormat,
  selectClassName,
} from "@/features/placement-head/components/head-ui";
import { usePlacements, usePreparation, useReadiness } from "@/features/placement-head/hooks/use-head-analytics";
import { cn } from "@/lib/utils";

interface DepartmentRow {
  department: string;
  students: number;
  readiness: number | null;
  applications: number;
  plans: number;
  completion: number | null;
}

type SortKey = "readiness" | "students" | "applications" | "completion" | "department";

export default function DepartmentComparisonPage() {
  const [graduationYear, setGraduationYear] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("readiness");
  const filters = { graduationYear: graduationYear ? Number(graduationYear) : undefined };

  const readinessQuery = useReadiness(filters);
  const optionsQuery = useReadiness();
  const placementsQuery = usePlacements();
  const preparationQuery = usePreparation(filters);

  const years = (optionsQuery.data?.byGraduationYear ?? []).map((y) => String(y.graduationYear)).filter((y) => !isUnknownGroup(y)).sort();

  // Join the three department-level aggregates on department code.
  const rows = React.useMemo<DepartmentRow[]>(() => {
    const map = new Map<string, DepartmentRow>();
    const get = (raw: string | null | undefined) => {
      const department = isUnknownGroup(raw) ? "Unassigned" : String(raw);
      if (!map.has(department)) map.set(department, { department, students: 0, readiness: null, applications: 0, plans: 0, completion: null });
      return map.get(department)!;
    };
    for (const d of readinessQuery.data?.byDepartment ?? []) {
      const row = get(d.group);
      row.students = d.count;
      row.readiness = d.average;
    }
    for (const d of placementsQuery.data?.byDepartment ?? []) get(d.department).applications += d.count;
    for (const d of preparationQuery.data?.completionByDepartment ?? []) {
      const row = get(d.department);
      row.plans = d.plans;
      row.completion = d.averageCompletionPercentage;
    }
    return [...map.values()];
  }, [readinessQuery.data, placementsQuery.data, preparationQuery.data]);

  const sorted = React.useMemo(() => {
    const value = (r: DepartmentRow) => (sort === "department" ? 0 : (r[sort] ?? -1));
    return [...rows].sort((a, b) => (sort === "department" ? a.department.localeCompare(b.department) : value(b) - value(a)));
  }, [rows, sort]);

  const ranked = rows.filter((r) => r.readiness != null && r.students > 0 && r.department !== "Unassigned").sort((a, b) => b.readiness! - a.readiness!);
  const leader = ranked[0];
  const trailing = ranked.length > 1 ? ranked[ranked.length - 1] : undefined;
  const spread = leader && trailing ? leader.readiness! - trailing.readiness! : null;
  const loading = readinessQuery.isLoading || placementsQuery.isLoading || preparationQuery.isLoading;
  const chartData = ranked.map((r) => ({ name: r.department, readiness: Math.round(r.readiness!), students: r.students }));

  return (
    <div className="-mt-1 space-y-5 sm:-mt-2 lg:-mt-4">
      <PageHero eyebrow="Department comparison" title="Department" highlight="Comparison" icon={Building2}
        description="Compare readiness, placement activity and preparation progress across departments.">
        <FilterField label="Graduation year">
          <select className={selectClassName} value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} aria-label="Filter by graduation year">
            <option value="">All years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </FilterField>
      </PageHero>

      <section aria-label="Department summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Departments" icon={Building2} tone="blue" loading={loading}
          value={rows.length ? numberFormat.format(rows.filter((r) => r.department !== "Unassigned").length) : null}
          detail={ranked.length ? `${ranked.length} with readiness data` : "No department data yet"} />
        <StatCard title="Leading Department" icon={TrendingUp} tone="green" loading={loading}
          value={leader ? leader.department : null} detail={leader ? `${Math.round(leader.readiness!)}% average readiness` : "Needs readiness snapshots"} />
        <StatCard title="Needs Attention" icon={TrendingDown} tone="rose" loading={loading}
          value={trailing ? trailing.department : null} detail={trailing ? `${Math.round(trailing.readiness!)}% average readiness` : "Needs two or more departments"} />
        <StatCard title="Readiness Spread" icon={Scale} tone="orange" loading={loading}
          value={spread == null ? null : `${Math.round(spread)} pts`} detail="Gap between highest and lowest department" />
      </section>

      <Panel title="Readiness by Department" description="Average latest readiness score, highest first" icon={ChartColumn}>
        <PanelState loading={readinessQuery.isLoading} error={readinessQuery.isError} onRetry={() => void readinessQuery.refetch()}
          empty={!chartData.length} emptyIcon={ChartColumn} emptyTitle="No department readiness yet" emptyText="Bars appear once students in a department have readiness snapshots." height={260}>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 12 }} interval={0} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: "#94A3B8", fontSize: 12 }} unit="%" />
                <Tooltip
                  cursor={{ fill: "rgba(255,101,0,0.06)" }}
                  formatter={(value, _name, item) => [`${value}% · ${item?.payload?.students ?? 0} students`, "Readiness"]}
                />
                <Bar dataKey="readiness" radius={[8, 8, 0, 0]} maxBarSize={56} isAnimationActive={false}>
                  {chartData.map((d, i) => <Cell key={d.name} fill={i === 0 ? ORANGE : i === chartData.length - 1 && chartData.length > 1 ? "#FDA4AF" : "#FDBA74"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PanelState>
      </Panel>

      <Panel title="Department Scorecard" description="All department-level metrics side by side" icon={UsersRound}
        action={
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <ArrowDownUp className="h-3.5 w-3.5" aria-hidden="true" /> Sort by
            <select className={cn(selectClassName, "h-9 min-w-[140px]")} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="readiness">Readiness</option>
              <option value="students">Students assessed</option>
              <option value="applications">Applications</option>
              <option value="completion">Plan completion</option>
              <option value="department">Name</option>
            </select>
          </label>
        }>
        <PanelState loading={loading} error={readinessQuery.isError || placementsQuery.isError}
          onRetry={() => { void readinessQuery.refetch(); void placementsQuery.refetch(); void preparationQuery.refetch(); }}
          empty={!rows.length} emptyIcon={Building2} emptyTitle="No department data" emptyText="Departments appear once students have readiness, applications or plans." height={200}>
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5 sm:pl-0">Department</th>
                  <th className="px-4 py-2.5">Readiness</th>
                  <th className="px-4 py-2.5 text-right">Students assessed</th>
                  <th className="px-4 py-2.5 text-right">Applications</th>
                  <th className="px-4 py-2.5 text-right">Prep plans</th>
                  <th className="px-4 py-2.5 text-right sm:pr-0">Plan completion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sorted.map((r) => (
                  <tr key={r.department} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold sm:pl-0" style={{ color: NAVY }}>
                      <span className="inline-flex items-center gap-2">
                        {leader?.department === r.department && <Award className="h-4 w-4 text-emerald-500" aria-label="Leading department" />}
                        {r.department === "Unassigned" ? <span className="font-medium italic text-slate-500">No department</span> : r.department}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.readiness == null ? <span className="text-slate-400">—</span> : (
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-[#FF6500]" style={{ width: `${Math.min(100, r.readiness)}%` }} />
                          </div>
                          <span className="font-semibold tabular-nums" style={{ color: NAVY }}>{Math.round(r.readiness)}%</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{numberFormat.format(r.students)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{numberFormat.format(r.applications)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{numberFormat.format(r.plans)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700 sm:pr-0">{r.completion == null ? "—" : `${Math.round(r.completion)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelState>
      </Panel>

      <Limitations items={[
        "Readiness and plan completion use the graduation-year filter; application counts cover all years.",
        ...(readinessQuery.data?.limitations ?? []),
      ]} />
    </div>
  );
}
