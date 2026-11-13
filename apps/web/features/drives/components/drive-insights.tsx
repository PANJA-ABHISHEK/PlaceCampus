"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CircleAlert,
  Clock3,
  History,
  Loader2,
  Search,
  ShieldAlert,
  ShieldCheck,
  Target,
  X,
} from "lucide-react";
import type {
  DriveSkillSupplyReport,
  DriveSkillSupplyRow,
  RecruiterAccessLogPage,
  SkillMatchItem,
  SkillMatchResult,
} from "@placecampus/shared-types";
import { apiClient, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { DriveCardTitle, driveCardClassName } from "./drive-admin-ui";

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

type DriveStudent = {
  id: string;
  name: string;
  registrationNumber: string | null;
  department: string;
  eligibility: { eligible: boolean };
};

type StaffGapAnalysis = {
  student: { id: string; name: string; registrationNumber?: string; department?: string };
  drive: { id: string; companyName: string; roleTitle: string; status: string };
  match: SkillMatchResult;
};

const errorText = (error: unknown) =>
  error instanceof ApiError ? error.message : "Could not load this right now.";

export function useDriveSkillSupply(driveId: string) {
  return useQuery({
    queryKey: ["placement", "drives", driveId, "skill-supply"],
    queryFn: () => apiClient.get<DriveSkillSupplyReport>(`/placement/drives/${driveId}/matching-summary`),
    enabled: !!driveId,
  });
}

function useDriveStudents(driveId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["placement", "eligible-students", driveId],
    queryFn: () => apiClient.get<{ students: DriveStudent[] }>(`/placement/drives/${driveId}/eligible-students`),
    enabled: !!driveId && enabled,
  });
}

function useStudentGapAnalysis(driveId: string, studentId: string | null) {
  return useQuery({
    queryKey: ["placement", "drives", driveId, "gap-analysis", studentId],
    queryFn: () =>
      apiClient.get<StaffGapAnalysis>(`/placement/drives/${driveId}/students/${studentId}/gap-analysis`),
    enabled: !!driveId && !!studentId,
  });
}

function useRecruiterAccessLogs(driveId: string, outcome: Outcome, page: number) {
  const params = new URLSearchParams({ driveId, page: String(page), limit: "6" });
  if (outcome !== "ALL") params.set("outcome", outcome);
  return useQuery({
    queryKey: ["placement", "recruiter-access-logs", driveId, outcome, page],
    queryFn: () => apiClient.get<RecruiterAccessLogPage>(`/placement/recruiter-access-logs?${params}`),
    enabled: !!driveId,
  });
}

/* ------------------------------------------------------------------ */
/* Skill supply against demand                                         */
/* ------------------------------------------------------------------ */

const SUPPLY_TONE: Record<DriveSkillSupplyRow["supplyStatus"], string> = {
  SHORTAGE: "bg-rose-50 text-rose-700 ring-rose-200",
  LIMITED: "bg-amber-50 text-amber-800 ring-amber-200",
  ADEQUATE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};
const SUPPLY_LABEL: Record<DriveSkillSupplyRow["supplyStatus"], string> = {
  SHORTAGE: "Shortage",
  LIMITED: "Limited",
  ADEQUATE: "Adequate",
};

