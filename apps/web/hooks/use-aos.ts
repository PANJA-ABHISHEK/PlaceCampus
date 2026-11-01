"use client";

import { useEffect } from "react";
import { aosConfig } from "@/config/animation";
import { useReducedMotion } from "./use-reduced-motion";

/**
 * useAOS — initializes AOS (Animate On Scroll) library.
 *
 * Call once in your layout or page component.
 * Respects prefers-reduced-motion by disabling animations.
 */
export function useAOS() {
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (prefersReduced) return;

    async function init() {
      const AOS = (await import("aos")).default;
      AOS.init({
        ...aosConfig,
        disable: false,
      });
    }

    init();

    return () => {
      // AOS doesn't have a formal destroy, but we can refresh on unmount
    };
  }, [prefersReduced]);
}
