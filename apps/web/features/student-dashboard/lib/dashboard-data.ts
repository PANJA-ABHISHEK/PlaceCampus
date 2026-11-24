import type {
  Application,
  AssessmentAttempt,
  EligibilityResult,
  MockInterview,
  PlacementDrive,
  ReadinessSnapshot,
  SkillGapItem,
  StoredResume,
  StudentProfile,
  StudentSkillEntry,
} from "@placecampus/shared-types";
import { getApplicationWindow, getWindowState } from "@/features/drives/lib/drive-meta";

/**
 * Pure derivations for the student Overview. Everything here works from data
 * the existing APIs already return; nothing is invented. Kept free of React
 * so the rules are easy to read and test.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/* ───────────── Readiness trend ───────────── */

/** Change since the previous distinct snapshot, or null when there is no history to compare. */
export function readinessTrend(current: ReadinessSnapshot | undefined, history: ReadinessSnapshot[] | undefined) {
  if (!current || !history?.length) return null;
  const previous = [...history]
    .filter((snap) => snap.id !== current.id && new Date(snap.calculatedAt) < new Date(current.calculatedAt))
    .sort((a, b) => +new Date(b.calculatedAt) - +new Date(a.calculatedAt))[0];
  if (!previous) return null;
  return Math.round(current.overallScore) - Math.round(previous.overallScore);
}

/* ───────────── Applications ───────────── */

const CLOSED_STATUSES = new Set(["WITHDRAWN", "REJECTED"]);
/** Statuses that mean the student made it past the shortlist. */
const SHORTLIST_OR_LATER = new Set(["SHORTLISTED", "INTERVIEW_SCHEDULED", "OFFER_RELEASED", "SELECTED"]);

export function applicationStats(applications: Application[] | undefined) {
  const active = (applications ?? []).filter((a) => !CLOSED_STATUSES.has(a.status));
  return {
    active: active.length,
    shortlisted: active.filter((a) => SHORTLIST_OR_LATER.has(a.status)).length,
  };
}

/* ───────────── Profile completion sections ───────────── */

export interface CompletionSection {
  key: string;
  label: string;
  done: number;
  total: number;
  hint: string;
  href: string;
}

/**
 * Section view of the profile. The headline percentage still comes from
 * getProfileCompletion (shared with the profile page); these rows show what
 * is left, including skills and the resume, which live outside the profile form.
 */
export function profileSections(
  profile: StudentProfile | null | undefined,
  verifiedSkillCount: number,
  resume: StoredResume | null | undefined,
): CompletionSection[] {
  const count = (values: unknown[]) => values.filter((v) => v !== undefined && v !== null && v !== "").length;
  return [
    { key: "basic", label: "Basic information", done: count([profile?.phone, profile?.bio]), total: 2, hint: "Phone number and a short bio", href: "/student/profile" },
    {
      key: "education",
      label: "Education details",
      done: count([profile?.university, profile?.department, profile?.program, profile?.batch, profile?.graduationYear, profile?.cgpa]),
      total: 6,
      hint: "University, department, programme, batch, graduation year and CGPA",
      href: "/student/profile",
    },
    { key: "skills", label: "Verified skills", done: verifiedSkillCount > 0 ? 1 : 0, total: 1, hint: "Add evidence so faculty can verify your skills", href: "/student/evidence" },
    { key: "resume", label: "Resume upload", done: resume ? 1 : 0, total: 1, hint: "Upload your resume in the AI Resume Analyzer", href: "/student/resume-analyzer" },
    {
      key: "links",
      label: "Professional links",
      done: count([profile?.linkedinUrl, profile?.githubUrl, profile?.portfolioUrl]),
      total: 3,
      hint: "LinkedIn, GitHub and portfolio",
      href: "/student/profile",
    },
  ];
}

/* ───────────── Recommended drives ───────────── */

export interface RecommendedDrive {
  drive: PlacementDrive;
  closesAt: number | null;
}

/**
 * Drives the eligibility engine says the student is eligible for, that are
 * open for applications and not yet applied to, soonest deadline first.
 */
export function recommendedDrives(
  drives: PlacementDrive[],
  eligibility: (EligibilityResult | undefined)[],
  applications: Application[] | undefined,
  now: number,
  limit = 3,
): RecommendedDrive[] {
  const applied = new Set((applications ?? []).filter((a) => a.status !== "WITHDRAWN").map((a) => String(a.driveId)));
  return drives
    .map((drive, index) => ({ drive, eligible: eligibility[index]?.eligible === true }))
    .filter(({ drive, eligible }) => {
      const window = getWindowState(drive, now);
      return eligible && (window === "OPEN" || window === "CLOSING_SOON") && !applied.has(drive.id);
    })
    .map(({ drive }) => ({ drive, closesAt: getApplicationWindow(drive).closesAt }))
    .sort((a, b) => (a.closesAt ?? Infinity) - (b.closesAt ?? Infinity))
    .slice(0, limit);
}

/* ───────────── Upcoming events ───────────── */

export type EventKind = "INTERVIEW" | "DRIVE" | "DEADLINE" | "ASSESSMENT";

