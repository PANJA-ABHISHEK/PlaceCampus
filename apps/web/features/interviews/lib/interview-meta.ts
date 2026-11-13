import {
  CalendarClock,
  CircleCheck,
  CircleSlash,
  ClipboardList,
  Hourglass,
  Radio,
  UserX,
  type LucideIcon,
} from "lucide-react";
import {
  EVALUATION_CRITERIA,
  type EvaluationCriterion,
  type InterviewAssessment,
  type InterviewRubric,
  type MockInterview,
  type MockInterviewStatus,
} from "@placecampus/shared-types";

const MINUTE = 60_000;

/* Mirrors the API rules in interviews.service.ts. */
export const STUDENT_CANCEL_CUTOFF_MS = 120 * MINUTE;
export const START_WINDOW_MS = 15 * MINUTE;

export const STATUS_META: Record<
  MockInterviewStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  SCHEDULED: {
    label: "Scheduled",
    icon: CalendarClock,
    className: "bg-blue-50 text-blue-700 ring-blue-200",
  },
  IN_PROGRESS: {
    label: "In Progress",
    icon: Radio,
    className: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  COMPLETED: {
    label: "Completed",
    icon: CircleCheck,
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  CANCELLED: {
    label: "Cancelled",
    icon: CircleSlash,
    className: "bg-slate-100 text-slate-600 ring-slate-200",
  },
  NO_SHOW: {
    label: "No-show",
    icon: UserX,
    className: "bg-red-50 text-red-700 ring-red-200",
  },
};

export const RUBRIC_DIMENSIONS: { key: keyof InterviewRubric; label: string }[] = [
  { key: "technicalKnowledge", label: "Technical Knowledge" },
  { key: "problemSolving", label: "Problem Solving" },
  { key: "communication", label: "Communication" },
  { key: "projectDepth", label: "Project Depth" },
];

export function startTime(interview: Pick<MockInterview, "scheduledAt">) {
  return new Date(interview.scheduledAt).getTime();
}

export function endTime(
  interview: Pick<MockInterview, "scheduledAt" | "durationMinutes">,
) {
  return startTime(interview) + (interview.durationMinutes ?? 60) * MINUTE;
}

/** Still ahead or running (not finished, not cancelled). */
export function isUpcoming(interview: MockInterview, now = Date.now()) {
  return (
    (interview.status === "SCHEDULED" || interview.status === "IN_PROGRESS") &&
    endTime(interview) + 30 * MINUTE > now
  );
}

/** The meeting link is useful from 15 minutes before until the slot ends. */
export function canJoin(interview: MockInterview, now = Date.now()) {
  return (
    !!interview.meetingUrl &&
    (interview.status === "SCHEDULED" || interview.status === "IN_PROGRESS") &&
    now >= startTime(interview) - START_WINDOW_MS &&
    now <= endTime(interview) + 30 * MINUTE
  );
}

export function canStudentCancel(interview: MockInterview, now = Date.now()) {
  return (
    interview.status === "SCHEDULED" &&
    startTime(interview) - now >= STUDENT_CANCEL_CUTOFF_MS
  );
}

export function canFacultyStartOrEvaluate(
  interview: MockInterview,
  now = Date.now(),
) {
  return now >= startTime(interview) - START_WINDOW_MS;
}

/** Average of the rubric scores that were given, out of 10. */
export function rubricAverage(rubric: InterviewRubric | undefined) {
  const values = Object.values(rubric ?? {}).filter(
    (v): v is number => typeof v === "number",
  );
  if (!values.length) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

/* ---------------- Directly scheduled interviews and the video room ---------------- */

export const INTERVIEW_TYPE_LABELS: Record<string, string> = {
  Technical: "Technical Interview",
  HR: "HR Interview",
  DSA: "DSA Interview",
  "Project Discussion": "Project Discussion",
  Behavioral: "Behavioral Interview",
  "System Design": "System Design",
};

export const typeLabel = (type: string) => INTERVIEW_TYPE_LABELS[type] ?? type;

export const EVALUATION_LABELS: Record<EvaluationCriterion, string> = {
  technicalKnowledge: "Technical Knowledge",
  problemSolving: "Problem-Solving Ability",
  communication: "Communication Skills",
  conceptualUnderstanding: "Conceptual Understanding",
  confidence: "Confidence and Presentation",
};

export const ASSESSMENT_META: Record<InterviewAssessment, { label: string; className: string }> = {
  EXCELLENT: { label: "Excellent", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  GOOD: { label: "Good", className: "bg-blue-50 text-blue-700 ring-blue-200" },
  AVERAGE: { label: "Average", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  NEEDS_IMPROVEMENT: { label: "Needs Improvement", className: "bg-red-50 text-red-700 ring-red-200" },
};

/** Suggested assessment for an overall 1–5 score (faculty can choose another). */
export function suggestedAssessment(score: number): InterviewAssessment {
  if (score >= 4.5) return "EXCELLENT";
  if (score >= 3.5) return "GOOD";
  if (score >= 2.5) return "AVERAGE";
  return "NEEDS_IMPROVEMENT";
}

/** Same rule as the API: mean of the five criteria, one decimal place. */
export function overallScoreOf(scores: Record<EvaluationCriterion, number>) {
  const sum = EVALUATION_CRITERIA.reduce((total, key) => total + scores[key], 0);
  return Math.round((sum / EVALUATION_CRITERIA.length) * 10) / 10;
}

export type DisplayStatus = MockInterviewStatus | "WAITING" | "PENDING_EVALUATION";

/**
 * Status shown in tables. "Waiting" (student in the waiting room) and "Pending
 * evaluation" (call ended, not scored yet) are derived, not stored.
 */
export function displayStatus(interview: MockInterview, now = Date.now()): DisplayStatus {
  if (interview.status === "IN_PROGRESS" && interview.endedAt) return "PENDING_EVALUATION";
  if (interview.status === "SCHEDULED" && interview.studentWaiting) return "WAITING";
  if (interview.status === "SCHEDULED" && endTime(interview) < now) return "PENDING_EVALUATION";
  return interview.status;
}

export const DISPLAY_STATUS_META: Record<"WAITING" | "PENDING_EVALUATION", { label: string; icon: LucideIcon; className: string }> = {
  WAITING: { label: "Waiting", icon: Hourglass, className: "bg-violet-50 text-violet-700 ring-violet-200" },
  PENDING_EVALUATION: { label: "Pending evaluation", icon: ClipboardList, className: "bg-orange-50 text-orange-700 ring-orange-200" },
};

/** The in-app room opens 15 minutes before the start and closes when the call ends. */
export function canEnterRoom(interview: MockInterview, now = Date.now()) {
  return (
    !!interview.roomId &&
    (interview.status === "SCHEDULED" || interview.status === "IN_PROGRESS") &&
    !interview.endedAt &&
    now >= startTime(interview) - START_WINDOW_MS
  );
}
