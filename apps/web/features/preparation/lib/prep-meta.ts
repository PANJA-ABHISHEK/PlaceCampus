import {
  CircleCheck,
  CircleDashed,
  CircleSlash,
  Loader,
  type LucideIcon,
} from "lucide-react";
import type {
  GapPriority,
  PlacementDrive,
  PreparationItem,
  PreparationItemStatus,
  PreparationPlan,
  PreparationPlanStatus,
} from "@placecampus/shared-types";

export const PLAN_STATUS_META: Record<
  PreparationPlanStatus,
  { label: string; badge: string; dot: string }
> = {
  ACTIVE: { label: "Active", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  COMPLETED: { label: "Completed", badge: "bg-blue-50 text-blue-700 ring-blue-200", dot: "bg-blue-500" },
  ARCHIVED: { label: "Archived", badge: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400" },
};

export const ITEM_STATUS_META: Record<
  PreparationItemStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  TODO: { label: "Pending", icon: CircleDashed, className: "bg-amber-50 text-amber-800 ring-amber-200" },
  IN_PROGRESS: { label: "In Progress", icon: Loader, className: "bg-blue-50 text-blue-700 ring-blue-200" },
  COMPLETED: { label: "Completed", icon: CircleCheck, className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  SKIPPED: { label: "Skipped", icon: CircleSlash, className: "bg-slate-100 text-slate-600 ring-slate-200" },
};

export const ITEM_STATUS_ORDER: PreparationItemStatus[] = [
  "TODO",
  "IN_PROGRESS",
  "COMPLETED",
  "SKIPPED",
];

export const PRIORITY_META: Record<GapPriority, { label: string; className: string }> = {
  HIGH: { label: "High priority", className: "bg-red-50 text-red-700 ring-red-200" },
  MEDIUM: { label: "Medium priority", className: "bg-amber-50 text-amber-800 ring-amber-200" },
  LOW: { label: "Low priority", className: "bg-slate-100 text-slate-600 ring-slate-200" },
};

const PRIORITY_RANK: Record<GapPriority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

/** Pending first, then by the engine's priority order. */
export function sortItemsForAction<T extends PreparationItem>(items: T[]): T[] {
  const done = (s: PreparationItemStatus) => s === "COMPLETED" || s === "SKIPPED";
  return [...items].sort(
    (a, b) =>
      Number(done(a.status)) - Number(done(b.status)) ||
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
  );
}

export function planCounts(plan: Pick<PreparationPlan, "items">) {
  const total = plan.items.length;
  const completed = plan.items.filter((i) => i.status === "COMPLETED").length;
  const skipped = plan.items.filter((i) => i.status === "SKIPPED").length;
  return { total, completed, skipped, pending: total - completed - skipped };
}

/** Plans only store a driveId; names come from the published drive. */
export function planTitle(drive?: PlacementDrive) {
  return drive ? `${drive.companyName} – ${drive.roleTitle}` : "Preparation Plan";
}

export function shortDriveId(driveId: string) {
  return driveId.slice(-6).toUpperCase();
}
