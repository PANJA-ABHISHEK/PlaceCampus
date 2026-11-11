import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface FacultyLoad {
  facultyUserId: string;
  fullName: string;
  employeeId?: string;
  department: string | null;
  sourceDepartment: string | null;
  designation?: string;
  employmentStatus: string;
  accountStatus: string;
  isDemoData: boolean;
  available: boolean;
  mentees: number;
  pendingReviews: number;
  overdueReviews: number;
  upcomingInterviews: number;
}

export interface Overview {
  target: number;
  stats: {
    totalStudents: number;
    activeFaculty: number;
    assignedStudents: number;
    unassignedStudents: number;
    pendingReviews: number;
    overdueReviews: number;
    coordinatorQueue: number;
    upcomingInterviews: number;
  };
  departments: string[];
  faculty: FacultyLoad[];
}

export interface AllocationResult {
  target: number;
  created?: number;
  skipped?: number;
  totals: { students: number; eligible: number; alreadyAssigned: number; toAssign: number; unassigned: number; activeFaculty: number; unavailableFaculty: number; facultyOverTarget: number };
  unassignedByReason: { reason: string; students: number }[];
  unmappedDepartments: { school: string; students: number }[];
  unavailableFaculty: { facultyUserId: string; fullName: string; department?: string; employmentStatus?: string; accountStatus?: string }[];
  departments: { department: string; students: number; assigned: number; faculty: number }[];
  workload: { facultyUserId: string; fullName: string; department: string; current: number; planned: number; total: number; overTarget: boolean; isDemoData: boolean }[];
}

export interface UnassignedStudent {
  studentId: string;
  registrationNumber?: string;
  fullName: string;
  reason: string;
  school?: string;
  department?: string;
}

export interface HistoryEntry {
  id: string;
  facultyUserId: string;
  facultyName: string | null;
  purposes: string[];
  status: "ACTIVE" | "ENDED";
  source?: string;
  reason?: string;
  endReason?: string;
  validFrom: string;
  validTo?: string;
  assignedByName: string | null;
  endedByName: string | null;
}

export interface FacultyOption {
  facultyUserId: string;
  fullName: string;
  department: string | null;
  designation?: string;
  employeeId?: string;
  mentees: number;
  sameDepartment: boolean;
}

const KEYS = {
  all: ["admin", "assignments"] as const,
  overview: (q: string) => [...KEYS.all, "overview", q] as const,
  unassigned: (q: string) => [...KEYS.all, "unassigned", q] as const,
  history: (id: string) => [...KEYS.all, "history", id] as const,
  options: (id: string) => [...KEYS.all, "options", id] as const,
};

export function useAssignmentOverview(q: { search?: string; department?: string; sort?: string }) {
  const params = Object.fromEntries(Object.entries(q).filter(([, v]) => v)) as Record<string, string>;
  return useQuery({
    queryKey: KEYS.overview(JSON.stringify(params)),
    queryFn: () => apiClient.get<Overview>("/admin/assignments/overview", { params }),
    placeholderData: (prev) => prev,
  });
}

export function useUnassigned(q: { reason?: string; search?: string; page: number }) {
  const params: Record<string, string> = { page: String(q.page), limit: "20" };
  if (q.reason) params.reason = q.reason;
  if (q.search) params.search = q.search;
  return useQuery({
    queryKey: KEYS.unassigned(JSON.stringify(params)),
    queryFn: () => apiClient.get<{ total: number; page: number; limit: number; items: UnassignedStudent[] }>("/admin/assignments/unassigned", { params }),
    placeholderData: (prev) => prev,
  });
}

export function useAssignmentHistory(studentId: string | null) {
  return useQuery({
    queryKey: KEYS.history(studentId ?? ""),
    queryFn: () => apiClient.get<HistoryEntry[]>(`/admin/assignments/students/${studentId}/history`),
    enabled: !!studentId,
  });
}

export interface Mentee {
  assignmentId: string;
  studentId: string;
  fullName: string;
  registrationNumber?: string;
  purposes: string[];
  source?: string;
  since: string;
}

export function useMentees(facultyUserId: string | null) {
  return useQuery({
    queryKey: [...KEYS.all, "mentees", facultyUserId ?? ""],
    queryFn: () => apiClient.get<Mentee[]>(`/admin/assignments/faculty/${facultyUserId}/mentees`),
    enabled: !!facultyUserId,
  });
}

export function useFacultyOptions(studentId: string | null) {
  return useQuery({
    queryKey: KEYS.options(studentId ?? ""),
    queryFn: () => apiClient.get<FacultyOption[]>(`/admin/assignments/students/${studentId}/faculty-options`),
    enabled: !!studentId,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: KEYS.all });
}

export function useAllocation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { commit: boolean; target: number; departmentCodes?: string[] }) =>
      apiClient.post<AllocationResult>(`/admin/assignments/allocation/${v.commit ? "commit" : "preview"}`, { target: v.target, departmentCodes: v.departmentCodes }),
    onSuccess: (_, v) => {
      if (v.commit) invalidate();
    },
  });
}

export function useAssign() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { studentId: string; facultyUserId: string; purposes: string[]; reason: string; allowCrossDepartment?: boolean; allowOverTarget?: boolean }) =>
      apiClient.post("/admin/assignments", v),
    onSuccess: invalidate,
  });
}

export function useReassign() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { assignmentId: string; facultyUserId: string; reason: string; allowCrossDepartment?: boolean; allowOverTarget?: boolean }) =>
      apiClient.post(`/admin/assignments/${v.assignmentId}/reassign`, { facultyUserId: v.facultyUserId, reason: v.reason, allowCrossDepartment: v.allowCrossDepartment, allowOverTarget: v.allowOverTarget }),
    onSuccess: invalidate,
  });
}

export function useEndAssignment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { assignmentId: string; reason: string }) => apiClient.post(`/admin/assignments/${v.assignmentId}/end`, { reason: v.reason }),
    onSuccess: invalidate,
  });
}

export const REASON_LABEL: Record<string, string> = {
  DEPARTMENT_UNMAPPED: "Department not mapped",
  NO_STUDENT_RECORD: "No institutional record (self-registered)",
  NO_FACULTY_IN_DEPARTMENT: "No faculty in department",
  ONLY_CONFLICTED_FACULTY: "Only conflicted faculty",
  ACCOUNT_DEACTIVATED: "Account deactivated",
  AWAITING_ALLOCATION: "Awaiting allocation",
};
