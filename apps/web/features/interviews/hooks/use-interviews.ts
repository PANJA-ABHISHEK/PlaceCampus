import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { MockInterview, InterviewRubric } from "@placecampus/shared-types";

export const INTERVIEW_KEYS = {
  all: ["interviews"] as const,
  student: () => [...INTERVIEW_KEYS.all, "student"] as const,
  faculty: () => [...INTERVIEW_KEYS.all, "faculty"] as const,
  detail: (id: string) => [...INTERVIEW_KEYS.all, "detail", id] as const,
};

export function useStudentInterviews() {
  return useQuery({
    queryKey: INTERVIEW_KEYS.student(),
    queryFn: () => apiClient.get<MockInterview[]>("/student/interviews"),
  });
}

export function useStudentInterview(id: string) {
  return useQuery({
    queryKey: INTERVIEW_KEYS.detail(id),
    queryFn: () => apiClient.get<MockInterview>(`/student/interviews/${id}`),
    enabled: !!id,
  });
}

export function useFacultyInterviews() {
  return useQuery({
    queryKey: INTERVIEW_KEYS.faculty(),
    queryFn: () => apiClient.get<MockInterview[]>("/faculty/interviews"),
  });
}

export function useFacultyInterview(id: string) {
  return useQuery({
    queryKey: INTERVIEW_KEYS.detail(id),
    queryFn: () => apiClient.get<MockInterview>(`/faculty/interviews/${id}`),
    enabled: !!id,
  });
}

export function useEvaluateInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { rubricScores: InterviewRubric; feedback: string };
    }) =>
      apiClient.post<MockInterview>(
        `/faculty/interviews/${id}/evaluate`,
        payload,
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(INTERVIEW_KEYS.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: INTERVIEW_KEYS.faculty() });
    },
  });
}
