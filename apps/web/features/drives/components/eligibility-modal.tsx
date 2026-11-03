"use client";

import * as React from "react";
import Link from "next/link";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { format } from "date-fns";
import {
  ArrowRight,
  BrainCircuit,
  CircleCheck,
  CircleMinus,
  CircleX,
  FilePlus2,
  Lock,
  RotateCcw,
  TriangleAlert,
  UserRound,
  X,
} from "lucide-react";
import type {
  Application,
  EligibilityCheckResult,
  EligibilityResult,
  PlacementDrive,
} from "@placecampus/shared-types";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  CHECK_LABEL,
  ELIGIBILITY_META,
  formatActual,
  formatRequirement,
  summarizeEligibility,
  type EligibilityState,
  type WindowState,
} from "../lib/drive-meta";
import { CompanyMark, EligibilityBadge } from "./drive-ui";

function ResultIcon({ result }: { result: EligibilityCheckResult["result"] }) {
  if (result === "PASS") return <CircleCheck className="h-5 w-5 text-emerald-600" aria-label="Met" />;
  if (result === "FAIL") return <CircleX className="h-5 w-5 text-red-600" aria-label="Not met" />;
  if (result === "MISSING_DATA") return <TriangleAlert className="h-5 w-5 text-amber-600" aria-label="Missing information" />;
  return <CircleMinus className="h-5 w-5 text-slate-400" aria-label="Not applicable" />;
}

