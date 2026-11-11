import * as React from "react";
import { CircleCheck, CircleSlash, FilePenLine, Lock } from "lucide-react";
import { DriveStatus } from "@placecampus/shared-types";
import { cn } from "@/lib/utils";

/**
 * Shared visual language for the Placement Officer drive pages
 * (create, view, edit): status colours, card shell and card headings.
 */

export const driveCardClassName =
  "rounded-[18px] border border-[#E7EBF0] bg-white shadow-[0_6px_24px_-14px_rgba(16,38,74,0.14)]";

export const STATUS_META: Record<
  DriveStatus,
  { label: string; badge: string; icon: React.ElementType; panel: string }
> = {
  [DriveStatus.DRAFT]: {
    label: "Draft",
    badge: "border-amber-200 bg-amber-50 text-amber-800",
    icon: FilePenLine,
    panel: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  [DriveStatus.PUBLISHED]: {
    label: "Open",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: CircleCheck,
    panel: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  [DriveStatus.CLOSED]: {
    label: "Closed",
    badge: "border-slate-300 bg-slate-100 text-slate-700",
    icon: Lock,
    panel: "bg-slate-100 text-slate-700 ring-slate-200",
  },
  [DriveStatus.CANCELLED]: {
    label: "Cancelled",
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    icon: CircleSlash,
    panel: "bg-rose-50 text-rose-700 ring-rose-200",
  },
};

export function DriveStatusBadge({ status, className }: { status: DriveStatus; className?: string }) {
  const meta = STATUS_META[status] ?? STATUS_META[DriveStatus.DRAFT];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
        meta.badge,
        className,
      )}
    >
      <meta.icon className="h-3.5 w-3.5" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export function DriveCardTitle({
  icon: Icon,
  title,
  description,
  action,
  as: Heading = "h2",
  id,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  as?: "h2" | "h3";
  id?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF1E8] text-[#FF6500] ring-1 ring-[#FFE0CC]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <Heading id={id} className="text-base font-bold text-[#10264A] sm:text-lg">{title}</Heading>
        {description && <p className="mt-0.5 text-xs leading-5 text-slate-500 sm:text-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}
