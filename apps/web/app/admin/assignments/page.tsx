"use client";

import * as React from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, GraduationCap, History, Loader2, Play, Search, SlidersHorizontal, UserCheck, UserRoundX, Users, Wand2, X } from "lucide-react";
import {
  type AllocationResult,
  REASON_LABEL,
  useAllocation,
  useAssign,
  useAssignmentHistory,
  useAssignmentOverview,
  useEndAssignment,
  useFacultyOptions,
  useMentees,
  useReassign,
  useUnassigned,
} from "@/features/admin-assignments/hooks/use-assignments";
import { DemoBadge, Stat, adminCard } from "@/features/admin-imports/components/import-ui";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const field = "h-10 rounded-xl border border-[#DCE3EC] bg-white px-3 text-sm text-[#142B4D] outline-none transition focus:border-[#FF6B1A]/50 focus:ring-2 focus:ring-[#FF6B1A]/15";
const btn = "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold disabled:opacity-50";
const FACULTY_PAGE_SIZE = 10;
const errText = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong.");

type StudentRef = { studentId: string; fullName: string; registrationNumber?: string };

export default function FacultyAssignmentsPage() {
  const [filters, setFilters] = React.useState({ search: "", department: "", sort: "mentees" });
  const overview = useAssignmentOverview(filters);
  const [tab, setTab] = React.useState<"workload" | "exceptions">("workload");
  const [historyFor, setHistoryFor] = React.useState<StudentRef | null>(null);
  const [assignFor, setAssignFor] = React.useState<StudentRef | null>(null);
  const s = overview.data?.stats;
  const hasFilters = !!(filters.search || filters.department || filters.sort !== "mentees");

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FF6B1A]">Admin / Faculty Assignments</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#142B4D] sm:text-3xl">Faculty Assignments</h1>
        <p className="mt-1 max-w-[52rem] text-sm leading-6 text-slate-600">Manage faculty mentors, monitor student assignments, and identify students who need a mentor.</p>
      </header>

      <section aria-labelledby="assignment-overview-title">
        <h2 id="assignment-overview-title" className="sr-only">Assignment Overview</h2>
        {overview.isError && !s ? (
          <ErrorPanel title="Couldn’t load assignment overview" onRetry={() => overview.refetch()} />
        ) : !s ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Total Students" value={s.totalStudents} detail="Active student profiles" icon={Users} />
              <MetricCard label="Active Faculty" value={s.activeFaculty} detail="Available faculty mentors" icon={GraduationCap} />
              <MetricCard label="Students With Mentor" value={s.assignedStudents} detail="Students with an active mentor" icon={UserCheck} tone="green" />
              <MetricCard label="Students Without Mentor" value={s.unassignedStudents} detail="Students needing an assignment" icon={UserRoundX} tone={s.unassignedStudents ? "orange" : "green"} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-[#E5EAF0] bg-white/80 px-4 py-3 text-sm">
              <span className="font-semibold text-[#142B4D]">Operational summary</span>
              <SummaryMetric label="Pending reviews" value={s.pendingReviews} />
              <SummaryMetric label="Overdue reviews" value={s.overdueReviews} alert={s.overdueReviews > 0} />
              <SummaryMetric label="Coordinator queue" value={s.coordinatorQueue} />
              <SummaryMetric label="Upcoming interviews" value={s.upcomingInterviews} />
            </div>
          </>
        )}
      </section>

      <AllocationPanel departments={overview.data?.departments ?? []} target={overview.data?.target ?? 40} />

      <section className={cn(adminCard, "overflow-hidden")}>
        <div className="border-b border-[#E8EDF3] px-5 pt-5 sm:px-6">
          <h2 className="text-lg font-bold text-[#142B4D]">Faculty Management</h2>
          <p className="mt-0.5 text-sm text-slate-500">Review faculty workloads or resolve students without a mentor.</p>
        </div>
        <div role="tablist" aria-label="Faculty management views" className="flex gap-2 border-b border-[#E8EDF3] px-4 pt-4 sm:px-6">
          {([["workload", "Faculty workload"], ["exceptions", "Exception queue"]] as const).map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition", tab === k ? "border-[#FF6B1A] text-[#C54C0B]" : "border-transparent text-slate-500 hover:text-[#142B4D]")}>
              {label}{k === "exceptions" && s && <span className={cn("rounded-full px-2 py-0.5 text-xs", s.unassignedStudents > 0 ? "bg-orange-50 text-[#C54C0B]" : "bg-slate-100 text-slate-500")}>{s.unassignedStudents}</span>}
            </button>
          ))}
        </div>
        {tab === "workload" ? (
          <Workload filters={filters} setFilters={setFilters} departments={overview.data?.departments ?? []} target={overview.data?.target ?? 40} onHistory={setHistoryFor} hasFilters={hasFilters} />
        ) : (
          <Exceptions onAssign={setAssignFor} onHistory={setHistoryFor} />
        )}
      </section>

      <HistoryDialog student={historyFor} onClose={() => setHistoryFor(null)} />
      <AssignDialog student={assignFor} onClose={() => setAssignFor(null)} />
    </div>
  );
}

