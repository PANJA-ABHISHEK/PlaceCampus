"use client";

import * as React from "react";

/** Soft orange waves anchored to the bottom-right of the light page heroes. */
export function HeroWaves() {
  const id = React.useId();
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 600 200"
      preserveAspectRatio="none"
      className="pointer-events-none absolute -right-10 bottom-0 h-full w-[70%] min-w-[420px]"
    >
      <defs>
        <linearGradient id={`${id}-a`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="hsl(24 95% 53%)" stopOpacity="0" />
          <stop offset="1" stopColor="hsl(24 95% 53%)" stopOpacity="0.16" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="hsl(28 100% 62%)" stopOpacity="0" />
          <stop offset="1" stopColor="hsl(28 100% 62%)" stopOpacity="0.22" />
        </linearGradient>
      </defs>
      <path
        d="M0 200 C 140 170 220 120 340 120 C 450 120 520 40 600 0 L600 200 Z"
        fill={`url(#${id}-a)`}
      />
      <path
        d="M80 200 C 220 190 300 160 400 155 C 490 150 550 110 600 80 L600 200 Z"
        fill={`url(#${id}-b)`}
      />
    </svg>
  );
}

/** Shared shell: cream-to-peach gradient, thin peach border, soft shadow. */
export const lightHeroClassName =
  "pc-enter relative overflow-hidden rounded-[20px] border border-[hsl(var(--primary)/0.18)] bg-gradient-to-r from-white via-[hsl(var(--color-primary-50))] to-[hsl(var(--color-primary-100))] px-6 py-7 shadow-[0_8px_30px_-18px_hsl(var(--primary)/0.35)] sm:px-8 sm:py-8";
