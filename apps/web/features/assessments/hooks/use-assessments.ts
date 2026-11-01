import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Assessment, AssessmentAttempt } from "@placecampus/shared-types";

export const ASSESSMENT_KEYS = {
  all: ["assessments"] as const,
  lists: () => [...ASSESSMENT_KEYS.all, "list"] as const,
  detail: (id: string) => [...ASSESSMENT_KEYS.all, "detail", id] as const,
  history: () => [...ASSESSMENT_KEYS.all, "history"] as const,
  attempt: (id: string) => [...ASSESSMENT_KEYS.all, "attempt", id] as const,
};

export function useAssessments() {
  return useQuery({
    queryKey: ASSESSMENT_KEYS.lists(),
    queryFn: () => apiClient.get<Assessment[]>("/assessments"),
  });
}

export function useAssessment(id: string) {
  return useQuery({
    queryKey: ASSESSMENT_KEYS.detail(id),
    queryFn: () => apiClient.get<Assessment>(`/assessments/${id}`),
    enabled: !!id,
  });
}

export function useStudentAssessmentHistory() {
  return useQuery({
    queryKey: ASSESSMENT_KEYS.history(),
    queryFn: () => apiClient.get<AssessmentAttempt[]>("/student/assessments"),
  });
}

export function useStartAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assessmentId: string) =>
      apiClient.post<AssessmentAttempt>(`/assessments/${assessmentId}/start`),
    onSuccess: (data) => {
      queryClient.setQueryData(ASSESSMENT_KEYS.attempt(data.id), data);
      queryClient.invalidateQueries({ queryKey: ASSESSMENT_KEYS.history() });
    },
  });
}

export function useSubmitAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      attemptId,
      payload,
    }: {
      attemptId: string;
      payload: { answers: Record<string, string> };
    }) =>
      apiClient.post<AssessmentAttempt>(
        `/student/assessments/${attemptId}/submit`,
        payload,
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(ASSESSMENT_KEYS.attempt(data.id), data);
      queryClient.invalidateQueries({ queryKey: ASSESSMENT_KEYS.history() });
    },
  });
}
