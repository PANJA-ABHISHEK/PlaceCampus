"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarClock, Lock, LockOpen } from "lucide-react";
import { toast } from "sonner";
import { useClaimReview, useReleaseReview } from "../hooks/use-faculty-portal";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/** Renew well before the 30-minute lock lapses. */
const RENEW_EVERY_MS = 10 * 60 * 1000;
/**
 * Releasing is deferred briefly and cancelled if the workspace mounts again
 * (React StrictMode remounts, quick back/forward), so a late release can never
 * drop a lock that a fresh claim just took.
 */
const RELEASE_DELAY_MS = 500;
const pendingRelease = new Map<string, number>();

/**
 * Claims the review while this workspace is open: renews the 30-minute lock
 * every 10 minutes and releases it when the reviewer leaves.
 */
export function ReviewLock({ evidenceId, dueAt, overdue }: { evidenceId: string; dueAt?: string; overdue?: boolean }) {
  const claim = useClaimReview();
  const release = useReleaseReview();
  const [expiresAt, setExpiresAt] = React.useState<string | null>(null);
  const [blocked, setBlocked] = React.useState<string | null>(null);
  const [released, setReleased] = React.useState(false);

  const claimMutate = claim.mutate;
  const releaseMutate = release.mutate;

  const doClaim = React.useCallback(() => {
    claimMutate(evidenceId, {
      onSuccess: (res) => {
        setExpiresAt(res.reviewLockExpiresAt ?? null);
        setBlocked(null);
        setReleased(false);
      },
      onError: (error) => setBlocked(error instanceof ApiError ? error.message : "Couldn't claim this review."),
    });
  }, [claimMutate, evidenceId]);

  React.useEffect(() => {
    if (released) return;
    window.clearTimeout(pendingRelease.get(evidenceId));
    pendingRelease.delete(evidenceId);
    doClaim();
    const timer = window.setInterval(doClaim, RENEW_EVERY_MS);
    return () => {
      window.clearInterval(timer);
      pendingRelease.set(
        evidenceId,
        window.setTimeout(() => {
          pendingRelease.delete(evidenceId);
          releaseMutate(evidenceId);
        }, RELEASE_DELAY_MS),
      );
    };
  }, [doClaim, evidenceId, releaseMutate, released]);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-4 py-3 text-sm",
        blocked ? "border-red-200 bg-red-50 text-red-800" : "border-orange-200 bg-orange-50/70 text-[#0B1F44]",
      )}
      role="status"
    >
      {blocked ? (
        <span className="flex items-center gap-2 font-semibold"><Lock className="h-4 w-4" aria-hidden="true" />{blocked}</span>
      ) : released ? (
        <span className="flex items-center gap-2 font-semibold"><LockOpen className="h-4 w-4" aria-hidden="true" />Released. It stays in your queue.</span>
      ) : (
        <span className="flex items-center gap-2 font-semibold">
          <Lock className="h-4 w-4 text-[#FF6B1A]" aria-hidden="true" />
          {expiresAt ? `Claimed by you until ${format(new Date(expiresAt), "h:mm a")} (renews while open)` : "Claiming…"}
        </span>
      )}
      {dueAt && (
        <span className={cn("flex items-center gap-1.5", overdue ? "font-semibold text-red-600" : "text-[#64748B]")}>
          <CalendarClock className="h-4 w-4" aria-hidden="true" />
          {overdue ? "Overdue since" : "Due"} {format(new Date(dueAt), "d MMM yyyy")}
        </span>
      )}
      <span className="ml-auto">
        {released ? (
          <button type="button" onClick={() => setReleased(false)} className="font-semibold text-[#FF6B1A] hover:underline">Claim again</button>
        ) : !blocked && expiresAt ? (
          <button
            type="button"
            onClick={() =>
              release.mutate(evidenceId, {
                onSuccess: () => {
                  setReleased(true);
                  setExpiresAt(null);
                  toast.success("Review released");
                },
              })
            }
            className="font-semibold text-[#0B1F44]/80 hover:text-[#FF6B1A]"
          >
            Release
          </button>
        ) : null}
      </span>
    </div>
  );
}
