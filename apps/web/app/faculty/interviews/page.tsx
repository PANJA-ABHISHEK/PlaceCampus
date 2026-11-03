"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRight,
  CalendarClock,
  CalendarPlus,
  CircleAlert,
  ClipboardCheck,
  Clock,
  DoorOpen,
  ExternalLink,
  UserRound,
  Video,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { InterviewSlot, MockInterview } from "@placecampus/shared-types";
import {
  useCancelInterviewSlot,
  useFacultyInterviewSlots,
  useFacultyInterviews,
} from "@/features/interviews/hooks/use-interviews";
import {
  canFacultyStartOrEvaluate,
  isUpcoming,
  rubricAverage,
  startTime,
} from "@/features/interviews/lib/interview-meta";
import {
  InterviewStatusBadge,
  ReasonDialog,
  formatDay,
  formatTime,
} from "@/features/interviews/components/interview-ui";
import { CreateSlotDialog } from "@/features/interviews/components/create-slot-dialog";
import { HeroWaves, lightHeroClassName } from "@/components/brand/hero-waves";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useNow } from "@/features/interviews/hooks/use-now";

function StatCard({ label, value, icon: Icon, tile }: { label: string; value: number; icon: LucideIcon; tile: string }) {
  return (
    <div className="pc-enter flex items-center gap-4 rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white p-5 shadow-[var(--shadow-card)]">
      <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", tile)}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-medium text-[hsl(var(--foreground)/0.75)]">{label}</p>
        <p className="text-2xl font-bold tabular-nums text-[hsl(var(--foreground))]">{value}</p>
      </div>
    </div>
  );
}

function InterviewRow({ interview, now }: { interview: MockInterview; now: number }) {
  const average = rubricAverage(interview.rubricScores);
  const needsEvaluation =
    (interview.status === "SCHEDULED" || interview.status === "IN_PROGRESS") &&
    canFacultyStartOrEvaluate(interview, now);
  return (
    <li className="border-b border-[hsl(var(--border)/0.6)] last:border-0">
      <Link
        href={`/faculty/interviews/${interview.id}`}
        className="group flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-[hsl(var(--primary)/0.03)] sm:flex-row sm:items-center sm:gap-4"
      >
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))]">
            {interview.student?.fullName ?? "Student"}
          </p>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {interview.type} · {formatDay(interview.scheduledAt)} at {formatTime(interview.scheduledAt)} · {interview.durationMinutes ?? 60} min
          </p>
        </div>
        {average != null && (
          <span className="text-sm font-semibold tabular-nums text-[hsl(var(--foreground))]">{average} / 10</span>
        )}
        {needsEvaluation && (
          <span className="rounded-full bg-[hsl(var(--primary)/0.1)] px-2.5 py-1 text-xs font-semibold text-[hsl(var(--color-primary-700))]">
            Ready to run
          </span>
        )}
        <InterviewStatusBadge status={interview.status} />
        <ArrowRight className="hidden h-4 w-4 text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-0.5 sm:block" aria-hidden="true" />
      </Link>
    </li>
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
        <p className="font-semibold text-[hsl(var(--foreground))]">{slot.type} · {slot.durationMinutes} min</p>
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
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
        >
          <XCircle className="h-4 w-4" aria-hidden="true" />
          Cancel
        </button>
      )}
    </li>
  );
}