export interface DashboardEvent {
  id: string;
  kind: EventKind;
  title: string;
  subtitle: string;
  /** ISO date-time the event happens (or, for an assessment in progress, when it started). */
  at: string;
  /** False for date-only values (deadlines), so no time is shown. */
  hasTime: boolean;
  status: { label: string; tone: "info" | "warning" | "success" | "neutral" };
  href: string;
}

export function upcomingEvents(input: {
  interviews: MockInterview[] | undefined;
  applications: Application[] | undefined;
  drives: PlacementDrive[];
  recommended: RecommendedDrive[];
  attempts: AssessmentAttempt[] | undefined;
  now: number;
  limit?: number;
}): DashboardEvent[] {
  const { now } = input;
  const events: DashboardEvent[] = [];
  const driveById = new Map(input.drives.map((d) => [d.id, d]));

  for (const interview of input.interviews ?? []) {
    if (interview.status !== "SCHEDULED" && interview.status !== "IN_PROGRESS") continue;
    // Past the slot (plus a grace period) it is no longer upcoming, even if
    // the record was never closed; it stays visible on the Interviews page.
    const endsAt = new Date(interview.scheduledAt).getTime() + ((interview.durationMinutes ?? 60) + 120) * 60 * 1000;
    if (endsAt < now) continue;
    events.push({
      id: `interview-${interview.id}`,
      kind: "INTERVIEW",
      title: interview.title || `${titleCase(interview.type)} mock interview`,
      subtitle: interview.interviewer?.fullName ? `With ${interview.interviewer.fullName}` : "Mock interview",
      at: interview.scheduledAt,
      hasTime: true,
      status: interview.status === "IN_PROGRESS" ? { label: "Live now", tone: "success" } : { label: "Scheduled", tone: "info" },
      href: "/student/interviews",
    });
  }

  // Drive days for drives the student applied to and is still in.
  for (const app of input.applications ?? []) {
    if (CLOSED_STATUSES.has(app.status)) continue;
    const drive = driveById.get(String(app.driveId));
    if (!drive?.driveDate || new Date(drive.driveDate).getTime() + DAY_MS < now) continue;
    events.push({
      id: `drive-${drive.id}`,
      kind: "DRIVE",
      title: `${drive.companyName} placement drive`,
      subtitle: drive.roleTitle,
      at: drive.driveDate,
      hasTime: false,
      status: { label: titleCase(app.status), tone: SHORTLIST_OR_LATER.has(app.status) ? "success" : "neutral" },
      href: `/student/applications/${app.id}`,
    });
  }

  // Application deadlines for drives recommended to the student.
  for (const { drive, closesAt } of input.recommended) {
    if (closesAt === null || closesAt < now) continue;
    const daysLeft = Math.ceil((closesAt - now) / DAY_MS);
    events.push({
      id: `deadline-${drive.id}`,
      kind: "DEADLINE",
      title: `Apply to ${drive.companyName}`,
      subtitle: `${drive.roleTitle} · application deadline`,
      at: drive.applicationDeadline!,
      hasTime: false,
      status: daysLeft <= 3 ? { label: daysLeft <= 1 ? "Closes today" : `${daysLeft} days left`, tone: "warning" } : { label: "Open", tone: "info" },
      href: `/student/drives/${drive.id}`,
    });
  }

  // Assessments have no schedule; an attempt in progress is the actionable item.
  for (const attempt of input.attempts ?? []) {
    if (attempt.status !== "IN_PROGRESS") continue;
    events.push({
      id: `assessment-${attempt.id}`,
      kind: "ASSESSMENT",
      title: attempt.assessment?.title ?? "Assessment",
      subtitle: "Started, not yet submitted",
      at: attempt.startedAt ?? attempt.createdAt,
      hasTime: true,
      status: { label: "In progress", tone: "warning" },
      href: `/student/assessments/${attempt.assessmentId}/attempt`,
    });
  }

  // In-progress items first, then by date.
  const rank = (e: DashboardEvent) => (e.kind === "ASSESSMENT" || e.status.label === "Live now" ? 0 : 1);
  return events.sort((a, b) => rank(a) - rank(b) || +new Date(a.at) - +new Date(b.at)).slice(0, input.limit ?? 5);
}

/* ───────────── Skills ───────────── */

export function verifiedSkills(skills: StudentSkillEntry[] | undefined) {
  return (skills ?? []).filter((s) => s.verificationStatus === "VERIFIED").sort((a, b) => b.level - a.level || a.canonicalName.localeCompare(b.canonicalName));
}

export function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Gaps for the summary card: optional skills dropped, and entries that share
 * a skill name (different taxonomy ids from different drives) merged into one
 * row keeping the highest requirement. Order follows the API's priority order.
 */
export function topSkillGaps(gaps: SkillGapItem[] | undefined, limit = 5): SkillGapItem[] {
  const byName = new Map<string, SkillGapItem>();
  for (const gap of gaps ?? []) {
    if (gap.status === "OPTIONAL") continue;
    const key = gap.skillName.trim().toLowerCase();
    const existing = byName.get(key);
    if (!existing) byName.set(key, gap);
    else if (gap.requiredLevel > existing.requiredLevel) byName.set(key, { ...gap, priority: existing.priority === "HIGH" ? "HIGH" : gap.priority });
  }
  return [...byName.values()].slice(0, limit);
}
