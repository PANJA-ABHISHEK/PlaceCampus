// ============================================
// PlaceCampus — Design Tokens (TypeScript)
// ============================================
// Mirrors CSS custom properties for use in JS/TS.
// Prefer CSS vars in components; use these for
// programmatic access (charts, animations, etc.)
// ============================================

export const colors = {
  primary: {
    DEFAULT: "hsl(24, 95%, 53%)",
    light: "hsl(28, 100%, 62%)",
    dark: "hsl(20, 90%, 44%)",
    50: "hsl(33, 100%, 96%)",
    100: "hsl(31, 100%, 90%)",
    200: "hsl(29, 100%, 80%)",
    300: "hsl(27, 98%, 68%)",
    400: "hsl(25, 97%, 58%)",
    500: "hsl(24, 95%, 53%)",
    600: "hsl(20, 90%, 44%)",
    700: "hsl(17, 88%, 36%)",
    800: "hsl(15, 79%, 30%)",
    900: "hsl(13, 75%, 25%)",
  },
  navy: {
    DEFAULT: "hsl(222, 47%, 15%)",
    light: "hsl(220, 40%, 25%)",
    dark: "hsl(224, 50%, 10%)",
    50: "hsl(220, 33%, 96%)",
    100: "hsl(220, 30%, 90%)",
    200: "hsl(221, 28%, 78%)",
    300: "hsl(222, 26%, 62%)",
    400: "hsl(222, 32%, 42%)",
    500: "hsl(222, 40%, 28%)",
    600: "hsl(222, 47%, 15%)",
    700: "hsl(224, 50%, 10%)",
  },
  success: "hsl(152, 60%, 42%)",
  warning: "hsl(38, 92%, 50%)",
  error: "hsl(0, 72%, 51%)",
  info: "hsl(210, 92%, 45%)",
} as const;

export const durations = {
  instant: 75,
  micro: 150,
  fast: 200,
  normal: 300,
  moderate: 400,
  slow: 600,
  reveal: 800,
  hero: 1200,
  float: 6000,
} as const;

export const easings = {
  default: "cubic-bezier(0.25, 0.1, 0.25, 1)",
  in: "cubic-bezier(0.4, 0, 1, 1)",
  out: "cubic-bezier(0, 0, 0.2, 1)",
  inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
} as const;

/** Recharts-compatible color palette for charts */
export const chartColors = [
  colors.primary.DEFAULT,
  colors.navy.DEFAULT,
  colors.success,
  colors.warning,
  colors.info,
  colors.primary[300],
  colors.navy[300],
] as const;
