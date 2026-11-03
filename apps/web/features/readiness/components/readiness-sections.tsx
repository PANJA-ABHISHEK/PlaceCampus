"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CircleHelp,
  Info,
  Lock,
  Sparkles,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Trophy,
} from "lucide-react";
import type {
  ReadinessFactor,
  ReadinessSnapshot,
} from "@placecampus/shared-types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  EXPLANATION_FACTOR,
  FACTOR_META,
  FACTOR_ORDER,
  STATUS_META,
  STRONG_THRESHOLD,
  TONE_META,
  WEAK_THRESHOLD,
  factorTone,
  formatScore,
  isFactorKey,
  type FactorKey,
} from "../lib/readiness-meta";

/** True one frame after mount, so bars and rings can animate from zero. */
function useEntered() {
  const [entered, setEntered] = React.useState(false);
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return entered;
}

const cardClassName =
  "rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white shadow-[var(--shadow-card)]";

/** Factors in the canonical order, falling back to the stored order. */
export function orderedFactors(snapshot: ReadinessSnapshot) {
  const byKey = new Map(snapshot.explanation.factors.map((f) => [f.key, f]));
  return FACTOR_ORDER.map((key) => byKey.get(key)).filter(
    (f): f is ReadinessFactor => !!f,
  );
}

/* ------------------------------------------------------------------------ */
/* Overall score                                                            */
/* ------------------------------------------------------------------------ */

