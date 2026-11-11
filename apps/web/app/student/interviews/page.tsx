"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CalendarCheck,
  CalendarPlus,
  ChevronDown,
  CircleAlert,
  Clock,
  ExternalLink,
  Info,
  Mail,
  Radio,
  Star,
  UserRound,
  Video,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { MockInterview } from "@placecampus/shared-types";
import {
  useCancelStudentInterview,
  useStudentInterviews,
} from "@/features/interviews/hooks/use-interviews";
import {
  RUBRIC_DIMENSIONS,
  canEnterRoom,
  canJoin,
  canStudentCancel,
  displayStatus,
  isUpcoming,
  rubricAverage,
  startTime,
  typeLabel,
} from "@/features/interviews/lib/interview-meta";
import { EvaluationView } from "@/features/interviews/components/evaluation";
import {
  InterviewStatusBadge,
  ReasonDialog,
  formatDay,
  formatTime,
} from "@/features/interviews/components/interview-ui";
import { BookInterviewDialog } from "@/features/interviews/components/book-interview-dialog";
import { HeroWaves, lightHeroClassName } from "@/components/brand/hero-waves";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useNow } from "@/features/interviews/hooks/use-now";

function VideoCallIllustration() {
  return (
    <svg viewBox="0 0 240 160" className="h-full w-full drop-shadow-[0_18px_24px_rgba(234,88,12,0.14)]" aria-hidden="true">
      <rect x="40" y="18" width="160" height="110" rx="14" fill="hsl(222 47% 15%)" />
      <rect x="48" y="26" width="144" height="86" rx="8" fill="#E9EEFB" />
      <circle cx="120" cy="58" r="16" fill="hsl(24 95% 53%)" />
      <path d="M92 104 c4 -20 52 -20 56 0 z" fill="hsl(24 95% 53%)" />
      <rect x="150" y="70" width="36" height="36" rx="6" fill="#fff" stroke="#CBD5E1" />
      <circle cx="168" cy="84" r="6" fill="hsl(222 40% 28%)" />
      <path d="M158 102 c2 -8 18 -8 20 0 z" fill="hsl(222 40% 28%)" />
      <g transform="translate(96 116)">
        <circle cx="0" cy="0" r="9" fill="#EF4444" />
        <circle cx="24" cy="0" r="9" fill="#fff" stroke="#CBD5E1" />
        <circle cx="48" cy="0" r="9" fill="#fff" stroke="#CBD5E1" />
      </g>
      <g transform="translate(10 40)">
        <rect width="46" height="30" rx="10" fill="#fff" />
        <circle cx="13" cy="15" r="3" fill="hsl(24 95% 53%)" />
        <circle cx="23" cy="15" r="3" fill="hsl(24 95% 53%)" />
        <circle cx="33" cy="15" r="3" fill="hsl(24 95% 53%)" />
      </g>
      <path d="M216 30 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill="hsl(24 95% 53%)" />
    </svg>
  );
}

