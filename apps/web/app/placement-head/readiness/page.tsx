"use client";

import * as React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  BarChart3,
  BookOpenCheck,
  CalendarRange,
  ClipboardList,
  Gauge,
  GraduationCap,
  Layers3,
  Sigma,
  Target,
  UsersRound,
} from "lucide-react";
import {
  BarRow,
  FilterField,
  Limitations,
  NAVY,
  PageHero,
  Panel,
  PanelState,
  StatCard,
  TONES,
  formatPercent,
  humanise,
  isUnknownGroup,
  numberFormat,
  selectClassName,
  type Tone,
} from "@/features/placement-head/components/head-ui";
import { usePreparation, useReadiness } from "@/features/placement-head/hooks/use-head-analytics";
import { BatchReadinessPanel } from "@/features/placement-head/components/batch-readiness-panel";

const STATUS_META: Record<string, { label: string; tone: Tone; hint: string }> = {
  READY: { label: "Ready", tone: "green", hint: "Meets the readiness threshold" },
  DEVELOPING: { label: "Developing", tone: "orange", hint: "Progressing; some gaps remain" },
  NEEDS_PREPARATION: { label: "Needs preparation", tone: "rose", hint: "Significant gaps to close" },
};

const FACTOR_META: Record<string, { label: string; hint: string }> = {
  verifiedSkills: { label: "Verified skills", hint: "Faculty-verified skill evidence" },
  assessments: { label: "Assessments", hint: "Skill assessment results" },
  academics: { label: "Academics", hint: "Academic performance" },
  projects: { label: "Projects", hint: "Evaluated project work" },
  interviews: { label: "Mock interviews", hint: "Interview evaluations" },
};

