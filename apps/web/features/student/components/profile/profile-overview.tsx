"use client";

import * as React from "react";
import { GraduationCap, Mail, PencilLine } from "lucide-react";
import { getInitials } from "@/components/layout/user-menu";
import { cn } from "@/lib/utils";
import { HeroWaves, lightHeroClassName } from "@/components/brand/hero-waves";

const RING_SIZE = 66;
const RING_STROKE = 7;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function CompletionRing({ value }: { value: number }) {
  // Start empty and animate to the real value after mount.
  const [shown, setShown] = React.useState(0);
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <div
      role="progressbar"
      aria-label="Profile completion"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className="relative shrink-0"
      style={{ width: RING_SIZE, height: RING_SIZE }}
    >
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          strokeWidth={RING_STROKE}
          className="stroke-[hsl(var(--primary)/0.12)]"
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
      <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-[hsl(var(--foreground))]">
        {value}%
      </span>
    </div>
  );
}

interface ProfileOverviewProps {
  name: string;
  email?: string;
  completion: { percentage: number; filled: number; total: number };
  onEdit: () => void;
}

export function ProfileOverview({
  name,
  email,
  completion,
  onEdit,
}: ProfileOverviewProps) {
  const isComplete = completion.percentage >= 100;

  return (
    <section aria-labelledby="profile-heading" className={cn(lightHeroClassName, "py-4 sm:py-5")}>
      <HeroWaves />

      <div className="relative space-y-3">
        <div className="max-w-[36rem] space-y-1">
          <h1
            id="profile-heading"
            className="text-3xl font-extrabold tracking-tight sm:text-4xl"
          >
            <span className="text-[hsl(var(--foreground))]">My </span>
            <span className="text-[hsl(var(--primary))]">Profile</span>
          </h1>
          <p className="text-[15px] leading-relaxed text-[hsl(var(--foreground)/0.8)] sm:text-base">
            Manage your personal, academic, and professional information.
          </p>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(var(--color-primary-100))] to-[hsl(var(--color-primary-200))] text-lg font-bold text-[hsl(var(--primary))] shadow-[0_10px_24px_-12px_hsl(var(--primary)/0.6)] ring-[3px] ring-white transition-transform duration-300 hover:scale-[1.03]">
              {getInitials(name)}
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="truncate text-xl font-bold tracking-tight text-[hsl(var(--foreground))]">
                  {name}
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--primary)/0.1)] px-3 py-1 text-xs font-semibold text-[hsl(var(--color-primary-700))] ring-1 ring-[hsl(var(--primary)/0.25)]">
                  <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                  Student
                </span>
              </div>
              {email && (
                <p className="flex min-w-0 items-center gap-2 text-sm text-[hsl(var(--foreground)/0.7)]">
                  <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{email}</span>
                </p>
              )}
              <button
                type="button"
                onClick={onEdit}
                className="mt-1 inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--primary)/0.4)] bg-white px-3.5 py-2 text-sm font-semibold text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(var(--primary)/0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)] lg:hidden"
              >
                <PencilLine className="h-4 w-4" aria-hidden="true" />
                Edit Profile
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-white/80 bg-white/70 px-4 py-2.5 shadow-[var(--shadow-card)] backdrop-blur-sm sm:pr-6">
            <CompletionRing value={completion.percentage} />
            <div className="max-w-[19rem] space-y-0.5">
              <h3 className="text-base font-bold text-[hsl(var(--foreground))]">
                Profile Completion
              </h3>
              <p className="text-sm leading-relaxed text-[hsl(var(--foreground)/0.75)]">
                {isComplete
                  ? "Your profile is complete. Keep it up to date as you grow."
                  : "Complete your profile to improve your placement readiness."}
              </p>
              <p className="text-xs font-semibold text-[hsl(var(--color-primary-700))]">
                {completion.filled} of {completion.total} details added
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
