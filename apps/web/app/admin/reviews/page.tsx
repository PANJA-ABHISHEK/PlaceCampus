"use client";

import * as React from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, ChevronDown, ClipboardCheck, Clock3, Loader2, RefreshCw, Search, UserRoundCheck } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";
import { useFacultyOptions } from "@/features/admin-assignments/hooks/use-assignments";
import { adminCard } from "@/features/admin-imports/components/import-ui";
import { TYPE_META } from "@/features/evidence/lib/evidence-meta";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { EvidenceType } from "@placecampus/shared-types";

interface QueueItem {
  id: string;
  title: string;
  type: EvidenceType;
  status: string;
  student: { id: string; fullName: string; registrationNumber?: string; department?: string | null } | null;
  createdAt: string;
  reviewDueAt?: string;
  overdue: boolean;
  reviewQueue?: "COORDINATOR";
  reviewEscalation?: { reasonCode: string; comment?: string; at: string };
  reviewerName: string | null;
  previousReviewerName: string | null;
}

const field = "h-10 rounded-xl border border-[#DCE3EC] bg-white px-3 text-sm text-[#142B4D] outline-none transition focus:border-[#FF6B1A]/50 focus:ring-2 focus:ring-[#FF6B1A]/15";
const dateLabel = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : format(date, "d MMM yyyy, h:mm a");
};