function StatCard({ label, value, icon: Icon, tile, delay }: { label: string; value: string; icon: LucideIcon; tile: string; delay: number }) {
  return (
    <div
      style={{ "--pc-delay": `${delay}ms` } as React.CSSProperties}
      className="pc-enter flex items-center gap-4 rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
    >
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

function UpcomingCard({ interview, now, onCancel }: { interview: MockInterview; now: number; onCancel: () => void }) {
  const joinable = canJoin(interview, now);
  const cancellable = canStudentCancel(interview, now);
  const inApp = !!interview.roomId;
  const roomOpen = canEnterRoom(interview, now);
  const live = interview.status === "IN_PROGRESS";
  return (
    <article className={cn("pc-enter flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)] sm:flex-row sm:items-start", live ? "border-[hsl(var(--primary)/0.5)] ring-2 ring-[hsl(var(--primary)/0.15)]" : "border-[hsl(var(--border)/0.8)]")}>
      <div className="flex w-full shrink-0 items-center gap-3 sm:w-auto sm:flex-col sm:items-center sm:gap-0 sm:rounded-xl sm:bg-[hsl(var(--primary)/0.08)] sm:px-4 sm:py-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--color-primary-700))]">
          {formatDay(interview.scheduledAt).split(",")[0]}
        </span>
        <span className="text-2xl font-extrabold tabular-nums text-[hsl(var(--foreground))]">
          {new Date(interview.scheduledAt).getDate()}
        </span>
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          {formatDay(interview.scheduledAt).split(" ").slice(2).join(" ")}
        </span>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold text-[hsl(var(--foreground))]">{interview.title || typeLabel(interview.type)}</h3>
          <InterviewStatusBadge status={displayStatus(interview, now)} />
        </div>
        {interview.title && <p className="text-sm font-medium text-[hsl(var(--foreground)/0.8)]">{typeLabel(interview.type)}</p>}
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[hsl(var(--foreground)/0.75)]">
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" aria-hidden="true" />
            {formatTime(interview.scheduledAt)} · {interview.durationMinutes ?? 60} min
          </span>
          <span className="flex items-center gap-1.5">
            <UserRound className="h-4 w-4" aria-hidden="true" />
            {interview.interviewer?.fullName ?? "Faculty interviewer"}
          </span>
          {interview.interviewer?.email && (
            <a href={`mailto:${interview.interviewer.email}`} className="flex items-center gap-1.5 hover:text-[hsl(var(--primary))]">
              <Mail className="h-4 w-4" aria-hidden="true" />
              {interview.interviewer.email}
            </a>
          )}
        </p>
        {interview.instructions && (
          <div className="mt-2 flex gap-2 rounded-xl bg-[hsl(var(--primary)/0.06)] px-3 py-2 text-sm text-[hsl(var(--foreground)/0.85)]">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--primary))]" aria-hidden="true" />
            <p className="whitespace-pre-line">{interview.instructions}</p>
          </div>
        )}
        {live && inApp && (
          <p className="flex items-center gap-1.5 text-sm font-semibold text-[hsl(var(--color-primary-700))]">
            <Radio className="h-4 w-4" aria-hidden="true" /> Your interviewer has started. Join now.
          </p>
        )}
        {inApp && !roomOpen && interview.status === "SCHEDULED" && (
          <p className="text-xs text-[hsl(var(--muted-foreground))]">The interview room opens 15 minutes before the start.</p>
        )}
        {!inApp && !joinable && interview.meetingUrl && (
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            The meeting link opens 15 minutes before the start.
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:items-end">
        {inApp ? (
          roomOpen ? (
            <Link
              href={`/student/interviews/room/${interview.roomId}`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 text-sm font-semibold text-white shadow-[0_6px_16px_-8px_hsl(var(--primary)/0.8)] transition-all hover:bg-[hsl(var(--color-primary-600))] active:scale-[0.98]"
            >
              <Video className="h-4 w-4" aria-hidden="true" />
              Join Interview
            </Link>
          ) : (
            <span className="inline-flex h-10 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-[hsl(var(--muted))] px-5 text-sm font-semibold text-[hsl(var(--muted-foreground))]">
              <Video className="h-4 w-4" aria-hidden="true" />
              Join Interview
            </span>
          )
        ) : joinable ? (
          <a
            href={interview.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 text-sm font-semibold text-white shadow-[0_6px_16px_-8px_hsl(var(--primary)/0.8)] transition-all hover:bg-[hsl(var(--color-primary-600))] active:scale-[0.98]"
          >
            <Video className="h-4 w-4" aria-hidden="true" />
            Join meeting
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        ) : (
          <span className="inline-flex h-10 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-[hsl(var(--muted))] px-5 text-sm font-semibold text-[hsl(var(--muted-foreground))]">
            <Video className="h-4 w-4" aria-hidden="true" />
            Join meeting
          </span>
        )}
        {cancellable ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
          >
            <XCircle className="h-4 w-4" aria-hidden="true" />
            Cancel booking
          </button>
        ) : interview.status === "SCHEDULED" ? (
          <span className="text-xs text-[hsl(var(--muted-foreground))]">Can&apos;t cancel within 2 hours</span>
        ) : null}
      </div>
    </article>
  );
}

/** Interviews evaluated before structured feedback used a 0–10 rubric; show them on the same 5-point scale. */
function legacyScore(interview: MockInterview) {
  const avg = rubricAverage(interview.rubricScores);
  return avg == null ? null : Math.round((avg / 2) * 10) / 10;
}

function HistoryRow({ interview, now }: { interview: MockInterview; now: number }) {
  const [open, setOpen] = React.useState(false);
  const average = interview.evaluation ? interview.evaluation.overallScore : legacyScore(interview);
  const hasFeedback = interview.status === "COMPLETED";
  return (
    <li className="border-b border-[hsl(var(--border)/0.6)] last:border-0">
      <button
        type="button"
        onClick={() => hasFeedback && setOpen((v) => !v)}
        aria-expanded={hasFeedback ? open : undefined}
        className={cn(
          "flex w-full flex-col gap-2 px-5 py-4 text-left sm:flex-row sm:items-center sm:gap-4",
          hasFeedback ? "cursor-pointer hover:bg-[hsl(var(--primary)/0.03)]" : "cursor-default",
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[hsl(var(--foreground))]">{interview.title || typeLabel(interview.type)}</p>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {formatDay(interview.scheduledAt)} · {interview.interviewer?.fullName ?? "Faculty interviewer"}
          </p>
          {interview.status === "CANCELLED" && (
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              Cancelled by {interview.cancelledBy === "STUDENT" ? "you" : "the interviewer"}
              {interview.cancellationReason ? `: ${interview.cancellationReason}` : ""}
            </p>
          )}
        </div>
        {average != null && (
          <span className="flex items-center gap-1 text-sm font-bold tabular-nums text-[hsl(var(--foreground))]">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
            {average} / 5
          </span>
        )}
        <InterviewStatusBadge status={displayStatus(interview, now)} />
        {hasFeedback && (
          <ChevronDown
            className={cn("hidden h-5 w-5 text-[hsl(var(--muted-foreground))] transition-transform sm:block", open && "rotate-180")}
            aria-hidden="true"
          />
        )}
      </button>
      {open && hasFeedback && interview.evaluation && (
        <div className="pc-step border-t border-[hsl(var(--border)/0.6)] bg-[hsl(var(--muted)/0.25)] px-5 py-5">
          <p className="mb-4 text-sm text-[hsl(var(--muted-foreground))]">Feedback from {interview.interviewer?.fullName ?? "your interviewer"}</p>
          <EvaluationView evaluation={interview.evaluation} />
        </div>
      )}
      {open && hasFeedback && !interview.evaluation && (
        <div className="pc-step grid gap-5 border-t border-[hsl(var(--border)/0.6)] bg-[hsl(var(--muted)/0.25)] px-5 py-5 md:grid-cols-2">
          <div className="space-y-3">
            {RUBRIC_DIMENSIONS.map(({ key, label }) => {
              const score = interview.rubricScores?.[key];
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-[hsl(var(--foreground))]">{label}</span>
                    <span className="font-semibold tabular-nums">{score ?? "—"}{score != null ? " / 10" : ""}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--color-primary-light))]"
                      style={{ width: `${((score ?? 0) / 10) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-[hsl(var(--foreground))]">Interviewer feedback</h4>
            <p className="whitespace-pre-wrap rounded-xl bg-white p-4 text-sm leading-relaxed text-[hsl(var(--foreground)/0.8)] ring-1 ring-[hsl(var(--border)/0.7)]">
              {interview.feedback || "No written feedback."}
            </p>
          </div>
        </div>
      )}
    </li>
  );
}

export default function StudentInterviewsPage() {
  const { data, isLoading, isError, refetch } = useStudentInterviews();
  // Pick up "your interviewer has started" without a reload.
  React.useEffect(() => {
    const t = setInterval(() => void refetch(), 30_000);
    return () => clearInterval(t);
  }, [refetch]);
  const cancelMutation = useCancelStudentInterview();
  const [bookOpen, setBookOpen] = React.useState(false);
  const [cancelTarget, setCancelTarget] = React.useState<MockInterview | null>(null);
  const now = useNow();

  const interviews = React.useMemo(() => data ?? [], [data]);
  const upcoming = React.useMemo(
    () => interviews.filter((iv) => isUpcoming(iv, now) && !iv.endedAt).sort((a, b) => startTime(a) - startTime(b)),
    [interviews, now],
  );
  const history = React.useMemo(
    () => interviews.filter((iv) => !isUpcoming(iv, now) || !!iv.endedAt).sort((a, b) => startTime(b) - startTime(a)),
    [interviews, now],
  );
  const completed = interviews.filter((iv) => iv.status === "COMPLETED");
  const averages = completed
    .map((iv) => (iv.evaluation ? iv.evaluation.overallScore : legacyScore(iv)))
    .filter((v): v is number => v != null);
  const overallAverage = averages.length
    ? (averages.reduce((a, b) => a + b, 0) / averages.length).toFixed(1)
    : null;

  const confirmCancel = (reason: string) => {
    if (!cancelTarget) return;
    cancelMutation.mutate(
      { id: cancelTarget.id, reason },
      {
        onSuccess: () => {
          toast.success("Booking cancelled", { description: "Your interviewer has been notified." });
          setCancelTarget(null);
        },
        onError: (error) =>
          toast.error("Couldn't cancel", {
            description: error instanceof ApiError ? error.message : "Please try again.",
          }),
      },
    );
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <section className={lightHeroClassName}>
        <HeroWaves />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-[36rem] space-y-3">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              <span className="text-[hsl(var(--foreground))]">My </span>
              <span className="text-[hsl(var(--primary))]">Interviews</span>
            </h1>
            <p className="text-[15px] leading-relaxed text-[hsl(var(--foreground)/0.8)] sm:text-base">
              Join live video mock interviews with faculty, or book an open slot, and get structured feedback that counts towards your readiness.
            </p>
          </div>
          <div className="pointer-events-none absolute right-[230px] top-1/2 hidden h-[140px] w-[210px] -translate-y-1/2 xl:block">
            <VideoCallIllustration />
          </div>
          <button
            type="button"
            onClick={() => setBookOpen(true)}
            className="relative inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-[hsl(var(--primary))] px-6 py-3.5 text-base font-semibold text-white shadow-[0_10px_24px_-10px_hsl(var(--primary)/0.8)] transition-all hover:-translate-y-0.5 hover:bg-[hsl(var(--color-primary-600))] active:translate-y-0 active:scale-[0.98] md:self-center"
          >
            <CalendarPlus className="h-5 w-5" aria-hidden="true" />
            Book Interview
          </button>
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-4" aria-busy="true">
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[88px] rounded-2xl" />)}
          </div>
          <Skeleton className="h-[130px] rounded-2xl" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50/60 px-6 py-12 text-center">
          <CircleAlert className="h-8 w-8 text-red-600" aria-hidden="true" />
          <p className="font-semibold text-red-900">We couldn&apos;t load your interviews</p>
          <button type="button" onClick={() => refetch()} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200">Retry</button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Upcoming" value={String(upcoming.length)} icon={CalendarCheck} tile="bg-blue-50 text-blue-600" delay={40} />
            <StatCard label="Completed" value={String(completed.length)} icon={Video} tile="bg-emerald-50 text-emerald-600" delay={80} />
            <StatCard label="Average score" value={overallAverage ? `${overallAverage} / 5` : "—"} icon={Star} tile="bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]" delay={120} />
          </div>

          <section aria-labelledby="upcoming-heading" className="space-y-3">
            <h2 id="upcoming-heading" className="text-xl font-bold text-[hsl(var(--foreground))]">Upcoming Interviews</h2>
            {upcoming.length === 0 ? (
              <div className="pc-enter flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[hsl(var(--primary)/0.3)] bg-white px-6 py-10 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
                  <CalendarPlus className="h-7 w-7" aria-hidden="true" />
                </span>
                <p className="font-semibold text-[hsl(var(--foreground))]">No interviews booked</p>
                <p className="max-w-[28rem] text-sm text-[hsl(var(--muted-foreground))]">
                  Practise with a faculty member before your placement drives. Pick a time that works for you.
                </p>
                <button type="button" onClick={() => setBookOpen(true)} className="mt-1 inline-flex h-10 items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 text-sm font-semibold text-white hover:bg-[hsl(var(--color-primary-600))]">
                  <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                  Book Interview
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((interview) => (
                  <UpcomingCard key={interview.id} interview={interview} now={now} onCancel={() => setCancelTarget(interview)} />
                ))}
              </div>
            )}
          </section>

          {history.length > 0 && (
            <section aria-labelledby="history-heading" className="space-y-3">
              <h2 id="history-heading" className="text-xl font-bold text-[hsl(var(--foreground))]">Past Interviews</h2>
              <ul className="overflow-hidden rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white shadow-[var(--shadow-card)]">
                {history.map((interview) => <HistoryRow key={interview.id} interview={interview} now={now} />)}
              </ul>
            </section>
          )}
        </>
      )}

      <BookInterviewDialog open={bookOpen} onOpenChange={setBookOpen} upcoming={upcoming} />
      <ReasonDialog
        open={!!cancelTarget}
        title="Cancel this interview?"
        description={
          cancelTarget
            ? `${typeLabel(cancelTarget.type)} on ${formatDay(cancelTarget.scheduledAt)} at ${formatTime(cancelTarget.scheduledAt)}. Your interviewer will be notified.`
            : ""
        }
        confirmLabel="Cancel booking"
        isPending={cancelMutation.isPending}
        onConfirm={confirmCancel}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      />
    </div>
  );
}
