import {
  CalendarClock,
  CircleCheck,
  CircleSlash,
  Radio,
  UserX,
  type LucideIcon,
} from "lucide-react";
import type {
  InterviewRubric,
  MockInterview,
  MockInterviewStatus,
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
