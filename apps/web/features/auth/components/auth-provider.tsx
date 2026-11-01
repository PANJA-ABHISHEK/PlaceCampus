"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { UserReference } from "@placecampus/shared-types";

interface AuthState {
  user: UserReference | null;
  loading: boolean;
  authenticated: boolean;
  setAuth: (accessToken: string) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const queryClient = useQueryClient();

  const setAuth = React.useCallback(
    (token: string) => {
      setAccessToken(token);
      apiClient.setAccessToken(token);
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
    [queryClient],
  );

  const clearAuth = React.useCallback(() => {
    setAccessToken(null);
    apiClient.setAccessToken(null);
    queryClient.setQueryData(["auth", "me"], null);
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
          setAuth(res.accessToken);
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
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await apiClient.get<{ user: UserReference }>("/auth/me");
      return res.user;
    },
    enabled: !!accessToken,
    retry: false,
  });

  const loading = !initialized || isLoading;

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
      {children}
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
