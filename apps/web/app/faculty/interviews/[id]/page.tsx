"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarClock,
  ExternalLink,
  Loader2,
  Mail,
  Play,
  Send,
  UserRound,
  UserX,
  Video,
} from "lucide-react";
import type { InterviewRubric } from "@placecampus/shared-types";
import {
  useEvaluateInterview,
  useFacultyInterview,
  useMarkInterviewNoShow,
  useStartInterview,
} from "@/features/interviews/hooks/use-interviews";
import {
  RUBRIC_DIMENSIONS,
  canFacultyStartOrEvaluate,
  startTime,
} from "@/features/interviews/lib/interview-meta";
import {
  InterviewStatusBadge,
  formatDay,
  formatTime,
} from "@/features/interviews/components/interview-ui";
import { getInitials } from "@/components/layout/user-menu";
import { useNow } from "@/features/interviews/hooks/use-now";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";

const errorText = (error: unknown) =>
  error instanceof ApiError ? error.message : "Please try again.";

export default function FacultyInterviewEvaluationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: interview, isLoading, isError } = useFacultyInterview(id);
  const evaluateMutation = useEvaluateInterview();
  const startMutation = useStartInterview();
  const noShowMutation = useMarkInterviewNoShow();
  const now = useNow();

  const [rubricOverride, setRubricOverride] = React.useState<InterviewRubric | null>(null);
  const [feedbackOverride, setFeedbackOverride] = React.useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-40 rounded-xl" />
        <Skeleton className="h-[140px] rounded-2xl" />
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
  const canEvaluate = active && windowOpen;
  const canStart = interview.status === "SCHEDULED" && windowOpen;
  const canNoShow = active && now >= startTime(interview);
  const readOnly = !canEvaluate;

  const rubricScores: InterviewRubric = rubricOverride ??
    interview.rubricScores ?? { technicalKnowledge: 0, problemSolving: 0, communication: 0, projectDepth: 0 };
  const feedback = feedbackOverride ?? interview.feedback ?? "";

  const setScore = (key: keyof InterviewRubric, value: number) => {
    if (readOnly) return;
    setRubricOverride({ ...rubricScores, [key]: value });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (readOnly) return;
    if (!feedback.trim()) {
      toast.error("Add written feedback before submitting");
      return;
    }
    if (!confirm("Submit this evaluation? The student will see the scores and feedback.")) return;
    evaluateMutation.mutate(
      { id, payload: { rubricScores, feedback: feedback.trim() } },
      {
        onSuccess: () => {
          toast.success("Evaluation submitted", { description: "The student has been notified." });
          router.push("/faculty/interviews");
        },
        onError: (error) => toast.error("Couldn't submit evaluation", { description: errorText(error) }),
      },
    );
  };

  const name = interview.student?.fullName ?? "Student";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
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
              <h1 className="text-xl font-bold text-[hsl(var(--foreground))]">{name}</h1>
              {interview.student?.email && (
                <p className="flex items-center gap-1.5 truncate text-sm text-[hsl(var(--muted-foreground))]">
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  {interview.student.email}
                </p>
              )}
              <p className="mt-1 text-sm font-medium text-[hsl(var(--foreground)/0.8)]">{interview.type} interview</p>
            </div>
          </div>
          <InterviewStatusBadge status={interview.status} />
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
            <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm text-[hsl(var(--muted-foreground))] ring-1 ring-[hsl(var(--border)/0.7)]">
              <UserRound className="h-5 w-5" aria-hidden="true" />
              No meeting link on file
            </div>
          )}
        </div>

        {active && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {interview.status === "SCHEDULED" && (
              <button
                type="button"
                disabled={!canStart || startMutation.isPending}
                onClick={() =>
                  startMutation.mutate(id, {
                    onSuccess: () => toast.success("Interview started"),
                    onError: (error) => toast.error("Couldn't start", { description: errorText(error) }),
                  })
                }
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 text-sm font-semibold text-white transition-colors hover:bg-[hsl(var(--color-primary-600))] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {startMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                Start interview
              </button>
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
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-white px-4 text-sm font-semibold text-[hsl(var(--foreground)/0.8)] transition-colors hover:bg-[hsl(var(--muted))] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UserX className="h-4 w-4" aria-hidden="true" />
              Student didn&apos;t attend
            </button>
            {!windowOpen && (
              <span className="text-xs text-[hsl(var(--muted-foreground))]">Starting and evaluation open 15 minutes before the start time.</span>
            )}
          </div>
        )}

        {interview.status === "CANCELLED" && (
          <p className="mt-5 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
            Cancelled by {interview.cancelledBy === "FACULTY" ? "you" : "the student"}
            {interview.cancellationReason ? `: ${interview.cancellationReason}` : "."}
          </p>
        )}
      </section>

      {interview.status !== "CANCELLED" && interview.status !== "NO_SHOW" && (
        <form onSubmit={submit} className="space-y-6 rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white p-6 shadow-[var(--shadow-card)]">
          <div>
            <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">Rubric evaluation</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {interview.status === "COMPLETED"
                ? "Submitted. The student can see these scores."
                : canEvaluate
                  ? "Score each area from 0 to 10, then add written feedback."
                  : "Available once the interview window opens."}
            </p>
          </div>

          <div className="space-y-5">
            {RUBRIC_DIMENSIONS.map(({ key, label }) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor={`score-${key}`} className="text-sm font-semibold text-[hsl(var(--foreground))]">{label}</label>
                  <span className="w-12 text-right font-bold tabular-nums text-[hsl(var(--primary))]">{rubricScores[key] ?? 0} / 10</span>
                </div>
                <input
                  id={`score-${key}`}
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={rubricScores[key] ?? 0}
                  onChange={(event) => setScore(key, Number(event.target.value))}
                  disabled={readOnly || evaluateMutation.isPending}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[hsl(var(--muted))] accent-[hsl(var(--primary))] disabled:cursor-not-allowed"
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label htmlFor="feedback" className="text-sm font-semibold text-[hsl(var(--foreground))]">Written feedback</label>
            <textarea
              id="feedback"
              value={feedback}
              onChange={(event) => setFeedbackOverride(event.target.value)}
              disabled={readOnly || evaluateMutation.isPending}
              placeholder="What went well, and what should the student work on next?"
              className="min-h-[150px] w-full resize-y rounded-xl border border-[hsl(var(--input))] p-3.5 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-4 focus:ring-[hsl(var(--primary)/0.12)] disabled:bg-[hsl(var(--muted)/0.4)]"
            />
          </div>

          {canEvaluate && (
            <div className="flex justify-end border-t border-[hsl(var(--border)/0.7)] pt-5">
              <button
                type="submit"
                disabled={evaluateMutation.isPending}
                className="inline-flex h-11 min-w-[180px] items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 text-sm font-semibold text-white transition-all hover:bg-[hsl(var(--color-primary-600))] active:scale-[0.98] disabled:opacity-60"
              >
                {evaluateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                Submit evaluation
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