function friendlyReason(item: QueueItem) {
  if (!item.reviewEscalation) return "No eligible reviewer was available";
  const reasons: Record<string, string> = {
    CONFLICT_OF_INTEREST: "Reviewer conflict of interest",
    NEEDS_SUBJECT_EXPERT: "Subject expert requested",
    SUSPECTED_FRAUD: "Potential integrity concern",
    POLICY_QUESTION: "Policy clarification requested",
  };
  return reasons[item.reviewEscalation.reasonCode] ?? item.reviewEscalation.reasonCode.replaceAll("_", " ").toLowerCase();
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

/** Review Coordinator: backend-authorized coordinator and overdue queues. */
export default function ReviewCoordinatorPage() {
  const [filter, setFilter] = React.useState<"coordinator" | "overdue">("coordinator");
  const [search, setSearch] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [assignItem, setAssignItem] = React.useState<QueueItem | null>(null);
  const qc = useQueryClient();
  const coordinator = useQuery({ queryKey: ["admin", "reviews", "coordinator"], queryFn: () => apiClient.get<QueueItem[]>("/admin/reviews", { params: { filter: "coordinator" } }) });
  const overdue = useQuery({ queryKey: ["admin", "reviews", "overdue"], queryFn: () => apiClient.get<QueueItem[]>("/admin/reviews", { params: { filter: "overdue" } }) });
  const activeQuery = filter === "coordinator" ? coordinator : overdue;
  const items = activeQuery.data ?? [];
  const availableDepartments = Array.from(new Set(items.map((item) => item.student?.department).filter((d): d is string => !!d))).sort();
  const availableTypes = Array.from(new Set(items.map((item) => item.type)));
  const filteredItems = items.filter((item) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || `${item.student?.fullName ?? ""} ${item.student?.registrationNumber ?? ""} ${item.student?.id ?? ""}`.toLowerCase().includes(query);
    return matchesSearch && (!department || item.student?.department === department) && (!typeFilter || item.type === typeFilter);
  });
  const reassign = useMutation({
    mutationFn: (v: { id: string; reviewerId: string; reason: string }) => apiClient.post(`/admin/reviews/${v.id}/reassign`, { reviewerId: v.reviewerId, reason: v.reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
      qc.invalidateQueries({ queryKey: ["admin", "assignments"] });
      setAssignItem(null);
      toast.success("Review assigned", { description: "The reviewer has been notified." });
    },
    onError: (e) => toast.error("Couldn’t assign the review", { description: e instanceof ApiError ? e.message : "Please try again." }),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "reviews"] });

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FF6B1A]">Admin / Review Queue</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#142B4D] sm:text-3xl">Review Queue</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Review evidence that needs coordinator attention and assign it to an available reviewer.</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={coordinator.isFetching || overdue.isFetching} className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-[#FF6B1A]/50 bg-white px-3.5 text-sm font-semibold text-[#C54C0B] transition hover:bg-orange-50/50 disabled:opacity-60 sm:self-auto">
          <RefreshCw className={cn("h-4 w-4", (coordinator.isFetching || overdue.isFetching) && "animate-spin")} aria-hidden="true" /> Refresh
        </button>
      </header>

      <div role="tablist" aria-label="Review queues" className="inline-flex max-w-full gap-1 rounded-xl border border-[#E5EAF0] bg-white p-1.5">
        <QueueTab active={filter === "coordinator"} label="Coordinator Queue" count={coordinator.data?.length} icon="coordinator" onClick={() => { setFilter("coordinator"); setSearch(""); setDepartment(""); setTypeFilter(""); }} />
        <QueueTab active={filter === "overdue"} label="All Overdue" count={overdue.data?.length} icon="overdue" onClick={() => { setFilter("overdue"); setSearch(""); setDepartment(""); setTypeFilter(""); }} />
      </div>

      <section className={cn(adminCard, "overflow-hidden")}>
        {activeQuery.isLoading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : activeQuery.isError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <AlertCircle className="h-8 w-8 text-red-500" aria-hidden="true" />
            <div><p className="font-semibold text-[#142B4D]">Couldn’t load this queue</p><p className="mt-1 text-sm text-slate-500">Check your connection and try again.</p></div>
            <button type="button" onClick={() => activeQuery.refetch()} className="rounded-lg border border-[#DCE3EC] px-3 py-2 text-sm font-semibold text-[#142B4D] hover:bg-slate-50">Try again</button>
          </div>
        ) : !items.length ? (
          <EmptyQueue overdue={filter === "overdue"} />
        ) : (
          <>
            <div className="flex flex-col gap-2 border-b border-[#E8EDF3] p-4 sm:flex-row sm:flex-wrap sm:items-center">
              <label className="relative min-w-0 flex-1 sm:max-w-[340px]"><span className="sr-only">Search by student name or ID</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input value={search} onChange={(e) => setSearch(e.target.value)} className={cn(field, "w-full pl-9")} placeholder="Search student name or ID" /></label>
              {availableDepartments.length > 0 && <SelectFilter label="Department" value={department} onChange={setDepartment} options={availableDepartments} allLabel="All departments" />}
              {availableTypes.length > 0 && <SelectFilter label="Evidence type" value={typeFilter} onChange={setTypeFilter} options={availableTypes.map((type) => ({ value: type, label: TYPE_META[type]?.label ?? statusLabel(type) }))} allLabel="All evidence types" />}
              <span className="text-xs text-slate-500 sm:ml-auto">{filteredItems.length} of {items.length} item{items.length === 1 ? "" : "s"}</span>
            </div>
            {!filteredItems.length ? (
              <div className="px-6 py-12 text-center"><p className="font-semibold text-[#142B4D]">No matching items</p><p className="mt-1 text-sm text-slate-500">Try adjusting the search or filters.</p></div>
            ) : filter === "coordinator" ? (
              <CoordinatorTable items={filteredItems} onAssign={setAssignItem} />
            ) : (
              <OverdueTable items={filteredItems} />
            )}
          </>
        )}
      </section>

      <ReviewerAssignmentDialog
        key={assignItem?.id ?? "closed"}
        item={assignItem}
        pending={reassign.isPending}
        onOpenChange={(open) => { if (!open) setAssignItem(null); }}
        onConfirm={(reviewerId, reason) => { if (assignItem) reassign.mutate({ id: assignItem.id, reviewerId, reason }); }}
      />
    </div>
  );
}

function QueueTab({ active, label, count, icon, onClick }: { active: boolean; label: string; count?: number; icon: "coordinator" | "overdue"; onClick: () => void }) {
  const Icon = icon === "coordinator" ? ClipboardCheck : Clock3;
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={cn("inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition sm:px-4", active ? "bg-orange-50 text-[#C54C0B] shadow-sm ring-1 ring-orange-200" : "text-slate-600 hover:bg-slate-50 hover:text-[#142B4D]")}>
    <Icon className="h-4 w-4" aria-hidden="true" />{label}{count !== undefined && <span className={cn("rounded-full px-2 py-0.5 text-xs tabular-nums", active ? "bg-white text-[#C54C0B]" : "bg-slate-100 text-slate-600")}>{count}</span>}
  </button>;
}