export function SkillSupplyCard({ driveId, sectionId }: { driveId: string; sectionId?: string }) {
  const { data, isLoading, isError, error, refetch } = useDriveSkillSupply(driveId);
  const [studentId, setStudentId] = React.useState<string | null>(null);

  return (
    <section
      id={sectionId}
      aria-labelledby="supply-title"
      className={cn(driveCardClassName, "scroll-mt-24 p-5 sm:p-6")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <DriveCardTitle id="supply-title" icon={BarChart3} title="Skill Supply vs Demand" />
        {data && (
          <p className="text-xs text-slate-500">
            Verified skills only · updated {new Date(data.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="mt-5 space-y-3" aria-busy="true" aria-label="Loading skill supply">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : isError ? (
        <InlineError message={errorText(error)} onRetry={() => void refetch()} />
      ) : data ? (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Stat label="Students in pool" value={data.poolSize} hint="Pass CGPA, backlog, year and department rules" />
            <Stat label="Meet every required skill" value={data.meetingAllRequired} hint="At the required level" tone="green" />
            <Stat label="Fully eligible" value={data.fullyEligible} hint="Pass every rule, skills included" />
            <Stat label="Applicants" value={data.applicants} hint="Applied to this drive" />
          </dl>

          {data.skills.length === 0 ? (
            <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              This drive has no skill requirements, so there is no skill demand to compare.
            </p>
          ) : (
            <>
              {data.shortages.length > 0 && (
                <p className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800 ring-1 ring-rose-200">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="font-semibold">Short supply:</span> {data.shortages.join(", ")}. Few students in the
                    pool have these verified at the required level.
                  </span>
                </p>
              )}
              <ul className="mt-4 space-y-3" aria-label="Supply per required skill">
                {data.skills.map((row) => (
                  <SupplyRow key={row.skillId} row={row} pool={data.poolSize} />
                ))}
              </ul>
              <Legend />
            </>
          )}

          <StudentPicker driveId={driveId} onPick={setStudentId} />
        </>
      ) : null}

      <GapAnalysisDialog driveId={driveId} studentId={studentId} onClose={() => setStudentId(null)} />
    </section>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: number; hint: string; tone?: "green" }) {
  return (
    <div className="rounded-xl border border-[#EEF1F5] bg-[#FAFBFC] px-3 py-2.5" title={hint}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={cn("mt-0.5 text-xl font-bold tabular-nums", tone === "green" ? "text-emerald-700" : "text-[#10264A]")}>
        {value}
      </dd>
    </div>
  );
}

function SupplyRow({ row, pool }: { row: DriveSkillSupplyRow; pool: number }) {
  const pct = (n: number) => (pool ? (n / pool) * 100 : 0);
  return (
    <li className="rounded-xl border border-[#EEF1F5] px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <p className="min-w-0 flex-1 font-semibold text-[#10264A]">
          {row.skillName}
          <span className="ml-2 text-xs font-medium text-slate-500">
            Level {row.requiredLevel}+ · {row.isOptional ? "optional" : "required"}
          </span>
        </p>
        <span className="text-sm font-bold tabular-nums text-[#10264A]">
          {row.meetsLevel}/{pool}
          <span className="ml-1 text-xs font-medium text-slate-500">({row.supplyRate}%)</span>
        </span>
        {!row.isOptional && (
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1", SUPPLY_TONE[row.supplyStatus])}>
            {SUPPLY_LABEL[row.supplyStatus]}
          </span>
        )}
      </div>
      <div
        className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label={`${row.meetsLevel} meet the level, ${row.belowLevel} below level, ${row.missing} missing`}
      >
        <span className="bg-emerald-500" style={{ width: `${pct(row.meetsLevel)}%` }} />
        <span className="bg-amber-400" style={{ width: `${pct(row.belowLevel)}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        {row.belowLevel} below level · {row.missing} without it
        {row.pendingReview > 0 && ` · ${row.pendingReview} awaiting review`} · {row.applicantsMeetingLevel} applicant
        {row.applicantsMeetingLevel === 1 ? "" : "s"} qualified
      </p>
    </li>
  );
}

function Legend() {
  return (
    <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
      <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Meets level</span>
      <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" />Below level</span>
      <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-200" />Missing</span>
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Gap analysis for any student                                        */
/* ------------------------------------------------------------------ */

function StudentPicker({ driveId, onPick }: { driveId: string; onPick: (id: string) => void }) {
  const [query, setQuery] = React.useState("");
  const { data, isLoading } = useDriveStudents(driveId, query.trim().length > 0);
  const needle = query.trim().toLowerCase();
  const matches = needle
    ? (data?.students ?? [])
        .filter((s) => [s.name, s.registrationNumber, s.department].some((v) => String(v ?? "").toLowerCase().includes(needle)))
        .slice(0, 6)
    : [];

  return (
    <div className="mt-5 border-t border-[#EEF1F5] pt-4">
      <label htmlFor="gap-student" className="flex items-center gap-2 text-sm font-semibold text-[#10264A]">
        <Target className="h-4 w-4 text-[#FF6500]" aria-hidden="true" />
        Gap analysis for a student
      </label>
      <p className="mt-0.5 text-xs text-slate-500">Any student, eligible or not, against this drive&apos;s requirements.</p>
      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          id="gap-student"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, registration number or department"
          className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[#FF6500] focus:ring-2 focus:ring-[#FF6500]/20"
        />
      </div>
      {needle && (
        <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-[#EEF1F5]" aria-label="Matching students">
          {isLoading ? (
            <li className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Searching…
            </li>
          ) : matches.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-slate-500">No students match “{query.trim()}”.</li>
          ) : (
            matches.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onPick(s.id)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-[#FFF8F3] focus-visible:bg-[#FFF8F3] focus-visible:outline-none"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-[#10264A]">{s.name}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {[s.registrationNumber, s.department].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      s.eligibility.eligible ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {s.eligibility.eligible ? "Eligible" : "Not eligible"}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

const PRIORITY_TONE: Record<string, string> = {
  HIGH: "bg-rose-50 text-rose-700 ring-rose-200",
  MEDIUM: "bg-amber-50 text-amber-800 ring-amber-200",
  LOW: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function GapAnalysisDialog({
  driveId,
  studentId,
  onClose,
}: {
  driveId: string;
  studentId: string | null;
  onClose: () => void;
}) {
  const { data, isLoading, isError, error, refetch } = useStudentGapAnalysis(driveId, studentId);
  const gaps = data?.match.skills.filter((s) => s.rank) ?? [];
  const met = data?.match.skills.filter((s) => !s.rank) ?? [];

  return (
    <DialogPrimitive.Root open={!!studentId} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="pc-overlay fixed inset-0 z-[var(--z-overlay)] bg-[hsl(var(--color-navy-dark)/0.35)] backdrop-blur-[2px]" />
        <DialogPrimitive.Content className="pc-modal fixed left-1/2 top-1/2 z-[var(--z-modal)] flex max-h-[min(820px,calc(100dvh-2rem))] w-[calc(100vw-2rem)] max-w-[40rem] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-2xl)] focus:outline-none">
          <div className="border-b border-[#EEF1F5] bg-gradient-to-br from-white to-[#FFF5EE] px-6 pb-4 pt-5 pr-14">
            <DialogPrimitive.Title className="text-lg font-bold text-[#10264A]">
              {data ? `Gap analysis · ${data.student.name}` : "Gap analysis"}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-0.5 text-sm text-slate-600">
              {data
                ? `${data.drive.roleTitle} at ${data.drive.companyName} · ${data.match.requiredSkillCoverage}% of required skills met`
                : "Ranked gaps against this drive's requirements."}
            </DialogPrimitive.Description>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500" aria-busy="true">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Analysing…
              </div>
            ) : isError ? (
              <InlineError message={errorText(error)} onRetry={() => void refetch()} />
            ) : data ? (
              <>
                {gaps.length === 0 ? (
                  <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
                    No gaps: every skill requirement is met with verified evidence.
                  </p>
                ) : (
                  <ol className="space-y-3" aria-label="Gaps, most urgent first">
                    {gaps.map((gap) => (
                      <GapItem key={gap.skillId} gap={gap} />
                    ))}
                  </ol>
                )}
                {met.length > 0 && (
                  <p className="mt-4 text-sm text-slate-600">
                    <span className="font-semibold text-emerald-700">Already met:</span>{" "}
                    {met.map((m) => `${m.skillName} (Level ${m.studentLevel})`).join(", ")}
                  </p>
                )}
              </>
            ) : null}
          </div>

          <DialogPrimitive.Close
            aria-label="Close gap analysis"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#10264A]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function GapItem({ gap }: { gap: SkillMatchItem }) {
  return (
    <li className="flex gap-3 rounded-xl border border-[#EEF1F5] p-3.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFF1E8] text-sm font-bold text-[#C24E00]">
        {gap.rank}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-[#10264A]">{gap.skillName}</p>
          <span className="text-xs text-slate-500">
            Level {gap.studentLevel ?? 0} → {gap.requiredLevel}
          </span>
          {gap.priority && (
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1", PRIORITY_TONE[gap.priority])}>
              {gap.isOptional ? "Optional" : `${gap.priority[0]}${gap.priority.slice(1).toLowerCase()} priority`}
            </span>
          )}
          {gap.pendingVerification && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200">
              <Clock3 className="h-3 w-3" aria-hidden="true" /> In review
            </span>
          )}
        </div>
        {gap.recommendedAction && <p className="mt-1 text-sm leading-6 text-slate-700">{gap.recommendedAction}</p>}
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Recruiter access log                                                */
/* ------------------------------------------------------------------ */

type Outcome = "ALL" | "ALLOWED" | "DENIED";

const ACTION_LABEL: Record<string, string> = {
  VIEW_CANDIDATE_LIST: "Viewed candidate list",
  VIEW_CANDIDATE_DETAIL: "Viewed candidate profile",
  VIEW_ACCESSIBLE_DRIVES: "Opened drive list",
  VIEW_DASHBOARD: "Opened dashboard",
  DENIED_CROSS_DRIVE_ACCESS: "Blocked: no access to drive",
  DENIED_EXPIRED_ACCESS: "Blocked: access not active",
  DENIED_UNAUTHORIZED_APPLICATION_ACCESS: "Blocked: student from another drive",
};

export function RecruiterAccessLogCard({ driveId }: { driveId: string }) {
  const [outcome, setOutcome] = React.useState<Outcome>("ALL");
  const [page, setPage] = React.useState(1);
  const { data, isLoading, isError, error, refetch, isFetching } = useRecruiterAccessLogs(driveId, outcome, page);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <section aria-labelledby="access-log-title" className={cn(driveCardClassName, "p-5")}>
      <DriveCardTitle id="access-log-title" icon={History} title="Recruiter Access Log" />
      <p className="mt-1 text-xs text-slate-500">Every recruiter view of this drive&apos;s candidates, and every blocked attempt.</p>

      <div className="mt-3 flex gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Filter by outcome">
        {(["ALL", "ALLOWED", "DENIED"] as const).map((o) => (
          <button
            key={o}
            type="button"
            role="tab"
            aria-selected={outcome === o}
            onClick={() => {
              setOutcome(o);
              setPage(1);
            }}
            className={cn(
              "flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition",
              outcome === o ? "bg-white text-[#10264A] shadow-sm" : "text-slate-600 hover:text-[#10264A]",
            )}
          >
            {o === "ALL" ? "All" : o === "ALLOWED" ? `Allowed${data && outcome === "ALL" ? ` ${data.allowed}` : ""}` : `Blocked${data && outcome === "ALL" ? ` ${data.denied}` : ""}`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-3 space-y-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-11 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : isError ? (
        <InlineError message={errorText(error)} onRetry={() => void refetch()} />
      ) : data && data.entries.length === 0 ? (
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
          {outcome === "DENIED" ? "No blocked attempts on this drive." : "No recruiter has accessed this drive yet."}
        </p>
      ) : data ? (
        <>
          <ul className={cn("mt-3 space-y-2", isFetching && "opacity-60")} aria-label="Access log entries">
            {data.entries.map((e) => (
              <li key={e.id} className="flex gap-2.5 rounded-lg border border-[#EEF1F5] px-3 py-2">
                {e.success ? (
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Allowed" />
                ) : (
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-label="Blocked" />
                )}
                <div className="min-w-0 flex-1 text-xs">
                  <p className={cn("font-semibold", e.success ? "text-[#10264A]" : "text-rose-700")}>
                    {ACTION_LABEL[e.action] ?? e.action}
                    {e.student && <span className="font-normal text-slate-600"> · {e.student.name}</span>}
                  </p>
                  <p className="mt-0.5 truncate text-slate-500">
                    {e.recruiter?.name ?? "Unknown recruiter"} ·{" "}
                    {new Date(e.createdAt).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg px-2 py-1 font-semibold hover:bg-slate-100 disabled:opacity-40"
              >
                Newer
              </button>
              <span>
                Page {page} of {pages}
              </span>
              <button
                type="button"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg px-2 py-1 font-semibold hover:bg-slate-100 disabled:opacity-40"
              >
                Older
              </button>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800 ring-1 ring-rose-200">
      <span>{message}</span>
      <button type="button" onClick={onRetry} className="shrink-0 font-semibold hover:underline">
        Retry
      </button>
    </div>
  );
}
