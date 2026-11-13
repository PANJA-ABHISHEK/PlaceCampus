"use client";

import * as React from "react";
import { toast } from "sonner";
import { Award, ClipboardCheck, Loader2, Plus, X } from "lucide-react";
import {
  EVALUATION_CRITERIA,
  INTERVIEW_ASSESSMENTS,
  type EvaluationCriterion,
  type InterviewAssessment,
  type InterviewFeedback,
} from "@placecampus/shared-types";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { fieldInputClassName } from "@/features/student/components/profile/profile-fields";
import { useEvaluateInterview } from "../hooks/use-interviews";
import {
  ASSESSMENT_META,
  EVALUATION_LABELS,
  overallScoreOf,
  suggestedAssessment,
} from "../lib/interview-meta";

const SCALE = [1, 2, 3, 4, 5] as const;
const SCALE_HINT: Record<number, string> = { 1: "Poor", 2: "Fair", 3: "Good", 4: "Very good", 5: "Excellent" };

export function AssessmentBadge({ assessment, className }: { assessment: InterviewAssessment; className?: string }) {
  const meta = ASSESSMENT_META[assessment];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1", meta.className, className)}>
      <Award className="h-3.5 w-3.5" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

/** Structured post-interview evaluation. The server recomputes the overall score. */
export function EvaluationForm({ interviewId, onDone }: { interviewId: string; onDone?: () => void }) {
  const evaluate = useEvaluateInterview();
  const [scores, setScores] = React.useState<Partial<Record<EvaluationCriterion, number>>>({});
  const [strengths, setStrengths] = React.useState("");
  const [improvements, setImprovements] = React.useState("");
  const [comments, setComments] = React.useState("");
  const [topics, setTopics] = React.useState<string[]>([]);
  const [topicDraft, setTopicDraft] = React.useState("");
  const [assessment, setAssessment] = React.useState<InterviewAssessment | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const complete = EVALUATION_CRITERIA.every((k) => typeof scores[k] === "number");
  const overall = complete ? overallScoreOf(scores as Record<EvaluationCriterion, number>) : null;
  const effectiveAssessment = assessment ?? (overall != null ? suggestedAssessment(overall) : null);

  const addTopic = () => {
    const t = topicDraft.trim();
    if (t && !topics.includes(t) && topics.length < 12) setTopics([...topics, t]);
    setTopicDraft("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!complete) return setError("Rate all five criteria.");
    if (!strengths.trim() || !improvements.trim()) return setError("Add strengths and areas for improvement.");
    if (!effectiveAssessment) return;
    evaluate.mutate(
      {
        id: interviewId,
        payload: {
          ...(scores as Record<EvaluationCriterion, number>),
          strengths: strengths.trim(),
          improvements: improvements.trim(),
          facultyComments: comments.trim() || undefined,
          recommendedTopics: topics,
          assessment: effectiveAssessment,
        },
      },
      {
        onSuccess: () => {
          toast.success("Evaluation submitted", { description: "The student can now see your feedback." });
          onDone?.();
        },
        onError: (err) => setError(err instanceof ApiError ? err.errors?.validation?.[0] || err.message : "Please try again."),
      },
    );
  };

  const textarea = cn(fieldInputClassName, "w-full resize-none px-3.5 py-2.5");

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-bold text-[hsl(var(--foreground))]">Ratings (1–5)</legend>
        {EVALUATION_CRITERIA.map((key) => (
          <div key={key} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span id={`crit-${key}`} className="text-sm font-medium text-[hsl(var(--foreground)/0.85)]">{EVALUATION_LABELS[key]}</span>
            <div role="radiogroup" aria-labelledby={`crit-${key}`} className="flex gap-1.5">
              {SCALE.map((n) => {
                const active = scores[key] === n;
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    title={SCALE_HINT[n]}
                    onClick={() => setScores((s) => ({ ...s, [key]: n }))}
                    className={cn(
                      "h-10 w-10 rounded-xl border text-sm font-bold tabular-nums transition-colors",
                      active
                        ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white"
                        : "border-[hsl(var(--border))] bg-white text-[hsl(var(--foreground)/0.8)] hover:border-[hsl(var(--primary)/0.5)]",
                    )}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-[hsl(var(--primary)/0.06)] px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Overall score</p>
          <p className="text-3xl font-extrabold tabular-nums text-[hsl(var(--foreground))]">
            {overall ?? "–"}<span className="text-base font-semibold text-[hsl(var(--muted-foreground))]"> / 5</span>
          </p>
        </div>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">Average of the five ratings. The server calculates the saved score.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm font-semibold">Strengths</span>
          <textarea rows={4} maxLength={2000} value={strengths} onChange={(e) => setStrengths(e.target.value)} className={textarea} />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-semibold">Areas for improvement</span>
          <textarea rows={4} maxLength={2000} value={improvements} onChange={(e) => setImprovements(e.target.value)} className={textarea} />
        </label>
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-semibold">Faculty comments (optional)</span>
        <textarea rows={3} maxLength={3000} value={comments} onChange={(e) => setComments(e.target.value)} className={textarea} />
      </label>

      <div className="space-y-2">
        <p className="text-sm font-semibold">Recommended preparation topics</p>
        {topics.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <li key={t} className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--muted))] py-1 pl-3 pr-1.5 text-sm">
                {t}
                <button type="button" aria-label={`Remove ${t}`} onClick={() => setTopics(topics.filter((x) => x !== t))} className="rounded-full p-0.5 hover:bg-white"><X className="h-3.5 w-3.5" /></button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input
            value={topicDraft}
            maxLength={80}
            onChange={(e) => setTopicDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTopic(); } }}
            placeholder="e.g. Graph traversal"
            aria-label="Add a preparation topic"
            className={cn(fieldInputClassName, "h-10 flex-1 px-3")}
          />
          <button type="button" onClick={addTopic} disabled={!topicDraft.trim()} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[hsl(var(--border))] bg-white px-3 text-sm font-semibold disabled:opacity-50">
            <Plus className="h-4 w-4" aria-hidden="true" /> Add
          </button>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Final assessment</legend>
        <div className="flex flex-wrap gap-2">
          {INTERVIEW_ASSESSMENTS.map((a) => {
            const active = effectiveAssessment === a;
            return (
              <button
                key={a}
                type="button"
                aria-pressed={active}
                onClick={() => setAssessment(a)}
                className={cn(
                  "rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
                  active ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--color-primary-700))]" : "border-[hsl(var(--border))] bg-white hover:border-[hsl(var(--primary)/0.4)]",
                )}
              >
                {ASSESSMENT_META[a].label}
              </button>
            );
          })}
        </div>
        {assessment == null && overall != null && (
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Suggested from the overall score. Choose another if it fits better.</p>
        )}
      </fieldset>

      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={evaluate.isPending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] text-base font-semibold text-white transition-colors hover:bg-[hsl(var(--color-primary-600))] disabled:opacity-60 sm:w-auto sm:px-8"
      >
        {evaluate.isPending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <ClipboardCheck className="h-5 w-5" aria-hidden="true" />}
        Submit evaluation
      </button>
    </form>
  );
}

