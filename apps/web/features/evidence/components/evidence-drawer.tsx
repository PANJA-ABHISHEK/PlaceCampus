"use client";

import * as React from "react";
import Link from "next/link";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Building2,
  CalendarCheck,
  CalendarDays,
  ExternalLink,
  FileText,
  ImageIcon,
  Loader2,
  PanelRightOpen,
  Pencil,
  Send,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { EvidenceItem } from "@placecampus/shared-types";
import { cn, isHttpUrl } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  openEvidenceDocument,
  useEvidence,
  useEvidenceDocumentBlob,
} from "../hooks/use-evidence";
import {
  TYPE_META,
  canModifyEvidence,
  formatEvidenceDate,
  getStatusBadge,
  getStatusGroup,
} from "../lib/evidence-meta";
import { EvidenceStatusBadge } from "./evidence-portfolio-card";
import { VerificationRecordSection } from "./evidence-detail";
import { getObjectUrl } from "@/lib/object-url";
import { toast } from "sonner";

function DocumentPreview({ evidence }: { evidence: EvidenceItem }) {
  const doc = evidence.document!;
  const isImage = doc.mimeType.startsWith("image/");
  const isPdf = doc.mimeType === "application/pdf";
  const { data: blob, isLoading, isError } = useEvidenceDocumentBlob(
    evidence.id,
    isImage || isPdf,
  );
  const url = getObjectUrl(blob);
  const [opening, setOpening] = React.useState(false);

  const open = async () => {
    setOpening(true);
    try {
      await openEvidenceDocument(evidence.id);
    } catch {
      toast.error("Couldn't open the document");
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border)/0.8)]">
      <div className="flex items-center gap-3 bg-[hsl(var(--muted)/0.35)] p-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[hsl(var(--primary))] shadow-[var(--shadow-xs)]">
          {isImage ? (
            <ImageIcon className="h-5 w-5" aria-hidden="true" />
          ) : (
            <FileText className="h-5 w-5" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[hsl(var(--foreground))]">
            {doc.originalName}
          </p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {(doc.size / 1024 / 1024).toFixed(2)} MB ·{" "}
            {doc.mimeType.split("/")[1]?.toUpperCase()}
          </p>
        </div>
        <button
          type="button"
          onClick={open}
          disabled={opening}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-white px-3 text-sm font-semibold text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--primary)/0.4)] hover:text-[hsl(var(--primary))] disabled:opacity-60"
        >
          {opening ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          )}
          Open
        </button>
      </div>
      {(isImage || isPdf) && (
        <div className="border-t border-[hsl(var(--border)/0.7)] bg-[hsl(var(--muted)/0.2)]">
          {isLoading ? (
            <Skeleton className="m-3 h-56 rounded-xl" />
          ) : isError || !url ? (
            <p className="p-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
              Preview unavailable. Use Open to view the document.
            </p>
          ) : isImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob URL, not optimisable
            <img
              src={url}
              alt={`Preview of ${doc.originalName}`}
              className="max-h-80 w-full object-contain"
            />
          ) : (
            <iframe
              src={url}
              title={`Preview of ${doc.originalName}`}
              className="h-80 w-full"
            />
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--muted)/0.6)] text-[hsl(var(--foreground)/0.7)]">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-[hsl(var(--muted-foreground))]">{label}</dt>
        <dd className="mt-0.5 break-words text-sm font-medium text-[hsl(var(--foreground))]">
          {value}
        </dd>
      </div>
    </div>
  );
}

