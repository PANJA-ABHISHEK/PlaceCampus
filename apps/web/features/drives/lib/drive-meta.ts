import type {
  EligibilityCheckResult,
  EligibilityResult,
  PlacementDrive,
} from "@placecampus/shared-types";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Mirrors getApplicationWindow in the API: dates are picked as calendar days
 * and stored as UTC midnight, so a date-only deadline is open all that day.
 */
export function getApplicationWindow(
  drive: Pick<PlacementDrive, "applicationStart" | "applicationDeadline">,
) {
  const toMs = (value?: string) => {
    if (!value) return null;
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? null : ms;
  };
  const opensAt = toMs(drive.applicationStart);
  const deadline = toMs(drive.applicationDeadline);
  const closesAt =
    deadline === null ? null : deadline % DAY_MS === 0 ? deadline + DAY_MS - 1 : deadline;
  return { opensAt, closesAt };
}

export type WindowState = "OPEN" | "CLOSING_SOON" | "CLOSED" | "NOT_OPEN";

/** Deadlines within this many days are highlighted and counted as upcoming. */
export const UPCOMING_DAYS = 7;

export function getWindowState(drive: PlacementDrive, now: number): WindowState {
  const { opensAt, closesAt } = getApplicationWindow(drive);
  if (opensAt !== null && now < opensAt) return "NOT_OPEN";
  if (closesAt !== null && now > closesAt) return "CLOSED";
  if (closesAt !== null && closesAt - now <= 3 * DAY_MS) return "CLOSING_SOON";
  return "OPEN";
}

export function hasUpcomingDeadline(drive: PlacementDrive, now: number) {
  const { closesAt } = getApplicationWindow(drive);
  return closesAt !== null && closesAt >= now && closesAt - now <= UPCOMING_DAYS * DAY_MS;
}

/* ---------------------------------------------------------------------------
 * Eligibility — derived from the engine's result, never recalculated here.
 * The engine marks a student ineligible both when a requirement fails and
 * when required data is missing; the checks say which it was.
 * ------------------------------------------------------------------------- */

export type EligibilityState =
  | "ELIGIBLE"
  | "NOT_ELIGIBLE"
  | "MISSING_INFO"
  | "CHECKING"
  | "UNAVAILABLE";

export function getEligibilityState(
  result: EligibilityResult | undefined,
  isLoading: boolean,
): EligibilityState {
  if (isLoading) return "CHECKING";
  if (!result) return "UNAVAILABLE";
  if (result.eligible) return "ELIGIBLE";
  return result.checks.some((c) => c.result === "FAIL")
    ? "NOT_ELIGIBLE"
    : "MISSING_INFO";
}

export const ELIGIBILITY_META: Record<
  EligibilityState,
  { label: string; badge: string; panel: string; dot: string }
> = {
  ELIGIBLE: {
    label: "Eligible",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    panel: "bg-emerald-50/80 text-emerald-900 ring-emerald-100",
    dot: "bg-emerald-500",
  },
  NOT_ELIGIBLE: {
    label: "Not Eligible",
    badge: "bg-red-50 text-red-700 ring-red-200",
    panel: "bg-red-50/80 text-red-900 ring-red-100",
    dot: "bg-red-500",
  },
  MISSING_INFO: {
    label: "Missing Information",
    badge: "bg-amber-50 text-amber-800 ring-amber-200",
    panel: "bg-amber-50/80 text-amber-900 ring-amber-100",
    dot: "bg-amber-500",
  },
  CHECKING: {
    label: "Checking…",
    badge: "bg-slate-100 text-slate-600 ring-slate-200",
    panel: "bg-slate-50 text-slate-700 ring-slate-100",
    dot: "bg-slate-400",
  },
  UNAVAILABLE: {
    label: "Unavailable",
    badge: "bg-slate-100 text-slate-600 ring-slate-200",
    panel: "bg-slate-50 text-slate-700 ring-slate-100",
    dot: "bg-slate-400",
  },
};

export const CHECK_LABEL: Record<EligibilityCheckResult["type"], string> = {
  CGPA: "Minimum CGPA",
  BACKLOGS: "Maximum active backlogs",
  GRADUATION_YEAR: "Graduation year",
  DEPARTMENT: "Allowed departments",
  SKILL: "Skill",
};

export function formatRequirement(check: EligibilityCheckResult) {
  if (check.type === "SKILL") return check.requiredLevel != null ? `Level ${check.requiredLevel}` : "Required";
  const value = check.requirement;
  if (Array.isArray(value)) return value.join(", ");
  return value == null || value === "" ? "—" : String(value);
}

export function formatActual(check: EligibilityCheckResult) {
  if (check.type === "SKILL") return check.actualLevel != null ? `Level ${check.actualLevel}` : "Not verified";
  if (check.result === "MISSING_DATA") return "Not on record";
  return check.actual == null || check.actual === "" ? "—" : String(check.actual);
}

/** One-line explanation for the card, built from the engine's checks. */
export function summarizeEligibility(
  state: EligibilityState,
  result: EligibilityResult | undefined,
  skillName: (id?: string) => string,
) {
  if (state === "ELIGIBLE") return "You meet this drive's academic and skill requirements.";
  if (state === "CHECKING") return "Checking your profile against this drive…";
  if (state === "UNAVAILABLE" || !result) return "Eligibility couldn't be checked right now.";
  if (state === "NOT_ELIGIBLE") {
    const fail = result.checks.find((c) => c.result === "FAIL")!;
    if (fail.type === "SKILL") return `${skillName(fail.skill)} at Level ${fail.requiredLevel} is required and not verified yet.`;
    if (fail.type === "CGPA") return `Minimum CGPA of ${fail.requirement} is required (yours: ${fail.actual}).`;
    if (fail.type === "BACKLOGS") return `At most ${fail.requirement} active backlogs allowed (yours: ${fail.actual}).`;
    if (fail.type === "GRADUATION_YEAR") return `For the ${fail.requirement} graduating batch (yours: ${fail.actual}).`;
    if (fail.type === "DEPARTMENT") return "Your department isn't in the allowed list.";
    return fail.reason ?? "A requirement isn't met.";
  }
  const noun: Record<EligibilityCheckResult["type"], string> = {
    CGPA: "CGPA",
    BACKLOGS: "backlog count",
    GRADUATION_YEAR: "graduation year",
    DEPARTMENT: "department",
    SKILL: "skills",
  };
  const missing = result.checks
    .filter((c) => c.result === "MISSING_DATA" && c.type !== "SKILL")
    .map((c) => noun[c.type]);
  return missing.length
    ? `Your ${missing.join(", ")} ${missing.length === 1 ? "isn't" : "aren't"} on record yet.`
    : "Some required information is missing from your profile.";
}

/* ---------------------------------------------------------------------------
 * Company initials (no logo assets exist for drives)
 * ------------------------------------------------------------------------- */

const INITIAL_TONES = [
  "bg-orange-50 text-orange-700 ring-orange-100",
  "bg-blue-50 text-blue-700 ring-blue-100",
  "bg-emerald-50 text-emerald-700 ring-emerald-100",
  "bg-violet-50 text-violet-700 ring-violet-100",
  "bg-rose-50 text-rose-700 ring-rose-100",
  "bg-sky-50 text-sky-700 ring-sky-100",
];

export function companyInitials(name: string) {
  // Ignore punctuation-only tokens like "[TEST]" brackets or "&".
  const words = name
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? words[0]?.[1] ?? "")).toUpperCase() || "?";
}

export function companyTone(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return INITIAL_TONES[hash % INITIAL_TONES.length];
}
