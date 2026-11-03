"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ArrowRight,
  CalendarCheck,
  CircleCheck,
  CircleHelp,
  CircleX,
  Clock,
  Gauge,
  ListChecks,
  Loader2,
  RotateCcw,
  Target,
  Timer,
  X,
} from "lucide-react";
import type { AssessmentAttempt } from "@placecampus/shared-types";
import { cn } from "@/lib/utils";
import { SkillIcon } from "@/features/skills/lib/skill-registry";
import { formatEvidenceDate } from "@/features/evidence/lib/evidence-meta";
import {
  DIFFICULTY_META,
  TYPE_LABEL,
  formatDuration,
  getDifficulty,
} from "../lib/assessment-meta";
import {
  MetaBadges,
  StatusBadge,
  startLabel,
  type AssessmentView,
} from "./assessment-card";

function DialogShell({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="pc-overlay fixed inset-0 z-[var(--z-overlay)] bg-[hsl(var(--color-navy-dark)/0.45)] backdrop-blur-[2px]" />
        <DialogPrimitive.Content className="pc-modal fixed left-1/2 top-1/2 z-[var(--z-modal)] flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-[34rem] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-2xl)] focus:outline-none">
          {children}
          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[hsl(var(--border)/0.8)] bg-[hsl(var(--muted)/0.35)] px-3.5 py-3">
      <dt className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-[hsl(var(--foreground))]">
        {value}
      </dd>
    </div>
  );
}

