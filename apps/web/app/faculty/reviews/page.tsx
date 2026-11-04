"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { AlertTriangle, CheckCheck, ChevronRight, CircleAlert, FileCheck2, RotateCcw } from "lucide-react";
import { EvidenceStatus, type FacultyReviewQueueItem } from "@placecampus/shared-types";
import { useFacultyReviews } from "@/features/faculty/hooks/use-faculty-reviews";
import { useFacultyDashboard } from "@/features/faculty/hooks/use-faculty-portal";
import { REVIEW_STATE_BADGE } from "@/features/faculty/lib/faculty-meta";
import { StudentCell, facultyCard } from "@/features/faculty/components/faculty-ui";
import { TYPE_META } from "@/features/evidence/lib/evidence-meta";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Tab = "NEEDS_REVIEW" | "OVERDUE" | "RESUBMISSION_REQUESTED";

const TABS: { key: Tab; label: string }[] = [
  { key: "NEEDS_REVIEW", label: "Needs Review" },
  { key: "OVERDUE", label: "Overdue" },
  { key: "RESUBMISSION_REQUESTED", label: "Awaiting Resubmission" },
];

function FacultyReviewsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const tab: Tab = params.get("filter") === "overdue" ? "OVERDUE" : params.get("status") === EvidenceStatus.RESUBMISSION_REQUESTED ? "RESUBMISSION_REQUESTED" : "NEEDS_REVIEW";
  const stats = useFacultyDashboard().data?.stats;
  const { data: reviews, isLoading, isError, refetch } = useFacultyReviews(
    tab === "OVERDUE" ? undefined : tab,
    undefined,
    tab === "OVERDUE" ? "overdue" : undefined,
  );

  const setTab = (next: Tab) => {
    const query = next === "OVERDUE" ? "?filter=overdue" : next === "RESUBMISSION_REQUESTED" ? `?status=${next}` : "";
    router.replace(`/faculty/reviews${query}`, { scroll: false });
  };

  const items = (reviews ?? []) as unknown as FacultyReviewQueueItem[];

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-[#0B1F44]">Evidence Review Queue</h2>
        <p className="mt-1 text-sm text-[#64748B]">
          Items routed to you for verification, most urgent first. Opening an item claims it for 30 minutes so nobody else works on it.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button type="button" onClick={() => setTab("NEEDS_REVIEW")} className={cn(facultyCard, "flex items-center gap-4 p-5 text-left transition-all hover:-translate-y-0.5", tab === "NEEDS_REVIEW" && "border-[#FF6B1A]/40")}>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-[#FF6B1A]"><FileCheck2 className="h-6 w-6" aria-hidden="true" /></span>
          <span><span className="block text-2xl font-extrabold tabular-nums text-[#0B1F44]">{stats?.pendingReviews ?? "–"}</span><span className="text-sm text-[#64748B]">Pending reviews</span></span>
        </button>
        <button type="button" onClick={() => setTab("OVERDUE")} className={cn(facultyCard, "flex items-center gap-4 p-5 text-left transition-all hover:-translate-y-0.5", tab === "OVERDUE" && "border-red-300")}>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600"><AlertTriangle className="h-6 w-6" aria-hidden="true" /></span>
          <span><span className="block text-2xl font-extrabold tabular-nums text-[#0B1F44]">{stats?.overdueReviews ?? "–"}</span><span className="text-sm text-[#64748B]">Overdue (past 3 working days)</span></span>
        </button>
      </div>

      <section className={cn(facultyCard, "overflow-hidden")}>
        <div role="tablist" aria-label="Review filter" className="flex flex-wrap gap-1 border-b border-[#E5E7EB] bg-slate-50/60 p-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn("rounded-lg px-4 py-2 text-sm font-semibold transition-colors", tab === t.key ? "bg-white text-[#0B1F44] shadow-sm ring-1 ring-[#E5E7EB]" : "text-[#64748B] hover:text-[#0B1F44]")}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5" aria-busy="true">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center" role="alert">
            <CircleAlert className="h-8 w-8 text-red-600" aria-hidden="true" />
            <p className="font-semibold text-red-900">Could not load the review queue</p>
            <button type="button" onClick={() => refetch()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-red-700 ring-1 ring-red-200"><RotateCcw className="h-4 w-4" aria-hidden="true" /> Retry</button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCheck className="h-5 w-5" aria-hidden="true" /></span>
            <p className="text-sm text-[#64748B]">
              {tab === "OVERDUE" ? "Nothing is overdue. Nice work!" : tab === "RESUBMISSION_REQUESTED" ? "No items are waiting on a student resubmission." : "You're all caught up! No evidence reviews require your attention."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#E5E7EB]">
            {items.map((item) => {
              const type = TYPE_META[item.type];
              const state = REVIEW_STATE_BADGE[item.reviewState];
              const waiting = item.status === EvidenceStatus.RESUBMISSION_REQUESTED;
              return (
                <li key={item.id}>
                  <Link href={`/faculty/reviews/${item.id}`} className="group grid grid-cols-1 items-center gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
                    <StudentCell student={item.student} full />
                    <div className="flex min-w-0 items-center gap-2.5">
                      <type.icon className="h-4 w-4 shrink-0 text-[#FF6B1A]" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#0B1F44] group-hover:text-[#FF6B1A]">{item.title}</p>
                        <p className="text-xs text-[#64748B]">{type.label} · submitted {format(new Date(item.createdAt), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      {item.reviewDueAt && !waiting && (
                        <span className={cn("text-xs", item.overdue ? "font-semibold text-red-600" : "text-[#64748B]")}>
                          {item.overdue ? "Overdue" : "Due"}: {format(new Date(item.reviewDueAt), "MMM d, yyyy")}
                        </span>
                      )}
                      {waiting ? (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-[#64748B] ring-1 ring-slate-200">Awaiting student</span>
                      ) : (
                        <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold ring-1", state.className)}>{state.label}</span>
                      )}
                      <ChevronRight className="h-5 w-5 text-[#64748B] group-hover:text-[#FF6B1A]" aria-hidden="true" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function FacultyReviewsPage() {
  return (
    <React.Suspense fallback={<Skeleton className="mx-auto h-[400px] max-w-[1280px] rounded-2xl" />}>
      <FacultyReviewsContent />
    </React.Suspense>
  );
}
