import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  MockInterview,
  InterviewRubric,
  InterviewSlot,
  CreateInterviewSlotDto,
} from "@placecampus/shared-types";

export const INTERVIEW_KEYS = {
  all: ["interviews"] as const,
  student: () => [...INTERVIEW_KEYS.all, "student"] as const,
  faculty: () => [...INTERVIEW_KEYS.all, "faculty"] as const,
  detail: (id: string) => [...INTERVIEW_KEYS.all, "detail", id] as const,
  openSlots: () => [...INTERVIEW_KEYS.all, "slots", "open"] as const,
  facultySlots: () => [...INTERVIEW_KEYS.all, "slots", "faculty"] as const,
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
    onSuccess: (_data, variables) => {
      // Refetch rather than cache the raw response, which lacks participant names.
      queryClient.invalidateQueries({
        queryKey: INTERVIEW_KEYS.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: INTERVIEW_KEYS.faculty() });
    },
  });
}

/* ---------------------------- Student booking ---------------------------- */

export function useOpenInterviewSlots(enabled = true) {
  return useQuery({
    queryKey: INTERVIEW_KEYS.openSlots(),
    queryFn: () => apiClient.get<InterviewSlot[]>("/student/interview-slots"),
    enabled,
  });
}

export function useBookInterviewSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slotId: string) =>
      apiClient.post<MockInterview>(`/student/interview-slots/${slotId}/book`),
    onSettled: () => {
      // Refresh either way: after a conflict the slot list is stale.
      queryClient.invalidateQueries({ queryKey: INTERVIEW_KEYS.openSlots() });
      queryClient.invalidateQueries({ queryKey: INTERVIEW_KEYS.student() });
    },
  });
}

export function useCancelStudentInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiClient.post<MockInterview>(`/student/interviews/${id}/cancel`, {
        reason: reason || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INTERVIEW_KEYS.student() });
      queryClient.invalidateQueries({ queryKey: INTERVIEW_KEYS.openSlots() });
    },
  });
}

/* ----------------------------- Faculty slots ----------------------------- */

export function useFacultyInterviewSlots() {
  return useQuery({
    queryKey: INTERVIEW_KEYS.facultySlots(),
    queryFn: () => apiClient.get<InterviewSlot[]>("/faculty/interview-slots"),
  });
}

export function useCreateInterviewSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateInterviewSlotDto) =>
      apiClient.post<InterviewSlot>("/faculty/interview-slots", dto),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: INTERVIEW_KEYS.facultySlots(),
      }),
  });
}

export function useCancelInterviewSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiClient.post<InterviewSlot>(`/faculty/interview-slots/${id}/cancel`, {
        reason: reason || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: INTERVIEW_KEYS.facultySlots(),
      });
      queryClient.invalidateQueries({ queryKey: INTERVIEW_KEYS.faculty() });
    },
  });
}

function useFacultyInterviewAction(action: "start" | "no-show") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<MockInterview>(`/faculty/interviews/${id}/${action}`),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: INTERVIEW_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: INTERVIEW_KEYS.faculty() });
    },
  });
}

export const useStartInterview = () => useFacultyInterviewAction("start");
export const useMarkInterviewNoShow = () =>
  useFacultyInterviewAction("no-show");
