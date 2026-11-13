import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { AiAnalysisSummary, EvidenceExtractionSummary, EvidenceItem, VerificationRecord } from "@placecampus/shared-types";

export const FACULTY_KEYS = {
  all: ["faculty", "reviews"] as const,
  lists: () => [...FACULTY_KEYS.all, "list"] as const,
  list: (filters: string) => [...FACULTY_KEYS.lists(), { filters }] as const,
  details: () => [...FACULTY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...FACULTY_KEYS.details(), id] as const,
};

export type ReviewDetailResponse = {
  evidence: EvidenceItem;
  verificationRecord: VerificationRecord | null;
  /** Latest text extraction (text layer and/or OCR), if one has run. */
  extraction?: EvidenceExtractionSummary | null;
  /** Latest AI document analysis (advisory), if one was recorded. */
  aiAnalysis?: AiAnalysisSummary | null;
};

/** The caller's own review queue; `filter: "overdue"` limits it to items past their due date. */
export function useFacultyReviews(status?: string, type?: string, filter?: "overdue") {
  return useQuery({
    queryKey: FACULTY_KEYS.list(JSON.stringify({ status, type, filter })),
    // Keep the faculty queue current when students submit evidence in another tab.
    refetchInterval: 5000,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (type) params.append("type", type);
      if (filter) params.append("filter", filter);

      const queryString = params.toString();
      const url = `/faculty/reviews${queryString ? `?${queryString}` : ""}`;

      return apiClient.get<EvidenceItem[]>(url);
    },
  });
}

export function useFacultyReview(id: string) {
  return useQuery({
    queryKey: FACULTY_KEYS.detail(id),
    queryFn: () =>
      apiClient.get<ReviewDetailResponse>(`/faculty/reviews/${id}`),
    enabled: !!id,
  });
}

export function useApproveEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiClient.patch(`/faculty/reviews/${id}/approve`, { reason }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: FACULTY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ["evidence"] });
      queryClient.invalidateQueries({ queryKey: ["faculty", "portal"] });
    },
  });
}

export function useRejectEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient.patch(`/faculty/reviews/${id}/reject`, { reason }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: FACULTY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ["evidence"] });
      queryClient.invalidateQueries({ queryKey: ["faculty", "portal"] });
    },
  });
}

export function useRequestResubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient.patch(`/faculty/reviews/${id}/request-resubmission`, {
        reason,
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: FACULTY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ["evidence"] });
      queryClient.invalidateQueries({ queryKey: ["faculty", "portal"] });
    },
  });
}

const documentPath = (id: string) => `/faculty/reviews/${id}/document/download`;

/** The download endpoint needs the bearer token, so fetch it as a blob. */
export function useFacultyDocumentBlob(id: string, enabled: boolean) {
  return useQuery({
    queryKey: [...FACULTY_KEYS.detail(id), "document"],
    queryFn: () => apiClient.get<Blob>(documentPath(id), { responseType: "blob" }),
    enabled: !!id && enabled,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/** Opens the original document in a new tab (tab opened first so popup blockers allow it). */
export async function openFacultyDocument(id: string) {
  const tab = window.open("", "_blank");
  try {
    const blob = await apiClient.get<Blob>(documentPath(id), { responseType: "blob" });
    const url = URL.createObjectURL(blob);
    if (tab) tab.location.href = url;
    else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    tab?.close();
    throw error;
  }
}
