import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  EvidenceItem,
  CreateEvidenceDto,
  UpdateEvidenceDto,
  VerificationRecord,
} from "@placecampus/shared-types";

const EVIDENCE_KEYS = {
  all: ["evidence"] as const,
  me: ["evidence", "me"] as const,
  detail: (id: string) => ["evidence", id] as const,
};

export function useMyEvidence() {
  return useQuery({
    queryKey: EVIDENCE_KEYS.me,
    queryFn: async () => {
      const res = await apiClient.get<EvidenceItem[]>("/evidence/me");
      return res;
    },
  });
}

export function useEvidence(id: string) {
  return useQuery({
    queryKey: EVIDENCE_KEYS.detail(id),
    queryFn: async () => {
      const res = await apiClient.get<EvidenceItem>(`/evidence/${id}`);
      return res;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      // Poll every 3 seconds if the status is PROCESSING
      return query.state.data?.status === "PROCESSING" ? 3000 : false;
    },
  });
}

export function useCreateEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateEvidenceDto) => {
      return apiClient.post<EvidenceItem>("/evidence", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EVIDENCE_KEYS.me });
    },
  });
}

export function useUpdateEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateEvidenceDto;
    }) => {
      return apiClient.patch<EvidenceItem>(`/evidence/${id}`, data);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: EVIDENCE_KEYS.me });
      queryClient.invalidateQueries({
        queryKey: EVIDENCE_KEYS.detail(variables.id),
      });
    },
  });
}

export function useDeleteEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete<{ success: boolean }>(`/evidence/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EVIDENCE_KEYS.me });
    },
  });
}

export function useUploadEvidenceDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      file,
      onProgress,
    }: {
      id: string;
      file: File;
      onProgress?: (percent: number) => void;
    }) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiClient.upload<EvidenceItem>(
        `/evidence/${id}/document`,
        formData,
        onProgress,
      );
      return res;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: EVIDENCE_KEYS.me });
      queryClient.invalidateQueries({
        queryKey: EVIDENCE_KEYS.detail(variables.id),
      });
    },
  });
}

export function useEvidenceVerification(evidenceId: string) {
  return useQuery({
    queryKey: [...EVIDENCE_KEYS.detail(evidenceId), "verification"],
    queryFn: async () => {
      const res = await apiClient.get<VerificationRecord>(
        `/evidence/${evidenceId}/verification`,
      );
      return res;
    },
    enabled: !!evidenceId,
    retry: false, // Don't retry infinitely if there's no record yet
  });
}

/**
 * The document download endpoint requires a bearer token, so a plain link
 * cannot open it. Fetch it through the API client and open a blob URL.
 */
export async function openEvidenceDocument(evidenceId: string) {
  // Open the tab synchronously so popup blockers allow it.
  const tab = window.open("", "_blank");
  try {
    const blob = await apiClient.get<Blob>(
      `/evidence/${evidenceId}/document/download`,
      { responseType: "blob" },
    );
    const url = URL.createObjectURL(blob);
    if (tab) tab.location.href = url;
    else window.location.href = url;
    // Give the new tab time to load before releasing the blob.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    tab?.close();
    throw error;
  }
}

export function useEvidenceDocumentBlob(evidenceId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...EVIDENCE_KEYS.detail(evidenceId), "document"],
    queryFn: () =>
      apiClient.get<Blob>(`/evidence/${evidenceId}/document/download`, {
        responseType: "blob",
      }),
    enabled: !!evidenceId && enabled,
    staleTime: 5 * 60_000,
    retry: false,
  });
}
