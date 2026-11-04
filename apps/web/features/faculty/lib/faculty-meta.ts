import type { ReviewState } from "@placecampus/shared-types";

/** Compact badge colours for the interview types the API offers. */
export const INTERVIEW_TYPE_BADGE: Record<string, string> = {
  Technical: "bg-blue-50 text-blue-700 ring-blue-200",
  HR: "bg-violet-50 text-violet-700 ring-violet-200",
  "System Design": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Behavioral: "bg-amber-50 text-amber-800 ring-amber-200",
};

export function interviewTypeBadge(type: string) {
  return INTERVIEW_TYPE_BADGE[type] ?? "bg-slate-100 text-slate-700 ring-slate-200";
}

export const REVIEW_STATE_BADGE: Record<ReviewState, { label: string; className: string }> = {
  ASSIGNED: { label: "Assigned", className: "bg-blue-50 text-blue-700 ring-blue-200" },
  CLAIMED: { label: "Claimed", className: "bg-amber-50 text-amber-800 ring-amber-200" },
};

/** Green for strong readiness, orange while developing, neutral when not calculated yet. */
export function readinessTone(score: number | null) {
  if (score === null) return { bar: "bg-slate-300", text: "text-slate-500" };
  if (score >= 70) return { bar: "bg-emerald-500", text: "text-emerald-700" };
  if (score >= 40) return { bar: "bg-[#FF6B1A]", text: "text-[#C2410C]" };
  return { bar: "bg-red-500", text: "text-red-700" };
}

export function initials(name: string | undefined) {
  return (
    (name ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

/** "Aarav Reddy" -> "Aarav R." for compact rows. */
export function shortName(name: string | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] ?? "Unknown student";
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}
