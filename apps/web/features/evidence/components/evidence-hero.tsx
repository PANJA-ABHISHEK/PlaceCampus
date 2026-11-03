"use client";

import { CircleCheck, Plus } from "lucide-react";
import { HeroWaves, lightHeroClassName } from "@/components/brand/hero-waves";

function CertificateIllustration() {
  return (
    <svg
      viewBox="0 0 240 170"
      className="h-full w-full drop-shadow-[0_18px_24px_rgba(234,88,12,0.14)]"
      aria-hidden="true"
    >
      {/* sparkle accents */}
      <g stroke="hsl(24 95% 53%)" strokeWidth="5" strokeLinecap="round">
        <path d="M176 18 L172 4" />
        <path d="M190 30 L202 20" />
        <path d="M196 48 L210 46" />
      </g>
      <circle cx="38" cy="58" r="3" fill="hsl(24 95% 53%)" opacity="0.7" />
      <circle cx="22" cy="104" r="2.5" fill="hsl(222 40% 28%)" opacity="0.35" />

      {/* back sheet */}
      <g transform="rotate(-12 80 110)">
        <rect x="34" y="62" width="104" height="96" rx="12" fill="#EEF2FB" />
        <rect x="50" y="86" width="56" height="7" rx="3.5" fill="#C9D4EE" />
        <rect x="50" y="102" width="70" height="7" rx="3.5" fill="#D9E1F3" />
        <rect x="50" y="118" width="44" height="7" rx="3.5" fill="#D9E1F3" />
      </g>

      {/* front sheet */}
      <g transform="rotate(8 130 90)">
        <rect x="74" y="26" width="118" height="126" rx="14" fill="#FFFFFF" />
        <rect
          x="74.5"
          y="26.5"
          width="117"
          height="125"
          rx="13.5"
          fill="none"
          stroke="hsl(24 95% 53% / 0.18)"
        />
        <rect x="92" y="48" width="74" height="9" rx="4.5" fill="hsl(222 47% 15% / 0.85)" />
        <rect x="92" y="66" width="82" height="7" rx="3.5" fill="#B8C6EA" />
        <rect x="92" y="81" width="64" height="7" rx="3.5" fill="#CBD6F0" />
        <rect x="92" y="96" width="50" height="7" rx="3.5" fill="#DCE4F5" />
      </g>

      {/* rosette */}
      <g transform="translate(176 128)">
        <path d="M-14 6 L-22 40 L-8 32 L-2 46 L4 12 Z" fill="hsl(20 90% 44%)" />
        <path d="M14 6 L22 40 L8 32 L2 46 L-4 12 Z" fill="hsl(24 95% 53%)" />
        <circle r="24" fill="hsl(24 95% 53%)" />
        <circle r="18" fill="hsl(28 100% 62%)" />
        <path
          d="M0 -10 L3 -3 L10.5 -3 L4.5 1.5 L6.8 9 L0 4.5 L-6.8 9 L-4.5 1.5 L-10.5 -3 L-3 -3 Z"
          fill="#FFFFFF"
        />
      </g>
    </svg>
  );
}

export function EvidenceHero({ onAdd }: { onAdd: () => void }) {
  return (
    <section className={lightHeroClassName}>
      <HeroWaves />

      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-[36rem] space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            <span className="text-[hsl(var(--foreground))]">My </span>
            <span className="text-[hsl(var(--primary))]">Evidence</span>
          </h1>
          <p className="text-[15px] leading-relaxed text-[hsl(var(--foreground)/0.8)] sm:text-base">
            Build your verified skill profile with certifications, projects,
            internships, and achievements.
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <CircleCheck className="h-4 w-4" aria-hidden="true" />
              Your Portfolio
            </span>
            <span
              aria-hidden="true"
              className="hidden h-4 w-px bg-[hsl(var(--border))] sm:block"
            />
            <span className="text-[hsl(var(--foreground)/0.75)]">
              Keep adding evidence to improve your readiness.
            </span>
          </div>
        </div>

        <div className="pointer-events-none absolute right-[250px] top-1/2 hidden h-[150px] w-[210px] -translate-y-1/2 xl:block 2xl:right-[290px]">
          <CertificateIllustration />
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="relative inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-[hsl(var(--primary))] px-6 py-3.5 text-base font-semibold text-white shadow-[0_10px_24px_-10px_hsl(var(--primary)/0.8)] transition-all hover:-translate-y-0.5 hover:bg-[hsl(var(--color-primary-600))] hover:shadow-[0_14px_28px_-12px_hsl(var(--primary)/0.9)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)] focus-visible:ring-offset-2 md:self-center"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          Add Evidence
        </button>
      </div>
    </section>
  );
}
