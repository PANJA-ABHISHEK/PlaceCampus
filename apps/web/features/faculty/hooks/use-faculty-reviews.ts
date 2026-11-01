import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { EvidenceItem, VerificationRecord } from "@placecampus/shared-types";

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
};

export function useFacultyReviews(status?: string, type?: string) {
  return useQuery({
    queryKey: FACULTY_KEYS.list(JSON.stringify({ status, type })),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (type) params.append("type", type);

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
    },
  });
}
