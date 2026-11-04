"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface ThemeProviderProps {
  children: ReactNode;
}

/** Portals whose screens are styled for both light and dark themes. */
const THEMEABLE_PREFIXES = ["/student"];

export function ThemeProvider({ children }: ThemeProviderProps) {
  const pathname = usePathname() ?? "";
  const themeable = THEMEABLE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
      // Everything else (landing, sign-in, staff portals) stays light whatever the student picked.
      forcedTheme={themeable ? undefined : "light"}
    >
      {children}
    </NextThemesProvider>
  );
}
