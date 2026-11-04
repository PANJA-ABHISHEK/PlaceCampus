import { CircleAlert, CircleDot, TriangleAlert, type LucideIcon } from "lucide-react";
import type {
  GapPriority,
  PreparationPlan,
  SkillGapStatus,
} from "@placecampus/shared-types";

/** Priority is a status-style encoding: always shown with its icon and label. */
export const PRIORITY_META: Record<
  GapPriority,
  { label: string; icon: LucideIcon; chip: string; bar: string; dot: string }
> = {
  HIGH: {
    label: "High",
    icon: CircleAlert,
    chip: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30",
    bar: "bg-red-500",
    dot: "bg-red-500",
  },
  MEDIUM: {
    label: "Medium",
    icon: TriangleAlert,
    chip: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30",
    bar: "bg-amber-400",
    dot: "bg-amber-400",
  },
  LOW: {
    label: "Low",
    icon: CircleDot,
    chip: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-500/30",
    bar: "bg-slate-400",
    dot: "bg-slate-400",
  },
};

export const PRIORITY_ORDER: GapPriority[] = ["HIGH", "MEDIUM", "LOW"];

export const STATUS_META: Record<SkillGapStatus, { label: string; description: string }> = {
  MISSING: {
    label: "Missing",
    description: "Required by a drive, but not yet verified in your profile.",
  },
  BELOW_LEVEL: {
    label: "Below required level",
    description: "Verified, but below the level a drive asks for.",
  },
  OPTIONAL: {
    label: "Nice to have",
    description: "Only optional requirements ask for more.",
  },
};

export const STATUS_ORDER: SkillGapStatus[] = ["MISSING", "BELOW_LEVEL", "OPTIONAL"];

export interface SkillPrepProgress {
  completed: number;
  inProgress: number;
  total: number;
  /** An active plan holding this skill, to link to. */
  planId?: string;
  /** Recommended actions from the student's own preparation plan. */
  actions: string[];
}

/**
 * Per-skill progress from the student's active preparation plans (the only
 * place progress on a gap is actually recorded).
 */
export function prepProgressBySkill(plans: PreparationPlan[] | undefined) {
  const bySkill = new Map<string, SkillPrepProgress>();
  for (const plan of plans ?? []) {
    if (plan.status !== "ACTIVE") continue;
    for (const item of plan.items) {
      const key = String(item.skillId);
      const entry =
        bySkill.get(key) ?? { completed: 0, inProgress: 0, total: 0, actions: [] };
      entry.total += 1;
      if (item.status === "COMPLETED") entry.completed += 1;
      if (item.status === "IN_PROGRESS") entry.inProgress += 1;
      entry.planId ??= plan.id;
      for (const action of item.recommendedActions ?? []) {
        if (!entry.actions.includes(action)) entry.actions.push(action);
      }
      bySkill.set(key, entry);
    }
  }
  return bySkill;
}

export function levelLabel(level?: number) {
  return level == null ? "Not verified" : `Level ${level}`;
}