function SelectFilter({ label, value, onChange, options, allLabel }: { label: string; value: string; onChange: (value: string) => void; options: string[] | { value: string; label: string }[]; allLabel: string }) {
  const normalized = options.map((option) => typeof option === "string" ? { value: option, label: option } : option);
  return <label className="relative"><span className="sr-only">Filter by {label.toLowerCase()}</span><select value={value} onChange={(e) => onChange(e.target.value)} className={cn(field, "w-full appearance-none pr-9 sm:min-w-[175px]")}><option value="">{allLabel}</option>{normalized.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" /></label>;
}

function EmptyQueue({ overdue }: { overdue: boolean }) {
  return <div className="mx-4 my-4 flex min-h-[250px] flex-col items-center justify-center rounded-xl border border-[#E8EDF3] bg-white px-6 py-10 text-center sm:my-5">
    <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-6 w-6" aria-hidden="true" /></span>
    <h2 className="text-lg font-bold text-[#142B4D]">{overdue ? "No overdue reviews" : "You’re all caught up!"}</h2>
    <p className="mt-1 max-w-lg text-sm text-slate-600">{overdue ? "There are currently no overdue evidence reviews." : "There are no evidence items waiting for coordinator review."}</p>
    {!overdue && <p className="mt-1 text-xs text-slate-500">New items will appear here when they need coordinator attention.</p>}
  </div>;
}

function CoordinatorTable({ items, onAssign }: { items: QueueItem[]; onAssign: (item: QueueItem) => void }) {
  return <div className="overflow-x-auto">
    <table className="w-full min-w-[950px] text-left text-sm">
      <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Student</th><th className="px-4 py-3">Evidence</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr></thead>
      <tbody className="divide-y divide-[#E8EDF3]">{items.map((item) => <tr key={item.id} className="transition hover:bg-slate-50/60">
        <td className="px-5 py-3"><p className="font-semibold text-[#142B4D]">{item.student?.fullName ?? "Unknown student"}</p><p className="mt-0.5 text-xs text-slate-500">{item.student?.registrationNumber ?? item.student?.id ?? "—"}</p></td>
        <td className="px-4 py-3"><p className="font-medium text-[#142B4D]">{item.title}</p><p className="mt-0.5 text-xs text-slate-500">{TYPE_META[item.type]?.label ?? statusLabel(item.type)}</p></td>
        <td className="px-4 py-3 text-slate-600">{item.student?.department ?? "—"}</td>
        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{dateLabel(item.createdAt)}</td>
        <td className="max-w-[230px] px-4 py-3"><p className="font-medium text-amber-800">{friendlyReason(item)}</p>{item.reviewEscalation?.comment && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.reviewEscalation.comment}</p>}</td>
        <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{statusLabel(item.status)}</span></td>
        <td className="px-5 py-3 text-right"><button type="button" disabled={!item.student?.id} title={!item.student?.id ? "Student details are unavailable" : undefined} onClick={() => onAssign(item)} className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#FF6B1A] px-3 text-xs font-semibold text-white transition hover:bg-[#EA580C] disabled:cursor-not-allowed disabled:opacity-50"><UserRoundCheck className="h-4 w-4" aria-hidden="true" />Assign Reviewer</button></td>
      </tr>)}</tbody>
    </table>
  </div>;
}

