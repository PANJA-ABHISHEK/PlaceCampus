import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { ReadinessSnapshot } from "@placecampus/shared-types";

export const READINESS_KEYS = {
  all: ["readiness"] as const,
  current: () => [...READINESS_KEYS.all, "current"] as const,
  history: () => [...READINESS_KEYS.all, "history"] as const,
};

export function useStudentReadiness() {
  return useQuery({
    queryKey: READINESS_KEYS.current(),
    queryFn: () => apiClient.get<ReadinessSnapshot>("/student/readiness"),
  });
}

export function useReadinessHistory() {
  return useQuery({
    queryKey: READINESS_KEYS.history(),
    queryFn: () =>
      apiClient.get<ReadinessSnapshot[]>("/student/readiness/history"),
  });
}
