import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AnalyzeResumeDto,
  ResumeAnalysis,
  ResumeAnalysisSummary,
  StoredResume,
} from "@placecampus/shared-types";
import { apiClient } from "@/lib/api-client";

const KEYS = {
  resume: ["resume-analyzer", "resume"] as const,
  history: ["resume-analyzer", "analyses"] as const,
  analysis: (id: string) => ["resume-analyzer", "analyses", id] as const,
};

export function useCurrentResume() {
  return useQuery({
    queryKey: KEYS.resume,
    queryFn: async () => (await apiClient.get<{ resume: StoredResume | null }>("/resume-analyzer/resume")).resume,
  });
}

export function useAnalysisHistory() {
  return useQuery({
    queryKey: KEYS.history,
    queryFn: () => apiClient.get<ResumeAnalysisSummary[]>("/resume-analyzer/analyses"),
  });
}

export function useResumeAnalysis(id: string | null) {
  return useQuery({
    queryKey: KEYS.analysis(id ?? ""),
    queryFn: () => apiClient.get<ResumeAnalysis>(`/resume-analyzer/analyses/${id}`),
    enabled: !!id,
    staleTime: Infinity, // saved analyses never change
  });
}

export function useUploadResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress?: (percent: number) => void }) => {
      const data = new FormData();
      data.append("file", file);
      return apiClient.upload<StoredResume>("/resume-analyzer/resume", data, onProgress);
    },
    onSuccess: (resume) => queryClient.setQueryData(KEYS.resume, resume),
  });
}

export function useRemoveResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.delete<{ removed: true }>("/resume-analyzer/resume"),
    onSuccess: () => queryClient.setQueryData(KEYS.resume, null),
  });
}

export function useAnalyzeResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: AnalyzeResumeDto) => apiClient.post<ResumeAnalysis>("/resume-analyzer/analyses", dto),
    onSuccess: (analysis) => {
      queryClient.setQueryData(KEYS.analysis(analysis.id), analysis);
      queryClient.invalidateQueries({ queryKey: KEYS.history });
    },
  });
}

export function useDeleteAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<{ deleted: true }>(`/resume-analyzer/analyses/${id}`),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<ResumeAnalysisSummary[]>(KEYS.history, (rows) => rows?.filter((row) => row.id !== id));
      queryClient.removeQueries({ queryKey: KEYS.analysis(id) });
    },
  });
}
