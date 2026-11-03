import {
  Bell,
  ClipboardCheck,
  FileCheck2,
  ListChecks,
  Send,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { NotificationType } from "@placecampus/shared-types";

export type NotificationCategory =
  | "SKILLS"
  | "ASSESSMENTS"
  | "INTERVIEWS"
  | "APPLICATIONS"
  | "PREPARATION"
  | "SYSTEM";

/** Categories group the notification types the API actually emits. */
export const CATEGORY_META: Record<
  NotificationCategory,
  { label: string; icon: LucideIcon; tile: string; chip: string }
> = {
  SKILLS: { label: "Skills Verification", icon: FileCheck2, tile: "bg-emerald-50 text-emerald-600", chip: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  ASSESSMENTS: { label: "Assessments", icon: ClipboardCheck, tile: "bg-blue-50 text-blue-600", chip: "bg-blue-50 text-blue-700 ring-blue-200" },
  INTERVIEWS: { label: "Interviews", icon: Video, tile: "bg-violet-50 text-violet-600", chip: "bg-violet-50 text-violet-700 ring-violet-200" },
  APPLICATIONS: { label: "Applications", icon: Send, tile: "bg-sky-50 text-sky-600", chip: "bg-sky-50 text-sky-700 ring-sky-200" },
  PREPARATION: { label: "Preparation Plans", icon: ListChecks, tile: "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]", chip: "bg-orange-50 text-orange-700 ring-orange-200" },
  SYSTEM: { label: "System Updates", icon: Bell, tile: "bg-slate-100 text-slate-600", chip: "bg-slate-100 text-slate-700 ring-slate-200" },
};

const TYPE_CATEGORY: Partial<Record<NotificationType, NotificationCategory>> = {
  EVIDENCE_VERIFIED: "SKILLS",
  EVIDENCE_REJECTED: "SKILLS",
  EVIDENCE_RESUBMISSION_REQUESTED: "SKILLS",
  ASSESSMENT_EVALUATED: "ASSESSMENTS",
  INTERVIEW_FEEDBACK: "INTERVIEWS",
  INTERVIEW_SCHEDULED: "INTERVIEWS",
  INTERVIEW_CANCELLED: "INTERVIEWS",
  APPLICATION_SUBMITTED: "APPLICATIONS",
  APPLICATION_STATUS_CHANGED: "APPLICATIONS",
  PREPARATION_PLAN_CREATED: "PREPARATION",
  PREPARATION_PLAN_COMPLETED: "PREPARATION",
};

export function getCategory(type: NotificationType): NotificationCategory {
  return TYPE_CATEGORY[type] ?? "SYSTEM";
}

export const CATEGORY_ORDER: NotificationCategory[] = [
  "SKILLS",
  "ASSESSMENTS",
  "INTERVIEWS",
  "APPLICATIONS",
  "PREPARATION",
  "SYSTEM",
];