function MetricCard({ label, value, detail, icon: Icon, tone = "orange" }: { label: string; value: number; detail: string; icon: React.ElementType; tone?: "orange" | "green" }) {
  const green = tone === "green";
  return (
    <div className={cn(adminCard, "flex min-h-[116px] items-center gap-4 p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md")}>
      <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", green ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-[#FF6B1A]")}><Icon className="h-5 w-5" aria-hidden="true" /></span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-600">{label}</p>
        <p className="mt-0.5 text-3xl font-bold leading-none tabular-nums text-[#142B4D]">{value.toLocaleString()}</p>
        <p className="mt-1.5 text-xs text-slate-500">{detail}</p>
      </div>
    </div>
  );
}

function SummaryMetric({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return <span className="inline-flex items-center gap-2 text-slate-600"><span>{label}</span><strong className={cn("tabular-nums text-[#142B4D]", alert && "text-red-700")}>{value.toLocaleString()}</strong></span>;
}

function ErrorPanel({ title, onRetry }: { title: string; onRetry: () => void }) {
  return <div className={cn(adminCard, "flex flex-col items-center gap-3 px-5 py-8 text-center")}><AlertCircle className="h-7 w-7 text-red-500" aria-hidden="true" /><div><p className="font-semibold text-[#142B4D]">{title}</p><p className="mt-1 text-sm text-slate-500">Check your connection and try again.</p></div><button type="button" onClick={onRetry} className="rounded-lg border border-[#DCE3EC] px-3 py-2 text-sm font-semibold text-[#142B4D] hover:bg-slate-50">Try again</button></div>;
}

function AllocationPanel({ departments, target: defaultTarget }: { departments: string[]; target: number }) {
  const allocation = useAllocation();
  const [target, setTarget] = React.useState(defaultTarget);
  const [scope, setScope] = React.useState<string[]>([]);
  const [preview, setPreview] = React.useState<AllocationResult | null>(null);
  const [confirming, setConfirming] = React.useState(false);

  const run = (commit: boolean) =>
    allocation.mutate(
      { commit, target, departmentCodes: scope.length ? scope : undefined },
      {
        onSuccess: (r) => {
          setPreview(r);
          setConfirming(false);
          if (commit) toast.success(`Allocated ${r.created} mentor(s)`, { description: r.skipped ? `${r.skipped} skipped (assigned meanwhile).` : undefined });
        },
        onError: (e) => toast.error(errText(e)),
      },
    );

  return (
    <section className={cn(adminCard, "p-5 sm:p-6")}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#142B4D]"><Wand2 className="h-5 w-5 text-[#FF6B1A]" aria-hidden="true" /> Automatic Mentor Allocation</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Automatically assign eligible students to faculty members based on department and current student workload.</p>
          <p className="mt-2 text-xs text-slate-500">Faculty with fewer assigned students are prioritized. Existing and manual assignments are preserved.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="text-xs font-semibold text-slate-600">Target per faculty<input type="number" min={1} max={500} value={target} onChange={(e) => setTarget(Number(e.target.value) || 40)} className={cn(field, "mt-1 block w-full sm:w-28")} /></label>
          <button type="button" onClick={() => run(false)} disabled={allocation.isPending} className={cn(btn, "h-10 justify-center border border-[#FF6B1A] bg-white px-4 text-[#C54C0B] hover:bg-orange-50")}>
            {allocation.isPending && !confirming ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />} Preview allocation
          </button>
        </div>
      </div>
      {departments.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="mr-1 font-semibold text-slate-600">Approved departments</span>
          {departments.map((d) => {
            const on = scope.length === 0 || scope.includes(d);
            return <button key={d} type="button" onClick={() => setScope(scope.length === 0 ? [d] : on ? scope.filter((x) => x !== d) : [...scope, d])} aria-pressed={on} className={cn("rounded-full px-3 py-1.5 font-semibold transition", on ? "bg-orange-50 text-[#C54C0B] ring-1 ring-orange-200" : "bg-white text-[#142B4D] ring-1 ring-[#DCE3EC] hover:border-orange-200 hover:bg-orange-50/40")}>{d}</button>;
          })}
          {scope.length > 0 && <button type="button" onClick={() => setScope([])} className="inline-flex items-center gap-1 font-semibold text-[#C54C0B]"><X className="h-3.5 w-3.5" />Clear</button>}
        </div>
      )}

      {preview && (
        <div className="space-y-4 rounded-xl border border-[#E5E7EB] bg-slate-50/50 p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <Stat label="Students in scope" value={preview.totals.students} />
            <Stat label="Eligible" value={preview.totals.eligible} />
            <Stat label="Already have a mentor" value={preview.totals.alreadyAssigned} />
            <Stat label={preview.created !== undefined ? "Assigned now" : "Will be assigned"} value={preview.created ?? preview.totals.toAssign} tone="text-emerald-700" />
            <Stat label="Unassigned" value={preview.totals.unassigned} tone={preview.totals.unassigned ? "text-amber-700" : undefined} />
            <Stat label="Unavailable faculty" value={preview.totals.unavailableFaculty} />
            <Stat label="Faculty over target" value={preview.totals.facultyOverTarget} tone={preview.totals.facultyOverTarget ? "text-amber-700" : undefined} />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <MiniTable title="By department" head={["Dept", "Students", "Assigned", "Faculty"]} rows={preview.departments.map((d) => [d.department, d.students, d.assigned, d.faculty])} />
            <MiniTable title="Unassigned by reason" head={["Reason", "Students"]} rows={preview.unassignedByReason.map((r) => [REASON_LABEL[r.reason] ?? r.reason, r.students])} />
            <MiniTable title="Unmapped departments" head={["School (source)", "Students"]} rows={preview.unmappedDepartments.map((u) => [u.school, u.students])} />
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold text-[#0B1F44]">Workload after allocation ({preview.workload.length} faculty)</summary>
            <div className="mt-2 max-h-72 overflow-auto"><MiniTable title="" head={["Faculty", "Dept", "Current", "+ Planned", "Total"]} rows={preview.workload.map((w) => [w.fullName, w.department, w.current, w.planned, `${w.total}${w.overTarget ? " ⚠" : ""}`])} /></div>
          </details>
          {preview.created === undefined && preview.totals.toAssign > 0 && (
            confirming ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-3 text-sm ring-1 ring-[#FF6B1A]/30">
                <AlertTriangle className="h-4 w-4 text-[#FF6B1A]" aria-hidden="true" />
                Create {preview.totals.toAssign} active MENTOR assignment(s)? The plan is recomputed at commit time.
                <button type="button" onClick={() => run(true)} disabled={allocation.isPending} className={cn(btn, "bg-[#FF6B1A] text-white")}>{allocation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Commit allocation</button>
                <button type="button" onClick={() => setConfirming(false)} className={cn(btn, "text-[#64748B]")}>Cancel</button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className={cn(btn, "h-10 bg-[#FF6B1A] px-5 text-white")}>Allocate {preview.totals.toAssign} mentor(s)…</button>
            )
          )}
        </div>
      )}
    </section>
  );
}

function MiniTable({ title, head, rows }: { title: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <div>
      {title && <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[#64748B]">{title}</p>}
      {rows.length ? (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-[#64748B]"><tr>{head.map((h) => <th key={h} className="pb-1 pr-2 font-semibold">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#E5E7EB]">{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="py-1 pr-2 tabular-nums text-[#0B1F44]">{c}</td>)}</tr>)}</tbody>
        </table>
      ) : (
        <p className="text-sm text-[#64748B]">None.</p>
      )}
    </div>
  );
}

function Workload({ filters, setFilters, departments, target, onHistory, hasFilters }: {
  filters: { search: string; department: string; sort: string };
  setFilters: (f: { search: string; department: string; sort: string }) => void;
  departments: string[];
  target: number;
  onHistory: (s: StudentRef) => void;
  hasFilters: boolean;
}) {
  const overview = useAssignmentOverview(filters);
  const [open, setOpen] = React.useState<string | null>(null);
  const [visibleCount, setVisibleCount] = React.useState(FACULTY_PAGE_SIZE);
  const rows = overview.data?.faculty ?? [];
  const visibleRows = rows.slice(0, visibleCount);
  const updateFilters = (next: { search: string; department: string; sort: string }) => {
    setVisibleCount(FACULTY_PAGE_SIZE);
    setFilters(next);
  };

  return (
    <div>
      <div className="flex flex-col gap-2 border-b border-[#E8EDF3] p-4 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="relative min-w-0 flex-1 sm:max-w-[340px]"><span className="sr-only">Search faculty</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input type="search" value={filters.search} onChange={(e) => updateFilters({ ...filters, search: e.target.value })} placeholder="Search name, ID or designation" className={cn(field, "w-full pl-9")} /></label>
        <label className="relative"><span className="sr-only">Filter by department</span><select value={filters.department} onChange={(e) => updateFilters({ ...filters, department: e.target.value })} className={cn(field, "w-full appearance-none pr-9 sm:w-48")} aria-label="Department"><option value="">All departments</option>{departments.map((d) => <option key={d}>{d}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" /></label>
        <label className="relative"><span className="sr-only">Sort faculty</span><select value={filters.sort} onChange={(e) => updateFilters({ ...filters, sort: e.target.value })} className={cn(field, "w-full appearance-none pr-9 sm:w-52")} aria-label="Sort"><option value="mentees">Most mentees</option><option value="menteesAsc">Fewest mentees</option><option value="reviews">Most pending reviews</option><option value="name">Name</option></select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" /></label>
        {hasFilters && <button type="button" onClick={() => updateFilters({ search: "", department: "", sort: "mentees" })} className="inline-flex h-10 items-center gap-1.5 self-start rounded-xl px-2 text-sm font-semibold text-[#C54C0B] hover:bg-orange-50 sm:self-auto"><SlidersHorizontal className="h-4 w-4" aria-hidden="true" />Clear filters</button>}
      </div>
      {overview.isError && !overview.data && <ErrorPanel title="Couldn’t load faculty workload" onRetry={() => overview.refetch()} />}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Faculty</th><th className="px-4 py-3">Department</th><th className="px-4 py-3 text-center">Mentees</th><th className="px-4 py-3 text-center">Pending reviews</th><th className="px-4 py-3 text-center">Overdue</th><th className="px-4 py-3 text-center">Interviews</th><th className="px-5 py-3 text-right">Action</th></tr></thead>
          <tbody className="divide-y divide-[#E8EDF3]">
            {visibleRows.map((f) => (
              <React.Fragment key={f.facultyUserId}>
                <tr className="transition hover:bg-slate-50/70">
                  <td className="px-5 py-3"><p className="font-semibold text-[#142B4D]">{f.fullName}</p><p className="mt-0.5 text-xs text-slate-500">{[f.employeeId, f.designation].filter(Boolean).join(" · ") || "Faculty member"}{!f.available && <span className="ml-1.5 font-semibold text-red-700">· Unavailable</span>}{f.isDemoData && <span className="ml-2 align-middle"><DemoBadge /></span>}</p></td>
                  <td className="px-4 py-3 text-[#142B4D]">{f.department ?? <span className="text-amber-700">Unmapped</span>}</td>
                  <td className={cn("px-4 py-3 text-center font-bold tabular-nums", f.mentees > target ? "text-amber-700" : "text-[#142B4D]")}>{f.mentees}</td>
                  <td className="px-4 py-3 text-center tabular-nums text-slate-700">{f.pendingReviews}</td>
                  <td className={cn("px-4 py-3 text-center tabular-nums", f.overdueReviews && "font-bold text-red-700")}>{f.overdueReviews}</td>
                  <td className="px-4 py-3 text-center tabular-nums text-slate-700">{f.upcomingInterviews}</td>
                  <td className="px-5 py-3 text-right">{f.mentees > 0 && <button type="button" onClick={() => setOpen(open === f.facultyUserId ? null : f.facultyUserId)} aria-expanded={open === f.facultyUserId} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#DCE3EC] px-2.5 text-xs font-semibold text-[#142B4D] transition hover:border-orange-200 hover:bg-orange-50/50"><Users className="h-3.5 w-3.5 text-[#FF6B1A]" aria-hidden="true" />View Students <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open === f.facultyUserId && "rotate-180")} aria-hidden="true" /></button>}</td>
                </tr>
                {open === f.facultyUserId && <tr><td colSpan={7} className="bg-slate-50/60 px-5 py-4"><MenteeList facultyUserId={f.facultyUserId} onHistory={onHistory} /></td></tr>}
              </React.Fragment>
            ))}
            {!overview.isLoading && !rows.length && <tr><td colSpan={7} className="px-4 py-12 text-center"><Users className="mx-auto mb-2 h-7 w-7 text-slate-400" aria-hidden="true" /><p className="font-semibold text-[#142B4D]">No faculty found</p><p className="mt-1 text-sm text-slate-500">Try clearing your search or department filter.</p></td></tr>}
            {overview.isLoading && !rows.length && <tr><td colSpan={7} className="p-4"><Skeleton className="h-12 rounded-lg" /></td></tr>}
          </tbody>
        </table>
      </div>
      {rows.length > 0 && <div className="flex flex-wrap items-center justify-center gap-3 border-t border-[#E8EDF3] px-4 py-3">
        <span className="text-sm text-slate-500">Showing {visibleRows.length} of {rows.length} faculty</span>
        {visibleCount < rows.length && <button type="button" onClick={() => setVisibleCount((count) => Math.min(count + FACULTY_PAGE_SIZE, rows.length))} className={cn(btn, "h-10 border border-[#DCE3EC] bg-white px-4 text-[#142B4D] hover:border-orange-200 hover:bg-orange-50/40")}>Load 10 More</button>}
      </div>}
    </div>
  );
}
function MenteeList({ facultyUserId, onHistory }: { facultyUserId: string; onHistory: (s: StudentRef) => void }) {
  const mentees = useMentees(facultyUserId);
  if (mentees.isError) return <div className="flex flex-wrap items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"><AlertCircle className="h-4 w-4" aria-hidden="true" />Couldn’t load assigned students.<button type="button" onClick={() => mentees.refetch()} className="font-semibold underline">Try again</button></div>;
  if (!mentees.data) return <Skeleton className="h-16 rounded-lg" />;
  return (
    <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
      {mentees.data.map((m) => (
        <li key={m.assignmentId} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-[#E5E7EB]">
          <span className="min-w-0"><span className="block truncate font-semibold text-[#0B1F44]">{m.fullName}</span><span className="text-xs text-[#64748B]">{m.registrationNumber} · {m.purposes.join(", ").toLowerCase()}</span></span>
          <button type="button" onClick={() => onHistory({ studentId: m.studentId, fullName: m.fullName, registrationNumber: m.registrationNumber })} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#FF6B1A]"><History className="h-3.5 w-3.5" aria-hidden="true" />Manage</button>
        </li>
      ))}
    </ul>
  );
}

function Exceptions({ onAssign, onHistory }: { onAssign: (s: StudentRef) => void; onHistory: (s: StudentRef) => void }) {
  const [q, setQ] = React.useState({ reason: "", search: "", page: 1 });
  const list = useUnassigned(q);
  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.limit)) : 1;
  return (
    <div>
      <div className="flex flex-col gap-2 border-b border-[#E8EDF3] p-4 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="relative min-w-0 flex-1 sm:max-w-[340px]"><span className="sr-only">Search students</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input type="search" value={q.search} onChange={(e) => setQ({ ...q, search: e.target.value, page: 1 })} placeholder="Search name or student ID" className={cn(field, "w-full pl-9")} /></label>
        <label className="relative"><span className="sr-only">Filter by exception reason</span><select value={q.reason} onChange={(e) => setQ({ ...q, reason: e.target.value, page: 1 })} className={cn(field, "w-full appearance-none pr-9 sm:w-60")} aria-label="Reason"><option value="">All reasons</option>{Object.entries(REASON_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" /></label>
        {list.data && <span className="text-sm text-slate-500">{list.data.total} student{list.data.total === 1 ? "" : "s"} in queue</span>}
      </div>
      {list.isError ? <ErrorPanel title="Couldn’t load the exception queue" onRetry={() => list.refetch()} /> : !list.data ? (
        <div className="space-y-2 p-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : !list.data.items.length ? (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center"><CheckCircle2 className="h-8 w-8 text-emerald-600" aria-hidden="true" /><p className="font-semibold text-[#142B4D]">No students need attention</p><p className="text-sm text-slate-500">Every student matching these filters has a mentor or is awaiting an eligible assignment.</p></div>
      ) : (
        <>
          <ul className="divide-y divide-[#E8EDF3]">
            {list.data.items.map((u) => (
              <li key={u.studentId} className="flex flex-col gap-3 px-5 py-4 text-sm transition hover:bg-slate-50/60 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1"><p className="font-semibold text-[#142B4D]">{u.fullName} <span className="ml-1 font-normal text-slate-500">{u.registrationNumber}</span></p><p className="mt-0.5 text-xs text-slate-500">{u.school ?? "No school"}{u.department ? ` · ${u.department}` : ""}</p></div>
                <div className="flex flex-wrap items-center gap-2 sm:w-[360px]">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">Unassigned</span>
                  <span className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">{REASON_LABEL[u.reason] ?? u.reason}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                  <button type="button" onClick={() => onHistory(u)} className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-[#142B4D]"><History className="h-3.5 w-3.5" aria-hidden="true" />History</button>
                  <button type="button" disabled={u.reason === "DEPARTMENT_UNMAPPED"} title={u.reason === "DEPARTMENT_UNMAPPED" ? "Approve the department mapping first" : undefined} onClick={() => onAssign(u)} className={cn(btn, "h-9 border border-[#FF6B1A] text-[#C54C0B] hover:bg-[#FF6B1A] hover:text-white")}>Assign faculty</button>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-[#E8EDF3] px-5 py-3 text-sm">
            <span className="text-slate-500">Page {q.page} of {pages}</span>
            <div className="flex gap-2">
              <button type="button" disabled={q.page <= 1} onClick={() => setQ({ ...q, page: q.page - 1 })} className={cn(btn, "border border-[#DCE3EC] text-[#142B4D]")}>Previous</button>
              <button type="button" disabled={q.page >= pages} onClick={() => setQ({ ...q, page: q.page + 1 })} className={cn(btn, "border border-[#DCE3EC] text-[#142B4D]")}>Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
/** Pick a faculty member (least loaded, same department first) plus reason and overrides. */
function FacultyPicker({ studentId, onSubmit, pending, submitLabel, showPurposes }: {
  studentId: string;
  onSubmit: (v: { facultyUserId: string; reason: string; purposes: string[]; allowCrossDepartment: boolean; allowOverTarget: boolean }) => void;
  pending: boolean;
  submitLabel: string;
  showPurposes?: boolean;
}) {
  const options = useFacultyOptions(studentId);
  const [v, setV] = React.useState({ facultyUserId: "", reason: "", purposes: ["MENTOR"], allowCrossDepartment: false, allowOverTarget: false });
  const chosen = options.data?.find((o) => o.facultyUserId === v.facultyUserId);
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSubmit(v); }}>
      <select required value={v.facultyUserId} onChange={(e) => setV({ ...v, facultyUserId: e.target.value })} className={cn(field, "w-full")} aria-label="Faculty">
        <option value="">{options.isLoading ? "Loading faculty…" : "Choose faculty (same department first, least loaded first)"}</option>
        {options.data?.map((o) => <option key={o.facultyUserId} value={o.facultyUserId}>{o.fullName} · {o.department ?? "no dept"} · {o.mentees} mentees{o.sameDepartment ? "" : " · other dept"}</option>)}
      </select>
      {showPurposes && (
        <div className="flex flex-wrap gap-3 text-sm">
          {["MENTOR", "EVIDENCE_REVIEWER", "INTERVIEWER", "PROJECT_GUIDE"].map((p) => (
            <label key={p} className="flex items-center gap-1.5"><input type="checkbox" checked={v.purposes.includes(p)} onChange={(e) => setV({ ...v, purposes: e.target.checked ? [...v.purposes, p] : v.purposes.filter((x) => x !== p) })} className="h-4 w-4 accent-[#FF6B1A]" />{p.replace("_", " ").toLowerCase()}</label>
          ))}
        </div>
      )}
      <input required value={v.reason} onChange={(e) => setV({ ...v, reason: e.target.value })} placeholder="Reason (required, recorded in history)" className={cn(field, "w-full")} />
      {chosen && !chosen.sameDepartment && <label className="flex items-center gap-2 text-sm text-amber-800"><input type="checkbox" checked={v.allowCrossDepartment} onChange={(e) => setV({ ...v, allowCrossDepartment: e.target.checked })} className="h-4 w-4 accent-[#FF6B1A]" />Allow cross-department assignment</label>}
      {chosen && chosen.mentees >= 40 && <label className="flex items-center gap-2 text-sm text-amber-800"><input type="checkbox" checked={v.allowOverTarget} onChange={(e) => setV({ ...v, allowOverTarget: e.target.checked })} className="h-4 w-4 accent-[#FF6B1A]" />Allow going over the 40-mentee target</label>}
      <button type="submit" disabled={pending || !v.facultyUserId || !v.reason.trim() || (showPurposes && !v.purposes.length)} className={cn(btn, "bg-[#FF6B1A] text-white")}>{pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{submitLabel}</button>
    </form>
  );
}

function AssignDialog({ student, onClose }: { student: StudentRef | null; onClose: () => void }) {
  const assign = useAssign();
  return (
    <Dialog open={!!student} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[34rem]">
        <DialogHeader><DialogTitle>Assign faculty</DialogTitle><DialogDescription>{student?.fullName} {student?.registrationNumber}</DialogDescription></DialogHeader>
        {student && (
          <FacultyPicker
            studentId={student.studentId}
            showPurposes
            submitLabel="Assign"
            pending={assign.isPending}
            onSubmit={(v) => assign.mutate({ studentId: student.studentId, ...v }, { onSuccess: () => { toast.success("Assigned"); onClose(); }, onError: (e) => toast.error(errText(e)) })}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function HistoryDialog({ student, onClose }: { student: StudentRef | null; onClose: () => void }) {
  const history = useAssignmentHistory(student?.studentId ?? null);
  const reassign = useReassign();
  const end = useEndAssignment();
  const [mode, setMode] = React.useState<{ id: string; kind: "reassign" | "end" } | null>(null);
  const [reason, setReason] = React.useState("");
  return (
    <Dialog open={!!student} onOpenChange={(o) => { if (!o) { onClose(); setMode(null); } }}>
      <DialogContent className="max-h-[85vh] max-w-[40rem] overflow-y-auto">
        <DialogHeader><DialogTitle>Assignment history</DialogTitle><DialogDescription>{student?.fullName} {student?.registrationNumber}</DialogDescription></DialogHeader>
        {!history.data ? <Skeleton className="h-24 rounded-lg" /> : !history.data.length ? <p className="text-sm text-[#64748B]">No assignments yet.</p> : (
          <ol className="space-y-3">
            {history.data.map((h) => (
              <li key={h.id} className={cn("rounded-xl p-3 text-sm ring-1", h.status === "ACTIVE" ? "bg-emerald-50/50 ring-emerald-200" : "bg-slate-50 ring-[#E5E7EB]")}>
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-[#0B1F44]">{h.facultyName ?? h.facultyUserId}</b>
                  <span className="text-xs text-[#64748B]">{h.purposes.join(", ").toLowerCase()}</span>
                  <span className={cn("ml-auto rounded-md px-2 py-0.5 text-xs font-semibold", h.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700")}>{h.status === "ACTIVE" ? "Active" : "Ended"}</span>
                </div>
                <p className="mt-1 text-xs text-[#64748B]">
                  {h.source?.toLowerCase()} · from {format(new Date(h.validFrom), "d MMM yyyy")}{h.validTo ? ` to ${format(new Date(h.validTo), "d MMM yyyy")}` : ""}
                  {h.assignedByName ? ` · by ${h.assignedByName}` : ""}{h.reason ? ` · “${h.reason}”` : ""}
                  {h.endReason ? ` · ended${h.endedByName ? ` by ${h.endedByName}` : ""}: “${h.endReason}”` : ""}
                </p>
                {h.status === "ACTIVE" && (
                  <div className="mt-2 space-y-2">
                    {mode?.id !== h.id ? (
                      <div className="flex gap-3">
                        <button type="button" onClick={() => setMode({ id: h.id, kind: "reassign" })} className="text-xs font-semibold text-[#FF6B1A]">Reassign</button>
                        <button type="button" onClick={() => setMode({ id: h.id, kind: "end" })} className="text-xs font-semibold text-red-700">End</button>
                      </div>
                    ) : mode.kind === "reassign" && student ? (
                      <FacultyPicker
                        studentId={student.studentId}
                        submitLabel="Reassign"
                        pending={reassign.isPending}
                        onSubmit={(v) => reassign.mutate({ assignmentId: h.id, facultyUserId: v.facultyUserId, reason: v.reason, allowCrossDepartment: v.allowCrossDepartment, allowOverTarget: v.allowOverTarget }, { onSuccess: () => { toast.success("Reassigned — both faculty and the student are notified"); setMode(null); }, onError: (e) => toast.error(errText(e)) })}
                      />
                    ) : (
                      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); end.mutate({ assignmentId: h.id, reason }, { onSuccess: () => { toast.success("Assignment ended"); setMode(null); setReason(""); }, onError: (err) => toast.error(errText(err)) }); }}>
                        <input required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" className={cn(field, "flex-1")} />
                        <button type="submit" className={cn(btn, "bg-red-600 text-white")}>End</button>
                      </form>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
