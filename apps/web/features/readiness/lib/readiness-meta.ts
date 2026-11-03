import {
  BrainCircuit,
  ClipboardList,
  FolderGit2,
  GraduationCap,
  Video,
  type LucideIcon,
} from "lucide-react";
import type {
  ReadinessFactor,
  ReadinessStatus,
} from "@placecampus/shared-types";

/* ---------------------------------------------------------------------------
 * Thresholds mirror apps/api/src/readiness/readiness.service.ts. The engine is
 * the source of truth; these only drive colours and wording.
 * ------------------------------------------------------------------------- */
export const STRONG_THRESHOLD = 80; // factor listed as a strength
export const WEAK_THRESHOLD = 60; // factor listed as an area to improve

export type FactorKey =
  | "verifiedSkills"
  | "assessments"
  | "academics"
  | "projects"
  | "interviews";

export const FACTOR_META: Record<
  FactorKey,
  {
    label: string;
    icon: LucideIcon;
    /** How the engine turns raw data into a 0–100 score. */
    howScored: string;
    action?: { label: string; href: string; hint: string };
    /** Students can't change this factor themselves. */
    institutionManaged?: boolean;
    missingHint: string;
  }
> = {
  verifiedSkills: {
    label: "Verified Skills",
    icon: BrainCircuit,
    howScored:
      "Average level of your verified skills: Level 1 = 20 up to Level 5 = 100.",
    action: {
      label: "Add Evidence",
      href: "/student/evidence",
      hint: "Submit certifications or project evidence to get skills verified.",
    },
    missingHint: "No verified skills yet.",
  },
  assessments: {
    label: "Assessments",
    icon: ClipboardList,
    howScored: "Average of your best score on each completed assessment.",
    action: {
      label: "Take Assessments",
      href: "/student/assessments",
      hint: "Complete available assessments to validate your knowledge.",
    },
    missingHint: "No completed assessments yet.",
  },
  academics: {
    label: "Academics",
    icon: GraduationCap,
    howScored: "Your CGPA on a 10-point scale, as a percentage.",
    institutionManaged: true,
    missingHint: "Your institution hasn't recorded your CGPA yet.",
  },
  projects: {
    label: "Projects",
    icon: FolderGit2,
    howScored: "Verified project evidence: 1 project = 50, 2 or more = 100.",
    action: {
      label: "Add Projects",
      href: "/student/evidence",
      hint: "Add project evidence with a supporting document to get it verified.",
    },
    missingHint: "No verified projects yet.",
  },
  interviews: {
    label: "Mock Interviews",
    icon: Video,
    howScored: "Average rubric score of your completed mock interviews × 10.",
    action: {
      label: "Book Interview",
      href: "/student/interviews",
      hint: "Book a live mock interview with faculty and get rubric feedback.",
    },
    missingHint: "No completed mock interviews yet.",
  },
};

export const FACTOR_ORDER: FactorKey[] = [
  "verifiedSkills",
  "assessments",
  "academics",
  "projects",
  "interviews",
];

export function isFactorKey(key: string): key is FactorKey {
  return key in FACTOR_META;
}

export type FactorTone = "strong" | "developing" | "weak" | "missing";

export function factorTone(factor: Pick<ReadinessFactor, "score" | "coverage">): FactorTone {
  if (!factor.coverage) return "missing";
  if (factor.score >= STRONG_THRESHOLD) return "strong";
  if (factor.score >= WEAK_THRESHOLD) return "developing";
  return "weak";
}

export const TONE_META: Record<
  FactorTone,
  { label: string; bar: string; badge: string; text: string }
> = {
  strong: {
    label: "Strong",
    bar: "from-emerald-500 to-emerald-400",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    text: "text-emerald-700",
  },
  developing: {
    label: "Developing",
    bar: "from-[hsl(var(--primary))] to-[hsl(var(--color-primary-light))]",
    badge: "bg-orange-50 text-orange-700 ring-orange-200",
    text: "text-[hsl(var(--color-primary-700))]",
  },
  weak: {
    label: "Needs work",
    bar: "from-amber-500 to-amber-400",
    badge: "bg-amber-50 text-amber-800 ring-amber-200",
    text: "text-amber-700",
  },
  missing: {
    label: "No data",
    bar: "from-slate-300 to-slate-300",
    badge: "bg-slate-100 text-slate-600 ring-slate-200",
    text: "text-[hsl(var(--muted-foreground))]",
  },
};

export const STATUS_META: Record<
  ReadinessStatus,
  { label: string; badge: string; ring: string; message: string }
> = {
  READY: {
    label: "Placement Ready",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    ring: "stroke-emerald-500",
    message: "You meet the readiness bar. Keep your evidence and skills current.",
  },
  DEVELOPING: {
    label: "Developing",
    badge: "bg-orange-50 text-orange-700 ring-orange-200",
    ring: "stroke-[hsl(var(--primary))]",
    message: "You're on your way. Strengthen your lower factors to reach 80.",
  },
  NEEDS_PREPARATION: {
    label: "Needs Preparation",
    badge: "bg-amber-50 text-amber-800 ring-amber-200",
    ring: "stroke-[hsl(var(--primary))]",
    message: "Build up your factors below to raise your score towards 60 and beyond.",
  },
};

/**
 * The engine emits fixed strength / improvement phrases. Map them back to
 * their factor so the UI can show the supporting score. Unknown phrases are
 * still shown, just without a score.
 */
export const EXPLANATION_FACTOR: Record<string, FactorKey> = {
  "Strong verified skill profile": "verifiedSkills",
  "Excellent assessment performance": "assessments",
  "Strong interview communication and problem solving": "interviews",
  "Good project evidence": "projects",
  "Verified Skills depth": "verifiedSkills",
  "Assessment performance": "assessments",
  "Mock interview performance": "interviews",
  "Project portfolio depth": "projects",
};

export const formatScore = (value: number) =>
  (Math.round(value * 10) / 10).toFixed(1);
