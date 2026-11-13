"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  ExternalLink,
  Hash,
  Loader2,
  Lock,
  Mail,
  NotebookPen,
  Play,
  RotateCcw,
  UserX,
  Video,
  XCircle,
} from "lucide-react";
import {
  useCancelFacultyInterview,
  useFacultyInterview,
  useMarkInterviewNoShow,
  useStartInterview,
} from "@/features/interviews/hooks/use-interviews";
import {
  RUBRIC_DIMENSIONS,
  canEnterRoom,
  canFacultyStartOrEvaluate,
  displayStatus,
  startTime,
  typeLabel,
} from "@/features/interviews/lib/interview-meta";
import {
  InterviewStatusBadge,
  ReasonDialog,
  formatDay,
  formatTime,
} from "@/features/interviews/components/interview-ui";
import { EvaluationForm, EvaluationView } from "@/features/interviews/components/evaluation";
import { RescheduleInterviewDialog } from "@/features/interviews/components/reschedule-interview-dialog";
import { getInitials } from "@/components/layout/user-menu";
import { useNow } from "@/features/interviews/hooks/use-now";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";

const errorText = (error: unknown) => (error instanceof ApiError ? error.message : "Please try again.");

const card = "rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white p-6 shadow-[var(--shadow-card)]";

export default function FacultyInterviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: interview, isLoading, isError } = useFacultyInterview(id);
  const startMutation = useStartInterview();
  const noShowMutation = useMarkInterviewNoShow();
  const cancelMutation = useCancelFacultyInterview();
  const now = useNow();
  const [rescheduleOpen, setRescheduleOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const evaluationRef = React.useRef<HTMLElement>(null);
  const loaded = !!interview;
  React.useEffect(() => {
    // Arriving from "End interview": jump to the evaluation form.
    if (loaded && new URLSearchParams(window.location.search).get("evaluate") === "1") {
      evaluationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [loaded]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-40 rounded-xl" />
        <Skeleton className="h-[180px] rounded-2xl" />
        <Skeleton className="h-[380px] rounded-2xl" />
      </div>
    );
  }

  if (isError || !interview) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-2xl border bg-white p-8 text-center">
        <p className="font-semibold">Interview not found</p>
        <Link href="/faculty/interviews" className="inline-flex h-10 items-center rounded-xl bg-[hsl(var(--primary))] px-4 text-sm font-semibold text-white">
          Back to interviews
        </Link>
      </div>
    );
  }

  const active = interview.status === "SCHEDULED" || interview.status === "IN_PROGRESS";
  const windowOpen = canFacultyStartOrEvaluate(interview, now);
  const canEvaluate = active && windowOpen && !interview.evaluation;
  const roomOpen = canEnterRoom(interview, now);
  const canNoShow = active && !interview.endedAt && now >= startTime(interview);
  const name = interview.student?.fullName ?? "Student";
  const roomHref = interview.roomId ? `/faculty/interviews/room/${interview.roomId}` : null;
  const questions = interview.questions ?? [];

  const startAndEnter = () => {
    if (!roomHref) return;
    if (interview.status === "IN_PROGRESS") return router.push(roomHref);
    startMutation.mutate(id, {
      onSuccess: () => router.push(roomHref),
      onError: (error) => toast.error("Couldn't start", { description: errorText(error) }),
    });
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <Link href="/faculty/interviews" className="inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-[hsl(var(--foreground)/0.75)] hover:bg-white">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All interviews
      </Link>

      <section className="rounded-2xl border border-[hsl(var(--border)/0.8)] bg-gradient-to-br from-white to-[hsl(var(--color-primary-50))] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary)/0.12)] text-lg font-bold text-[hsl(var(--primary))] ring-4 ring-white">
              {getInitials(name)}
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[hsl(var(--foreground))]">{interview.title || `${typeLabel(interview.type)}`}</h1>
              <p className="text-sm font-medium text-[hsl(var(--foreground)/0.8)]">
                {name} · {typeLabel(interview.type)}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-[hsl(var(--muted-foreground))]">
                {interview.student?.registrationNumber && (
                  <span className="inline-flex items-center gap-1"><Hash className="h-3.5 w-3.5" aria-hidden="true" />{interview.student.registrationNumber}</span>
                )}
                {interview.student?.email && (
                  <span className="inline-flex items-center gap-1 truncate"><Mail className="h-3.5 w-3.5" aria-hidden="true" />{interview.student.email}</span>
                )}
              </p>
            </div>
          </div>
          <InterviewStatusBadge status={displayStatus(interview, now)} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-[hsl(var(--border)/0.7)]">
            <CalendarClock className="h-5 w-5 shrink-0 text-[hsl(var(--primary))]" aria-hidden="true" />
            <div className="text-sm">
              <p className="font-semibold">{formatDay(interview.scheduledAt)}</p>
              <p className="text-[hsl(var(--muted-foreground))]">{formatTime(interview.scheduledAt)} · {interview.durationMinutes ?? 60} min</p>
            </div>
          </div>
          {interview.meetingUrl ? (
            <a href={interview.meetingUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-[hsl(var(--border)/0.7)] transition-colors hover:ring-[hsl(var(--primary)/0.4)]">
              <Video className="h-5 w-5 shrink-0 text-[hsl(var(--primary))]" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{interview.meetingUrl.replace(/^https:\/\//, "")}</span>
              <ExternalLink className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
            </a>
          ) : (
            <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-[hsl(var(--border)/0.7)]">
              <Video className="h-5 w-5 text-[hsl(var(--primary))]" aria-hidden="true" />
              <span className="font-semibold">PlaceCampus video room</span>
            </div>
          )}
        </div>

        {interview.instructions && (
          <div className="mt-4 rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-[hsl(var(--border)/0.7)]">
            <p className="mb-1 font-semibold">Instructions for the student</p>
            <p className="whitespace-pre-line text-[hsl(var(--foreground)/0.8)]">{interview.instructions}</p>
          </div>
        )}

        {active && !interview.endedAt && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {roomHref && (
              <button
                type="button"
                disabled={!roomOpen || startMutation.isPending}
                onClick={startAndEnter}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 text-sm font-semibold text-white transition-colors hover:bg-[hsl(var(--color-primary-600))] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {startMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                {interview.status === "IN_PROGRESS" ? "Rejoin interview room" : "Start Interview"}
              </button>
            )}
            {interview.status === "SCHEDULED" && (
              <>
                <button type="button" onClick={() => setRescheduleOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-white px-4 text-sm font-semibold hover:bg-[hsl(var(--muted))]">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reschedule
                </button>
                <button type="button" onClick={() => setCancelOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 hover:bg-red-50">
                  <XCircle className="h-4 w-4" aria-hidden="true" /> Cancel
                </button>
              </>
            )}
            <button
              type="button"
              disabled={!canNoShow || noShowMutation.isPending}
              onClick={() => {
                if (!confirm("Mark this student as a no-show?")) return;
                noShowMutation.mutate(id, {
                  onSuccess: () => toast.success("Marked as no-show"),
                  onError: (error) => toast.error("Couldn't update", { description: errorText(error) }),
                });
              }}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-white px-4 text-sm font-semibold text-[hsl(var(--foreground)/0.8)] hover:bg-[hsl(var(--muted))] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UserX className="h-4 w-4" aria-hidden="true" />
              Student didn&apos;t attend
            </button>
            {!windowOpen && <span className="text-xs text-[hsl(var(--muted-foreground))]">The interview room opens 15 minutes before the start time.</span>}
          </div>
        )}

        {interview.status === "CANCELLED" && (
          <p className="mt-5 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
            Cancelled by {interview.cancelledBy === "FACULTY" ? "you" : "the student"}
            {interview.cancellationReason ? `: ${interview.cancellationReason}` : "."}
          </p>
        )}
      </section>

      {(questions.length > 0 || interview.facultyNotes) && (
        <div className="grid gap-5 lg:grid-cols-2">
          {questions.length > 0 && (
            <section className={card} aria-labelledby="q-title">
              <h2 id="q-title" className="mb-3 text-lg font-bold">Questions</h2>
              <ol className="space-y-2.5">
                {questions.map((q, i) => (
                  <li key={q.id} className="text-sm">
                    <p className="flex items-start gap-2">
                      {q.asked ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Asked" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" aria-label="Not asked" />}
                      <span><span className="font-semibold">{i + 1}.</span> {q.text} <span className="text-xs text-[hsl(var(--muted-foreground))]">· {q.category}</span></span>
                    </p>
                    {q.feedback && <p className="ml-6 mt-1 rounded-lg bg-[hsl(var(--muted)/0.6)] px-2.5 py-1.5 text-xs text-[hsl(var(--foreground)/0.8)]">{q.feedback}</p>}
                  </li>
                ))}
              </ol>
            </section>
          )}
          {interview.facultyNotes && (
            <section className={card} aria-labelledby="n-title">
              <h2 id="n-title" className="mb-3 flex items-center gap-2 text-lg font-bold"><NotebookPen className="h-5 w-5 text-[hsl(var(--primary))]" aria-hidden="true" />Private notes</h2>
              <p className="whitespace-pre-line text-sm text-[hsl(var(--foreground)/0.8)]">{interview.facultyNotes}</p>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]"><Lock className="h-3.5 w-3.5" aria-hidden="true" />Only you can see these.</p>
            </section>
          )}
        </div>
      )}

      {interview.status !== "CANCELLED" && interview.status !== "NO_SHOW" && (
        <section ref={evaluationRef} className={card} aria-labelledby="eval-title">
          <h2 id="eval-title" className="mb-1 flex items-center gap-2 text-lg font-bold">
            <ClipboardCheck className="h-5 w-5 text-[hsl(var(--primary))]" aria-hidden="true" /> Evaluation
          </h2>
          {interview.evaluation ? (
            <>
              <p className="mb-5 text-sm text-[hsl(var(--muted-foreground))]">Submitted. The student can see this feedback.</p>
              <EvaluationView evaluation={interview.evaluation} />
            </>
          ) : interview.status === "COMPLETED" && interview.rubricScores ? (
            // Evaluated before structured feedback existed (0–10 rubric).
            <div className="mt-4 space-y-3">
              {RUBRIC_DIMENSIONS.map(({ key, label }) =>
                interview.rubricScores?.[key] != null ? (
                  <p key={key} className="flex justify-between text-sm"><span>{label}</span><span className="font-bold tabular-nums">{interview.rubricScores[key]} / 10</span></p>
                ) : null,
              )}
              {interview.feedback && <p className="whitespace-pre-line border-t pt-3 text-sm">{interview.feedback}</p>}
            </div>
          ) : canEvaluate ? (
            <>
              <p className="mb-5 text-sm text-[hsl(var(--muted-foreground))]">Rate the student on each criterion, then share strengths and what to work on next.</p>
              <EvaluationForm interviewId={id} onDone={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
            </>
          ) : (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Available once the interview window opens.</p>
          )}
        </section>
      )}

      <RescheduleInterviewDialog interview={rescheduleOpen ? interview : null} onOpenChange={(o) => !o && setRescheduleOpen(false)} />
      <ReasonDialog
        open={cancelOpen}
        title="Cancel this interview?"
        description={`${name} will be notified, with your reason if you give one.`}
        reasonLabel="Reason for the student (optional)"
        confirmLabel="Cancel interview"
        isPending={cancelMutation.isPending}
        onConfirm={(reason) =>
          cancelMutation.mutate(
            { id, reason },
            {
              onSuccess: () => {
                toast.success("Interview cancelled", { description: "The student has been notified." });
                setCancelOpen(false);
              },
              onError: (error) => toast.error("Couldn't cancel", { description: errorText(error) }),
            },
          )
        }
        onOpenChange={(o) => !o && setCancelOpen(false)}
      />
    </div>
  );
}
