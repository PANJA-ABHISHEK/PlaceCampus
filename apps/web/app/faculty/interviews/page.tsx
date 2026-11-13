"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarClock,
  CalendarPlus,
  CircleAlert,
  ClipboardCheck,
  ClipboardList,
  DoorOpen,
  ExternalLink,
  Eye,
  Layers,
  Loader2,
  Play,
  Radio,
  RotateCcw,
  Search,
  UserRound,
  Video,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { InterviewSlot, MockInterview } from "@placecampus/shared-types";
import {
  useCancelFacultyInterview,
  useCancelInterviewSlot,
  useFacultyInterviewSlots,
  useFacultyInterviewSummary,
  useFacultyInterviews,
  useStartInterview,
} from "@/features/interviews/hooks/use-interviews";
import {
  canEnterRoom,
  displayStatus,
  startTime,
  typeLabel,
  type DisplayStatus,
} from "@/features/interviews/lib/interview-meta";
import {
  InterviewStatusBadge,
  ReasonDialog,
  formatDay,
  formatTime,
} from "@/features/interviews/components/interview-ui";
import { CreateSlotDialog } from "@/features/interviews/components/create-slot-dialog";
import { ScheduleInterviewDialog } from "@/features/interviews/components/schedule-interview-dialog";
import { RescheduleInterviewDialog } from "@/features/interviews/components/reschedule-interview-dialog";
import { HeroWaves, lightHeroClassName } from "@/components/brand/hero-waves";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useNow } from "@/features/interviews/hooks/use-now";

function StatCard({ label, value, icon: Icon, tile }: { label: string; value: number | undefined; icon: LucideIcon; tile: string }) {
  return (
    <div className="pc-enter flex items-center gap-4 rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white p-5 shadow-[var(--shadow-card)]">
      <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", tile)}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-medium text-[hsl(var(--foreground)/0.75)]">{label}</p>
        <p className="text-2xl font-bold tabular-nums text-[hsl(var(--foreground))]">{value ?? "–"}</p>
      </div>
    </div>
  );
}