export function EvidenceDrawer({
  evidence: initial,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  evidence: EvidenceItem | null;
  onOpenChange: (open: boolean) => void;
  onEdit: (evidence: EvidenceItem) => void;
  onDelete: (evidence: EvidenceItem) => void;
}) {
  // Fresh copy (polls while PROCESSING); fall back to the list item instantly.
  const { data } = useEvidence(initial?.id ?? "");
  const evidence = data && data.id === initial?.id ? data : initial;

  return (
    <DialogPrimitive.Root open={!!initial} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="pc-overlay fixed inset-0 z-[var(--z-overlay)] bg-[hsl(var(--color-navy-dark)/0.35)] backdrop-blur-[2px]" />
        <DialogPrimitive.Content className="pc-modal fixed left-1/2 top-1/2 z-[var(--z-modal)] flex max-h-[min(880px,calc(100dvh-2rem))] w-[calc(100vw-2rem)] max-w-[46rem] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-2xl)] focus:outline-none sm:max-h-[min(880px,calc(100dvh-4rem))]">
          {evidence && (
            <DrawerBody
              evidence={evidence}
              onEdit={() => onEdit(evidence)}
              onDelete={() => onDelete(evidence)}
            />
          )}
          <DialogPrimitive.Close
            aria-label="Close details"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function DrawerBody({
  evidence,
  onEdit,
  onDelete,
}: {
  evidence: EvidenceItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const type = TYPE_META[evidence.type] ?? TYPE_META.OTHER;
  const TypeIcon = type.icon;
  const status = getStatusBadge(evidence.status);
  const group = getStatusGroup(evidence.status);
  const editable = canModifyEvidence(evidence.status);

  return (
    <>
      <div className="border-b border-[hsl(var(--border)/0.7)] bg-gradient-to-br from-white to-[hsl(var(--color-primary-50))] px-6 pb-5 pt-6">
        <div className="flex items-start gap-4 pr-10">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]">
            <TypeIcon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <DialogPrimitive.Title className="text-xl font-bold leading-snug text-[hsl(var(--foreground))]">
              {evidence.title}
            </DialogPrimitive.Title>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-[hsl(var(--primary)/0.08)] px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-[hsl(var(--color-primary-700))]">
                {type.label}
              </span>
              <EvidenceStatusBadge status={evidence.status} />
            </div>
          </div>
        </div>
        <DialogPrimitive.Description
          className={cn(
            "mt-4 flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm",
            group === "VERIFIED" && "bg-emerald-50 text-emerald-800",
            group === "PENDING" && "bg-amber-50 text-amber-800",
            group === "NEEDS_ACTION" && "bg-red-50 text-red-800",
          )}
        >
          {group === "VERIFIED" ? (
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span>
            {status.description}
            {evidence.rejectionReason && (
              <span className="mt-1 block font-semibold">
                Feedback: {evidence.rejectionReason}
              </span>
            )}
          </span>
        </DialogPrimitive.Description>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DetailRow
            icon={Building2}
            label="Issuer / Organization"
            value={evidence.issuer || "Not provided"}
          />
          <DetailRow
            icon={CalendarDays}
            label="Issued / completed"
            value={
              formatEvidenceDate(evidence.issuedDate, "d MMM yyyy") ??
              "Not provided"
            }
          />
          <DetailRow
            icon={Send}
            label="Submitted"
            value={formatEvidenceDate(evidence.createdAt, "d MMM yyyy, h:mm a")}
          />
          {evidence.verifiedAt && (
            <DetailRow
              icon={CalendarCheck}
              label="Verified"
              value={formatEvidenceDate(evidence.verifiedAt, "d MMM yyyy")}
            />
          )}
        </dl>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">
            Description
          </h3>
          <p
            className={cn(
              "whitespace-pre-wrap text-sm leading-relaxed",
              evidence.description
                ? "text-[hsl(var(--foreground)/0.8)]"
                : "italic text-[hsl(var(--muted-foreground))]",
            )}
          >
            {evidence.description || "No description added."}
          </p>
        </section>

        {evidence.externalUrl && isHttpUrl(evidence.externalUrl) && (
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">
              Supporting link
            </h3>
            <a
              href={evidence.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-2 break-all text-sm font-medium text-[hsl(var(--primary))] hover:underline"
            >
              {evidence.externalUrl}
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
            </a>
          </section>
        )}

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">
            Supporting document
          </h3>
          {evidence.document ? (
            <DocumentPreview evidence={evidence} />
          ) : (
            <p className="rounded-xl border border-dashed border-[hsl(var(--border))] px-4 py-5 text-center text-sm text-[hsl(var(--muted-foreground))]">
              No document attached
              {editable && ". Add one with Edit to start verification."}
            </p>
          )}
        </section>

        {/* Records only exist once a document has been submitted. */}
        {evidence.document && (
          <VerificationRecordSection evidenceId={evidence.id} />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[hsl(var(--border)/0.7)] bg-[hsl(var(--muted)/0.25)] px-6 py-4">
        <Link
          href={`/student/evidence/${evidence.id}`}
          className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[hsl(var(--foreground)/0.8)] transition-colors hover:bg-white"
        >
          <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
          Full page
        </Link>
        {editable && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 text-sm font-semibold text-white transition-colors hover:bg-[hsl(var(--color-primary-600))]"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </button>
          </div>
        )}
      </div>
    </>
  );
}
