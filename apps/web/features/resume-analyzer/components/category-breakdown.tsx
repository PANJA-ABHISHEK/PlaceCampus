"use client";

import * as React from "react";
import type { ResumeCategoryScore } from "@placecampus/shared-types";
import { cn } from "@/lib/utils";
import { getScoreBand } from "../lib/resume-analyzer-meta";

/** A meter bar whose fill carries severity; the track is a lighter step of the same hue. */
export function ScoreBar({ score, className, label }: { score: number; className?: string; label: string }) {
  const band = getScoreBand(score);
  const [shown, setShown] = React.useState(0);
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(score));
    return () => cancelAnimationFrame(frame);
  }, [score]);
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score}
      aria-label={`${label}: ${score} out of 100, ${band.label}`}
      className={cn("h-2 w-full overflow-hidden rounded-full", className)}
      style={{ background: band.track }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
        style={{ width: `${shown}%`, background: band.color }}
      />
    </div>
  );
}

/** Meter list: a name, a bar and a figure per category, with the reason underneath. */
export function CategoryBreakdown({ categories }: { categories: ResumeCategoryScore[] }) {
  return (
    <ul className="space-y-5">
      {categories.map((category) => {
        const band = getScoreBand(category.score);
        return (
          <li key={category.key}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                {category.label}
                <span className="ml-2 text-xs font-normal text-[hsl(var(--muted-foreground))]">{category.weight}% of score</span>
              </p>
              <p className="shrink-0 text-sm tabular-nums text-[hsl(var(--foreground))]">
                <span className="font-bold">{category.score}</span>
                <span className="text-[hsl(var(--muted-foreground))]">/100</span>
                <span className="sr-only">, {band.label}</span>
              </p>
            </div>
            <ScoreBar score={category.score} label={category.label} className="mt-2" />
            <p className="mt-2 text-[13px] leading-relaxed text-[hsl(var(--muted-foreground))]">{category.rationale}</p>
          </li>
        );
      })}
    </ul>
  );
}
