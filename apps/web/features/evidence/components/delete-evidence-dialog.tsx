"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Loader2, Trash2 } from "lucide-react";
import { EvidenceItem } from "@placecampus/shared-types";

export function DeleteEvidenceDialog({
  evidence,
  isDeleting,
  onConfirm,
  onOpenChange,
}: {
  evidence: EvidenceItem | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <DialogPrimitive.Root
      open={!!evidence}
      onOpenChange={(open) => !isDeleting && onOpenChange(open)}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="pc-overlay fixed inset-0 z-[var(--z-overlay)] bg-[hsl(var(--color-navy-dark)/0.45)] backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          role="alertdialog"
          className="pc-modal fixed left-1/2 top-1/2 z-[var(--z-modal)] w-[calc(100vw-2rem)] max-w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-[var(--shadow-2xl)] focus:outline-none"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <Trash2 className="h-6 w-6" aria-hidden="true" />
          </span>
          <DialogPrimitive.Title className="mt-4 text-lg font-bold text-[hsl(var(--foreground))]">
            Delete this evidence?
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1.5 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
            <strong className="text-[hsl(var(--foreground))]">
              {evidence?.title}
            </strong>{" "}
            and its document will be permanently removed. This can&apos;t be
            undone.
          </DialogPrimitive.Description>
          <div className="mt-6 flex justify-end gap-2">
            <DialogPrimitive.Close
              disabled={isDeleting}
              className="inline-flex h-10 items-center rounded-xl border border-[hsl(var(--border))] bg-white px-4 text-sm font-semibold text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))] disabled:opacity-50"
            >
              Cancel
            </DialogPrimitive.Close>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="inline-flex h-10 min-w-[110px] items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
            >
              {isDeleting && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Delete
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
