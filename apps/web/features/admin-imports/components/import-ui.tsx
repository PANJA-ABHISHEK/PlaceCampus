import { cn } from "@/lib/utils";
import type { ImportStatus, RowAction } from "../hooks/use-imports";

export const adminCard =
  "rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-18px_rgba(15,23,42,0.18)]";

const STATUS_STYLE: Record<ImportStatus, string> = {
  UPLOADED: "bg-slate-100 text-slate-700 ring-slate-200",
  VALIDATING: "bg-blue-50 text-blue-700 ring-blue-200",
  VALIDATION_FAILED: "bg-red-50 text-red-700 ring-red-200",
  AWAITING_CONFIRMATION: "bg-amber-50 text-amber-800 ring-amber-200",
  COMMITTING: "bg-blue-50 text-blue-700 ring-blue-200",
  COMMITTED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  PARTIALLY_COMMITTED: "bg-amber-50 text-amber-800 ring-amber-200",
  COMMIT_FAILED: "bg-red-50 text-red-700 ring-red-200",
  CANCELLED: "bg-slate-100 text-slate-600 ring-slate-200",
  EXPIRED: "bg-slate-100 text-slate-600 ring-slate-200",
  REVERTING: "bg-blue-50 text-blue-700 ring-blue-200",
  REVERTED: "bg-slate-100 text-slate-700 ring-slate-200",
  REVERT_PARTIAL: "bg-amber-50 text-amber-800 ring-amber-200",
};

export function StatusBadge({ status }: { status: ImportStatus }) {
  return (
    <span className={cn("inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ring-1", STATUS_STYLE[status])}>
      {status.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
    </span>
  );
}

export const ACTION_META: Record<RowAction, { label: string; className: string }> = {
  CREATE: { label: "Create", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  UPDATE: { label: "Update", className: "bg-blue-50 text-blue-700 ring-blue-200" },
  UNCHANGED: { label: "Unchanged", className: "bg-slate-100 text-slate-600 ring-slate-200" },
  SKIP_EXISTING: { label: "Existing (skipped)", className: "bg-slate-100 text-slate-700 ring-slate-200" },
  INVALID: { label: "Invalid", className: "bg-red-50 text-red-700 ring-red-200" },
  DUPLICATE_IN_FILE: { label: "Duplicate in file", className: "bg-red-50 text-red-700 ring-red-200" },
  SKIPPED_IDENTICAL: { label: "Identical (skipped)", className: "bg-slate-100 text-slate-600 ring-slate-200" },
  CONFLICT: { label: "Conflict", className: "bg-red-50 text-red-700 ring-red-200" },
};

export function DemoBadge() {
  return <span className="inline-flex rounded-md bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700 ring-1 ring-violet-200">Demo data</span>;
}

export function Stat({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3">
      <p className={cn("text-2xl font-extrabold tabular-nums text-[#0B1F44]", tone)}>{value}</p>
      <p className="text-xs font-medium text-[#64748B]">{label}</p>
    </div>
  );
}