export default function FacultyInterviewsPage() {
  const interviewsQuery = useFacultyInterviews();
  const slotsQuery = useFacultyInterviewSlots();
  const cancelSlot = useCancelInterviewSlot();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [cancelTarget, setCancelTarget] = React.useState<InterviewSlot | null>(null);
  const now = useNow();

  const interviews = React.useMemo(() => interviewsQuery.data ?? [], [interviewsQuery.data]);
  const slots = React.useMemo(() => slotsQuery.data ?? [], [slotsQuery.data]);

  const upcoming = interviews.filter((iv) => isUpcoming(iv, now)).sort((a, b) => startTime(a) - startTime(b));
  const past = interviews.filter((iv) => !isUpcoming(iv, now)).sort((a, b) => startTime(b) - startTime(a));
  const activeSlots = slots.filter((s) => s.status !== "CANCELLED" && new Date(s.startsAt).getTime() > now);
  const awaiting = upcoming.filter((iv) => canFacultyStartOrEvaluate(iv, now)).length;

  const confirmCancel = (reason: string) => {
    if (!cancelTarget) return;
    cancelSlot.mutate(
      { id: cancelTarget.id, reason },
      {
        onSuccess: () => {
          toast.success(cancelTarget.status === "BOOKED" ? "Interview cancelled" : "Slot removed", {
            description: cancelTarget.status === "BOOKED" ? "The student has been notified." : undefined,
          });
          setCancelTarget(null);
        },
        onError: (error) =>
          toast.error("Couldn't cancel", {
            description: error instanceof ApiError ? error.message : "Please try again.",
          }),
      },
    );
  };

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
              Open time slots for students to book, run the interview on your meeting link, and score it with the rubric.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="relative inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-[hsl(var(--primary))] px-6 py-3.5 text-base font-semibold text-white shadow-[0_10px_24px_-10px_hsl(var(--primary)/0.8)] transition-all hover:-translate-y-0.5 hover:bg-[hsl(var(--color-primary-600))] active:scale-[0.98] md:self-center"
          >
            <CalendarPlus className="h-5 w-5" aria-hidden="true" />
            Open a Slot
          </button>
        </div>
      </section>

      {loading ? (
        <div className="space-y-4" aria-busy="true">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[88px] rounded-2xl" />)}
          </div>
          <Skeleton className="h-[200px] rounded-2xl" />
        </div>
      ) : failed ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50/60 px-6 py-12 text-center">
          <CircleAlert className="h-8 w-8 text-red-600" aria-hidden="true" />
          <p className="font-semibold text-red-900">We couldn&apos;t load your interviews</p>
          <button type="button" onClick={() => { interviewsQuery.refetch(); slotsQuery.refetch(); }} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200">Retry</button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Open slots" value={activeSlots.filter((s) => s.status === "OPEN").length} icon={DoorOpen} tile="bg-emerald-50 text-emerald-600" />
            <StatCard label="Upcoming interviews" value={upcoming.length} icon={CalendarClock} tile="bg-blue-50 text-blue-600" />
            <StatCard label="Ready to run" value={awaiting} icon={Clock} tile="bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]" />
            <StatCard label="Completed" value={interviews.filter((iv) => iv.status === "COMPLETED").length} icon={ClipboardCheck} tile="bg-violet-50 text-violet-600" />
          </div>

          <section aria-labelledby="fac-upcoming" className="space-y-3">
            <h2 id="fac-upcoming" className="text-xl font-bold text-[hsl(var(--foreground))]">Upcoming Interviews</h2>
            {upcoming.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-white px-6 py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
                No booked interviews yet. Open a slot so students can book you.
              </p>
            ) : (
              <ul className="overflow-hidden rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white shadow-[var(--shadow-card)]">
                {upcoming.map((iv) => <InterviewRow key={iv.id} interview={iv} now={now} />)}
              </ul>
            )}
          </section>

          <section aria-labelledby="fac-slots" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 id="fac-slots" className="text-xl font-bold text-[hsl(var(--foreground))]">My Slots</h2>
              <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[hsl(var(--primary))] hover:underline">
                <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                Open a slot
              </button>
            </div>
            {slots.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[hsl(var(--primary)/0.3)] bg-white px-6 py-10 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
                  <Video className="h-7 w-7" aria-hidden="true" />
                </span>
                <p className="font-semibold text-[hsl(var(--foreground))]">No slots yet</p>
                <p className="max-w-[26rem] text-sm text-[hsl(var(--muted-foreground))]">Open a time with your meeting link. Students will see it and can book it right away.</p>
              </div>
            ) : (
              <ul className="overflow-hidden rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white shadow-[var(--shadow-card)]">
                {slots.map((slot) => <SlotRow key={slot.id} slot={slot} now={now} onCancel={() => setCancelTarget(slot)} />)}
              </ul>
            )}
          </section>

          {past.length > 0 && (
            <section aria-labelledby="fac-past" className="space-y-3">
              <h2 id="fac-past" className="text-xl font-bold text-[hsl(var(--foreground))]">Past Interviews</h2>
              <ul className="overflow-hidden rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white shadow-[var(--shadow-card)]">
                {past.map((iv) => <InterviewRow key={iv.id} interview={iv} now={now} />)}
              </ul>
            </section>
          )}
        </>
      )}

      <CreateSlotDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ReasonDialog
        open={!!cancelTarget}
        title={cancelTarget?.status === "BOOKED" ? "Cancel this booked interview?" : "Remove this slot?"}
        description={
          cancelTarget
            ? cancelTarget.status === "BOOKED"
              ? `${cancelTarget.student?.fullName ?? "The student"} booked this ${cancelTarget.type} interview on ${formatDay(cancelTarget.startsAt)} at ${formatTime(cancelTarget.startsAt)}. They will be notified, with your reason if you give one.`
              : `${cancelTarget.type} slot on ${formatDay(cancelTarget.startsAt)} at ${formatTime(cancelTarget.startsAt)} will no longer be bookable.`
            : ""
        }
        reasonLabel={cancelTarget?.status === "BOOKED" ? "Reason for the student (optional)" : "Note (optional)"}
        confirmLabel={cancelTarget?.status === "BOOKED" ? "Cancel interview" : "Remove slot"}
        isPending={cancelSlot.isPending}
        onConfirm={confirmCancel}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      />
    </div>
  );
}