export default function InstitutionReadinessPage() {
  const [department, setDepartment] = React.useState("");
  const [graduationYear, setGraduationYear] = React.useState("");
  const filters = { department: department || undefined, graduationYear: graduationYear ? Number(graduationYear) : undefined };

  const readinessQuery = useReadiness(filters);
  const optionsQuery = useReadiness(); // unfiltered: filter options
  const preparationQuery = usePreparation(filters);
  const r = readinessQuery.data;
  const prep = preparationQuery.data;

  const departments = (optionsQuery.data?.byDepartment ?? []).map((d) => d.group).filter((d) => !isUnknownGroup(d)).sort();
  const years = (optionsQuery.data?.byGraduationYear ?? []).map((y) => String(y.graduationYear)).filter((y) => !isUnknownGroup(y)).sort();

  const statusRows = (r?.byStatus ?? []).filter((s) => s.count > 0);
  const statusTotal = statusRows.reduce((sum, s) => sum + s.count, 0);
  const readyShare = statusTotal ? ((statusRows.find((s) => s.status === "READY")?.count ?? 0) / statusTotal) * 100 : null;
  const factors = [...(r?.factorBreakdown ?? [])].sort((a, b) => b.averageScore - a.averageScore);
  const yearRows = [...(r?.byGraduationYear ?? [])].filter((y) => y.count > 0).sort((a, b) => String(a.graduationYear).localeCompare(String(b.graduationYear)));
  const loading = readinessQuery.isLoading;

  return (
    <div className="-mt-1 space-y-5 sm:-mt-2 lg:-mt-4">
      <PageHero
        eyebrow="Institution readiness"
        title="Institution"
        highlight="Readiness"
        icon={Gauge}
        description="How prepared students are for placements, from each student's latest readiness snapshot."
      >
        <FilterField label="Department">
          <select className={selectClassName} value={department} onChange={(e) => setDepartment(e.target.value)} aria-label="Filter by department">
            <option value="">All departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </FilterField>
        <FilterField label="Graduation year">
          <select className={selectClassName} value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} aria-label="Filter by graduation year">
            <option value="">All years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </FilterField>
      </PageHero>

      <section aria-label="Readiness summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Average Readiness" icon={BarChart3} tone="orange" loading={loading}
          value={formatPercent(r?.mean)} detail="Mean of latest readiness scores" />
        <StatCard title="Median Readiness" icon={Sigma} tone="blue" loading={loading}
          value={formatPercent(r?.median)} detail="Half of students score at or above this" />
        <StatCard title="Students Assessed" icon={UsersRound} tone="violet" loading={loading}
          value={r?.studentsWithSnapshots ? numberFormat.format(r.studentsWithSnapshots) : null}
          detail={r?.coverage.studentsMissingFactors ? `${numberFormat.format(r.coverage.studentsMissingFactors)} missing some factors` : "With a readiness snapshot"} />
        <StatCard title="Placement Ready" icon={Target} tone="green" loading={loading}
          value={formatPercent(readyShare)} detail={statusTotal ? `${numberFormat.format(statusRows.find((s) => s.status === "READY")?.count ?? 0)} of ${numberFormat.format(statusTotal)} students` : "No readiness statuses yet"} />
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Panel title="Readiness Distribution" description="Latest readiness status per student" icon={Layers3}>
          <PanelState loading={loading} error={readinessQuery.isError} onRetry={() => void readinessQuery.refetch()}
            empty={!statusTotal} emptyIcon={Layers3} emptyTitle="No readiness snapshots" emptyText="Statuses appear once students have readiness snapshots.">
            <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-[180px_minmax(0,1fr)]">
              <div className="relative mx-auto h-[180px] w-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusRows} dataKey="count" nameKey="status" innerRadius={58} outerRadius={82} paddingAngle={2} cornerRadius={4} stroke="none">
                      {statusRows.map((s) => <Cell key={s.status} fill={TONES[STATUS_META[s.status]?.tone ?? "blue"].hex} />)}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, STATUS_META[String(name)]?.label ?? humanise(String(name))]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold tabular-nums" style={{ color: NAVY }}>{numberFormat.format(statusTotal)}</span>
                  <span className="text-xs text-slate-500">students</span>
                </div>
              </div>
              <ul className="space-y-3">
                {statusRows.map((s) => {
                  const meta = STATUS_META[s.status] ?? { label: humanise(s.status), tone: "blue" as Tone, hint: "" };
                  return (
                    <li key={s.status}>
                      <BarRow label={meta.label} value={s.count} max={statusTotal} tone={meta.tone}
                        display={`${numberFormat.format(s.count)} · ${Math.round((s.count / statusTotal) * 100)}%`} sub={meta.hint} />
                    </li>
                  );
                })}
              </ul>
            </div>
          </PanelState>
        </Panel>

        <Panel title="Readiness Factors" description="Average score for each factor that makes up readiness" icon={BookOpenCheck}>
          <PanelState loading={loading} error={readinessQuery.isError} onRetry={() => void readinessQuery.refetch()}
            empty={!factors.length} emptyIcon={BookOpenCheck} emptyTitle="No factor data" emptyText="Factor scores appear once readiness snapshots exist.">
            <ul className="space-y-4">
              {factors.map((f, i) => {
                const meta = FACTOR_META[f.key] ?? { label: humanise(f.key), hint: "" };
                const tones: Tone[] = ["orange", "blue", "violet", "green", "rose"];
                return (
                  <li key={f.key}>
                    <BarRow label={meta.label} value={f.averageScore} max={100} tone={tones[i % tones.length]}
                      display={`${Math.round(f.averageScore)}%`}
                      sub={`${meta.hint ? `${meta.hint} · ` : ""}${numberFormat.format(f.coverageCount)} student${f.coverageCount === 1 ? "" : "s"} with data`} />
                  </li>
                );
              })}
            </ul>
            {factors.length > 0 && (
              <p className="mt-4 text-xs text-slate-500">
                Students have on average {r?.coverage.averageFactorsPresent ?? 0} of {factors.length} factors recorded.
              </p>
            )}
          </PanelState>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel title="Readiness by Graduation Year" description="Average readiness for each batch" icon={CalendarRange}>
          <PanelState loading={loading} error={readinessQuery.isError} onRetry={() => void readinessQuery.refetch()}
            empty={!yearRows.length} emptyIcon={CalendarRange} emptyTitle="No batch data" emptyText="Batches appear once students with a graduation year are assessed." height={180}>
            <ul className="space-y-4">
              {yearRows.map((y) => (
                <li key={String(y.graduationYear)}>
                  <BarRow label={isUnknownGroup(y.graduationYear) ? "Year not set" : `Batch ${y.graduationYear}`} value={y.average} max={100} tone="blue"
                    display={`${Math.round(y.average)}%`} sub={`${numberFormat.format(y.count)} student${y.count === 1 ? "" : "s"}`} />
                </li>
              ))}
            </ul>
          </PanelState>
        </Panel>

        <Panel title="Preparation Progress" description="Preparation plans students follow to close gaps" icon={ClipboardList}>
          <PanelState loading={preparationQuery.isLoading} error={preparationQuery.isError} onRetry={() => void preparationQuery.refetch()}
            empty={!prep || (!prep.byStatus.some((s) => s.count) && !prep.commonGaps.length)} emptyIcon={ClipboardList}
            emptyTitle="No preparation plans yet" emptyText="Plan progress and common skill gaps appear once students create preparation plans." height={180}>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-orange-50/70 p-3">
                <p className="text-xs text-slate-500">Average completion</p>
                <p className="text-xl font-bold tabular-nums" style={{ color: NAVY }}>{formatPercent(prep?.averageCompletionPercentage) ?? "—"}</p>
              </div>
              <div className="rounded-xl bg-blue-50/70 p-3">
                <p className="text-xs text-slate-500">Plans</p>
                <p className="text-xl font-bold tabular-nums" style={{ color: NAVY }}>{numberFormat.format(prep?.byStatus.reduce((s, x) => s + x.count, 0) ?? 0)}</p>
                <p className="text-[11px] text-slate-500">{prep?.byStatus.filter((s) => s.count).map((s) => `${humanise(s.status)} ${s.count}`).join(" · ")}</p>
              </div>
            </div>
            {prep && prep.commonGaps.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><GraduationCap className="h-3.5 w-3.5" aria-hidden="true" /> Most common skill gaps</p>
                <ul className="space-y-3">
                  {prep.commonGaps.slice(0, 5).map((g) => (
                    <li key={g.skillId}>
                      <BarRow label={g.skillName} value={g.count} max={prep.commonGaps[0].count} tone="rose"
                        display={`${numberFormat.format(g.count)} student${g.count === 1 ? "" : "s"}`} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </PanelState>
        </Panel>
      </div>

      <BatchReadinessPanel scope={filters} />

      <Limitations items={[...(r?.limitations ?? []), ...(prep?.limitations ?? [])]} />
    </div>
  );
}
