"use client";

import * as React from "react";
import {
  ArrowRight,
  Clock,
  FileText,
  Info,
  ShieldCheck,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { StatusGroup } from "../lib/evidence-meta";

function useCountUp(value: number, duration = 700) {
  const [display, setDisplay] = React.useState(0);
  const displayRef = React.useRef(0);
  React.useEffect(() => {
    const from = displayRef.current;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let frame = 0;
    let start: number | null = null;
    const tick = (time: number) => {
      start ??= time;
      const progress = reduceMotion
        ? 1
        : Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(from + (value - from) * eased);
      displayRef.current = next;
      setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return display;
}

const ACCENTS = {
  blue: {
    card: "from-white to-blue-50/80 hover:border-blue-200",
    active: "border-blue-300 ring-2 ring-blue-200",
    icon: "bg-blue-100 text-blue-600",
  },
  green: {
    card: "from-white to-emerald-50/80 hover:border-emerald-200",
    active: "border-emerald-300 ring-2 ring-emerald-200",
    icon: "bg-emerald-100 text-emerald-600",
  },
  amber: {
    card: "from-white to-amber-50/80 hover:border-amber-200",
    active: "border-amber-300 ring-2 ring-amber-200",
    icon: "bg-amber-100 text-amber-600",
  },
  red: {
    card: "from-white to-red-50/80 hover:border-red-200",
    active: "border-red-300 ring-2 ring-red-200",
    icon: "bg-red-100 text-red-600",
  },
} as const;

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
  active,
  onClick,
  delay,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: keyof typeof ACCENTS;
  active: boolean;
  onClick: () => void;
  delay: number;
}) {
  const shown = useCountUp(value);
  const styles = ACCENTS[accent];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{ "--pc-delay": `${delay}ms` } as React.CSSProperties}
      className={cn(
        "pc-enter group flex h-full flex-col justify-between gap-3 rounded-2xl border border-[hsl(var(--border)/0.8)] bg-gradient-to-br p-4 text-left shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)] sm:p-5",
        styles.card,
        active && styles.active,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105",
            styles.icon,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="text-sm font-semibold leading-tight text-[hsl(var(--foreground))]">
          {label}
        </span>
      </div>
      <span className="text-3xl font-bold tabular-nums text-[hsl(var(--foreground))]">
        {shown}
      </span>
    </button>
  );
}

const RING_SIZE = 84;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function StrengthCard({
  strength,
  onImprove,
}: {
  strength: { percentage: number; covered: number; total: number };
  onImprove: () => void;
}) {
  const [shown, setShown] = React.useState(0);
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(strength.percentage));
    return () => cancelAnimationFrame(frame);
  }, [strength.percentage]);
  const isComplete = strength.covered >= strength.total;

  return (
    <div
      style={{ "--pc-delay": "200ms" } as React.CSSProperties}
      className="pc-enter flex h-full items-center gap-4 rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white p-4 shadow-[var(--shadow-card)] sm:p-5"
    >
      <div
        role="progressbar"
        aria-label="Evidence portfolio strength"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={strength.percentage}
        className="relative shrink-0"
        style={{ width: RING_SIZE, height: RING_SIZE }}
      >
        <svg
          width={RING_SIZE}
          height={RING_SIZE}
          className="-rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            strokeWidth={RING_STROKE}
            className="stroke-[hsl(var(--muted))]"
          />
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - shown / 100)}
            className="stroke-[hsl(var(--primary))] transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-[hsl(var(--foreground))]">
          {strength.percentage}%
        </span>
      </div>
      <div className="min-w-0 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <h3 className="whitespace-nowrap text-sm font-bold text-[hsl(var(--foreground))]">
            Evidence Portfolio Strength
          </h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="How portfolio strength is calculated"
                className="rounded-full text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)]"
              >
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-72 leading-relaxed">
              One point for each recommended evidence type you have submitted:
              certification, project, internship, achievement and hackathon.
              Rejected items don&apos;t count until you resubmit them.
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          <span className="font-semibold text-[hsl(var(--primary))]">
            {strength.covered} of {strength.total}
          </span>{" "}
          recommended evidence types
        </p>
        {!isComplete && (
          <button
            type="button"
            onClick={onImprove}
            className="group mt-1 inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-[hsl(var(--primary)/0.1)] px-3 py-1.5 text-sm font-semibold text-[hsl(var(--color-primary-700))] transition-colors hover:bg-[hsl(var(--primary)/0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)]"
          >
            Improve Portfolio
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </button>
        )}
      </div>
    </div>
  );
}

export function EvidenceStats({
  stats,
  strength,
  activeGroup,
  onSelectGroup,
  onImprove,
}: {
  stats: { total: number; verified: number; pending: number; needsAction: number };
  strength: { percentage: number; covered: number; total: number };
  activeGroup: StatusGroup | "ALL";
  onSelectGroup: (group: StatusGroup | "ALL") => void;
  onImprove: () => void;
}) {
  const toggle = (group: StatusGroup) =>
    onSelectGroup(activeGroup === group ? "ALL" : group);

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.9fr)]">
      <KpiCard
        label="Total Evidence"
        value={stats.total}
        icon={FileText}
        accent="blue"
        active={false}
        onClick={() => onSelectGroup("ALL")}
        delay={40}
      />
      <KpiCard
        label="Verified"
        value={stats.verified}
        icon={ShieldCheck}
        accent="green"
        active={activeGroup === "VERIFIED"}
        onClick={() => toggle("VERIFIED")}
        delay={80}
      />
      <KpiCard
        label="Pending"
        value={stats.pending}
        icon={Clock}
        accent="amber"
        active={activeGroup === "PENDING"}
        onClick={() => toggle("PENDING")}
        delay={120}
      />
      <KpiCard
        label="Needs Action"
        value={stats.needsAction}
        icon={TriangleAlert}
        accent="red"
        active={activeGroup === "NEEDS_ACTION"}
        onClick={() => toggle("NEEDS_ACTION")}
        delay={160}
      />
      <div className="col-span-2 lg:col-span-4 xl:col-span-1">
        <StrengthCard strength={strength} onImprove={onImprove} />
      </div>
    </div>
  );
}
