"use client";

import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { getScoreBand } from "../lib/resume-analyzer-meta";

/**
 * Circular meter for one 0-100 score. The fill animates from 0 on mount
 * (CSS transition; reduced-motion users get the final state immediately).
 * Status is carried by the label and icon, not by colour alone.
 */
export function AtsScoreRing({
  score,
  size = 196,
  label = "Estimated ATS score",
  className,
}: {
  score: number;
  size?: number;
  label?: string;
  className?: string;
}) {
  const band = getScoreBand(score);
  const stroke = Math.round(size * 0.075);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
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
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={band.track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={band.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shown / 100)}
          className="transition-[stroke-dashoffset] duration-[1100ms] ease-out motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[52px] font-extrabold leading-none tracking-tight text-[hsl(var(--foreground))]">{score}</span>
        <span className="mt-1 text-xs font-medium text-[hsl(var(--muted-foreground))]">out of 100</span>
      </div>
    </div>
  );
}

export function ScoreBandPill({ score, className }: { score: number; className?: string }) {
  const band = getScoreBand(score);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", band.pillClassName, className)}>
      <band.icon className="h-3.5 w-3.5" aria-hidden="true" />
      {band.label}
    </span>
  );
}

/** Signed change against an earlier score. Up is good for every score here. */
export function ScoreDelta({ delta, suffix = "since last analysis" }: { delta: number; suffix?: string }) {
  const Icon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-sm font-semibold",
        delta > 0 && "text-[hsl(152_60%_32%)]",
        delta < 0 && "text-[hsl(0_72%_45%)]",
        delta === 0 && "text-[hsl(var(--muted-foreground))]",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {delta > 0 ? `+${delta}` : delta}
      <span className="font-normal text-[hsl(var(--muted-foreground))]">{suffix}</span>
    </span>
  );
}
