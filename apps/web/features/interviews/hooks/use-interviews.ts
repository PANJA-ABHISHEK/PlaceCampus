import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  MockInterview,
  InterviewSlot,
  CreateInterviewSlotDto,
  EvaluateInterviewDto,
  FacultyInterviewSummary,
  InterviewQuestion,
  InterviewQuestionInput,
  QuestionBankEntry,
  RescheduleInterviewDto,
  RtcConfigResponse,
  ScheduleInterviewDto,
} from "@placecampus/shared-types";

export const INTERVIEW_KEYS = {
  all: ["interviews"] as const,
  student: () => [...INTERVIEW_KEYS.all, "student"] as const,
  faculty: () => [...INTERVIEW_KEYS.all, "faculty"] as const,
  summary: () => [...INTERVIEW_KEYS.all, "faculty", "summary"] as const,
  detail: (id: string) => [...INTERVIEW_KEYS.all, "detail", id] as const,
  room: (roomId: string) => [...INTERVIEW_KEYS.all, "room", roomId] as const,
  questionBank: () => [...INTERVIEW_KEYS.all, "question-bank"] as const,
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

export function useFacultyInterviewSummary() {
  return useQuery({
    queryKey: INTERVIEW_KEYS.summary(),
    queryFn: () => apiClient.get<FacultyInterviewSummary>("/faculty/interviews/summary"),
    // "Waiting" and the counts change while students join; keep them fresh.
    refetchInterval: 30_000,
  });
}

/** Invalidates everything that shows faculty interview state. */
function useInvalidateFaculty() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    queryClient.invalidateQueries({ queryKey: INTERVIEW_KEYS.faculty() });
    if (id) queryClient.invalidateQueries({ queryKey: INTERVIEW_KEYS.detail(id) });
    queryClient.invalidateQueries({ queryKey: [...INTERVIEW_KEYS.all, "room"] });
  };
}

export function useEvaluateInterview() {
  const invalidate = useInvalidateFaculty();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EvaluateInterviewDto }) =>
      apiClient.post<MockInterview>(`/faculty/interviews/${id}/evaluate`, payload),
    onSuccess: (_data, variables) => invalidate(variables.id),
  });
}

export function useScheduleInterview() {
  const invalidate = useInvalidateFaculty();
  return useMutation({
    mutationFn: (dto: ScheduleInterviewDto) =>
      apiClient.post<MockInterview>("/faculty/interviews", dto),
    onSuccess: () => invalidate(),
  });
}

export function useRescheduleInterview() {
  const invalidate = useInvalidateFaculty();
  return useMutation({
    mutationFn: ({ id, ...dto }: RescheduleInterviewDto & { id: string }) =>
      apiClient.post<MockInterview>(`/faculty/interviews/${id}/reschedule`, dto),
    onSuccess: (_data, variables) => invalidate(variables.id),
  });
}

export function useCancelFacultyInterview() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateFaculty();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiClient.post<MockInterview>(`/faculty/interviews/${id}/cancel`, {
        reason: reason || undefined,
      }),
    onSuccess: (_data, variables) => {
      invalidate(variables.id);
      queryClient.invalidateQueries({ queryKey: INTERVIEW_KEYS.facultySlots() });
    },
  });
}

export function useEndInterview() {
  const invalidate = useInvalidateFaculty();
  return useMutation({
    mutationFn: (id: string) => apiClient.post<MockInterview>(`/faculty/interviews/${id}/end`),
    onSuccess: (_data, id) => invalidate(id),
  });
}

export function useQuestionBank(enabled = true) {
  return useQuery({
    queryKey: INTERVIEW_KEYS.questionBank(),
    queryFn: () => apiClient.get<QuestionBankEntry[]>("/faculty/interview-question-bank"),
    staleTime: Infinity,
    enabled,
  });
}

/* Question and notes mutations return fresh data; callers update their local state. */

export function addInterviewQuestions(id: string, questions: InterviewQuestionInput[]) {
  return apiClient.post<InterviewQuestion[]>(`/faculty/interviews/${id}/questions`, { questions });
}

export function updateInterviewQuestion(
  id: string,
  questionId: string,
  patch: { asked?: boolean; feedback?: string },
) {
  return apiClient.patch<InterviewQuestion[]>(`/faculty/interviews/${id}/questions/${questionId}`, patch);
}

export function removeInterviewQuestion(id: string, questionId: string) {
  return apiClient.delete<InterviewQuestion[]>(`/faculty/interviews/${id}/questions/${questionId}`);
}

export function saveFacultyNotes(id: string, notes: string) {
  return apiClient.put<{ facultyNotes: string; savedAt: string }>(`/faculty/interviews/${id}/notes`, { notes });
}

/* ------------------------------ Video room ------------------------------ */

export function useInterviewRoomDetails(roomId: string) {
  return useQuery({
    queryKey: INTERVIEW_KEYS.room(roomId),
    queryFn: () => apiClient.get<MockInterview>(`/interviews/rooms/${roomId}`),
    enabled: /^[a-f0-9]{32}$/.test(roomId),
    retry: false,
  });
}

export function fetchRtcConfig() {
  return apiClient.get<RtcConfigResponse>("/interviews/rtc-config");
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
