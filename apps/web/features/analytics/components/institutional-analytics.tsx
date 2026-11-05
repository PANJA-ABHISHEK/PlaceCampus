"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, BriefcaseBusiness, GraduationCap, ShieldCheck, UsersRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { useAnalytics } from "../hooks/use-analytics";
import { AdminPageHeader, AdminPanelHeader, AdminViewAll } from "@/features/admin/components/admin-ui";
import { adminCard } from "@/features/admin-imports/components/import-ui";

export function InstitutionalAnalytics({ roleLabel }: { roleLabel: string }) {
  const [department, setDepartment] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const filters = { department: department || undefined, graduationYear: graduationYear ? Number(graduationYear) : undefined };
  const analytics = useAnalytics(filters);
  const queries = Object.values(analytics);
  const isLoading = queries.some((query) => query.isLoading);
  const error = queries.find((query) => query.isError);
  if (isLoading) return <div className="mx-auto w-full max-w-[1280px]"><LoadingState text="Loading institutional analytics..." /></div>;
  if (error) return <div className="mx-auto w-full max-w-[1280px]"><ErrorState description="Analytics could not be loaded." onRetry={() => queries.forEach((query) => query.refetch())} /></div>;

  const overview = analytics.overview.data;
  const readiness = analytics.readiness.data;
  const skills = analytics.skills.data;
  const placements = analytics.placements.data;
  const evidence = analytics.evidence.data;
  const preparation = analytics.preparation.data;
  if (!overview || !readiness || !skills || !placements || !evidence || !preparation) {
    return <div className="mx-auto w-full max-w-[1280px]"><EmptyState title="No analytics available" description="There is no persisted institutional data for this view yet." /></div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6">
      <AdminPageHeader eyebrow={roleLabel} title="Institutional Analytics" description="Aggregate readiness, demand, evidence, applications, and preparation signals." action={<div className="flex flex-wrap gap-2"><label className="text-xs font-semibold text-[#64748B]">Department<input className="mt-1 block h-10 w-48 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-normal text-[#0B1F44] outline-none focus:border-[#FF6B1A]/50 focus:ring-2 focus:ring-[#FF6B1A]/15" value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="All departments" /></label><label className="text-xs font-semibold text-[#64748B]">Graduation year<input className="mt-1 block h-10 w-32 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-normal text-[#0B1F44] outline-none focus:border-[#FF6B1A]/50 focus:ring-2 focus:ring-[#FF6B1A]/15" value={graduationYear} onChange={(event) => setGraduationYear(event.target.value.replace(/\D/g, ""))} placeholder="All years" /></label></div>} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric title="Registered students" value={overview.students.registered} icon={UsersRound} />
        <Metric title="Usable profiles" value={overview.students.usableProfiles} icon={GraduationCap} />
        <Metric title="Average readiness" value={overview.readiness.average == null ? "—" : `${overview.readiness.average}%`} icon={BarChart3} />
        <Metric title="Published drives" value={overview.drives.published} icon={BriefcaseBusiness} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Readiness by department" icon={BarChart3}>{readiness.byDepartment.length ? <ResponsiveContainer width="100%" height={260}><BarChart data={readiness.byDepartment}><CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" /><XAxis dataKey="group" tick={{ fill: "#64748B", fontSize: 12 }} /><YAxis tick={{ fill: "#64748B", fontSize: 12 }} /><Tooltip /><Bar dataKey="average" fill="hsl(var(--primary))" name="Average" /></BarChart></ResponsiveContainer> : <EmptyState description="No readiness data by department in this scope." className="py-10" />}</ChartCard>
        <ChartCard title="Application status" icon={BriefcaseBusiness}>{placements.byStatus.length ? <ResponsiveContainer width="100%" height={260}><BarChart data={placements.byStatus}><CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" /><XAxis dataKey="status" tick={{ fill: "#64748B", fontSize: 12 }} /><YAxis allowDecimals={false} tick={{ fill: "#64748B", fontSize: 12 }} /><Tooltip /><Bar dataKey="count" fill="hsl(var(--color-info))" /></BarChart></ResponsiveContainer> : <EmptyState description="No applications in this scope." className="py-10" />}</ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DataCard title="Skill demand and verified supply" icon={GraduationCap} empty={!skills.skills.length}>{skills.skills.slice(0, 8).map((skill) => <div className="flex items-center justify-between border-b border-[#E5E7EB] py-3 last:border-0" key={skill.skillId}><span className="font-medium text-[#0B1F44]">{skill.skillName}</span><span className="text-sm text-[#64748B]">Required {skill.requiredDemand} · Optional {skill.optionalDemand} · Gap {skill.supplyGap}</span></div>)}</DataCard>
        <DataCard title="Evidence verification" icon={ShieldCheck} action={<AdminViewAll href="/admin/reviews" label="Review queue" />}><p className="text-3xl font-extrabold text-[#0B1F44]">{evidence.verifiedPercentage == null ? "—" : `${evidence.verifiedPercentage}%`}</p><p className="text-sm text-[#64748B]">{evidence.verified} verified of {evidence.total} stored evidence records</p><p className="mt-4 text-sm text-[#0B1F44]">Preparation completion: {preparation.averageCompletionPercentage == null ? "—" : `${preparation.averageCompletionPercentage}%`}</p></DataCard>
      </div>

      <DataCard title="Current application statuses" icon={BriefcaseBusiness}><div className="flex flex-wrap gap-3">{placements.byStatus.length ? placements.byStatus.map((item) => <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-[#FF6B1A] ring-1 ring-orange-200" key={item.status}>{item.status}: {item.count}</span>) : <span className="text-sm text-[#64748B]">No applications in this scope.</span>}</div></DataCard>
    </div>
  );
}

function Metric({ title, value, icon: Icon }: { title: string; value: string | number; icon: typeof UsersRound }) { return <Card className={`${adminCard} overflow-hidden`}><CardContent className="flex min-h-[100px] items-center gap-4 p-4 sm:p-5"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[#FF6B1A] sm:h-14 sm:w-14"><Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" /></span><span><span className="block text-2xl font-extrabold tabular-nums text-[#0B1F44] sm:text-3xl">{value}</span><span className="mt-1.5 block text-sm font-medium text-[#64748B]">{title}</span></span></CardContent></Card>; }
function ChartCard({ title, icon: Icon, children }: { title: string; icon: typeof BarChart3; children: React.ReactNode }) { return <Card className={`${adminCard} min-w-0 overflow-hidden`}><AdminPanelHeader icon={Icon} title={title} /><CardContent className="p-5 sm:p-6">{children}</CardContent></Card>; }
function DataCard({ title, icon: Icon, action, children, empty = false }: { title: string; icon: typeof BarChart3; action?: React.ReactNode; children: React.ReactNode; empty?: boolean }) { return <Card className={`${adminCard} min-w-0 overflow-hidden`}><AdminPanelHeader icon={Icon} title={title}>{action}</AdminPanelHeader><CardContent className="p-5 sm:p-6">{empty ? <p className="text-sm text-[#64748B]">No persisted data in this scope.</p> : children}</CardContent></Card>; }
