import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  AnalyticsEvidence,
  AnalyticsFilters,
  AnalyticsOverview,
  AnalyticsPlacements,
  AnalyticsPreparation,
  AnalyticsReadiness,
  AnalyticsSkills,
} from "@placecampus/shared-types";

export const ANALYTICS_KEYS = {
  all: ["analytics"] as const,
};

function params(filters: AnalyticsFilters) {
  return Object.fromEntries(
    Object.entries(filters)
      .filter(([, value]) => value !== undefined && value !== "")
      .map(([key, value]) => [key, String(value)]),
  );
}

export function useAnalytics(filters: AnalyticsFilters = {}) {
  const queryParams = params(filters);
  const options = { queryParams };
  return {
    overview: useQuery({
      queryKey: [...ANALYTICS_KEYS.all, "overview", queryParams],
      queryFn: () => apiClient.get<AnalyticsOverview>("/analytics/overview", { params: options.queryParams }),
    }),
    readiness: useQuery({
      queryKey: [...ANALYTICS_KEYS.all, "readiness", queryParams],
      queryFn: () => apiClient.get<AnalyticsReadiness>("/analytics/readiness", { params: options.queryParams }),
    }),
    skills: useQuery({
      queryKey: [...ANALYTICS_KEYS.all, "skills", queryParams],
      queryFn: () => apiClient.get<AnalyticsSkills>("/analytics/skills", { params: options.queryParams }),
    }),
    placements: useQuery({
      queryKey: [...ANALYTICS_KEYS.all, "placements", queryParams],
      queryFn: () => apiClient.get<AnalyticsPlacements>("/analytics/placements", { params: options.queryParams }),
    }),
    evidence: useQuery({
      queryKey: [...ANALYTICS_KEYS.all, "evidence", queryParams],
      queryFn: () => apiClient.get<AnalyticsEvidence>("/analytics/evidence", { params: options.queryParams }),
    }),
    preparation: useQuery({
      queryKey: [...ANALYTICS_KEYS.all, "preparation", queryParams],
      queryFn: () => apiClient.get<AnalyticsPreparation>("/analytics/preparation", { params: options.queryParams }),
    }),
  };
}
