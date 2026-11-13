"use client";

import * as React from "react";
import { AlertTriangle, Copy, ScanText } from "lucide-react";
import { toast } from "sonner";
import type {
  EvidenceExtractionSummary,
  ExtractionMethod,
  ExtractionStatus,
  VerificationRecord,
} from "@placecampus/shared-types";
import { cn } from "@/lib/utils";

const METHOD_LABELS: Record<ExtractionMethod | "IMAGE_OCR", string> = {
  PDF_TEXT: "PDF text",
  OCR: "OCR",
  MIXED: "PDF text + OCR",
  IMAGE_OCR: "OCR",
  NONE: "None",
};

export function extractionMethodLabel(method?: string | null) {
  return method ? (METHOD_LABELS[method as ExtractionMethod] ?? method) : "None";
}

const STATUS_STYLES: Record<ExtractionStatus, string> = {
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  PARTIAL: "bg-amber-50 text-amber-700 ring-amber-200",
  FAILED: "bg-rose-50 text-rose-700 ring-rose-200",
};

export function ExtractionStatusBadge({ status }: { status?: ExtractionStatus | null }) {
  if (!status) return null;
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ring-1", STATUS_STYLES[status])}>
      {status.toLowerCase()}
    </span>
  );
}

export function ocrConfidenceClass(confidence: number) {
  if (confidence >= 80) return "text-emerald-600";
  if (confidence >= 60) return "text-amber-600";
  return "text-rose-600";
}

const SOURCE_LABELS = { TEXT_LAYER: "Text layer", OCR: "OCR", NONE: "Not read" } as const;

/** Reviewer panel: how the text was obtained, per-page detail, duplicates and the text itself. */
export function ExtractionPanel({
  extraction,
  duplicates,
}: {
  extraction: EvidenceExtractionSummary | null | undefined;
  duplicates?: VerificationRecord["duplicateMatches"];
}) {
  const [expanded, setExpanded] = React.useState(false);

  if (!extraction) return null;
  const hasText = extraction.text.trim().length > 0;
  const long = extraction.text.length > 1200;

  return (
    <section className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[hsl(var(--border))] bg-slate-50/60 p-4">
        <h3 className="flex items-center gap-2 font-semibold text-heading">
          <ScanText className="h-5 w-5 text-[hsl(var(--primary))]" aria-hidden="true" />
          Extracted Text
        </h3>
        <ExtractionStatusBadge status={extraction.status} />
      </div>

      <div className="space-y-4 p-5">
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="mb-1 text-[hsl(var(--muted-foreground))]">Method</dt>
            <dd className="font-medium">{extractionMethodLabel(extraction.method)}</dd>
          </div>
          <div>
            <dt className="mb-1 text-[hsl(var(--muted-foreground))]">OCR confidence</dt>
            <dd className={cn("font-medium", extraction.ocrConfidence !== null && ocrConfidenceClass(extraction.ocrConfidence))}>
              {extraction.ocrConfidence === null ? "Not used" : `${Math.round(extraction.ocrConfidence)}%`}
            </dd>
          </div>
          <div>
            <dt className="mb-1 text-[hsl(var(--muted-foreground))]">Pages</dt>
            <dd className="font-medium">{extraction.pageCount}</dd>
          </div>
          <div>
            <dt className="mb-1 text-[hsl(var(--muted-foreground))]">Words</dt>
            <dd className="font-medium">{extraction.wordCount}</dd>
          </div>
        </dl>

        {duplicates && duplicates.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-orange-50 p-3 text-sm text-orange-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" aria-hidden="true" />
            <div>
              <p className="font-semibold">Possible duplicate submission</p>
              <ul className="mt-1 space-y-0.5">
                {duplicates.map((d) => (
                  <li key={d.evidenceId}>
                    {d.matchType === "FILE" ? "Identical file" : "Matching text"} already submitted{" "}
                    {d.sameStudent ? "by this student" : "by another student"}{" "}
                    <span className="font-mono text-xs text-orange-700/80">({d.evidenceId.slice(-6)})</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {extraction.error && (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{extraction.error}</p>
        )}

        {extraction.pageCount > 1 && (
          <ul className="flex flex-wrap gap-1.5 text-xs">
            {extraction.pages.map((p) => (
              <li key={p.page} className="rounded-md bg-slate-100 px-2 py-1 text-slate-600" title={p.error}>
                Page {p.page}: {SOURCE_LABELS[p.source]}
                {p.ocrConfidence !== undefined && ` · ${Math.round(p.ocrConfidence)}%`}
                {p.error && " ⚠"}
              </li>
            ))}
          </ul>
        )}

        {hasText ? (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Text</p>
              <button
                type="button"
                onClick={() =>
                  navigator.clipboard
                    .writeText(extraction.text)
                    .then(() => toast.success("Extracted text copied."))
                    .catch(() => toast.error("Couldn't copy the text."))
                }
                className="inline-flex items-center gap-1 text-xs font-semibold text-[hsl(var(--primary))] hover:underline"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copy
              </button>
            </div>
            <pre
              className={cn(
                "whitespace-pre-wrap break-words rounded-lg border border-slate-100 bg-slate-50 p-3 font-sans text-sm leading-6 text-slate-700",
                !expanded && long && "max-h-64 overflow-hidden",
              )}
            >
              {extraction.text}
            </pre>
            {long && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-2 text-sm font-semibold text-[hsl(var(--primary))] hover:underline"
              >
                {expanded ? "Show less" : "Show full text"}
              </button>
            )}
            {extraction.textTruncated && (
              <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                Only the first {extraction.text.length.toLocaleString()} characters are stored. Open the original for the rest.
              </p>
            )}
          </div>
        ) : (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-[hsl(var(--muted-foreground))]">
            No text could be read from this document. Inspect the original file.
          </p>
        )}
      </div>
    </section>
  );
}
