import { CircleCheck } from "lucide-react";
import { HeroWaves, lightHeroClassName } from "@/components/brand/hero-waves";

function ClipboardIllustration() {
  return (
    <svg
      viewBox="0 0 260 170"
      className="h-full w-full drop-shadow-[0_18px_24px_rgba(234,88,12,0.14)]"
      aria-hidden="true"
    >
      {/* motion ticks */}
      <g stroke="hsl(24 95% 53%)" strokeWidth="4" strokeLinecap="round">
        <path d="M26 64 l-12 -6" />
        <path d="M24 82 h-14" />
        <path d="M30 46 l-8 -10" />
        <path d="M222 120 l12 -4" />
        <path d="M218 136 l12 6" />
      </g>

      {/* clipboard */}
      <rect x="92" y="22" width="112" height="140" rx="12" fill="hsl(222 40% 28%)" />
      <rect x="100" y="32" width="96" height="122" rx="7" fill="#fff" />
      <rect x="128" y="14" width="40" height="18" rx="6" fill="#8EA0C8" />
      <circle cx="148" cy="20" r="4" fill="#fff" />
      {[56, 86, 116].map((y) => (
        <g key={y}>
          <rect x="110" y={y - 8} width="16" height="16" rx="4" fill="#22C55E" />
          <path
            d={`M114 ${y} l3 3 6 -6`}
            stroke="#fff"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
          <rect x="134" y={y - 6} width="50" height="5" rx="2.5" fill="#B8C6EA" />
          <rect x="134" y={y + 2} width="34" height="4" rx="2" fill="#DCE4F5" />
        </g>
      ))}

      {/* stopwatch */}
      <g transform="translate(70 124)">
        <rect x="-5" y="-38" width="10" height="8" rx="2" fill="hsl(20 90% 44%)" />
        <circle r="30" fill="hsl(24 95% 53%)" />
        <circle r="23" fill="#fff" />
        <path d="M0 -14 V0 L9 6" stroke="hsl(222 47% 15%)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <circle r="3" fill="hsl(222 47% 15%)" />
      </g>

      {/* graduation cap */}
      <g transform="translate(206 32) rotate(12)">
        <path d="M-32 0 L0 -15 L32 0 L0 15 Z" fill="hsl(222 47% 15%)" />
        <path d="M-19 6 v12 c9 8 29 8 38 0 v-12 l-19 9 z" fill="hsl(222 40% 28%)" />
        <path d="M22 4 v22" stroke="hsl(24 95% 53%)" strokeWidth="3" />
        <circle cx="22" cy="28" r="4" fill="hsl(24 95% 53%)" />
      </g>
    </svg>
  );
}

export function AssessmentsHero() {
  return (
    <section className={lightHeroClassName}>
      <HeroWaves />
      <div className="relative flex items-center justify-between gap-6">
        <div className="max-w-[38rem] space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            <span className="text-[hsl(var(--foreground))]">My </span>
            <span className="text-[hsl(var(--primary))]">Assessments</span>
          </h1>
          <p className="text-[15px] leading-relaxed text-[hsl(var(--foreground)/0.8)] sm:text-base">
            Evaluate your knowledge, measure your skills, and track your
            placement readiness.
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <CircleCheck className="h-4 w-4" aria-hidden="true" />
              Assessments
            </span>
            <span
              aria-hidden="true"
              className="hidden h-4 w-px bg-[hsl(var(--border))] sm:block"
            />
            <span className="text-[hsl(var(--foreground)/0.75)]">
              Tests, quizzes, and evaluations to build your verified skill
              profile.
            </span>
          </div>
        </div>
        <div className="pointer-events-none hidden h-[150px] w-[230px] shrink-0 lg:block xl:mr-16">
          <ClipboardIllustration />
        </div>
      </div>
    </section>
  );
}
