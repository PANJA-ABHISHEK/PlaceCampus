"use client";

import { useState, useEffect } from "react";

/**
 * useReducedMotion — detects the user's prefers-reduced-motion setting.
 *
 * Returns true if the user prefers reduced motion, false otherwise.
 * Updates reactively when the system preference changes.
 */
export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefersReduced(mql.matches);
    const handler = (event: MediaQueryListEvent) => {
      setPrefersReduced(event.matches);
    };

    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return prefersReduced;
}