export function AssessmentDetailsDialog({
  view,
  relatedSkills,
  onOpenChange,
  onStart,
  isStarting,
}: {
  view: AssessmentView | null;
  relatedSkills: string[];
  onOpenChange: (open: boolean) => void;
  onStart: () => void;
  isStarting: boolean;
}) {
  if (!view) return <DialogShell open={false} onOpenChange={onOpenChange}>{null}</DialogShell>;
  const { assessment, summary } = view;
  const questionCount = assessment.questions?.length ?? 0;
  const difficulty = DIFFICULTY_META[getDifficulty(assessment.difficulty)];

  // Rules below mirror the API: MCQ answers are auto-scored on submit, an
  // in-progress attempt is resumed, and there is no attempt limit.
  const instructions = [
    assessment.type === "MCQ"
      ? "Answers are scored automatically when you submit."
      : "Only multiple-choice questions are scored automatically.",
    `Score at least ${assessment.passingScore}% to pass.`,
    `Plan to finish within ${assessment.durationMinutes} minutes.`,
    "If you leave midway, you can resume your in-progress attempt.",
  ];

  return (
    <DialogShell open onOpenChange={onOpenChange}>
      <div className="border-b border-[hsl(var(--border)/0.7)] bg-gradient-to-br from-white to-[hsl(var(--color-primary-50))] px-6 pb-5 pt-6">
        <div className="flex items-start gap-4 pr-8">
          {view.skillName ? (
            <SkillIcon name={view.skillName} size="lg" />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
              <ListChecks className="h-7 w-7" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0 space-y-2">
            <DialogPrimitive.Title className="text-xl font-bold leading-snug text-[hsl(var(--foreground))]">
              {assessment.title}
            </DialogPrimitive.Title>
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={summary.status} />
              <MetaBadges view={view} />
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <DialogPrimitive.Description className="text-sm leading-relaxed text-[hsl(var(--foreground)/0.8)]">
          {assessment.description || "No description provided."}
        </DialogPrimitive.Description>

        <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <Fact icon={CircleHelp} label="Questions" value={questionCount} />
          <Fact icon={Clock} label="Duration" value={`${assessment.durationMinutes} mins`} />
          <Fact icon={Gauge} label="Difficulty" value={difficulty.label} />
          <Fact icon={Target} label="Pass mark" value={`${assessment.passingScore}%`} />
          <Fact icon={ListChecks} label="Format" value={TYPE_LABEL[assessment.type]} />
          <Fact
            icon={RotateCcw}
            label="Attempts"
            value={`${summary.finishedCount} taken · no limit`}
          />
        </dl>

        {relatedSkills.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">
              Related skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {relatedSkills.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-white py-1 pl-1 pr-3 text-sm font-medium"
                >
                  <SkillIcon name={name} size="sm" className="h-6 w-6 rounded-full" />
                  {name}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">
            Instructions
          </h3>
          <ul className="space-y-1.5">
            {instructions.map((line) => (
              <li key={line} className="flex gap-2 text-sm text-[hsl(var(--foreground)/0.8)]">
                <CircleCheck
                  className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--primary))]"
                  aria-hidden="true"
                />
                {line}
              </li>
            ))}
          </ul>
        </section>

        {summary.bestPercentage != null && (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Your best score so far is <strong>{summary.bestPercentage}%</strong>.
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-[hsl(var(--border)/0.7)] bg-[hsl(var(--muted)/0.25)] px-6 py-4">
        <DialogPrimitive.Close className="inline-flex h-11 items-center rounded-xl px-4 text-sm font-semibold text-[hsl(var(--foreground)/0.8)] transition-colors hover:bg-white">
          Close
        </DialogPrimitive.Close>
        <button
          type="button"
          onClick={onStart}
          disabled={isStarting || questionCount === 0}
          className="inline-flex h-11 min-w-[190px] items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 text-sm font-semibold text-white shadow-[0_6px_16px_-6px_hsl(var(--primary)/0.7)] transition-all hover:bg-[hsl(var(--color-primary-600))] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isStarting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          )}
          {startLabel(summary.status)}
        </button>
      </div>
    </DialogShell>
  );
}

export function AssessmentResultDialog({
  attempt,
  title,
  totalQuestions,
  canRetake,
  onRetake,
  onOpenChange,
}: {
  attempt: AssessmentAttempt | null;
  title: string;
  totalQuestions: number | null;
  canRetake: boolean;
  onRetake: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  if (!attempt) return <DialogShell open={false} onOpenChange={onOpenChange}>{null}</DialogShell>;
  const percentage = attempt.percentage ?? 0;
  const passed = !!attempt.passed;
  const size = 120;
  const stroke = 11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <DialogShell open onOpenChange={onOpenChange}>
      <div className="flex flex-col items-center gap-4 bg-gradient-to-b from-[hsl(var(--color-primary-50))] to-white px-6 pb-2 pt-8 text-center">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-[hsl(var(--muted))]" />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - percentage / 100)}
              className={passed ? "stroke-emerald-500" : "stroke-[hsl(var(--primary))]"}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-[hsl(var(--foreground))]">
            {percentage}%
          </span>
        </div>
        <div className="space-y-1.5">
          <DialogPrimitive.Title className="text-xl font-bold text-[hsl(var(--foreground))]">
            {title}
          </DialogPrimitive.Title>
          <span
            className={cn(
              "pc-pop inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1",
              passed
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-red-50 text-red-700 ring-red-200",
            )}
          >
            {passed ? (
              <CircleCheck className="h-4 w-4" aria-hidden="true" />
            ) : (
              <CircleX className="h-4 w-4" aria-hidden="true" />
            )}
            {passed ? "Passed" : "Not passed"}
          </span>
        </div>
      </div>

      <div className="space-y-4 px-6 py-5">
        <DialogPrimitive.Description className="sr-only">
          Result details for this assessment attempt.
        </DialogPrimitive.Description>
        <dl className="grid grid-cols-2 gap-2.5">
          <Fact
            icon={ListChecks}
            label="Score"
            value={
              totalQuestions != null
                ? `${attempt.score ?? 0} / ${totalQuestions} correct`
                : `${attempt.score ?? 0} correct`
            }
          />
          <Fact icon={Timer} label="Time taken" value={formatDuration(attempt.durationSeconds) ?? "—"} />
          <Fact
            icon={CalendarCheck}
            label="Completed on"
            value={formatEvidenceDate(attempt.submittedAt, "d MMM yyyy, h:mm a") ?? "—"}
          />
          <Fact icon={Gauge} label="Status" value={attempt.status === "EVALUATED" ? "Evaluated" : "Submitted"} />
        </dl>
      </div>

      <div className="flex justify-end gap-2 border-t border-[hsl(var(--border)/0.7)] bg-[hsl(var(--muted)/0.25)] px-6 py-4">
        <DialogPrimitive.Close className="inline-flex h-11 items-center rounded-xl px-4 text-sm font-semibold text-[hsl(var(--foreground)/0.8)] transition-colors hover:bg-white">
          Close
        </DialogPrimitive.Close>
        {canRetake && (
          <button
            type="button"
            onClick={onRetake}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 text-sm font-semibold text-white transition-colors hover:bg-[hsl(var(--color-primary-600))]"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Retake
          </button>
        )}
      </div>
    </DialogShell>
  );
}
