"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { useStudentSettings } from "../hooks/use-student-settings";

/**
 * Applies the theme saved on the student's account, so the choice follows them
 * across devices and browsers. Runs once per loaded preference value.
 */
export function ThemePreferenceSync() {
  const { data } = useStudentSettings();
  const { theme, setTheme } = useTheme();
  const saved = data?.preferences.theme;
  const applied = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!saved || applied.current === saved) return;
    applied.current = saved;
    if (theme !== saved) setTheme(saved);
  }, [saved, theme, setTheme]);

  return null;
}
