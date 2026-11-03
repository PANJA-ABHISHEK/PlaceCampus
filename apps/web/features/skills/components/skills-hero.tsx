"use client";

import { CircleCheck, Plus } from "lucide-react";
import { HeroWaves, lightHeroClassName } from "@/components/brand/hero-waves";

function LaptopIllustration() {
  return (
    <svg
      viewBox="0 0 260 170"
      className="h-full w-full drop-shadow-[0_18px_24px_rgba(234,88,12,0.14)]"
      aria-hidden="true"
    >
      {/* sparkles */}
      <g fill="hsl(24 95% 53%)">
        <path d="M60 18 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" opacity="0.85" />
        <path d="M232 70 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" />
        <circle cx="236" cy="98" r="2.5" opacity="0.7" />
      </g>

      {/* laptop */}
      <rect x="78" y="34" width="132" height="92" rx="10" fill="hsl(222 47% 15%)" />
      <rect x="86" y="42" width="116" height="76" rx="5" fill="url(#pc-skill-screen)" />
      <defs>
        <linearGradient id="pc-skill-screen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7C8CF8" />
          <stop offset="1" stopColor="#5B6BE0" />
        </linearGradient>
      </defs>
      <path
        d="M128 66 l-12 14 12 14 M160 66 l12 14 -12 14 M150 62 l-12 36"
        fill="none"
        stroke="#fff"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M64 128 h160 l-10 14 h-140 z" fill="#2A3555" />
      <rect x="128" y="130" width="32" height="4" rx="2" fill="#4A5578" />

      {/* graduation cap on the screen corner */}
      <g transform="translate(196 34) rotate(14)">
        <path d="M-30 0 L0 -14 L30 0 L0 14 Z" fill="hsl(24 95% 53%)" />
        <path d="M-18 6 v12 c8 8 28 8 36 0 v-12 l-18 8 z" fill="hsl(20 90% 44%)" />
        <path d="M20 4 v20" stroke="hsl(28 100% 62%)" strokeWidth="2.5" />
        <circle cx="20" cy="26" r="3.5" fill="hsl(28 100% 62%)" />
      </g>

      {/* checklist card */}
      <g transform="rotate(-6 50 110)">
        <rect x="14" y="78" width="76" height="66" rx="10" fill="#fff" />
        <rect x="14.5" y="78.5" width="75" height="65" rx="9.5" fill="none" stroke="rgba(15,23,42,0.08)" />
        <rect x="24" y="90" width="16" height="16" rx="4" fill="#22C55E" />
        <path d="M28 98 l3 3 6 -6" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <rect x="46" y="94" width="34" height="6" rx="3" fill="#CBD5E1" />
        <rect x="24" y="116" width="16" height="16" rx="4" fill="#22C55E" />
        <path d="M28 124 l3 3 6 -6" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <rect x="46" y="120" width="28" height="6" rx="3" fill="#CBD5E1" />
      </g>
    </svg>
  );
}

export function SkillsHero({ onAddSkill }: { onAddSkill: () => void }) {
  return (
    <section className={lightHeroClassName}>
      <HeroWaves />

      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-[36rem] space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            <span className="text-[hsl(var(--foreground))]">My </span>
            <span className="text-[hsl(var(--primary))]">Skills</span>
          </h1>
          <p className="text-[15px] leading-relaxed text-[hsl(var(--foreground)/0.8)] sm:text-base">
            Track, verify, and strengthen your technical and professional
            skills.
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <CircleCheck className="h-4 w-4" aria-hidden="true" />
              Verified Skills
            </span>
            <span
              aria-hidden="true"
              className="hidden h-4 w-px bg-[hsl(var(--border))] sm:block"
            />
            <span className="text-[hsl(var(--foreground)/0.75)]">
              Skills are extracted from your evidence and verified by
              PlaceCampus.
            </span>
          </div>
        </div>

        <div className="pointer-events-none absolute right-[230px] top-1/2 hidden h-[150px] w-[230px] -translate-y-1/2 xl:block 2xl:right-[270px]">
          <LaptopIllustration />
        </div>

        <button
          type="button"
          onClick={onAddSkill}
          title="Skills are added by submitting evidence for verification"
          className="relative inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-[hsl(var(--primary))] px-6 py-3.5 text-base font-semibold text-white shadow-[0_10px_24px_-10px_hsl(var(--primary)/0.8)] transition-all hover:-translate-y-0.5 hover:bg-[hsl(var(--color-primary-600))] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)] focus-visible:ring-offset-2 md:self-center"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          Add Skill
        </button>
      </div>
    </section>
  );
}
