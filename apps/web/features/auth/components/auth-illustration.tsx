'use client';

import * as React from 'react';
import { BadgeCheck, BriefcaseBusiness, FileCheck2, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { gsap, useAuthMotion } from '../hooks/use-auth-motion';
import styles from './auth-motion.module.css';

/** Illustrative values only — the auth illustration never shows live data. */
const SAMPLE_READINESS = 78;
const SAMPLE_BARS = [
  { label: 'Verified skills', status: 'Profile', value: 76, tone: 'bg-orange-400' },
  { label: 'Evidence review', status: 'In progress', value: 58, tone: 'bg-white/75' },
] as const;

const RING_RADIUS = 45;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ringOffset(value: number) {
  return RING_CIRCUMFERENCE * (1 - value / 100);
}

/**
 * Shared illustration motion: ring count-up, bar fill, step reveal, and on
 * desktop a gentle badge drift, slow orbit rotation and pointer parallax.
 */
function useIllustrationMotion(scopeRef: React.RefObject<HTMLDivElement | null>) {
  useAuthMotion(scopeRef, ({ desktop }) => {
    const scope = scopeRef.current;
    if (!scope) return;

    scope.querySelectorAll<HTMLElement>('[data-ring]').forEach((ring) => {
      const target = Number(ring.dataset.ring) || 0;
      const progress = ring.querySelector<SVGCircleElement>('[data-ring-progress]');
      const label = ring.querySelector<HTMLElement>('[data-ring-value]');
      const counter = { value: 0 };
      const render = () => {
        progress?.setAttribute('stroke-dashoffset', String(ringOffset(counter.value)));
        if (label) label.textContent = `${Math.round(counter.value)}%`;
      };
      render();
      gsap.to(counter, {
        value: target,
        duration: 1.6,
        delay: 0.45,
        ease: 'power3.out',
        onUpdate: render,
      });
    });

    gsap.fromTo(
      '[data-bar]',
      { scaleX: 0 },
      {
        scaleX: 1,
        transformOrigin: 'left center',
        duration: 1.1,
        delay: 0.7,
        stagger: 0.18,
        ease: 'power3.out',
      },
    );

    gsap.fromTo(
      '[data-step]',
      { autoAlpha: 0, scale: 0.7 },
      { autoAlpha: 1, scale: 1, duration: 0.4, delay: 0.95, stagger: 0.1, ease: 'power2.out' },
    );

    gsap.fromTo(
      '[data-float]',
      { autoAlpha: 0, y: 12 },
      { autoAlpha: 1, y: 0, duration: 0.6, delay: 0.55, stagger: 0.12, ease: 'power3.out' },
    );

    if (!desktop) return;

    gsap.to('[data-drift]', {
      y: -6,
      duration: 3.6,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      stagger: { each: 0.6 },
    });

    scope.querySelectorAll<HTMLElement>('[data-orbit]').forEach((orbit) => {
      const direction = orbit.dataset.orbit === 'reverse' ? -1 : 1;
      gsap.to(orbit, {
        rotation: 360 * direction,
        duration: Number(orbit.dataset.orbitDuration) || 120,
        ease: 'none',
        repeat: -1,
      });
    });

    // Restrained parallax: each layer moves at most depth × 14px toward the pointer.
    const surface = scope.closest<HTMLElement>('[data-parallax-surface]') ?? scope;
    const layers = Array.from(
      surface.querySelectorAll<HTMLElement>('[data-parallax]'),
    ).map((element) => ({
      depth: Number(element.dataset.parallax) || 0,
      x: gsap.quickTo(element, 'x', { duration: 0.9, ease: 'power3.out' }),
      y: gsap.quickTo(element, 'y', { duration: 0.9, ease: 'power3.out' }),
    }));

    const handleMove = (event: PointerEvent) => {
      const bounds = surface.getBoundingClientRect();
      const nx = (event.clientX - bounds.left) / bounds.width - 0.5;
      const ny = (event.clientY - bounds.top) / bounds.height - 0.5;
      layers.forEach((layer) => {
        layer.x(nx * layer.depth * 28);
        layer.y(ny * layer.depth * 28);
      });
    };
    const handleLeave = () => {
      layers.forEach((layer) => {
        layer.x(0);
        layer.y(0);
      });
    };

    surface.addEventListener('pointermove', handleMove);
    surface.addEventListener('pointerleave', handleLeave);
    return () => {
      surface.removeEventListener('pointermove', handleMove);
      surface.removeEventListener('pointerleave', handleLeave);
    };
  });
}

interface ReadinessRingProps {
  className?: string;
  valueClassName?: string;
}

function ReadinessRing({ className, valueClassName }: ReadinessRingProps) {
  return (
    <div data-ring={SAMPLE_READINESS} className={cn('relative shrink-0', className)}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          stroke="rgba(255,255,255,.16)"
          strokeWidth="7"
        />
        <circle
          data-ring-progress
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={ringOffset(SAMPLE_READINESS)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span data-ring-value className={cn('font-bold tabular-nums text-white', valueClassName)}>
          {SAMPLE_READINESS}%
        </span>
        <span className="text-[9px] font-medium uppercase tracking-wider text-white/55">
          Sample
        </span>
      </div>
    </div>
  );
}

function SampleBars({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn('min-w-0 flex-1', compact ? 'space-y-2.5' : 'space-y-3')}>
      {SAMPLE_BARS.map((bar, index) => (
        <div key={bar.label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-[10px]">
            <span className="truncate text-white/70">{bar.label}</span>
            <span className="flex shrink-0 items-center gap-1 font-semibold text-white">
              {index === 1 && (
                <span
                  aria-hidden="true"
                  className={cn('h-1.5 w-1.5 rounded-full bg-orange-300', styles.pulseDot)}
                />
              )}
              {bar.status}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
            <div className="h-full" style={{ width: `${bar.value}%` }}>
              <div data-bar className={cn('h-full rounded-full', bar.tone, styles.barSheen)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FloatingBadge({
  className,
  children,
  tone = 'light',
}: {
  className: string;
  children: React.ReactNode;
  tone?: 'light' | 'navy';
}) {
  return (
    <div data-float className={cn('absolute z-20', className)}>
      <div data-drift>
        <div
          className={cn(
            'flex cursor-default items-center gap-2.5 rounded-2xl border shadow-xl shadow-black/15 transition-[translate,scale,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1 hover:scale-[1.03]',
            tone === 'light'
              ? 'border-[hsl(var(--border))] bg-white px-3 py-2.5 text-[hsl(var(--color-navy))] hover:border-orange-200 hover:shadow-[0_14px_34px_-10px_hsl(var(--primary)/0.6)]'
              : 'border-white/15 bg-[hsl(var(--color-navy-light))] px-3 py-2 text-white hover:border-orange-300/40 hover:shadow-[0_12px_28px_-10px_hsl(var(--primary)/0.5)]',
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

interface AuthIllustrationProps {
  compact?: boolean;
}

export function AuthIllustration({ compact = false }: AuthIllustrationProps) {
  const scopeRef = React.useRef<HTMLDivElement>(null);
  useIllustrationMotion(scopeRef);

  if (compact) {
    return (
      <div
        ref={scopeRef}
        role="img"
        aria-label="Sample readiness overview — illustrative UI, not live data"
        className="w-full rounded-2xl border border-white/15 bg-white/[0.08] p-3.5 backdrop-blur-md"
      >
        <div aria-hidden="true">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-white">Readiness overview</p>
            <span className="rounded-full border border-white/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/70">
              Sample UI
            </span>
          </div>
          <div className="flex items-center gap-3.5">
            <ReadinessRing className="h-[4.5rem] w-[4.5rem]" valueClassName="text-base" />
            <SampleBars compact />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scopeRef}
      role="img"
      aria-label="Sample student readiness dashboard — illustrative UI, not live data"
      className="relative mx-auto w-full max-w-[30rem] px-[9%] py-[13%] xl:max-w-[34rem]"
    >
      {/* Decorative orbits sit behind the card and never receive pointer events. */}
      <div aria-hidden="true" data-parallax="0.6" className="pointer-events-none absolute inset-0 z-0">
        <div
          data-orbit
          data-orbit-duration="140"
          className="absolute left-1/2 top-1/2 aspect-square w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10"
        >
          <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-300/80" />
        </div>
        <div
          data-orbit="reverse"
          data-orbit-duration="100"
          className="absolute left-1/2 top-1/2 aspect-square w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/[0.09]"
        >
          <span className="absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-white/50" />
        </div>
      </div>

      <div data-parallax="0.18" className="relative z-10">
        <div
          aria-hidden="true"
          className={cn(
            'mx-auto w-full max-w-[19.5rem] rounded-3xl border border-white/15 bg-white/[0.08] p-4 shadow-2xl shadow-black/20 backdrop-blur-md transition-[translate,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1.5 hover:border-white/25 hover:shadow-[0_30px_60px_-20px_rgb(0_0_0/0.55)] sm:p-5',
            styles.cardEnter,
          )}
        >
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/15 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[hsl(var(--color-navy))]">
                <UserRound className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
                  Student profile
                </p>
                <p className="text-sm font-semibold text-white">Readiness overview</p>
              </div>
            </div>
            <span className="rounded-full border border-white/15 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-white/70">
              Sample UI
            </span>
          </div>

          <div className="flex items-center gap-4">
            <ReadinessRing className="h-[6.5rem] w-[6.5rem]" valueClassName="text-xl" />
            <SampleBars />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/15 pt-3 text-center">
            {['Profile', 'Evidence', 'Readiness'].map((step, index) => (
              <div key={step} className="flex flex-col items-center gap-1.5">
                <span
                  data-step
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold',
                    index < 2
                      ? 'bg-orange-400 text-[hsl(var(--color-navy))]'
                      : 'border border-white/30 text-white',
                  )}
                >
                  {index + 1}
                </span>
                <span className="text-[9px] text-white/65">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <FloatingBadge className="left-0 top-[1%]">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-[hsl(var(--primary))]">
          <BadgeCheck aria-hidden="true" className="h-4 w-4" />
        </span>
        <span>
          <span className="block text-[9px] font-medium uppercase tracking-wide text-slate-500">
            Verified skill
          </span>
          <span className="block text-xs font-semibold">React.js</span>
        </span>
      </FloatingBadge>

      <FloatingBadge className="right-[3%] top-[3%]" tone="navy">
        <FileCheck2 aria-hidden="true" className="h-4 w-4 text-orange-300" />
        <span className="text-[10px] font-medium">Evidence review · Faculty</span>
      </FloatingBadge>

      <FloatingBadge className="bottom-[1%] right-0">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-[hsl(var(--primary))]">
          <BriefcaseBusiness aria-hidden="true" className="h-4 w-4" />
        </span>
        <span>
          <span className="block text-[9px] font-medium uppercase tracking-wide text-slate-500">
            Opportunity match
          </span>
          <span className="block text-xs font-semibold">82% skill match</span>
        </span>
      </FloatingBadge>
    </div>
  );
}
