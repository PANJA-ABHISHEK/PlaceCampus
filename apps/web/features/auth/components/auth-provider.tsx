"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { UserReference } from "@placecampus/shared-types";
import { PORTAL_ROUTE_PATTERN, RECRUITER_LOGIN_ROUTE, SELECT_ROLE_ROUTE } from "@/lib/routes";

interface AuthState {
  user: UserReference | null;
  loading: boolean;
  authenticated: boolean;
  /** Stores the token and resolves once the signed-in user is loaded. */
  setAuth: (accessToken: string) => Promise<UserReference | null>;
  clearAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const ME_KEY = ["auth", "me"] as const;
const fetchMe = async () => (await apiClient.get<{ user: UserReference | null }>("/auth/me")).user;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const queryClient = useQueryClient();

  const setAuth = React.useCallback(
    async (token: string) => {
      setAccessToken(token);
      apiClient.setAccessToken(token);
      // Load the user before callers navigate, so portal guards never see stale role data.
      return queryClient.fetchQuery({ queryKey: ME_KEY, queryFn: fetchMe, staleTime: 0 }).catch(() => null);
    },
    [queryClient],
  );

  const clearAuth = React.useCallback(async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Clear the local session even when the server cannot be reached.
    } finally {
      setAccessToken(null);
      apiClient.setAccessToken(null);
      // Drop every cached response so the next account on this browser never sees this one's data.
      queryClient.removeQueries();
      queryClient.setQueryData(ME_KEY, null);
    }
  }, [queryClient]);

  useEffect(() => {
    let mounted = true;

    // Listen for unauthorized events to clear state
    const handleUnauthorized = () => {
      setAccessToken(null);
      queryClient.setQueryData(["auth", "me"], null);
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);

    const initAuth = async () => {
      try {
        const res = await apiClient.post<{ accessToken: string }>(
          "/auth/refresh",
        );
        if (mounted) {
          await setAuth(res.accessToken);
        }
      } catch (err) {
        // No valid session, stay unauthenticated
      } finally {
        if (mounted) setInitialized(true);
      }
    };

    initAuth();

    return () => {
      mounted = false;
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, [queryClient, setAuth]);

  const { data, isLoading } = useQuery({
    queryKey: ME_KEY,
    queryFn: fetchMe,
    enabled: !!accessToken,
    retry: false,
  });

  const loading = !initialized || isLoading;

  // A multi-role session has no active role yet: keep it out of every portal.
  const pathname = usePathname();
  const router = useRouter();
  const blocked =
    !!data?.requiresRoleSelection &&
    PORTAL_ROUTE_PATTERN.test(pathname) &&
    pathname !== RECRUITER_LOGIN_ROUTE;
  useEffect(() => {
    if (blocked) router.replace(SELECT_ROLE_ROUTE);
  }, [blocked, router]);

  return (
    <AuthContext.Provider
      value={{
        user: data || null,
        loading,
        authenticated: !!data,
        setAuth,
        clearAuth,
      }}
    >
      {blocked ? null : children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
