"use client";

import type { ReactNode } from "react";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";

import { AuthProvider } from "@/features/auth/components/auth-provider";

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Root providers wrapper — composes all client-side providers.
 * Add new providers here as the project grows.
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <AuthProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
