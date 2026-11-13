"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { format } from "date-fns";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DISPLAY_STATUS_META, STATUS_META, type DisplayStatus } from "../lib/interview-meta";

/** "Mon, 10 Nov 2026" and "2:30 PM", in the viewer's local time. */
export function formatDay(iso: string) {
  return format(new Date(iso), "EEE, d MMM yyyy");
}
export function formatTime(iso: string) {
  return format(new Date(iso), "h:mm a");
}

export function InterviewStatusBadge({
  status,
  className,
}: {
  status: DisplayStatus;
  className?: string;
}) {
  const meta =
    status === "WAITING" || status === "PENDING_EVALUATION"
      ? DISPLAY_STATUS_META[status]
      : STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
        meta.className,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export function DialogFrame({
  open,
  onOpenChange,
  locked,
  className,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Block closing while a request is in flight. */
  locked?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => !locked && onOpenChange(next)}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="pc-overlay fixed inset-0 z-[var(--z-overlay)] bg-[hsl(var(--color-navy-dark)/0.45)] backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          className={cn(
            "pc-modal fixed left-1/2 top-1/2 z-[var(--z-modal)] flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-[30rem] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-2xl)] focus:outline-none",
            className,
          )}
        >
          {children}
          <DialogPrimitive.Close
            disabled={locked}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Destructive confirmation with an optional free-text reason. */
export function ReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  reasonLabel = "Reason (optional)",
  isPending,
  onConfirm,
  onOpenChange,
}: {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  reasonLabel?: string;
  isPending: boolean;
  onConfirm: (reason: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = React.useState("");
  return (
    <DialogFrame
      open={open}
      locked={isPending}
      onOpenChange={(next) => {
        if (!next) setReason("");
        onOpenChange(next);
      }}
    >
      <div className="space-y-4 p-6">
        <DialogPrimitive.Title className="pr-8 text-lg font-bold text-[hsl(var(--foreground))]">
          {title}
        </DialogPrimitive.Title>
        <DialogPrimitive.Description className="text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
          {description}
        </DialogPrimitive.Description>
        <div className="space-y-1.5">
          <label
            htmlFor="reason-input"
            className="text-sm font-semibold text-[hsl(var(--foreground))]"
          >
            {reasonLabel}
          </label>
          <textarea
            id="reason-input"
            rows={3}
            maxLength={300}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="w-full resize-none rounded-xl border border-[hsl(var(--input))] px-3.5 py-2.5 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-4 focus:ring-[hsl(var(--primary)/0.12)]"
          />
          <p className="text-right text-xs text-[hsl(var(--muted-foreground))]">
            {reason.length} / 300
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-[hsl(var(--border)/0.7)] bg-[hsl(var(--muted)/0.25)] px-6 py-4">
        <DialogPrimitive.Close
          disabled={isPending}
          className="inline-flex h-10 items-center rounded-xl border border-[hsl(var(--border))] bg-white px-4 text-sm font-semibold transition-colors hover:bg-[hsl(var(--muted))] disabled:opacity-50"
        >
          Keep it
        </DialogPrimitive.Close>
        <button
          type="button"
          onClick={() => onConfirm(reason.trim())}
          disabled={isPending}
          className="inline-flex h-10 min-w-[120px] items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {confirmLabel}
        </button>
      </div>
    </DialogFrame>
  );
}
