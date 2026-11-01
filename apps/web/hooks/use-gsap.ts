"use client";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "./use-reduced-motion";

/**
 * useGSAP — safely initializes GSAP with ScrollTrigger in a React component.
 *
 * Dynamically imports GSAP (client-only) and provides the gsap instance
 * via callback. Respects prefers-reduced-motion.
 *
 * Usage:
 * ```tsx
 * useGSAP((gsap, ScrollTrigger) => {
 *   gsap.from(ref.current, { opacity: 0, y: 40 });
 * }, []);
 * ```
 */
export function useGSAP(
  callback: (
    gsap: typeof import("gsap").gsap,
    ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger,
  ) => void | (() => void),
  deps: React.DependencyList = [],
) {
  const prefersReduced = useReducedMotion();
  const cleanupRef = useRef<(() => void) | void>(undefined);

  useEffect(() => {
    if (prefersReduced) return;

    let cancelled = false;

    async function init() {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      if (cancelled) return;

      cleanupRef.current = callback(gsap, ScrollTrigger);
    }

    init();

    return () => {
      cancelled = true;
      if (typeof cleanupRef.current === "function") {
        cleanupRef.current();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefersReduced, ...deps]);
}