/** Read-only evaluation, shown to faculty and to the student. */
export function EvaluationView({ evaluation }: { evaluation: InterviewFeedback }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-extrabold tabular-nums text-[hsl(var(--foreground))]">{evaluation.overallScore}</span>
          <span className="text-base font-semibold text-[hsl(var(--muted-foreground))]">/ 5</span>
        </div>
        <AssessmentBadge assessment={evaluation.assessment} />
      </div>
      <ul className="space-y-2.5">
        {EVALUATION_CRITERIA.map((key) => (
          <li key={key} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[14rem_1fr_auto]">
            <span className="text-sm font-medium text-[hsl(var(--foreground)/0.85)]">{EVALUATION_LABELS[key]}</span>
            <span className="order-last col-span-2 h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))] sm:order-none sm:col-span-1" aria-hidden="true">
              <span className="block h-full rounded-full bg-[hsl(var(--primary))]" style={{ width: `${(evaluation[key] / 5) * 100}%` }} />
            </span>
            <span className="text-sm font-bold tabular-nums">{evaluation[key]} / 5</span>
          </li>
        ))}
      </ul>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-emerald-50/70 p-4">
          <p className="mb-1 text-sm font-bold text-emerald-800">Strengths</p>
          <p className="whitespace-pre-line text-sm text-emerald-950/80">{evaluation.strengths}</p>
        </div>
        <div className="rounded-2xl bg-amber-50/70 p-4">
          <p className="mb-1 text-sm font-bold text-amber-800">Areas for improvement</p>
          <p className="whitespace-pre-line text-sm text-amber-950/80">{evaluation.improvements}</p>
        </div>
      </div>
      {evaluation.facultyComments && (
        <div>
          <p className="mb-1 text-sm font-bold">Faculty comments</p>
          <p className="whitespace-pre-line text-sm text-[hsl(var(--foreground)/0.8)]">{evaluation.facultyComments}</p>
        </div>
      )}
      {(evaluation.recommendedTopics?.length ?? 0) > 0 && (
        <div>
          <p className="mb-2 text-sm font-bold">Recommended preparation topics</p>
          <ul className="flex flex-wrap gap-2">
            {evaluation.recommendedTopics!.map((t) => (
              <li key={t} className="rounded-full bg-[hsl(var(--primary)/0.08)] px-3 py-1 text-sm font-medium text-[hsl(var(--color-primary-700))]">{t}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
