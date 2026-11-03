import {
  AssessmentAttemptStatus,
  type Assessment,
  type AssessmentAttempt,
} from "@placecampus/shared-types";
import {
  detectSkillIcon,
  getSkillCategory,
  type SkillCategory,
} from "@/features/skills/lib/skill-registry";

/* ---------------------------------------------------------------------------
 * Difficulty — stored as a number; 1 = Easy, 2 = Medium, 3+ = Hard.
 * ------------------------------------------------------------------------- */

export type DifficultyLabel = "EASY" | "MEDIUM" | "HARD";

export function getDifficulty(level: number): DifficultyLabel {
  if (level <= 1) return "EASY";
  if (level === 2) return "MEDIUM";
  return "HARD";
}

export const DIFFICULTY_META: Record<
  DifficultyLabel,
  { label: string; className: string }
> = {
  EASY: { label: "Easy", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  MEDIUM: { label: "Medium", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  HARD: { label: "Hard", className: "bg-red-50 text-red-700 ring-red-200" },
};

export const TYPE_LABEL: Record<Assessment["type"], string> = {
  MCQ: "Multiple choice",
  CODING: "Coding",
  SUBJECTIVE: "Written",
};

/* ---------------------------------------------------------------------------
 * Skill / category
 * ------------------------------------------------------------------------- */

// Short or common words that would misfire as single-word matches in titles.
const AMBIGUOUS_WORDS = new Set(["next", "rest", "spring", "express", "go", "node"]);

/**
 * The skill an assessment tests: its target skill when set, otherwise the
 * first recognisable technology in the title ("SQL for Developers" → SQL).
 */
export function inferAssessmentSkill(
  assessment: Pick<Assessment, "title" | "targetSkillId">,
  skillNameById: Map<string, string>,
): string | null {
  const target = assessment.targetSkillId
    ? skillNameById.get(String(assessment.targetSkillId))
    : undefined;
  if (target) return target;

  const words = assessment.title.split(/[\s,:;&()/|–—-]+/).filter(Boolean);
  for (const size of [3, 2, 1]) {
    for (let i = 0; i + size <= words.length; i++) {
      const phrase = words.slice(i, i + size).join(" ");
      if (
        size === 1 &&
        (phrase.length < 3 || AMBIGUOUS_WORDS.has(phrase.toLowerCase()))
      )
        continue;
      const match = detectSkillIcon(phrase);
      if (match) return match.label;
    }
  }
  return null;
}

export function getAssessmentCategory(skillName: string | null): SkillCategory {
  return skillName ? getSkillCategory(skillName) : "OTHER";
}

/* ---------------------------------------------------------------------------
 * Per-student status, derived from attempts
 * ------------------------------------------------------------------------- */

export type StudentAssessmentStatus = "AVAILABLE" | "IN_PROGRESS" | "COMPLETED";

export const STATUS_META: Record<
  StudentAssessmentStatus,
  { label: string; className: string; dot: string }
> = {
  AVAILABLE: {
    label: "Available",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-blue-50 text-blue-700 ring-blue-200",
    dot: "bg-blue-500",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-600",
  },
};

export function isFinished(attempt: AssessmentAttempt) {
  return (
    attempt.status === AssessmentAttemptStatus.EVALUATED ||
    attempt.status === AssessmentAttemptStatus.SUBMITTED
  );
}

export function summarizeAttempts(
  assessmentId: string,
  attempts: AssessmentAttempt[],
) {
  const mine = attempts.filter((a) => a.assessmentId === assessmentId);
  const finished = mine.filter(isFinished);
  const inProgress = mine.find(
    (a) => a.status === AssessmentAttemptStatus.IN_PROGRESS,
  );
  const scores = finished
    .map((a) => a.percentage)
    .filter((p): p is number => typeof p === "number");
  const status: StudentAssessmentStatus = inProgress
    ? "IN_PROGRESS"
    : finished.length
      ? "COMPLETED"
      : "AVAILABLE";
  return {
    status,
    finishedCount: finished.length,
    bestPercentage: scores.length ? Math.max(...scores) : null,
    inProgress,
  };
}

export function formatDuration(seconds: number | undefined) {
  if (seconds == null) return null;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes ? `${minutes}m ${rest}s` : `${rest}s`;
}
