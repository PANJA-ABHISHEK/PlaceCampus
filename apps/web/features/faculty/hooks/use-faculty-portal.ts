import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  FacultyDashboard,
  FacultyStudentDetail,
  FacultyStudentSummary,
} from "@placecampus/shared-types";
import { apiClient } from "@/lib/api-client";
import { FACULTY_KEYS } from "./use-faculty-reviews";

export const PORTAL_KEYS = {
  all: ["faculty", "portal"] as const,
  dashboard: () => [...PORTAL_KEYS.all, "dashboard"] as const,
  students: () => [...PORTAL_KEYS.all, "students"] as const,
  student: (id: string) => [...PORTAL_KEYS.all, "student", id] as const,
};

/** KPIs, review queue, upcoming interviews and assigned students in one call. */
export function useFacultyDashboard() {
  return useQuery({
    queryKey: PORTAL_KEYS.dashboard(),
    queryFn: () => apiClient.get<FacultyDashboard>("/faculty/dashboard"),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useFacultyStudents() {
  return useQuery({
    queryKey: PORTAL_KEYS.students(),
    queryFn: () => apiClient.get<FacultyStudentSummary[]>("/faculty/students"),
  });
}

export function useFacultyStudent(id: string) {
  return useQuery({
    queryKey: PORTAL_KEYS.student(id),
    queryFn: () => apiClient.get<FacultyStudentDetail>(`/faculty/students/${id}`),
    enabled: !!id,
    retry: false,
  });
}

type LockResponse = { reviewState: "ASSIGNED" | "CLAIMED"; reviewLockExpiresAt?: string };

/** Claim or renew the 30-minute review lock. */
export function useClaimReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post<LockResponse>(`/faculty/reviews/${id}/claim`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FACULTY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: PORTAL_KEYS.dashboard() });
    },
  });
}

export function useReleaseReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post<LockResponse>(`/faculty/reviews/${id}/release`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FACULTY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: PORTAL_KEYS.dashboard() });
    },
  });
}
