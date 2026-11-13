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
import { ANALYTICS_KEYS } from "@/features/analytics/hooks/use-analytics";

/**
 * Single-endpoint analytics queries for the Placement Head pages, so each page
 * loads only what it shows. Keys share the ANALYTICS_KEYS prefix with the
 * institutional analytics page, so cached results are reused across pages.
 */
type Endpoint = "overview" | "readiness" | "skills" | "placements" | "evidence" | "preparation";

function cleanParams(filters: AnalyticsFilters) {
  return Object.fromEntries(
    Object.entries(filters)
      .filter(([, value]) => value !== undefined && value !== "")
      .map(([key, value]) => [key, String(value)]),
  );
}

function useEndpoint<T>(endpoint: Endpoint, filters: AnalyticsFilters = {}) {
  const params = cleanParams(filters);
  return useQuery({
    queryKey: [...ANALYTICS_KEYS.all, endpoint, params],
    queryFn: () => apiClient.get<T>(`/analytics/${endpoint}`, { params }),
  });
}

export const useOverview = (f?: AnalyticsFilters) => useEndpoint<AnalyticsOverview>("overview", f);
export const useReadiness = (f?: AnalyticsFilters) => useEndpoint<AnalyticsReadiness>("readiness", f);
export const usePlacements = (f?: AnalyticsFilters) => useEndpoint<AnalyticsPlacements>("placements", f);
export const useEvidence = (f?: AnalyticsFilters) => useEndpoint<AnalyticsEvidence>("evidence", f);
export const usePreparation = (f?: AnalyticsFilters) => useEndpoint<AnalyticsPreparation>("preparation", f);
export const useSkills = (f?: AnalyticsFilters) => useEndpoint<AnalyticsSkills>("skills", f);