/** Centered eligibility modal: header, independently scrolling body, footer. */
export function EligibilityModal({
  drive,
  result,
  state,
  windowState,
  application,
  skillName,
  onRetry,
  onOpenChange,
}: {
  drive: PlacementDrive | null;
  result: EligibilityResult | undefined;
  state: EligibilityState;
  windowState: WindowState;
  application?: Application;
  skillName: (id?: string) => string;
  onRetry: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <DialogPrimitive.Root open={!!drive} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="pc-overlay pc-overlay-exit fixed inset-0 z-[var(--z-overlay)] bg-[hsl(var(--color-navy-dark)/0.5)] backdrop-blur-[3px]" />
        <DialogPrimitive.Content className="pc-modal pc-modal-exit fixed left-1/2 top-1/2 z-[var(--z-modal)] flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.35)] focus:outline-none sm:max-h-[85vh] sm:w-[calc(100vw-3rem)] sm:max-w-[820px]">
          {drive && (
            <Body
              drive={drive}
              result={result}
              state={state}
              windowState={windowState}
              application={application}
              skillName={skillName}
              onRetry={onRetry}
            />
          )}
          <DialogPrimitive.Close aria-label="Close" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)] sm:right-5 sm:top-5">
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function Body({
  drive,
  result,
  state,
  windowState,
  application,
  skillName,
  onRetry,
}: {
  drive: PlacementDrive;
  result: EligibilityResult | undefined;
  state: EligibilityState;
  windowState: WindowState;
  application?: Application;
  skillName: (id?: string) => string;
  onRetry: () => void;
}) {
  const checks = result?.checks ?? [];
  const academic = checks.filter((c) => c.type !== "SKILL");
  const skills = checks.filter((c) => c.type === "SKILL");
  const optional = (id?: string) =>
    drive.requirements?.skills?.find((s) => s.skillId === id)?.isOptional ?? false;

  const missingAcademic = academic.some((c) => c.result === "MISSING_DATA");
  const skillGaps = skills.filter((c) => c.result !== "PASS" && !optional(c.skill));
  const open = windowState === "OPEN" || windowState === "CLOSING_SOON";

  return (
    <>
      <div className="shrink-0 border-b border-[hsl(var(--border)/0.7)] bg-gradient-to-br from-white to-[hsl(var(--color-primary-50))] px-5 pb-5 pt-6 sm:px-8 sm:pt-7">
        <div className="flex items-start gap-4 pr-12">
          <CompanyMark name={drive.companyName} size="lg" />
          <div className="min-w-0 space-y-1.5">
            <DialogPrimitive.Title className="text-xl font-bold text-[hsl(var(--foreground))]">{drive.companyName}</DialogPrimitive.Title>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">{drive.roleTitle}</p>
            <EligibilityBadge state={state} />
          </div>
        </div>
        <DialogPrimitive.Description className={cn("mt-4 rounded-xl px-3.5 py-3 text-sm ring-1", ELIGIBILITY_META[state].panel)}>
          {summarizeEligibility(state, result, skillName)}
        </DialogPrimitive.Description>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8">
        {state === "CHECKING" ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
          </div>
        ) : state === "UNAVAILABLE" ? (
          <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-sm font-semibold hover:bg-[hsl(var(--muted))]">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Check again
          </button>
        ) : (
          <>
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">Academic requirements</h3>
              {academic.length === 0 ? (
                <p className="text-sm text-[hsl(var(--muted-foreground))]">This drive has no academic requirements.</p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-[hsl(var(--border)/0.8)]">
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 bg-[hsl(var(--muted)/0.5)] px-4 py-2 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                    <span>Requirement</span><span className="text-right">Required</span><span className="text-right">Your Details</span><span className="sr-only">Result</span>
                  </div>
                  {academic.map((check) => (
                    <div key={check.type} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 border-t border-[hsl(var(--border)/0.6)] px-4 py-3 text-sm">
                      <span className="font-medium text-[hsl(var(--foreground))]">{CHECK_LABEL[check.type]}</span>
                      <span className="max-w-[9rem] truncate text-right tabular-nums">{formatRequirement(check)}</span>
                      <span className={cn("text-right tabular-nums", check.result === "MISSING_DATA" && "text-amber-700")}>{formatActual(check)}</span>
                      <ResultIcon result={check.result} />
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">Required skills</h3>
              {skills.length === 0 ? (
                <p className="text-sm text-[hsl(var(--muted-foreground))]">No specific skills are required.</p>
              ) : (
                <ul className="space-y-2">
                  {skills.map((check) => (
                    <li key={check.skill} className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border)/0.8)] px-4 py-3">
                      <BrainCircuit className="h-4 w-4 shrink-0 text-[hsl(var(--primary))]" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[hsl(var(--foreground))]">
                          {skillName(check.skill)}
                          {optional(check.skill) && <span className="ml-2 rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">Optional</span>}
                        </p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          Required {formatRequirement(check)} · Yours: {formatActual(check)}
                        </p>
                      </div>
                      <ResultIcon result={check.result} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {(missingAcademic || skillGaps.length > 0 || application || !open) && (
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">Next steps</h3>
                <div className="space-y-2">
                  {application && (
                    <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
                      You applied on {format(new Date(application.appliedAt ?? application.updatedAt), "d MMM yyyy")}. Status: <strong>{application.status.replace(/_/g, " ").toLowerCase()}</strong>.
                    </p>
                  )}
                  {!open && !application && (
                    <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                      {windowState === "CLOSED" ? "Applications for this drive have closed." : "Applications for this drive haven't opened yet."}
                    </p>
                  )}
                  {missingAcademic && (
                    <div className="flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <div className="space-y-2">
                        <p>Academic details are managed by your institution. If something is missing or wrong, contact your placement office.</p>
                        <Link href="/student/profile" className="inline-flex items-center gap-1.5 font-semibold underline-offset-2 hover:underline">
                          <UserRound className="h-4 w-4" aria-hidden="true" /> Review your profile
                        </Link>
                      </div>
                    </div>
                  )}
                  {skillGaps.length > 0 && (
                    <div className="flex items-start gap-3 rounded-xl bg-[hsl(var(--primary)/0.07)] px-4 py-3 text-sm text-[hsl(var(--foreground)/0.85)]">
                      <FilePlus2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--primary))]" aria-hidden="true" />
                      <div className="space-y-2">
                        <p>
                          Get {skillGaps.map((c) => skillName(c.skill)).join(", ")} verified by submitting evidence.
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <Link href="/student/evidence" className="font-semibold text-[hsl(var(--primary))] hover:underline">Add evidence</Link>
                          <Link href="/student/skills" className="font-semibold text-[hsl(var(--primary))] hover:underline">View my skills</Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[hsl(var(--border)/0.7)] bg-[hsl(var(--muted)/0.25)] px-5 py-4 sm:px-8">
        <DialogPrimitive.Close className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold text-[hsl(var(--foreground)/0.8)] hover:bg-white">
          Close
        </DialogPrimitive.Close>
        <Link
          href={`/student/drives/${drive.id}`}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 text-sm font-semibold text-white transition-colors hover:bg-[hsl(var(--color-primary-600))]"
        >
          {state === "ELIGIBLE" && open && !application ? "Continue to apply" : "View full details"}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </>
  );
}
