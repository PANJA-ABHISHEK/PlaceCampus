"use client";

import * as React from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { AlertTriangle, ChevronDown, History, Loader2, Play, Search, Users, Wand2 } from "lucide-react";
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

const field = "h-9 rounded-lg border border-[#E5E7EB] bg-white px-2.5 text-sm outline-none focus:border-[#FF6B1A]/50 focus:ring-2 focus:ring-[#FF6B1A]/15";
const btn = "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold disabled:opacity-50";
const errText = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong.");

type StudentRef = { studentId: string; fullName: string; registrationNumber?: string };

export default function FacultyAssignmentsPage() {
  const [filters, setFilters] = React.useState({ search: "", department: "", sort: "mentees" });
  const overview = useAssignmentOverview(filters);
  const [tab, setTab] = React.useState<"workload" | "exceptions">("workload");
  const [historyFor, setHistoryFor] = React.useState<StudentRef | null>(null);
  const [assignFor, setAssignFor] = React.useState<StudentRef | null>(null);
  const s = overview.data?.stats;

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0B1F44]">Faculty Assignments</h1>
        <p className="mt-1 max-w-[52rem] text-sm text-[#64748B]">
          Every eligible student gets one active primary mentor from an approved department. Students whose department isn&apos;t approved stay in the exception queue. Demo and real records are never paired.
        </p>
      </div>

      {!s ? (
        <Skeleton className="h-24 rounded-2xl" />
      ) : (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          <Stat label="Total students" value={s.totalStudents} />
          <Stat label="Active faculty" value={s.activeFaculty} />
          <Stat label="With a mentor" value={s.assignedStudents} tone="text-emerald-700" />
          <Stat label="Without a mentor" value={s.unassignedStudents} tone={s.unassignedStudents ? "text-amber-700" : undefined} />
          <Stat label="Pending reviews" value={s.pendingReviews} />
          <Stat label="Overdue reviews" value={s.overdueReviews} tone={s.overdueReviews ? "text-red-700" : undefined} />
          <Stat label="Coordinator queue" value={s.coordinatorQueue} />
          <Stat label="Upcoming interviews" value={s.upcomingInterviews} />
        </section>
      )}

      <AllocationPanel departments={overview.data?.departments ?? []} target={overview.data?.target ?? 40} />

      <section className={cn(adminCard, "overflow-hidden")}>
        <div role="tablist" className="flex flex-wrap gap-1 border-b border-[#E5E7EB] bg-slate-50/60 p-2">
          {([["workload", "Faculty workload"], ["exceptions", "Exception queue"]] as const).map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("rounded-lg px-4 py-2 text-sm font-semibold", tab === k ? "bg-white text-[#0B1F44] shadow-sm ring-1 ring-[#E5E7EB]" : "text-[#64748B] hover:text-[#0B1F44]")}>
              {label}
            </button>
          ))}
        </div>
        {tab === "workload" ? (
          <Workload filters={filters} setFilters={setFilters} departments={overview.data?.departments ?? []} target={overview.data?.target ?? 40} onHistory={setHistoryFor} />
        ) : (
          <Exceptions onAssign={setAssignFor} onHistory={setHistoryFor} />
        )}
      </section>

      <HistoryDialog student={historyFor} onClose={() => setHistoryFor(null)} />
      <AssignDialog student={assignFor} onClose={() => setAssignFor(null)} />
    </div>
  );
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
    <section className={cn(adminCard, "space-y-4 p-5")}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-[#0B1F44]"><Wand2 className="h-5 w-5 text-[#FF6B1A]" aria-hidden="true" /> Automatic mentor allocation</h2>
          <p className="mt-1 text-sm text-[#64748B]">Lowest mentee count first, ties to the least recently assigned. The target is soft: faculty over it are flagged, not skipped. Existing and manual assignments are never changed.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold text-[#64748B]">Target per faculty<input type="number" min={1} max={500} value={target} onChange={(e) => setTarget(Number(e.target.value) || 40)} className={cn(field, "mt-1 block w-24")} /></label>
          <button type="button" onClick={() => run(false)} disabled={allocation.isPending} className={cn(btn, "h-10 border border-[#E5E7EB] bg-white text-[#0B1F44]")}>{allocation.isPending && !confirming ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />} Preview</button>
        </div>
      </div>
      {departments.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-semibold text-[#64748B]">Departments:</span>
          {departments.map((d) => {
            const on = scope.includes(d);
            return <button key={d} type="button" onClick={() => setScope(on ? scope.filter((x) => x !== d) : [...scope, d])} aria-pressed={on} className={cn("rounded-full px-2.5 py-1 font-semibold ring-1", on ? "bg-[#FF6B1A] text-white ring-[#FF6B1A]" : "bg-white text-[#0B1F44] ring-[#E5E7EB]")}>{d}</button>;
          })}
          {scope.length > 0 && <button type="button" onClick={() => setScope([])} className="font-semibold text-[#FF6B1A]">All</button>}
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

function Workload({ filters, setFilters, departments, target, onHistory }: {
  filters: { search: string; department: string; sort: string };
  setFilters: (f: { search: string; department: string; sort: string }) => void;
  departments: string[];
  target: number;
  onHistory: (s: StudentRef) => void;
}) {
  const overview = useAssignmentOverview(filters);
  const [open, setOpen] = React.useState<string | null>(null);
  const rows = overview.data?.faculty ?? [];
  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-[#E5E7EB] p-3">
        <label className="relative"><span className="sr-only">Search faculty</span><Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" aria-hidden="true" /><input type="search" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Name, ID or designation" className={cn(field, "w-60 pl-8")} /></label>
        <select value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })} className={field} aria-label="Department"><option value="">All departments</option>{departments.map((d) => <option key={d}>{d}</option>)}</select>
        <select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })} className={field} aria-label="Sort"><option value="mentees">Most mentees</option><option value="menteesAsc">Fewest mentees</option><option value="reviews">Most pending reviews</option><option value="name">Name</option></select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-[#64748B]"><tr><th className="px-4 py-2.5">Faculty</th><th className="px-4 py-2.5">Department</th><th className="px-4 py-2.5 text-center">Mentees</th><th className="px-4 py-2.5 text-center">Pending reviews</th><th className="px-4 py-2.5 text-center">Overdue</th><th className="px-4 py-2.5 text-center">Interviews</th><th className="px-4 py-2.5" /></tr></thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {rows.map((f) => (
              <React.Fragment key={f.facultyUserId}>
                <tr className="hover:bg-slate-50/60">
                  <td className="px-4 py-2.5"><p className="font-semibold text-[#0B1F44]">{f.fullName}</p><p className="text-xs text-[#64748B]">{[f.employeeId, f.designation].filter(Boolean).join(" · ")}{!f.available && <span className="ml-1.5 font-semibold text-red-700">unavailable</span>}{f.isDemoData && <span className="ml-1.5"><DemoBadge /></span>}</p></td>
                  <td className="px-4 py-2.5 text-[#0B1F44]">{f.department ?? <span className="text-amber-700">unmapped</span>}</td>
                  <td className={cn("px-4 py-2.5 text-center font-bold tabular-nums", f.mentees > target ? "text-amber-700" : "text-[#0B1F44]")}>{f.mentees}</td>
                  <td className="px-4 py-2.5 text-center tabular-nums">{f.pendingReviews}</td>
                  <td className={cn("px-4 py-2.5 text-center tabular-nums", f.overdueReviews && "font-bold text-red-700")}>{f.overdueReviews}</td>
                  <td className="px-4 py-2.5 text-center tabular-nums">{f.upcomingInterviews}</td>
                  <td className="px-4 py-2.5 text-right">{f.mentees > 0 && <button type="button" onClick={() => setOpen(open === f.facultyUserId ? null : f.facultyUserId)} aria-expanded={open === f.facultyUserId} className="inline-flex items-center gap-1 text-sm font-semibold text-[#FF6B1A]">Students <ChevronDown className={cn("h-4 w-4 transition-transform", open === f.facultyUserId && "rotate-180")} aria-hidden="true" /></button>}</td>
                </tr>
                {open === f.facultyUserId && <tr><td colSpan={7} className="bg-slate-50/60 px-4 py-3"><MenteeList facultyUserId={f.facultyUserId} onHistory={onHistory} /></td></tr>}
              </React.Fragment>
            ))}
            {!rows.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-[#64748B]">No faculty match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MenteeList({ facultyUserId, onHistory }: { facultyUserId: string; onHistory: (s: StudentRef) => void }) {
  const mentees = useMentees(facultyUserId);
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
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E7EB] p-3">
        <label className="relative"><span className="sr-only">Search students</span><Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" aria-hidden="true" /><input type="search" value={q.search} onChange={(e) => setQ({ ...q, search: e.target.value, page: 1 })} placeholder="Name or registration no." className={cn(field, "w-60 pl-8")} /></label>
        <select value={q.reason} onChange={(e) => setQ({ ...q, reason: e.target.value, page: 1 })} className={field} aria-label="Reason"><option value="">All reasons</option>{Object.entries(REASON_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        {list.data && <span className="text-sm text-[#64748B]">{list.data.total} student(s)</span>}
      </div>
      {!list.data ? (
        <div className="space-y-2 p-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
      ) : !list.data.items.length ? (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center"><Users className="h-8 w-8 text-emerald-600" aria-hidden="true" /><p className="text-sm text-[#64748B]">Every student in scope has a primary mentor.</p></div>
      ) : (
        <>
          <ul className="divide-y divide-[#E5E7EB]">
            {list.data.items.map((u) => (
              <li key={u.studentId} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0 flex-1"><p className="font-semibold text-[#0B1F44]">{u.fullName} <span className="font-normal text-[#64748B]">{u.registrationNumber}</span></p><p className="text-xs text-[#64748B]">{u.school ?? "No school"}{u.department ? ` · ${u.department}` : ""}</p></div>
                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">{REASON_LABEL[u.reason] ?? u.reason}</span>
                <button type="button" onClick={() => onHistory(u)} className="text-xs font-semibold text-[#64748B] hover:text-[#0B1F44]">History</button>
                <button type="button" disabled={u.reason === "DEPARTMENT_UNMAPPED"} title={u.reason === "DEPARTMENT_UNMAPPED" ? "Approve the department mapping first" : undefined} onClick={() => onAssign(u)} className={cn(btn, "h-8 border border-[#FF6B1A] text-[#FF6B1A] hover:bg-[#FF6B1A] hover:text-white")}>Assign</button>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-[#E5E7EB] px-4 py-2.5 text-sm">
            <span className="text-[#64748B]">Page {q.page} of {pages}</span>
            <div className="flex gap-2">
              <button type="button" disabled={q.page <= 1} onClick={() => setQ({ ...q, page: q.page - 1 })} className={cn(btn, "border border-[#E5E7EB]")}>Previous</button>
              <button type="button" disabled={q.page >= pages} onClick={() => setQ({ ...q, page: q.page + 1 })} className={cn(btn, "border border-[#E5E7EB]")}>Next</button>
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
