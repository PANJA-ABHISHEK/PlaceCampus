"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { useAnalytics } from "../hooks/use-analytics";

export function InstitutionalAnalytics({ roleLabel }: { roleLabel: string }) {
  const [department, setDepartment] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const filters = { department: department || undefined, graduationYear: graduationYear ? Number(graduationYear) : undefined };
  const analytics = useAnalytics(filters);
  const queries = Object.values(analytics);
  const isLoading = queries.some((query) => query.isLoading);
  const error = queries.find((query) => query.isError);
  if (isLoading) return <LoadingState text="Loading institutional analytics..." />;
  if (error) return <ErrorState description="Analytics could not be loaded." onRetry={() => queries.forEach((query) => query.refetch())} />;

  const overview = analytics.overview.data;
  const readiness = analytics.readiness.data;
  const skills = analytics.skills.data;
  const placements = analytics.placements.data;
  const evidence = analytics.evidence.data;
  const preparation = analytics.preparation.data;
  if (!overview || !readiness || !skills || !placements || !evidence || !preparation) {
    return <EmptyState title="No analytics available" description="There is no persisted institutional data for this view yet." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><p className="text-sm text-[hsl(var(--muted-foreground))]">{roleLabel}</p><h1 className="text-3xl font-bold text-heading">Institutional Analytics</h1><p className="text-sm text-[hsl(var(--muted-foreground))]">Aggregate readiness, demand, evidence, applications, and preparation signals.</p></div>
        <div className="flex gap-2"><label className="text-sm">Department<input className="mt-1 block rounded-md border p-2" value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="All" /></label><label className="text-sm">Graduation year<input className="mt-1 block w-28 rounded-md border p-2" value={graduationYear} onChange={(event) => setGraduationYear(event.target.value.replace(/\D/g, ""))} placeholder="All" /></label></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric title="Registered students" value={overview.students.registered} />
        <Metric title="Usable profiles" value={overview.students.usableProfiles} />
        <Metric title="Average readiness" value={overview.readiness.average == null ? "—" : `${overview.readiness.average}%`} />
        <Metric title="Published drives" value={overview.drives.published} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Readiness by department"><ResponsiveContainer width="100%" height={260}><BarChart data={readiness.byDepartment}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="group" /><YAxis /><Tooltip /><Bar dataKey="average" fill="hsl(var(--primary))" name="Average" /></BarChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Application status"><ResponsiveContainer width="100%" height={260}><BarChart data={placements.byStatus}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="status" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="hsl(var(--color-info))" /></BarChart></ResponsiveContainer></ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DataCard title="Skill demand and verified supply" empty={!skills.skills.length}>{skills.skills.slice(0, 8).map((skill) => <div className="flex items-center justify-between border-b py-3 last:border-0" key={skill.skillId}><span>{skill.skillName}</span><span className="text-sm text-[hsl(var(--muted-foreground))]">Required {skill.requiredDemand} · Optional {skill.optionalDemand} · Gap {skill.supplyGap}</span></div>)}</DataCard>
        <DataCard title="Evidence verification"><p className="text-3xl font-bold">{evidence.verifiedPercentage == null ? "—" : `${evidence.verifiedPercentage}%`}</p><p className="text-sm text-[hsl(var(--muted-foreground))]">{evidence.verified} verified of {evidence.total} stored evidence records</p><p className="mt-4 text-sm">Preparation completion: {preparation.averageCompletionPercentage == null ? "—" : `${preparation.averageCompletionPercentage}%`}</p></DataCard>
      </div>

      <DataCard title="Current application statuses"><div className="flex flex-wrap gap-3">{placements.byStatus.length ? placements.byStatus.map((item) => <span className="rounded-full bg-[hsl(var(--muted))] px-3 py-1 text-sm" key={item.status}>{item.status}: {item.count}</span>) : <span className="text-sm text-[hsl(var(--muted-foreground))]">No applications in this scope.</span>}</div></DataCard>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string | number }) { return <Card><CardContent className="p-5"><p className="text-sm text-[hsl(var(--muted-foreground))]">{title}</p><p className="mt-2 text-2xl font-bold text-heading">{value}</p></CardContent></Card>; }
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) { return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent>{children}</CardContent></Card>; }
function DataCard({ title, children, empty = false }: { title: string; children: React.ReactNode; empty?: boolean }) { return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent>{empty ? <p className="text-sm text-[hsl(var(--muted-foreground))]">No persisted data in this scope.</p> : children}</CardContent></Card>; }
