"use client";

import * as React from "react";
import {
  ArrowRight,
  CircleHelp,
  ClipboardList,
  Clock,
  Loader2,
  RotateCcw,
  Trophy,
} from "lucide-react";
import type { Assessment } from "@placecampus/shared-types";
import { cn } from "@/lib/utils";
import {
  CATEGORY_META,
  SkillIcon,
  type SkillCategory,
} from "@/features/skills/lib/skill-registry";
import {
  DIFFICULTY_META,
  STATUS_META,
  getDifficulty,
  summarizeAttempts,
} from "../lib/assessment-meta";

export interface AssessmentView {
  assessment: Assessment;
  skillName: string | null;
  category: SkillCategory;
  summary: ReturnType<typeof summarizeAttempts>;
}

export function startLabel(status: AssessmentView["summary"]["status"]) {
  if (status === "IN_PROGRESS") return "Resume Assessment";
  if (status === "COMPLETED") return "Retake Assessment";
  return "Start Assessment";
}

export function StatusBadge({
  status,
}: {
  status: AssessmentView["summary"]["status"];
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
        meta.className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export function MetaBadges({ view }: { view: AssessmentView }) {
  const difficulty = DIFFICULTY_META[getDifficulty(view.assessment.difficulty)];
  return (
    <div className="flex flex-wrap gap-1.5">
      {view.category !== "OTHER" && (
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
            CATEGORY_META[view.category].badge,
          )}
        >
          {CATEGORY_META[view.category].label}
        </span>
      )}
      <span
        className={cn(
          "rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
          difficulty.className,
        )}
      >
        {difficulty.label}
      </span>
    </div>
  );
}

export function AssessmentCard({
  view,
  onOpen,
  onStart,
  isStarting,
  style,
}: {
  view: AssessmentView;
  onOpen: () => void;
  onStart: () => void;
  isStarting: boolean;
  style?: React.CSSProperties;
}) {
  const { assessment, summary } = view;
  const questionCount = assessment.questions?.length ?? 0;
  const StartIcon = summary.status === "COMPLETED" ? RotateCcw : ArrowRight;

  return (
    <article
      style={style}
      className="pc-enter group relative flex h-full flex-col rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/0.25)] hover:shadow-[var(--shadow-card-hover)]"
    >
      <div className="flex items-start gap-3.5">
        {view.skillName ? (
          <SkillIcon name={view.skillName} size="md" />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 font-bold leading-snug text-[hsl(var(--foreground))]">
              {/* Whole-card click target for details, without nesting buttons. */}
              <button
                type="button"
                onClick={onOpen}
                className="text-left after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none group-hover:text-[hsl(var(--primary))] [&:focus-visible]:after:ring-2 [&:focus-visible]:after:ring-[hsl(var(--primary)/0.5)]"
              >
                {assessment.title}
              </button>
            </h3>
            <StatusBadge status={summary.status} />
          </div>
          <MetaBadges view={view} />
        </div>
      </div>

      <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
        {assessment.description || "No description provided."}
      </p>

      <div className="mt-auto flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-[hsl(var(--foreground)/0.7)]">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {assessment.durationMinutes} mins
          </span>
          <span className="flex items-center gap-1.5">
            <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
            {questionCount} {questionCount === 1 ? "Question" : "Questions"}
          </span>
          {summary.bestPercentage != null && (
            <span className="flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
              Best {summary.bestPercentage}%
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onStart}
          disabled={isStarting || questionCount === 0}
          title={questionCount === 0 ? "This assessment has no questions yet" : undefined}
          className="relative z-10 inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 text-sm font-semibold text-white shadow-[0_6px_16px_-8px_hsl(var(--primary)/0.8)] transition-all hover:bg-[hsl(var(--color-primary-600))] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isStarting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          {startLabel(summary.status)}
          {!isStarting && <StartIcon className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </article>
  );
}
