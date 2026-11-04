"use client";

import * as React from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { CheckCheck, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";
import { useAssignmentOverview } from "@/features/admin-assignments/hooks/use-assignments";
import { adminCard } from "@/features/admin-imports/components/import-ui";
import { TYPE_META } from "@/features/evidence/lib/evidence-meta";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { EvidenceType } from "@placecampus/shared-types";

interface QueueItem {
  id: string;
  title: string;
  type: EvidenceType;
  student: { id: string; fullName: string; registrationNumber?: string } | null;
  reviewDueAt?: string;
  overdue: boolean;
  reviewQueue?: "COORDINATOR";
  reviewEscalation?: { reasonCode: string; comment?: string; at: string };
  reviewerName: string | null;
  previousReviewerName: string | null;
}

const field = "h-9 rounded-lg border border-[#E5E7EB] bg-white px-2.5 text-sm outline-none focus:border-[#FF6B1A]/50";

/** Review Coordinator: unroutable and escalated reviews, and every overdue review. */
export default function ReviewCoordinatorPage() {
  const [filter, setFilter] = React.useState<"coordinator" | "overdue">("coordinator");
  const qc = useQueryClient();
  const queue = useQuery({ queryKey: ["admin", "reviews", filter], queryFn: () => apiClient.get<QueueItem[]>("/admin/reviews", { params: { filter } }) });
  const faculty = useAssignmentOverview({ sort: "reviews" }).data?.faculty.filter((f) => f.available) ?? [];
  const reassign = useMutation({
    mutationFn: (v: { id: string; reviewerId: string; reason: string }) => apiClient.post(`/admin/reviews/${v.id}/reassign`, { reviewerId: v.reviewerId, reason: v.reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
      qc.invalidateQueries({ queryKey: ["admin", "assignments"] });
      toast.success("Review assigned — the reviewer is notified");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't reassign."),
  });

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0B1F44]">Review Queue</h1>
        <p className="mt-1 max-w-[50rem] text-sm text-[#64748B]">
          Evidence that couldn&apos;t be routed (no assigned or department reviewer) or was escalated lands here. You act as Review Coordinator: assign it to an available reviewer with a reason. Conflicts of interest and demo/real separation are enforced.
        </p>
      </div>
      <div role="tablist" className="inline-flex rounded-xl bg-slate-100 p-1">
        {([["coordinator", "Coordinator queue"], ["overdue", "All overdue"]] as const).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)} className={cn("rounded-lg px-4 py-2 text-sm font-semibold", filter === k ? "bg-white text-[#0B1F44] shadow-sm" : "text-[#64748B]")}>{l}</button>
        ))}
      </div>
      <section className={cn(adminCard, "overflow-hidden")}>
        {queue.isLoading ? (
          <div className="space-y-2 p-5">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : !queue.data?.length ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center"><CheckCheck className="h-8 w-8 text-emerald-600" aria-hidden="true" /><p className="text-sm text-[#64748B]">{filter === "overdue" ? "No overdue reviews." : "The coordinator queue is empty."}</p></div>
        ) : (
          <ul className="divide-y divide-[#E5E7EB]">
            {queue.data.map((item) => <QueueRow key={item.id} item={item} faculty={faculty} pending={reassign.isPending} onAssign={(reviewerId, reason) => reassign.mutate({ id: item.id, reviewerId, reason })} />)}
          </ul>
        )}
      </section>
    </div>
  );
}

function QueueRow({ item, faculty, pending, onAssign }: { item: QueueItem; faculty: { facultyUserId: string; fullName: string; department: string | null; pendingReviews: number; isDemoData: boolean }[]; pending: boolean; onAssign: (reviewerId: string, reason: string) => void }) {
  const [reviewerId, setReviewerId] = React.useState("");
  const [reason, setReason] = React.useState("");
  const type = TYPE_META[item.type];
  return (
    <li className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="min-w-0 space-y-1 text-sm">
        <p className="font-semibold text-[#0B1F44]">{item.title}</p>
        <p className="text-xs text-[#64748B]">{type?.label} · {item.student?.fullName} {item.student?.registrationNumber}{item.reviewDueAt && <> · <span className={item.overdue ? "font-semibold text-red-700" : ""}>due {format(new Date(item.reviewDueAt), "d MMM yyyy")}</span></>}</p>
        {item.reviewEscalation ? (
          <p className="text-xs text-amber-800">Escalated by {item.previousReviewerName ?? "reviewer"}: <b>{item.reviewEscalation.reasonCode.replaceAll("_", " ").toLowerCase()}</b>{item.reviewEscalation.comment ? ` — “${item.reviewEscalation.comment}”` : ""}</p>
        ) : item.reviewQueue === "COORDINATOR" ? (
          <p className="text-xs text-amber-800">No assigned or department reviewer was available.</p>
        ) : (
          <p className="text-xs text-[#64748B]">Current reviewer: {item.reviewerName ?? "—"}</p>
        )}
      </div>
      <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); onAssign(reviewerId, reason); }}>
        <select required value={reviewerId} onChange={(e) => setReviewerId(e.target.value)} className={cn(field, "min-w-[14rem] flex-1")} aria-label="Reviewer">
          <option value="">Choose reviewer…</option>
          {faculty.map((f) => <option key={f.facultyUserId} value={f.facultyUserId}>{f.fullName} · {f.department ?? "no dept"} · {f.pendingReviews} open{f.isDemoData ? " · demo" : ""}</option>)}
        </select>
        <input required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className={cn(field, "min-w-[10rem] flex-1")} />
        <button type="submit" disabled={pending} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#FF6B1A] px-3 text-sm font-semibold text-white disabled:opacity-50">{pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Assign</button>
      </form>
    </li>
  );
}
