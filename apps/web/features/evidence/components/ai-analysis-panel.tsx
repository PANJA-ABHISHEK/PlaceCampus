"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, CircleHelp, Sparkles } from "lucide-react";
import type { AiAnalysisSummary } from "@placecampus/shared-types";
import { cn } from "@/lib/utils";

const FIELD_LABELS: Record<string, string> = {
  holderName: "Holder",
  issuerName: "Issuer",
  issuerDomain: "Issuer domain",
  title: "Title",
  issueDate: "Issued",
  expiryDate: "Expires",
  credentialId: "Credential ID",
  verificationUrl: "Verification URL",
  score: "Score",
  scoreMax: "Out of",
  grade: "Grade",
  organisation: "Organisation",
  roleTitle: "Role",
  startDate: "Start",
  endDate: "End",
  semester: "Semester",
  sgpa: "SGPA",
  cgpa: "CGPA",
};

const FLAG_LABELS: Record<string, string> = {
  DATE_IN_FUTURE: "Date in the future",
  ISSUER_UNCLEAR: "Issuer unclear",
  POSSIBLE_EDIT: "Possible edit",
  LOW_QUALITY: "Low-quality text",
  MISSING_KEY_FIELD: "Missing key field",
  CLAIM_NOT_SUPPORTED: "Claim not supported",
  DECLARED_MISMATCH: "Declared details mismatch",
};

const STATUS_COPY: Record<AiAnalysisSummary["status"], string> = {
  SUCCEEDED: "",
  DISABLED: "AI analysis was not used for this document.",
  FAILED: "The AI provider could not be reached. Review without AI findings.",
  INVALID_OUTPUT: "The AI returned an invalid response. Review without AI findings.",
  REFUSED: "The AI declined to analyse this document. Review without AI findings.",
};

const humanise = (value: string) => value.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

/**
 * Reviewer view of the AI document analysis. AI is advisory (Master Plan §12.5):
 * extracted fields are marked confirmed only when found in the document text.
 */
export function AiAnalysisPanel({ analysis }: { analysis: AiAnalysisSummary | null | undefined }) {
  if (!analysis) return null;
  const result = analysis.result;
  const unconfirmed = new Set(analysis.postValidation?.unconfirmedFields ?? []);
  const fields = result ? Object.entries(result.extracted).filter(([, v]) => v) : [];
  const providerLabel = analysis.provider === "none" ? "Not configured" : `${analysis.provider} · ${analysis.model ?? "model"}`;

  return (
    <div className="space-y-4 border-t border-[hsl(var(--border))] pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> AI document analysis
        </p>
        <span className="text-[11px] text-[hsl(var(--muted-foreground))]">{providerLabel}</span>
      </div>

      {!result ? (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-[hsl(var(--muted-foreground))]">
          {analysis.skippedReason || STATUS_COPY[analysis.status]}
        </p>
      ) : (
        <>
          <p className="text-sm leading-6 text-heading">{result.summary}</p>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-[hsl(var(--muted-foreground))]">Document type</dt>
              <dd className="font-medium">{humanise(result.documentType)}</dd>
            </div>
            <div>
              <dt className="text-[hsl(var(--muted-foreground))]">Readability</dt>
              <dd className={cn("font-medium", result.readability === "POOR" && "text-rose-600", result.readability === "FAIR" && "text-amber-600")}>
                {humanise(result.readability)}
              </dd>
            </div>
          </dl>

          {result.consistencyFlags.length > 0 && (
            <ul className="space-y-1.5">
              {result.consistencyFlags.map((flag, i) => (
                <li key={i} className="flex items-start gap-2 rounded-md bg-orange-50 p-2 text-sm text-orange-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" aria-hidden="true" />
                  <span>
                    <span className="font-semibold">{FLAG_LABELS[flag.code] ?? humanise(flag.code)}</span>
                    {flag.detail && <span className="block text-xs text-orange-700/90">{flag.detail}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {fields.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Extracted details</p>
              <ul className="divide-y divide-[hsl(var(--border))] text-sm">
                {fields.map(([field, value]) => {
                  const isUnconfirmed = unconfirmed.has(field);
                  return (
                    <li key={field} className="flex items-start justify-between gap-3 py-1.5">
                      <span className="text-[hsl(var(--muted-foreground))]">{FIELD_LABELS[field] ?? field}</span>
                      <span className="flex min-w-0 items-center gap-1.5 text-right font-medium">
                        <span className="truncate" title={value ?? undefined}>{value}</span>
                        {isUnconfirmed ? (
                          <CircleHelp className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-label="Unconfirmed: not found in the document text" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-label="Found in the document text" />
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {unconfirmed.size > 0 && (
                <p className="mt-1.5 text-xs text-amber-700">Details marked ? were not found in the document text. Verify them on the original.</p>
              )}
            </div>
          )}

          {result.skillMentions.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Skill mentions</p>
              <div className="flex flex-wrap gap-1.5">
                {result.skillMentions.map((m, i) => (
                  <span
                    key={i}
                    title={m.rationale || undefined}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs ring-1",
                      m.suggestedSkillId ? "bg-blue-50 text-blue-700 ring-blue-200" : "bg-slate-50 text-slate-500 ring-slate-200",
                    )}
                  >
                    {m.text}
                    <span className="ml-1 opacity-70">{Math.round(m.relevance * 100)}%</span>
                    {!m.suggestedSkillId && <span className="ml-1 italic">unresolved</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.uncertainty.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Uncertainty</p>
              <ul className="list-disc space-y-0.5 pl-4 text-xs text-[hsl(var(--muted-foreground))]">
                {result.uncertainty.map((u, i) => <li key={i}>{u}</li>)}
              </ul>
            </div>
          )}
        </>
      )}

      <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
        AI findings are suggestions only. The faculty decision is final.
      </p>
    </div>
  );
}
