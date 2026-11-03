'use client';

import * as React from 'react';
import { gsap } from 'gsap';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

export interface AuthMotionEnv {
  /** Desktop layout with a fine pointer — enables parallax and continuous drift. */
  desktop: boolean;
}

/**
 * Runs scoped GSAP motion for the auth illustration.
 *
 * Unlike the shared useGSAP hook, GSAP is imported statically and the setup runs
 * in a layout effect, so initial states are applied before the browser paints.
 * Skips entirely when the user prefers reduced motion; everything is reverted
 * on unmount through gsap.context.
 */
export function useAuthMotion(
  scopeRef: React.RefObject<HTMLElement | null>,
  setup: (env: AuthMotionEnv) => void | (() => void),
) {
  useIsomorphicLayoutEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const desktop = window.matchMedia('(min-width: 1024px) and (pointer: fine)').matches;
    let teardown: void | (() => void);
    const context = gsap.context(() => {
      teardown = setup({ desktop });
    }, scope);

    return () => {
      teardown?.();
      context.revert();
    };
    // Setup runs once per mount; route-driven changes remount via keys instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export { gsap };
