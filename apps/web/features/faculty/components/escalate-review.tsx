"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";

const REASONS = [
  ["CONFLICT_OF_INTEREST", "Conflict of interest"],
  ["NEEDS_SUBJECT_EXPERT", "Needs a subject expert"],
  ["SUSPECTED_FRAUD", "Suspected fraud"],
  ["POLICY_QUESTION", "Policy question"],
] as const;

/** Hands the review to the Review Coordinator with a reason code (Master Plan §12.8). */
export function EscalateReview({ evidenceId }: { evidenceId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [reasonCode, setReasonCode] = React.useState<string>("");
  const [comment, setComment] = React.useState("");
  const escalate = useMutation({
    mutationFn: () => apiClient.post(`/faculty/reviews/${evidenceId}/escalate`, { reasonCode, comment: comment || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faculty"] });
      toast.success("Escalated to the Review Coordinator");
      router.push("/faculty/reviews");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't escalate."),
  });

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 rounded-md border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
        <ArrowUpRight className="h-5 w-5" aria-hidden="true" /> Escalate to coordinator
      </button>
    );
  }
  return (
    <form className="space-y-2 rounded-lg border border-slate-200 p-3" onSubmit={(e) => { e.preventDefault(); escalate.mutate(); }}>
      <select required value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} className="h-9 w-full rounded-md border border-slate-200 px-2 text-sm" aria-label="Escalation reason">
        <option value="">Reason…</option>
        {REASONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={reasonCode === "POLICY_QUESTION" ? "Describe the policy question (required)" : "Comment (optional)"} rows={2} className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm" />
      <div className="flex gap-2">
        <button type="submit" disabled={!reasonCode || escalate.isPending || (reasonCode === "POLICY_QUESTION" && !comment.trim())} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-slate-800 px-3 text-sm font-semibold text-white disabled:opacity-50">{escalate.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Escalate</button>
        <button type="button" onClick={() => setOpen(false)} className="h-9 px-2 text-sm text-slate-500">Cancel</button>
      </div>
    </form>
  );
}
