import { format } from "date-fns";
import { Clock, Layers } from "lucide-react";
import type { ReadinessStatus } from "@placecampus/shared-types";
import { HeroWaves, lightHeroClassName } from "@/components/brand/hero-waves";
import { cn } from "@/lib/utils";
import { STATUS_META } from "../lib/readiness-meta";

function ReadinessIllustration() {
  return (
    <svg viewBox="0 0 250 160" className="h-full w-full drop-shadow-[0_18px_24px_rgba(234,88,12,0.14)]" aria-hidden="true">
      <rect x="36" y="22" width="150" height="124" rx="14" fill="hsl(222 40% 28%)" />
      <rect x="44" y="30" width="134" height="108" rx="8" fill="#fff" />
      <rect x="92" y="14" width="40" height="16" rx="6" fill="#8EA0C8" />
      {[50, 74, 98].map((y) => (
        <g key={y}>
          <circle cx="60" cy={y} r="8" fill="#22C55E" />
          <path d={`M56 ${y} l3 3 5 -5`} stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <rect x="74" y={y - 4} width="48" height="7" rx="3.5" fill="#C9D4EE" />
        </g>
      ))}
      <rect x="132" y="96" width="12" height="30" rx="3" fill="hsl(28 100% 62%)" />
      <rect x="148" y="80" width="12" height="46" rx="3" fill="hsl(24 95% 53%)" />
      <rect x="164" y="62" width="12" height="64" rx="3" fill="hsl(20 90% 44%)" />
      <g transform="translate(196 34) rotate(10)">
        <path d="M-32 0 L0 -15 L32 0 L0 15 Z" fill="hsl(222 47% 15%)" />
        <path d="M-19 6 v12 c9 8 29 8 38 0 v-12 l-19 9 z" fill="hsl(222 40% 28%)" />
        <path d="M22 4 v22" stroke="hsl(24 95% 53%)" strokeWidth="3" />
        <circle cx="22" cy="28" r="4" fill="hsl(24 95% 53%)" />
      </g>
      <path d="M222 92 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill="hsl(24 95% 53%)" />
    </svg>
  );
}

export function ReadinessHero({
  status,
  coverageCount,
  calculatedAt,
}: {
  status?: ReadinessStatus;
  coverageCount?: number;
  calculatedAt?: string;
}) {
  const meta = status ? STATUS_META[status] : null;
  return (
    <section className={lightHeroClassName}>
      <HeroWaves />
      <div className="relative flex items-center justify-between gap-6">
        <div className="max-w-[40rem] space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            <span className="text-[hsl(var(--foreground))]">My </span>
            <span className="text-[hsl(var(--primary))]">Placement</span>
            <span className="text-[hsl(var(--foreground))]"> Readiness</span>
          </h1>
          <p className="text-[15px] leading-relaxed text-[hsl(var(--foreground)/0.8)] sm:text-base">
            Understand your strengths, identify skill gaps, and track your
            preparation for placements.
          </p>
          {meta && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1 text-sm">
              <span className={cn("rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ring-1", meta.badge)}>
                {meta.label}
              </span>
              <span aria-hidden="true" className="hidden h-4 w-px bg-[hsl(var(--border))] sm:block" />
              <span className="flex items-center gap-1.5 text-[hsl(var(--foreground)/0.75)]">
                <Layers className="h-4 w-4" aria-hidden="true" />
                Coverage: {coverageCount ?? 0} / 5 factors measured
              </span>
              {calculatedAt && (
                <>
                  <span aria-hidden="true" className="hidden h-4 w-px bg-[hsl(var(--border))] sm:block" />
                  <span className="flex items-center gap-1.5 text-[hsl(var(--foreground)/0.75)]">
                    <Clock className="h-4 w-4" aria-hidden="true" />
                    Updated {format(new Date(calculatedAt), "MMM d, h:mm a")}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
        <div className="pointer-events-none hidden h-[140px] w-[220px] shrink-0 lg:block xl:mr-16">
          <ReadinessIllustration />
        </div>
      </div>
    </section>
  );
}
