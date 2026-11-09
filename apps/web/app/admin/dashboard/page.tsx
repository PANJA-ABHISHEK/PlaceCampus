"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ArrowDownRight, ArrowRight, BellRing, BookOpenCheck, BriefcaseBusiness, CheckCircle2, ClipboardCheck, Clock3, Database, FileSpreadsheet, GraduationCap, RefreshCw, ShieldCheck, UserRoundCheck, Users, UserRoundCog, Zap } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiClient } from "@/lib/api-client";
import type { AnalyticsOverview, AnalyticsReadiness } from "@placecampus/shared-types";
import { useAssignmentOverview } from "@/features/admin-assignments/hooks/use-assignments";
import { useImportJobs } from "@/features/admin-imports/hooks/use-imports";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditEntry {
  id: string;
  action: string;
  resourceType: string;
  actorName: string;
  success: boolean;
  createdAt: string;
}

type ActivityItem = { id: string; title: string; detail: string; at: string; ok: boolean; kind: "audit" | "import" };

const cardClass = "rounded-2xl border border-[#E5EAF0] bg-white shadow-[0_8px_30px_-24px_rgba(20,43,77,0.25)]";
const numberFormat = new Intl.NumberFormat("en-IN");

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const overview = useQuery({ queryKey: ["analytics", "overview", "admin-dashboard"], queryFn: () => apiClient.get<AnalyticsOverview>("/analytics/overview") });
  const readiness = useQuery({ queryKey: ["analytics", "readiness", "admin-dashboard"], queryFn: () => apiClient.get<AnalyticsReadiness>("/analytics/readiness") });
  const assignments = useAssignmentOverview({ sort: "reviews" });
  const imports = useImportJobs();
  const audit = useQuery({ queryKey: ["admin", "audit", "recent"], queryFn: () => apiClient.get<AuditEntry[]>("/admin/audit/recent", { params: { limit: "8" } }) });
  const health = useQuery({ queryKey: ["system", "health"], queryFn: () => apiClient.get<{ status: string; service: string; timestamp: string }>("/health"), refetchInterval: 60_000, retry: 1 });
  const [refreshedAt, setRefreshedAt] = React.useState<Date | null>(null);

  const refresh = async () => {
    await queryClient.invalidateQueries();
    setRefreshedAt(new Date());
  };

  const stats = assignments.data?.stats;
  const data = overview.data;
  const pendingReviews = stats?.pendingReviews;
  const totalEvidence = data ? Object.values(data.evidenceByStatus).reduce((sum, count) => sum + count, 0) : null;
  const verifiedEvidence = data?.evidenceByStatus.VERIFIED ?? 0;
  const profileProgress = data?.students.registered ? (data.students.usableProfiles / data.students.registered) * 100 : 0;
  const assignmentProgress = stats?.totalStudents ? (stats.assignedStudents / stats.totalStudents) * 100 : 0;
  const evidenceProgress = totalEvidence ? (verifiedEvidence / totalEvidence) * 100 : 0;
  const importActivity: ActivityItem[] = (imports.data ?? []).slice(0, 5).map((job) => ({
    id: `import-${job.id}`,
    title: job.status === "COMMITTED" ? "Bulk import completed" : `Bulk import ${job.status.toLowerCase().replaceAll("_", " ")}`,
    detail: `${job.kind === "STUDENTS" ? "Student" : "Faculty"} import · ${job.fileName}`,
    at: job.committedAt ?? job.createdAt,
    ok: job.status === "COMMITTED",
    kind: "import",
  }));
  const auditActivity: ActivityItem[] = (audit.data ?? []).map((item) => ({
    id: item.id,
    title: item.action.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
    detail: `${item.actorName} · ${item.resourceType.toLowerCase()}`,
    at: item.createdAt,
    ok: item.success,
    kind: "audit",
  }));
  const recentActivity = [...auditActivity, ...importActivity].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 5);
  const lastSuccessfulImport = imports.data?.find((job) => job.status === "COMMITTED");
  const readinessRows = (readiness.data?.byStatus ?? []).map((item) => ({ status: item.status.replaceAll("_", " "), count: item.count }));
  const isRefreshing = [overview, readiness, assignments, imports, audit].some((query) => query.isFetching);

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-[26px] border border-[#F7DDCD] bg-gradient-to-r from-white via-white to-[#FFF4ED] px-5 py-6 sm:px-8 sm:py-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-14 h-48 w-48 rounded-full border-[28px] border-[#FFE3D1]/65" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-32 h-44 w-44 rounded-full bg-[#FFF0E6]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#F45D16]">Administration</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#142B4D] sm:text-[34px]">Administration Overview</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">Monitor institutional performance, manage platform operations, and oversee placement readiness.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E7EAF0] bg-white/90 px-3.5 text-sm font-medium text-[#53647A]"><Clock3 className="h-4 w-4 text-[#FF6B1A]" />{new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
            <button type="button" onClick={refresh} disabled={isRefreshing} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#FF6B1A] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ED5D12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B1A]/40 focus-visible:ring-offset-2 disabled:opacity-70"><RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />Refresh dashboard</button>
          </div>
        </div>
        {refreshedAt && <p className="relative mt-3 text-right text-[11px] text-[#718096]">Updated {refreshedAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</p>}
      </section>

      {[overview, readiness, assignments].some((query) => query.isError) && <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><span>Some dashboard data is temporarily unavailable. Available metrics are still shown.</span><button type="button" onClick={() => { overview.refetch(); readiness.refetch(); assignments.refetch(); }} className="font-semibold underline underline-offset-2">Retry</button></div>}

      <section aria-label="Institutional key metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Metric icon={Users} label="Total Students" value={data?.students.registered} note="Registered student accounts" tone="orange" loading={overview.isLoading} />
        <Metric icon={UserRoundCog} label="Total Faculty" value={stats?.activeFaculty} note="Active faculty accounts" tone="blue" loading={assignments.isLoading} />
        <Metric icon={BriefcaseBusiness} label="Active Placement Drives" value={data?.drives.published} note="Published drives" tone="green" loading={overview.isLoading} />
        <Metric icon={ClipboardCheck} label="Pending Evidence Reviews" value={pendingReviews} note="In the faculty review workflow" tone="amber" loading={assignments.isLoading} />
        <Metric icon={BookOpenCheck} label="Usable Student Profiles" value={data?.students.usableProfiles} note="Profiles ready for institutional reporting" tone="sky" loading={overview.isLoading} />
        <Metric icon={GraduationCap} label="Average Placement Readiness" value={data?.readiness.average == null ? undefined : `${data.readiness.average}%`} note={`${numberFormat.format(data?.students.withReadinessSnapshots ?? 0)} students with a snapshot`} tone="navy" loading={overview.isLoading} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.9fr)]">
        <div className={`${cardClass} p-5 sm:p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF0E8] text-[#F45D16]"><Activity className="h-4 w-4" /></span><h2 className="text-lg font-bold text-[#142B4D]">Institutional overview</h2></div><p className="mt-2 text-sm text-[#718096]">Current coverage across the records and workflows in PlaceCampus.</p></div><Link href="/admin/analytics" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-[#F45D16] transition hover:bg-[#FFF4ED]">Analytics <ArrowRight className="h-4 w-4" /></Link></div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="space-y-5">
              <ProgressRow label="Student profile coverage" hint={data ? `${numberFormat.format(data.students.usableProfiles)} of ${numberFormat.format(data.students.registered)} profiles` : "Waiting for student data"} value={profileProgress} loading={overview.isLoading} />
              <ProgressRow label="Faculty assignment coverage" hint={stats ? `${numberFormat.format(stats.assignedStudents)} of ${numberFormat.format(stats.totalStudents)} students assigned` : "Waiting for assignment data"} value={assignmentProgress} loading={assignments.isLoading} />
              <ProgressRow label="Evidence verified" hint={totalEvidence != null ? `${numberFormat.format(verifiedEvidence)} of ${numberFormat.format(totalEvidence)} evidence records` : "Waiting for evidence data"} value={evidenceProgress} loading={overview.isLoading} />
              <div className="rounded-xl border border-[#E9EDF2] bg-[#FAFBFC] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#142B4D]"><ShieldCheck className="h-4 w-4 text-[#FF6B1A]" />Workflow health</div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-[#718096]">Unassigned students</p><p className="mt-1 font-bold tabular-nums text-[#142B4D]">{stats ? numberFormat.format(stats.unassignedStudents) : "—"}</p></div><div><p className="text-xs text-[#718096]">Overdue reviews</p><p className="mt-1 font-bold tabular-nums text-[#142B4D]">{stats ? numberFormat.format(stats.overdueReviews) : "—"}</p></div></div>
              </div>
            </div>
            <div className="min-h-[250px] rounded-xl border border-[#E9EDF2] p-3 sm:p-4">
              <div className="mb-2 flex items-center justify-between gap-2"><div><p className="text-sm font-semibold text-[#142B4D]">Readiness distribution</p><p className="mt-0.5 text-xs text-[#718096]">Latest persisted snapshots by status</p></div><span className="rounded-lg bg-[#FFF4ED] px-2 py-1 text-xs font-semibold text-[#E85C14]">{numberFormat.format(readiness.data?.studentsWithSnapshots ?? 0)} students</span></div>
              {readiness.isLoading ? <Skeleton className="mt-5 h-44 rounded-lg" /> : readiness.isError ? <InlineEmpty text="Readiness distribution is unavailable." /> : readinessRows.length ? <ResponsiveContainer width="100%" height={190}><BarChart data={readinessRows} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 4 }}><CartesianGrid horizontal={false} stroke="#EDF0F4" /><XAxis type="number" allowDecimals={false} tick={{ fill: "#718096", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="status" width={92} tick={{ fill: "#53647A", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: "#FFF6F0" }} contentStyle={{ borderRadius: 12, borderColor: "#E5EAF0", fontSize: 12 }} /><Bar dataKey="count" name="Students" fill="#FF6B1A" radius={[0, 6, 6, 0]} maxBarSize={22} /></BarChart></ResponsiveContainer> : <InlineEmpty text="No persisted readiness snapshots yet." />}
            </div>
          </div>
        </div>

        <div className={`${cardClass} overflow-hidden`}>
          <div className="flex items-start justify-between gap-3 border-b border-[#EDF0F4] px-5 py-5"><div><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF0E8] text-[#F45D16]"><BellRing className="h-4 w-4" /></span><h2 className="text-lg font-bold text-[#142B4D]">Recent system activity</h2></div><p className="mt-2 text-sm text-[#718096]">Recorded admin actions and bulk imports.</p></div><Link href="/admin/logs" className="mt-1 text-sm font-semibold text-[#F45D16] hover:underline">View audit</Link></div>
          <div className="divide-y divide-[#EDF0F4]">
            {audit.isLoading || imports.isLoading ? Array.from({ length: 4 }).map((_, i) => <div className="flex gap-3 px-5 py-4" key={i}><Skeleton className="h-9 w-9 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-3/5" /><Skeleton className="h-3 w-4/5" /></div></div>) : recentActivity.length ? recentActivity.map((item) => <ActivityRow key={item.id} item={item} />) : <div className="px-5 py-12 text-center"><Activity className="mx-auto h-8 w-8 text-[#CBD5E1]" /><p className="mt-3 text-sm font-semibold text-[#142B4D]">No recent activity recorded</p><p className="mt-1 text-xs text-[#718096]">Administrative actions and imports will appear here.</p></div>}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.9fr)]">
        <div className={`${cardClass} p-5 sm:p-6`}>
          <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF0E8] text-[#F45D16]"><Zap className="h-4 w-4" /></span><div><h2 className="text-lg font-bold text-[#142B4D]">Quick actions</h2><p className="mt-0.5 text-xs text-[#718096]">Jump into a current administrative workflow.</p></div></div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <QuickAction href="/admin/imports" icon={FileSpreadsheet} title="Import Students" detail="Upload institutional records" />
            <QuickAction href="/admin/assignments" icon={UserRoundCheck} title="Assign Faculty" detail="Manage mentor coverage" />
            <QuickAction href="/admin/reviews" icon={ClipboardCheck} title="Review Evidence" detail="Open coordinator queue" />
            <QuickAction icon={BriefcaseBusiness} title="Manage Placement Drives" detail="No admin drive-management page" disabled />
            <QuickAction icon={Users} title="Manage Users" detail="No admin user-management page" disabled />
            <QuickAction href="/admin/logs" icon={ShieldCheck} title="View Audit Logs" detail="Review recorded activity" />
          </div>
        </div>

        <div className={`${cardClass} p-5 sm:p-6`}>
          <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF7F2] text-[#258653]"><Database className="h-4 w-4" /></span><div><h2 className="text-lg font-bold text-[#142B4D]">System health</h2><p className="mt-0.5 text-xs text-[#718096]">Based on available service and workflow data.</p></div></div>
          <div className="mt-4 space-y-3">
            <HealthRow label="API service" value={health.data?.status === "ok" ? "Operational" : health.isError ? "Unavailable" : "Checking"} ok={health.data?.status === "ok"} />
            <HealthRow label="Last successful bulk import" value={lastSuccessfulImport ? new Date(lastSuccessfulImport.committedAt ?? lastSuccessfulImport.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : imports.isLoading ? "Checking" : "No successful import recorded"} ok={!!lastSuccessfulImport} />
            <HealthRow label="Pending administrative tasks" value={stats ? numberFormat.format(stats.unassignedStudents + stats.coordinatorQueue) : "—"} ok={!!stats && stats.unassignedStudents + stats.coordinatorQueue === 0} />
          </div>
          <p className="mt-4 border-t border-[#EDF0F4] pt-3 text-[11px] leading-5 text-[#718096]">Database, queue worker, and search service health are not exposed by the current health endpoint.</p>
        </div>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value, note, tone, loading }: { icon: React.ElementType; label: string; value?: string | number; note: string; tone: string; loading: boolean }) {
  const tones: Record<string, string> = { orange: "bg-[#FFF0E8] text-[#F45D16]", blue: "bg-blue-50 text-blue-600", green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", sky: "bg-sky-50 text-sky-700", navy: "bg-[#EEF2F8] text-[#315078]" };
  return <article title={note} className={`${cardClass} group p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#F3D3C1] hover:shadow-[0_14px_32px_-22px_rgba(20,43,77,0.32)]`}><div className="flex items-start justify-between gap-2"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="h-[19px] w-[19px]" /></span><span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#DCE3EA] transition group-hover:bg-[#FF6B1A]" /></div><p className="mt-4 min-h-10 text-[13px] font-semibold leading-5 text-[#53647A]">{label}</p>{loading && value === undefined ? <Skeleton className="mt-1 h-8 w-24" /> : <p className="mt-1 text-[27px] font-extrabold tracking-tight text-[#142B4D] tabular-nums">{value === undefined ? "—" : typeof value === "number" ? numberFormat.format(value) : value}</p>}<p className="mt-1 truncate text-[11px] text-[#8793A3]">{note}</p></article>;
}