function OverdueTable({ items }: { items: QueueItem[] }) {
  return <div className="overflow-x-auto">
    <table className="w-full min-w-[1000px] text-left text-sm">
      <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Student</th><th className="px-4 py-3">Evidence</th><th className="px-4 py-3">Reviewer</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3">Due date</th><th className="px-4 py-3">Overdue</th><th className="px-5 py-3">Status</th></tr></thead>
      <tbody className="divide-y divide-[#E8EDF3]">{items.map((item) => {
        const dueAt = item.reviewDueAt ? new Date(item.reviewDueAt) : null;
        const days = dueAt && !Number.isNaN(dueAt.getTime()) ? Math.max(1, differenceInCalendarDays(new Date(), dueAt)) : null;
        return <tr key={item.id} className="transition hover:bg-slate-50/60">
          <td className="px-5 py-3"><p className="font-semibold text-[#142B4D]">{item.student?.fullName ?? "Unknown student"}</p><p className="mt-0.5 text-xs text-slate-500">{item.student?.registrationNumber ?? item.student?.id ?? "—"}</p></td>
          <td className="px-4 py-3"><p className="font-medium text-[#142B4D]">{item.title}</p><p className="mt-0.5 text-xs text-slate-500">{TYPE_META[item.type]?.label ?? statusLabel(item.type)}</p></td>
          <td className="px-4 py-3 text-slate-600">{item.reviewerName ?? "Unassigned"}</td>
          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{dateLabel(item.createdAt)}</td>
          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{dateLabel(item.reviewDueAt)}</td>
          <td className="px-4 py-3"><span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">{days === null ? "Overdue" : `${days} day${days === 1 ? "" : "s"}`}</span></td>
          <td className="px-5 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{statusLabel(item.status)}</span></td>
        </tr>;
      })}</tbody>
    </table>
  </div>;
}

function ReviewerAssignmentDialog({ item, pending, onOpenChange, onConfirm }: { item: QueueItem | null; pending: boolean; onOpenChange: (open: boolean) => void; onConfirm: (reviewerId: string, reason: string) => void }) {
  const reviewerOptions = useFacultyOptions(item?.student?.id ?? null);
  const [reviewerId, setReviewerId] = React.useState("");
  const [reason, setReason] = React.useState("");
  return <Dialog open={!!item} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-[32rem]">
      <DialogHeader><DialogTitle className="text-[#142B4D]">Assign reviewer</DialogTitle><DialogDescription>{item?.title} · {item?.student?.fullName ?? "Unknown student"}</DialogDescription></DialogHeader>
      {reviewerOptions.isLoading ? <Skeleton className="h-12 rounded-xl" /> : reviewerOptions.isError ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700"><p>Couldn’t load eligible reviewers.</p><button type="button" onClick={() => reviewerOptions.refetch()} className="mt-1 font-semibold underline">Try again</button></div> : !reviewerOptions.data?.length ? <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">No eligible reviewers are currently available for this student. Reviewer availability, data class, and conflicts are checked by the existing system.</div> : (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onConfirm(reviewerId, reason); }}>
          <label className="block space-y-1.5 text-sm font-semibold text-[#142B4D]">Eligible reviewer
            <select required value={reviewerId} onChange={(e) => setReviewerId(e.target.value)} className={cn(field, "w-full font-normal")}>
              <option value="">Choose a reviewer</option>
              {reviewerOptions.data.map((reviewer) => <option key={reviewer.facultyUserId} value={reviewer.facultyUserId}>{reviewer.fullName} · {reviewer.designation ?? "Faculty"} · {reviewer.department ?? "No department"} · {reviewer.mentees} mentees</option>)}
            </select>
          </label>
          <label className="block space-y-1.5 text-sm font-semibold text-[#142B4D]">Reason for assignment
            <textarea required maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-24 w-full resize-y rounded-xl border border-[#DCE3EC] bg-white px-3 py-2 text-sm font-normal text-[#142B4D] outline-none transition focus:border-[#FF6B1A]/50 focus:ring-2 focus:ring-[#FF6B1A]/15" placeholder="Why is this reviewer being assigned?" />
          </label>
          <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
            <button type="button" onClick={() => onOpenChange(false)} className="h-10 rounded-xl border border-[#DCE3EC] px-4 text-sm font-semibold text-[#142B4D] hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={pending || !reviewerId || !reason.trim()} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#FF6B1A] px-4 text-sm font-semibold text-white hover:bg-[#EA580C] disabled:cursor-not-allowed disabled:opacity-50">{pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Confirm Assignment</button>
          </div>
        </form>
      )}
      {!reviewerOptions.isLoading && !reviewerOptions.isError && !reviewerOptions.data?.length && <button type="button" onClick={() => onOpenChange(false)} className="mt-3 h-10 rounded-xl border border-[#DCE3EC] px-4 text-sm font-semibold text-[#142B4D] hover:bg-slate-50">Cancel</button>}
    </DialogContent>
  </Dialog>;
}