export function ScoreCard({
  snapshot,
  previousScore,
}: {
  snapshot: ReadinessSnapshot;
  previousScore: number | null;
}) {
  const entered = useEntered();
  const status = STATUS_META[snapshot.status];
  const size = 196;
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const score = Math.min(Math.max(snapshot.overallScore, 0), 100);
  const delta =
    previousScore == null
      ? null
      : Math.round((snapshot.overallScore - previousScore) * 10) / 10;
  const noData = snapshot.coverageCount === 0;

  return (
    <section
      aria-labelledby="overall-score-heading"
      className={cn(cardClassName, "pc-enter relative overflow-hidden p-6")}
      style={{ "--pc-delay": "60ms" } as React.CSSProperties}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[hsl(var(--primary))] via-[hsl(var(--color-primary-light))] to-blue-500"
      />
      <div className="flex items-center gap-2">
        <h2 id="overall-score-heading" className="text-lg font-bold text-[hsl(var(--foreground))]">
          Overall Readiness Score
        </h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label="About the overall score" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
              <Info className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-72 leading-relaxed">
            Sum of each factor&apos;s score × its weight, out of 100. 80+ is
            Placement Ready, 60+ is Developing.
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <div
          role="meter"
          aria-label="Overall readiness score"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={snapshot.overallScore}
          className="relative shrink-0"
          style={{ width: size, height: size }}
        >
          <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-[hsl(var(--muted))]" />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - (entered ? score : 0) / 100)}
              className={cn(status.ring, "transition-[stroke-dashoffset] duration-[1200ms] ease-out motion-reduce:transition-none")}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-extrabold tabular-nums tracking-tight text-[hsl(var(--foreground))]">
              {formatScore(snapshot.overallScore)}
            </span>
            <span className="text-base font-semibold text-[hsl(var(--muted-foreground))]">/ 100</span>
          </div>
        </div>

        <div className="space-y-3 text-center sm:text-left">
          <span className={cn("inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-base font-bold ring-1", status.badge)}>
            {status.label}
          </span>
          <p className="text-sm leading-relaxed text-[hsl(var(--foreground)/0.75)]">
            {noData
              ? "More data is needed to calculate a meaningful readiness score."
              : status.message}
          </p>
          {delta != null && delta !== 0 && (
            <p
              className={cn(
                "inline-flex items-center gap-1.5 text-sm font-semibold",
                delta > 0 ? "text-emerald-700" : "text-red-600",
              )}
            >
              {delta > 0 ? <TrendingUp className="h-4 w-4" aria-hidden="true" /> : <TrendingDown className="h-4 w-4" aria-hidden="true" />}
              {delta > 0 ? "+" : ""}
              {formatScore(delta)} since your last update
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-2 border-t border-[hsl(var(--border)/0.7)] pt-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-[hsl(var(--foreground))]">Data coverage</span>
          <span className="tabular-nums text-[hsl(var(--foreground)/0.75)]">
            <strong className="text-[hsl(var(--foreground))]">{snapshot.coverageCount}</strong> of 5 factors measured
          </span>
        </div>
        <div className="flex gap-1.5" aria-hidden="true">
          {Array.from({ length: 5 }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 flex-1 rounded-full transition-colors duration-500",
                entered && i < snapshot.coverageCount ? "bg-[hsl(var(--primary))]" : "bg-[hsl(var(--muted))]",
              )}
              style={{ transitionDelay: `${i * 90}ms` }}
            />
          ))}
        </div>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          Unmeasured factors count as 0 until you have data for them. That&apos;s
          missing data, not a low score.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/* Factor breakdown                                                         */
/* ------------------------------------------------------------------------ */

export function FactorBreakdown({ snapshot }: { snapshot: ReadinessSnapshot }) {
  const entered = useEntered();
  const factors = orderedFactors(snapshot);

  return (
    <section
      aria-labelledby="breakdown-heading"
      className={cn(cardClassName, "pc-enter flex flex-col p-6")}
      style={{ "--pc-delay": "120ms" } as React.CSSProperties}
    >
      <h2 id="breakdown-heading" className="text-lg font-bold text-[hsl(var(--foreground))]">
        How your score is calculated
      </h2>
      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
        Each factor is normalized to 0–100 and combined using fixed weights.
      </p>

      <ul className="mt-5 flex-1 space-y-2">
        {factors.map((factor) => {
          const key = factor.key as FactorKey;
          const meta = isFactorKey(key) ? FACTOR_META[key] : null;
          const Icon = meta?.icon ?? CircleHelp;
          const tone = factorTone(factor);
          const toneMeta = TONE_META[tone];
          const width = factor.coverage ? Math.min(factor.score, 100) : 0;
          return (
            <li
              key={factor.key}
              className="group rounded-xl px-3 py-3 transition-colors hover:bg-[hsl(var(--muted)/0.45)]"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105",
                    tone === "missing"
                      ? "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                      : "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[hsl(var(--foreground))]">
                        {meta?.label ?? factor.key}
                      </span>
                      {meta && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" aria-label={`How ${meta.label} is scored`} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-64 leading-relaxed">{meta.howScored}</TooltipContent>
                        </Tooltip>
                      )}
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1", toneMeta.badge)}>
                        {toneMeta.label}
                      </span>
                    </div>
                    <span className="text-sm tabular-nums text-[hsl(var(--foreground)/0.75)]">
                      {factor.coverage ? formatScore(factor.score) : "—"} × {Math.round(factor.weight * 100)}% ={" "}
                      <strong className={cn("font-bold", factor.coverage ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--muted-foreground))]")}>
                        +{formatScore(factor.contribution)}
                      </strong>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                    <div
                      className={cn("h-full rounded-full bg-gradient-to-r transition-[width] duration-1000 ease-out motion-reduce:transition-none", toneMeta.bar)}
                      style={{ width: `${entered ? width : 0}%` }}
                    />
                  </div>
                  {!factor.coverage && meta && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{meta.missingHint}</p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex items-center justify-between rounded-xl bg-gradient-to-r from-[hsl(var(--color-primary-50))] to-white px-4 py-3.5 ring-1 ring-[hsl(var(--primary)/0.15)]">
        <span className="font-bold text-[hsl(var(--foreground))]">Total Overall Readiness</span>
        <span className="text-2xl font-extrabold tabular-nums text-[hsl(var(--primary))]">
          {formatScore(snapshot.overallScore)}
          <span className="text-base font-semibold text-[hsl(var(--muted-foreground))]"> / 100</span>
        </span>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/* Strengths & areas to improve                                             */
/* ------------------------------------------------------------------------ */

function FactorScoreChip({ factorKey, snapshot }: { factorKey?: FactorKey; snapshot: ReadinessSnapshot }) {
  if (!factorKey) return null;
  const factor = snapshot.explanation.factors.find((f) => f.key === factorKey);
  if (!factor?.coverage) return null;
  return (
    <span className="shrink-0 text-sm font-bold tabular-nums text-[hsl(var(--foreground))]">
      {formatScore(factor.score)}
      <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">/100</span>
    </span>
  );
}

export function Insights({ snapshot }: { snapshot: ReadinessSnapshot }) {
  const { strengths, areasToImprove } = snapshot.explanation;
  const missing = orderedFactors(snapshot).filter((f) => !f.coverage);
  const noData = snapshot.coverageCount === 0;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section
        aria-labelledby="strengths-heading"
        className="pc-enter relative overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-white to-emerald-50/70 p-6 shadow-[var(--shadow-card)]"
        style={{ "--pc-delay": "160ms" } as React.CSSProperties}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <Trophy className="h-6 w-6" aria-hidden="true" />
          </span>
          <h2 id="strengths-heading" className="text-lg font-bold text-[hsl(var(--foreground))]">Your Strengths</h2>
        </div>
        {strengths.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {strengths.map((item) => (
              <li key={item} className="flex items-center justify-between gap-3 rounded-xl bg-white/80 px-3.5 py-2.5 ring-1 ring-emerald-100">
                <span className="text-sm font-medium text-[hsl(var(--foreground))]">{item}</span>
                <FactorScoreChip factorKey={EXPLANATION_FACTOR[item]} snapshot={snapshot} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
            {noData
              ? "More data is needed to identify your specific strengths and improvement areas."
              : `No factor has reached ${STRONG_THRESHOLD}/100 yet. Factors at ${STRONG_THRESHOLD} or above appear here.`}
          </p>
        )}
      </section>

      <section
        aria-labelledby="improve-heading"
        className="pc-enter relative overflow-hidden rounded-2xl border border-orange-200/70 bg-gradient-to-br from-white to-orange-50/70 p-6 shadow-[var(--shadow-card)]"
        style={{ "--pc-delay": "200ms" } as React.CSSProperties}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
            <TriangleAlert className="h-6 w-6" aria-hidden="true" />
          </span>
          <h2 id="improve-heading" className="text-lg font-bold text-[hsl(var(--foreground))]">Areas to Improve</h2>
        </div>
        {noData ? (
          <p className="mt-4 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
            More data is needed to identify your specific strengths and improvement areas.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {areasToImprove.length > 0 ? (
              <ul className="space-y-2">
                {areasToImprove.map((item) => (
                  <li key={item} className="rounded-xl bg-white/80 px-3.5 py-2.5 ring-1 ring-orange-100">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{item}</span>
                      <FactorScoreChip factorKey={EXPLANATION_FACTOR[item]} snapshot={snapshot} />
                    </div>
                    <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                      Below {WEAK_THRESHOLD}/100, so it&apos;s holding your score back.
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                None of your measured factors are below {WEAK_THRESHOLD}/100.
              </p>
            )}
            {missing.length > 0 && (
              <div className="rounded-xl border border-dashed border-orange-200 bg-white/60 px-3.5 py-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Not yet measured</p>
                <p className="mt-1 text-sm text-[hsl(var(--foreground)/0.8)]">
                  {missing.map((f) => (isFactorKey(f.key) ? FACTOR_META[f.key].label : f.key)).join(", ")}
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Recommendations                                                          */
/* ------------------------------------------------------------------------ */

export function Recommendations({ snapshot }: { snapshot: ReadinessSnapshot }) {
  // Only factors that are unmeasured or below the strength threshold.
  const items = orderedFactors(snapshot).filter(
    (f) => isFactorKey(f.key) && factorTone(f) !== "strong",
  );

  return (
    <section aria-labelledby="improve-readiness-heading" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="improve-readiness-heading" className="text-xl font-bold text-[hsl(var(--foreground))]">
          Improve Your Readiness
        </h2>
        <a href="#how-it-works" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[hsl(var(--primary))] hover:underline">
          <Info className="h-4 w-4" aria-hidden="true" />
          How your readiness score works
        </a>
      </div>
      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-5 py-4 text-sm text-emerald-800">
          <Sparkles className="h-5 w-5 shrink-0" aria-hidden="true" />
          Every factor is at {STRONG_THRESHOLD} or above. Keep your evidence current to stay ready.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {items.map((factor, index) => {
            const key = factor.key as FactorKey;
            const meta = FACTOR_META[key];
            const Icon = meta.icon;
            const tone = factorTone(factor);
            return (
              <article
                key={key}
                style={{ "--pc-delay": `${240 + index * 50}ms` } as React.CSSProperties}
                className="pc-enter group flex flex-col rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] transition-transform group-hover:scale-105">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-[hsl(var(--foreground))]">{meta.label}</h3>
                    <span className={cn("text-xs font-semibold", TONE_META[tone].text)}>
                      {tone === "missing" ? "Not measured" : `${formatScore(factor.score)}/100 · ${TONE_META[tone].label}`}
                    </span>
                  </div>
                </div>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-[hsl(var(--foreground)/0.75)]">
                  {meta.institutionManaged
                    ? "Your academic record is managed by your institution. Contact your placement office if it's missing or wrong."
                    : meta.action?.hint}
                </p>
                {meta.institutionManaged || !meta.action ? (
                  <span className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--muted))] text-sm font-semibold text-[hsl(var(--muted-foreground))]">
                    <Lock className="h-4 w-4" aria-hidden="true" />
                    Institution managed
                  </span>
                ) : (
                  <Link
                    href={meta.action.href}
                    className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[hsl(var(--primary)/0.45)] text-sm font-semibold text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(var(--primary))] hover:text-white"
                  >
                    {meta.action.label}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/* How it works                                                             */
/* ------------------------------------------------------------------------ */

const WEIGHT_COLORS: Record<FactorKey, string> = {
  verifiedSkills: "bg-[hsl(var(--primary))]",
  assessments: "bg-[hsl(var(--color-primary-light))]",
  academics: "bg-[hsl(var(--secondary))]",
  projects: "bg-blue-500",
  interviews: "bg-emerald-500",
};

export function HowItWorks({ snapshot }: { snapshot: ReadinessSnapshot }) {
  const factors = orderedFactors(snapshot);
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className={cn(cardClassName, "scroll-mt-28 p-6")}
    >
      <h2 id="how-it-works-heading" className="text-lg font-bold text-[hsl(var(--foreground))]">
        How Your Readiness Score Works
      </h2>
      <p className="mt-1 max-w-[52rem] text-sm leading-relaxed text-[hsl(var(--foreground)/0.75)]">
        Your placement readiness score is calculated using verified skills,
        assessments, academics, projects, and mock interview performance. Each
        factor contributes according to its predefined weight.
      </p>
      <div className="mt-5 flex h-3 overflow-hidden rounded-full" aria-hidden="true">
        {factors.map((f) => (
          <span
            key={f.key}
            className={isFactorKey(f.key) ? WEIGHT_COLORS[f.key] : "bg-slate-300"}
            style={{ width: `${f.weight * 100}%` }}
          />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-5">
        {factors.map((f) => (
          <li key={f.key} className="flex items-center gap-2 text-sm">
            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", isFactorKey(f.key) ? WEIGHT_COLORS[f.key] : "bg-slate-300")} aria-hidden="true" />
            <span className="text-[hsl(var(--foreground)/0.8)]">{isFactorKey(f.key) ? FACTOR_META[f.key].label : f.key}</span>
            <strong className="ml-auto tabular-nums text-[hsl(var(--foreground))] lg:ml-0">{Math.round(f.weight * 100)}%</strong>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-[hsl(var(--muted-foreground))]">
        {STATUS_META.READY.label}: {STRONG_THRESHOLD}+ · {STATUS_META.DEVELOPING.label}: {WEAK_THRESHOLD}–{STRONG_THRESHOLD - 0.1} · {STATUS_META.NEEDS_PREPARATION.label}: below {WEAK_THRESHOLD}
      </p>
    </section>
  );
}