function ProgressRow({ label, hint, value, loading }: { label: string; hint: string; value: number; loading: boolean }) {
  return <div><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-[#263B57]">{label}</p><span className="text-xs font-bold tabular-nums text-[#142B4D]">{loading ? "—" : `${Math.round(Math.max(0, Math.min(value, 100)))}%`}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#EDF1F5]">{loading ? <div className="h-full w-1/3 animate-pulse rounded-full bg-[#D9E0E7]" /> : <div className="h-full rounded-full bg-[#FF6B1A] transition-[width] duration-700 ease-out" style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />}</div><p className="mt-1.5 text-xs text-[#8793A3]">{hint}</p></div>;
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const Icon = item.kind === "import" ? FileSpreadsheet : item.ok ? CheckCircle2 : ArrowDownRight;
  return <div className="flex items-start gap-3 px-5 py-3.5"><span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.ok ? "bg-emerald-50 text-emerald-700" : "bg-[#FFF4ED] text-[#E85C14]"}`}><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#263B57]">{item.title}</p><p className="mt-0.5 truncate text-xs text-[#718096]">{item.detail}</p></div><time className="shrink-0 pt-0.5 text-[11px] text-[#8793A3]" dateTime={item.at}>{relativeTime(item.at)}</time></div>;
}

function QuickAction({ href, icon: Icon, title, detail, disabled = false }: { href?: string; icon: React.ElementType; title: string; detail: string; disabled?: boolean }) {
  const className = `group flex min-h-[92px] flex-col justify-between rounded-xl border border-[#E9EDF2] bg-white p-3.5 transition duration-200 ${disabled ? "cursor-not-allowed bg-[#FAFBFC] opacity-65" : "hover:-translate-y-0.5 hover:border-[#FFBE98] hover:bg-[#FFFCFA] hover:shadow-[0_8px_22px_-18px_rgba(244,93,22,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B1A]/40"}`;
  const content = <><Icon className={`h-5 w-5 text-[#FF6B1A] ${disabled ? "" : "transition-transform group-hover:scale-110"}`} /><span><span className="block text-sm font-bold text-[#263B57]">{title}</span><span className="mt-0.5 block text-[11px] text-[#8793A3]">{detail}</span></span></>;
  return disabled || !href ? <button type="button" disabled title={detail} className={className}>{content}</button> : <Link href={href} className={className}>{content}</Link>;
}

function HealthRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return <div className="flex items-start justify-between gap-3 rounded-xl bg-[#FAFBFC] px-3.5 py-3"><span className="text-xs font-medium text-[#53647A]">{label}</span><span className={`inline-flex max-w-[60%] items-center gap-1.5 text-right text-xs font-semibold ${ok ? "text-emerald-700" : "text-[#718096]"}`}>{ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />}{value}</span></div>;
}

function InlineEmpty({ text }: { text: string }) { return <div className="flex h-[190px] items-center justify-center px-4 text-center text-sm text-[#8793A3]">{text}</div>; }

function relativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