type Filter = "all" | "upcoming" | "live" | "pending" | "completed" | "cancelled";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "live", label: "In progress" },
  { id: "pending", label: "Pending evaluation" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

function matchesFilter(status: DisplayStatus, filter: Filter) {
  switch (filter) {
    case "all": return true;
    case "upcoming": return status === "SCHEDULED" || status === "WAITING";
    case "live": return status === "IN_PROGRESS";
    case "pending": return status === "PENDING_EVALUATION";
    case "completed": return status === "COMPLETED";
    case "cancelled": return status === "CANCELLED" || status === "NO_SHOW";
  }
}

function InterviewActions({
  interview,
  now,
  onReschedule,
  onCancel,
}: {
  interview: MockInterview;
  now: number;
  onReschedule: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const start = useStartInterview();
  const roomHref = interview.roomId ? `/faculty/interviews/room/${interview.roomId}` : null;
  const roomOpen = canEnterRoom(interview, now);
  const live = interview.status === "IN_PROGRESS" && !interview.endedAt;
  const scheduled = interview.status === "SCHEDULED";
  const icon = "inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-35";

  return (
    <div className="flex items-center justify-end gap-1">
      <Link href={`/faculty/interviews/${interview.id}`} aria-label="View details" title="View details" className={cn(icon, "text-[hsl(var(--foreground)/0.7)] hover:bg-[hsl(var(--muted))]")}>
        <Eye className="h-4 w-4" />
      </Link>
      {roomHref && (scheduled || live) && (
        <button
          type="button"
          aria-label={live ? "Rejoin interview" : "Start interview"}
          title={roomOpen ? (live ? "Rejoin interview" : "Start interview") : "Opens 15 minutes before the start"}
          disabled={!roomOpen || start.isPending}
          onClick={() =>
            live
              ? router.push(roomHref)
              : start.mutate(interview.id, {
                  onSuccess: () => router.push(roomHref),
                  onError: (e) => toast.error("Couldn't start", { description: e instanceof ApiError ? e.message : undefined }),
                })
          }
          className={cn(icon, "bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--color-primary-600))]")}
        >
          {start.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        </button>
      )}
      <button type="button" aria-label="Reschedule" title="Reschedule" disabled={!scheduled} onClick={onReschedule} className={cn(icon, "text-[hsl(var(--foreground)/0.7)] hover:bg-[hsl(var(--muted))]")}>
        <RotateCcw className="h-4 w-4" />
      </button>
      <button type="button" aria-label="Cancel interview" title="Cancel" disabled={!scheduled} onClick={onCancel} className={cn(icon, "text-red-600 hover:bg-red-50")}>
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  );
}

function SlotRow({ slot, now, onCancel }: { slot: InterviewSlot; now: number; onCancel: () => void }) {
  const past = new Date(slot.startsAt).getTime() < now;
  const statusClass = {
    OPEN: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    BOOKED: "bg-blue-50 text-blue-700 ring-blue-200",
    CANCELLED: "bg-slate-100 text-slate-600 ring-slate-200",
  }[slot.status];
  return (
    <li className="flex flex-col gap-3 border-b border-[hsl(var(--border)/0.6)] px-5 py-4 last:border-0 sm:flex-row sm:items-center">
      <div className="w-36 shrink-0">
        <p className="font-bold tabular-nums text-[hsl(var(--foreground))]">{formatTime(slot.startsAt)}</p>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">{formatDay(slot.startsAt)}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[hsl(var(--foreground))]">{typeLabel(slot.type)} · {slot.durationMinutes} min</p>
        <p className="flex items-center gap-1.5 truncate text-sm text-[hsl(var(--muted-foreground))]">
          {slot.status === "BOOKED" ? (
            <>
              <UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Booked by {slot.student?.fullName ?? "a student"}
            </>
          ) : (
            slot.meetingUrl && (
              <a href={slot.meetingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 truncate hover:text-[hsl(var(--primary))]">
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {slot.meetingUrl.replace(/^https:\/\//, "")}
              </a>
            )
          )}
        </p>
      </div>
      <span className={cn("w-fit rounded-full px-2.5 py-1 text-xs font-semibold ring-1", statusClass)}>
        {slot.status === "OPEN" ? "Open" : slot.status === "BOOKED" ? "Booked" : "Cancelled"}
      </span>
      {slot.status !== "CANCELLED" && !past && (
        <button type="button" onClick={onCancel} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50">
          <XCircle className="h-4 w-4" aria-hidden="true" />
          Cancel
        </button>
      )}
    </li>
  );
}

export default function FacultyInterviewsPage() {
  const interviewsQuery = useFacultyInterviews();
  const summaryQuery = useFacultyInterviewSummary();
  const slotsQuery = useFacultyInterviewSlots();
  const cancelSlot = useCancelInterviewSlot();
  const cancelInterview = useCancelFacultyInterview();
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [slotDialogOpen, setSlotDialogOpen] = React.useState(false);
  const [cancelSlotTarget, setCancelSlotTarget] = React.useState<InterviewSlot | null>(null);
  const [cancelTarget, setCancelTarget] = React.useState<MockInterview | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = React.useState<MockInterview | null>(null);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [query, setQuery] = React.useState("");
  const now = useNow();

  // Keep "Waiting" fresh while a student sits in the waiting room.
  const { refetch } = interviewsQuery;
  React.useEffect(() => {
    const t = setInterval(() => void refetch(), 20_000);
    return () => clearInterval(t);
  }, [refetch]);

  const interviews = React.useMemo(() => interviewsQuery.data ?? [], [interviewsQuery.data]);
  const slots = React.useMemo(() => slotsQuery.data ?? [], [slotsQuery.data]);
  const activeSlots = slots.filter((s) => s.status !== "CANCELLED" && new Date(s.startsAt).getTime() > now);

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return interviews
      .map((iv) => ({ iv, status: displayStatus(iv, now) }))
      .filter(({ iv, status }) => matchesFilter(status, filter) && (!q || [iv.student?.fullName, iv.student?.registrationNumber, iv.title, iv.type].some((v) => v?.toLowerCase().includes(q))))
      .sort((a, b) => {
        // Live and upcoming first (soonest first), then the rest newest first.
        const rank = (s: DisplayStatus) => (s === "IN_PROGRESS" || s === "WAITING" ? 0 : s === "SCHEDULED" ? 1 : s === "PENDING_EVALUATION" ? 2 : 3);
        const r = rank(a.status) - rank(b.status);
        if (r) return r;
        return rank(a.status) <= 1 ? startTime(a.iv) - startTime(b.iv) : startTime(b.iv) - startTime(a.iv);
      });
  }, [interviews, filter, query, now]);

  const waiting = rows.filter((r) => r.status === "WAITING");
  const loading = interviewsQuery.isLoading || slotsQuery.isLoading;
  const failed = interviewsQuery.isError || slotsQuery.isError;

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <section className={lightHeroClassName}>
        <HeroWaves />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="max-w-[36rem] space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              <span className="text-[hsl(var(--foreground))]">Mock </span>
              <span className="text-[hsl(var(--primary))]">Interviews</span>
            </h1>
            <p className="text-[15px] leading-relaxed text-[hsl(var(--foreground)/0.8)]">
              Schedule live video interviews with your students, run them in the PlaceCampus room, and evaluate each one.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 self-start md:self-center">
            <button
              type="button"
              onClick={() => setSlotDialogOpen(true)}
              className="relative inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-white px-4 py-3.5 text-sm font-semibold text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--primary)/0.5)]"
            >
              <DoorOpen className="h-4 w-4" aria-hidden="true" />
              Open a Slot
            </button>
            <button
              type="button"
              onClick={() => setScheduleOpen(true)}
              className="relative inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-6 py-3.5 text-base font-semibold text-white shadow-[0_10px_24px_-10px_hsl(var(--primary)/0.8)] transition-all hover:-translate-y-0.5 hover:bg-[hsl(var(--color-primary-600))] active:scale-[0.98]"
            >
              <CalendarPlus className="h-5 w-5" aria-hidden="true" />
              Schedule Interview
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="space-y-4" aria-busy="true">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[88px] rounded-2xl" />)}
          </div>
          <Skeleton className="h-[260px] rounded-2xl" />
        </div>
      ) : failed ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50/60 px-6 py-12 text-center">
          <CircleAlert className="h-8 w-8 text-red-600" aria-hidden="true" />
          <p className="font-semibold text-red-900">We couldn&apos;t load your interviews</p>
          <button type="button" onClick={() => { interviewsQuery.refetch(); slotsQuery.refetch(); summaryQuery.refetch(); }} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200">Retry</button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Total Mock Interviews" value={summaryQuery.data?.total} icon={Layers} tile="bg-slate-100 text-slate-700" />
            <StatCard label="Upcoming" value={summaryQuery.data?.upcoming} icon={CalendarClock} tile="bg-blue-50 text-blue-600" />
            <StatCard label="In Progress" value={summaryQuery.data?.inProgress} icon={Radio} tile="bg-amber-50 text-amber-600" />
            <StatCard label="Completed" value={summaryQuery.data?.completed} icon={ClipboardCheck} tile="bg-emerald-50 text-emerald-600" />
            <StatCard label="Pending Evaluations" value={summaryQuery.data?.pendingEvaluations} icon={ClipboardList} tile="bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]" />
          </div>

          {waiting.length > 0 && (
            <div className="flex flex-col gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between" role="status">
              <p className="text-sm font-semibold text-violet-900">
                {waiting.map((w) => w.iv.student?.fullName ?? "A student").join(", ")} {waiting.length === 1 ? "is" : "are"} in the waiting room.
              </p>
              <Link href={`/faculty/interviews/room/${waiting[0]!.iv.roomId}`} className="inline-flex h-9 w-fit items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700">
                <Video className="h-4 w-4" aria-hidden="true" /> Open room
              </Link>
            </div>
          )}

          <section aria-labelledby="fac-table" className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <h2 id="fac-table" className="text-xl font-bold text-[hsl(var(--foreground))]">Interview Management</h2>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search student, reg. no or title"
                  aria-label="Search interviews"
                  className="h-10 w-full rounded-xl border border-[hsl(var(--border))] bg-white pl-9 pr-3 text-sm outline-none focus:border-[hsl(var(--primary))] lg:w-72"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter interviews">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn("rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors", filter === f.id ? "bg-[#10264A] text-white" : "bg-white text-[hsl(var(--foreground)/0.75)] ring-1 ring-[hsl(var(--border))] hover:ring-[hsl(var(--primary)/0.4)]")}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {interviews.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[hsl(var(--primary)/0.3)] bg-white px-6 py-12 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
                  <Video className="h-7 w-7" aria-hidden="true" />
                </span>
                <p className="font-semibold text-[hsl(var(--foreground))]">No mock interviews yet</p>
                <p className="max-w-[26rem] text-sm text-[hsl(var(--muted-foreground))]">Schedule an interview with one of your students. They&apos;ll get a notification with the time and instructions.</p>
                <button type="button" onClick={() => setScheduleOpen(true)} className="mt-1 inline-flex h-10 items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 text-sm font-semibold text-white">
                  <CalendarPlus className="h-4 w-4" aria-hidden="true" /> Schedule Interview
                </button>
              </div>
            ) : rows.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-white px-6 py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">No interviews match this filter.</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white shadow-[var(--shadow-card)]">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="border-b border-[hsl(var(--border)/0.7)] bg-[hsl(var(--muted)/0.4)] text-xs uppercase tracking-wide text-[hsl(var(--foreground)/0.65)]">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-semibold">Student</th>
                      <th scope="col" className="px-3 py-3 font-semibold">Reg. No</th>
                      <th scope="col" className="px-3 py-3 font-semibold">Interview Type</th>
                      <th scope="col" className="px-3 py-3 font-semibold">Date &amp; Time</th>
                      <th scope="col" className="px-3 py-3 font-semibold">Duration</th>
                      <th scope="col" className="px-3 py-3 font-semibold">Status</th>
                      <th scope="col" className="px-5 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ iv, status }) => (
                      <tr key={iv.id} className="border-b border-[hsl(var(--border)/0.6)] last:border-0 hover:bg-[hsl(var(--primary)/0.02)]">
                        <td className="px-5 py-3.5">
                          <Link href={`/faculty/interviews/${iv.id}`} className="font-semibold text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))]">
                            {iv.student?.fullName ?? "Student"}
                          </Link>
                          {iv.title && <p className="max-w-[16rem] truncate text-xs text-[hsl(var(--muted-foreground))]">{iv.title}</p>}
                        </td>
                        <td className="px-3 py-3.5 tabular-nums text-[hsl(var(--foreground)/0.8)]">{iv.student?.registrationNumber ?? "—"}</td>
                        <td className="px-3 py-3.5">{typeLabel(iv.type)}</td>
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <p className="font-medium">{formatDay(iv.scheduledAt)}</p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">{formatTime(iv.scheduledAt)}</p>
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap">{iv.durationMinutes ?? 60} min</td>
                        <td className="px-3 py-3.5"><InterviewStatusBadge status={status} /></td>
                        <td className="px-5 py-3.5">
                          <InterviewActions interview={iv} now={now} onReschedule={() => setRescheduleTarget(iv)} onCancel={() => setCancelTarget(iv)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section aria-labelledby="fac-slots" className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 id="fac-slots" className="text-xl font-bold text-[hsl(var(--foreground))]">Open Slots</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Times any student can book. {activeSlots.filter((s) => s.status === "OPEN").length} open.</p>
              </div>
              <button type="button" onClick={() => setSlotDialogOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[hsl(var(--primary))] hover:underline">
                <DoorOpen className="h-4 w-4" aria-hidden="true" />
                Open a slot
              </button>
            </div>
            {slots.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-white px-6 py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
                No open slots. Use Schedule Interview to invite a specific student, or open a slot any student can book.
              </p>
            ) : (
              <ul className="overflow-hidden rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white shadow-[var(--shadow-card)]">
                {slots.map((slot) => <SlotRow key={slot.id} slot={slot} now={now} onCancel={() => setCancelSlotTarget(slot)} />)}
              </ul>
            )}
          </section>
        </>
      )}

      <ScheduleInterviewDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />
      <CreateSlotDialog open={slotDialogOpen} onOpenChange={setSlotDialogOpen} />
      <RescheduleInterviewDialog interview={rescheduleTarget} onOpenChange={(o) => !o && setRescheduleTarget(null)} />
      <ReasonDialog
        open={!!cancelTarget}
        title="Cancel this interview?"
        description={cancelTarget ? `${cancelTarget.student?.fullName ?? "The student"}'s ${typeLabel(cancelTarget.type)} on ${formatDay(cancelTarget.scheduledAt)} at ${formatTime(cancelTarget.scheduledAt)} will be cancelled and they will be notified.` : ""}
        reasonLabel="Reason for the student (optional)"
        confirmLabel="Cancel interview"
        isPending={cancelInterview.isPending}
        onConfirm={(reason) =>
          cancelTarget &&
          cancelInterview.mutate(
            { id: cancelTarget.id, reason },
            {
              onSuccess: () => {
                toast.success("Interview cancelled", { description: "The student has been notified." });
                setCancelTarget(null);
              },
              onError: (error) => toast.error("Couldn't cancel", { description: error instanceof ApiError ? error.message : "Please try again." }),
            },
          )
        }
        onOpenChange={(open) => !open && setCancelTarget(null)}
      />
      <ReasonDialog
        open={!!cancelSlotTarget}
        title={cancelSlotTarget?.status === "BOOKED" ? "Cancel this booked interview?" : "Remove this slot?"}
        description={
          cancelSlotTarget
            ? cancelSlotTarget.status === "BOOKED"
              ? `${cancelSlotTarget.student?.fullName ?? "The student"} booked this ${cancelSlotTarget.type} interview on ${formatDay(cancelSlotTarget.startsAt)} at ${formatTime(cancelSlotTarget.startsAt)}. They will be notified, with your reason if you give one.`
              : `${cancelSlotTarget.type} slot on ${formatDay(cancelSlotTarget.startsAt)} at ${formatTime(cancelSlotTarget.startsAt)} will no longer be bookable.`
            : ""
        }
        reasonLabel={cancelSlotTarget?.status === "BOOKED" ? "Reason for the student (optional)" : "Note (optional)"}
        confirmLabel={cancelSlotTarget?.status === "BOOKED" ? "Cancel interview" : "Remove slot"}
        isPending={cancelSlot.isPending}
        onConfirm={(reason) =>
          cancelSlotTarget &&
          cancelSlot.mutate(
            { id: cancelSlotTarget.id, reason },
            {
              onSuccess: () => {
                toast.success(cancelSlotTarget.status === "BOOKED" ? "Interview cancelled" : "Slot removed");
                setCancelSlotTarget(null);
              },
              onError: (error) => toast.error("Couldn't cancel", { description: error instanceof ApiError ? error.message : "Please try again." }),
            },
          )
        }
        onOpenChange={(open) => !open && setCancelSlotTarget(null)}
      />
    </div>
  );
}
