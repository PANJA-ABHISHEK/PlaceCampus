import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { PlacementDrive } from '@placecampus/shared-types';

export interface RecruiterCandidateSkill {
  skillId: string;
  skillName: string;
  status: string;
}

export interface RecruiterCandidate {
  id: string;
  studentName?: string;
  studentEmail?: string;
  registrationNumber?: string;
  department?: string;
  graduationYear?: number;
  cgpa?: number;
  skillMatchCoverage?: number;
  applicationStatus?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  expiresAt?: string;
  releasedFields?: string[];
  skills?: RecruiterCandidateSkill[];
  projects?: string[];
  internshipExperience?: string[];
  resumeUrl?: string;
  recruiterNotes?: string;
  canManageApplications?: boolean;
  /** Present on cross-drive listings. */
  driveId?: string;
  companyName?: string;
  roleTitle?: string;
  appliedAt?: string;
}

export interface RecruiterApplicationHistoryItem {
  applicationId: string;
  driveId: string;
  companyName: string;
  roleTitle: string;
  appliedAt: string;
  status?: string;
  lastUpdated?: string;
  interviews: { id: string; round: string; startsAt: string; status: string; recommendation?: string; technicalScore?: number; communicationScore?: number }[];
}

export interface RecruiterCandidateProfile extends RecruiterCandidate {
  driveId: string;
  applicationHistory: RecruiterApplicationHistoryItem[];
}

export interface RecruiterCandidateFilters {
  department?: string;
  minCgpa?: number;
  maxCgpa?: number;
  graduationYear?: number;
  skill?: string;
}

export interface RecruiterCandidatePage {
  candidates: RecruiterCandidate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type RecruiterDriveLifecycle = 'ACTIVE' | 'UPCOMING' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';

export interface RecruiterDriveView {
  grantId: string;
  drive: PlacementDrive;
  lifecycle: RecruiterDriveLifecycle;
  expiresAt: string;
  releasedFields: string[];
  canManageApplications?: boolean;
}

export interface RecruiterDashboardDrive extends RecruiterDriveView {
  candidateCount: number;
  /** Null when the drive's grant does not share application status. */
  statusCounts: {
    applied: number;
    underReview: number;
    shortlisted: number;
    interviewScheduled: number;
    offerReleased: number;
    selected: number;
    rejected: number;
    withdrawn: number;
  } | null;
  interviewCounts: { total: number; scheduled: number; completed: number };
}

export interface RecruiterDashboardStats {
  demoMode: boolean;
  activeDrives: number;
  totalApplications: number;
  uniqueApplicants: number;
  pendingReviews: number | null;
  underReview: number | null;
  newApplications: number | null;
  shortlisted: number | null;
  interviewsScheduled: number | null;
  offersReleased: number | null;
  selected: number | null;
  rejected: number | null;
  statusShared: boolean;
  assignedDriveCount: number;
  expiringDriveAccess: number;
}

export function useRecruiterDashboardStats() {
  return useQuery({
    queryKey: ['recruiter', 'dashboard', 'stats'],
    queryFn: () => apiClient.get<RecruiterDashboardStats>('/recruiter/dashboard/stats'),
  });
}

export function useRecruiterDrives() {
  return useQuery({
    queryKey: ['recruiter', 'drives'],
    queryFn: async () => {
      return apiClient.get<RecruiterDriveView[]>('/recruiter/drives');
    },
  });
}

export function useRecruiterDashboardSummary() {
  return useQuery({
    queryKey: ['recruiter', 'dashboard', 'summary'],
    queryFn: () => apiClient.get<RecruiterDashboardDrive[]>('/recruiter/dashboard/summary'),
  });
}

export function useRecruiterCandidates(
  driveId: string,
  page = 1,
  limit = 10,
  status?: string,
  q?: string,
  filters: RecruiterCandidateFilters = {},
) {
  return useQuery({
    queryKey: ['recruiter', 'drives', driveId, 'candidates', { page, limit, status, q, ...filters }],
    queryFn: async () => {
      return apiClient.get<RecruiterCandidatePage>(`/recruiter/drives/${driveId}/candidates`, {
        params: {
          page: page.toString(),
          limit: limit.toString(),
          ...(status ? { status } : {}),
          ...(q ? { q } : {}),
          ...(filters.department ? { department: filters.department } : {}),
          ...(filters.minCgpa !== undefined ? { minCgpa: filters.minCgpa.toString() } : {}),
          ...(filters.maxCgpa !== undefined ? { maxCgpa: filters.maxCgpa.toString() } : {}),
          ...(filters.graduationYear !== undefined ? { graduationYear: filters.graduationYear.toString() } : {}),
          ...(filters.skill ? { skill: filters.skill } : {}),
        },
      });
    },
    enabled: !!driveId,
  });
}

export function useRecruiterCandidate(driveId: string, applicationId: string) {
  return useQuery({
    queryKey: ['recruiter', 'drives', driveId, 'candidates', applicationId],
    queryFn: async () => {
      return apiClient.get<RecruiterCandidate>(`/recruiter/drives/${driveId}/candidates/${applicationId}`);
    },
    enabled: !!driveId && !!applicationId,
  });
}

export interface RecruiterInterview {
  id: string;
  driveId: string;
  applicationId: string;
  recruiterId: string;
  candidateName: string;
  interviewerId: string;
  interviewerName: string;
  startsAt: string;
  round: string;
  instructions: string;
  meetingUrl?: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  cancellationReason?: string;
  drive: { companyName: string; roleTitle: string } | null;
  feedback?: {
    technicalKnowledge: number;
    problemSolving: number;
    communication: number;
    projectUnderstanding: number;
    comments: string;
    recommendation: 'ADVANCE' | 'HOLD' | 'DO_NOT_ADVANCE';
    submittedAt: string;
  } | null;
  canManage: boolean;
  canSubmitFeedback: boolean;
}

const recruiterInterviewKey = ['recruiter', 'interviews'] as const;

export function useRecruiterInterviews() {
  return useQuery({
    queryKey: recruiterInterviewKey,
    queryFn: () => apiClient.get<RecruiterInterview[]>('/recruiter/interviews'),
  });
}

function useRecruiterInterviewMutation<TPayload>(path: (payload: TPayload) => { url: string; body: unknown; method: 'POST' | 'PATCH' }) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TPayload) => {
      const request = path(payload);
      if (request.method === 'POST') return apiClient.post<RecruiterInterview>(request.url, request.body);
      return apiClient.patch<RecruiterInterview>(request.url, request.body);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: recruiterInterviewKey });
      void client.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useScheduleRecruiterInterview() {
  return useRecruiterInterviewMutation<{ driveId: string; applicationId: string; startsAt: string; round: string; instructions?: string; meetingUrl?: string }>((payload) => ({ url: '/recruiter/interviews', body: payload, method: 'POST' }));
}

export function useRescheduleRecruiterInterview() {
  return useRecruiterInterviewMutation<{ id: string; startsAt: string }>((payload) => ({ url: `/recruiter/interviews/${payload.id}/reschedule`, body: { startsAt: payload.startsAt }, method: 'PATCH' }));
}

export function useCancelRecruiterInterview() {
  return useRecruiterInterviewMutation<{ id: string; reason?: string }>((payload) => ({ url: `/recruiter/interviews/${payload.id}/cancel`, body: { reason: payload.reason }, method: 'PATCH' }));
}

export function useSubmitRecruiterInterviewFeedback() {
  return useRecruiterInterviewMutation<{ id: string; technicalKnowledge: number; problemSolving: number; communication: number; projectUnderstanding: number; comments: string; recommendation: 'ADVANCE' | 'HOLD' | 'DO_NOT_ADVANCE' }>((payload) => {
    const { id, ...body } = payload;
    return { url: `/recruiter/interviews/${id}/feedback`, body, method: 'PATCH' };
  });
}

export interface RecruiterFunnel {
  totalApplications: number;
  stages: { status: string; count: number; reached: number; conversionFromPrevious: number }[];
  rejected: number;
  withdrawn?: number;
  selectionRate: number;
  rejectionRate?: number;
}

export interface RecruiterPipeline extends RecruiterFunnel {
  statusShared: boolean;
  sharedDriveCount?: number;
  assignedDriveCount?: number;
}

export function useRecruiterDashboardPipeline() {
  return useQuery({
    queryKey: ['recruiter', 'dashboard', 'pipeline'],
    queryFn: () => apiClient.get<RecruiterPipeline>('/recruiter/dashboard/pipeline'),
  });
}

export interface RecruiterActivity {
  id: string;
  type: string;
  title: string;
  message: string;
  at: string;
  href: string;
}

export function useRecruiterActivities(limit = 6) {
  return useQuery({
    queryKey: ['recruiter', 'dashboard', 'activities', limit],
    queryFn: () => apiClient.get<RecruiterActivity[]>('/recruiter/dashboard/activities', { params: { limit: String(limit) } }),
  });
}

export interface RecruiterCandidateListFilters extends RecruiterCandidateFilters {
  page?: number;
  limit?: number;
  driveId?: string;
  company?: string;
  status?: string;
  q?: string;
}

const toParams = (filters: object) => Object.fromEntries(
  Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== '').map(([key, value]) => [key, String(value)]),
);

/** Candidates across all assigned drives (or shortlisted candidates when `shortlists` is true). */
export function useRecruiterCandidateList(filters: RecruiterCandidateListFilters, shortlists = false) {
  return useQuery({
    queryKey: ['recruiter', shortlists ? 'shortlists' : 'candidates', filters],
    queryFn: () => apiClient.get<RecruiterCandidatePage>(shortlists ? '/recruiter/shortlists' : '/recruiter/candidates', { params: toParams(filters) }),
    placeholderData: (previous) => previous,
  });
}

export function useRecruiterCandidateProfile(applicationId?: string) {
  return useQuery({
    queryKey: ['recruiter', 'candidates', 'profile', applicationId],
    queryFn: () => apiClient.get<RecruiterCandidateProfile>(`/recruiter/candidates/${applicationId}`),
    enabled: !!applicationId,
  });
}

/** Moves a demo application to its next stage or saves a recruiter note, then refreshes every recruiter view. */
export function useUpdateRecruiterApplication() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ driveId, applicationId, ...body }: { driveId: string; applicationId: string; status?: string; recruiterNotes?: string }) =>
      apiClient.patch<{ applicationId: string; status: string; recruiterNotes?: string }>(`/recruiter/drives/${driveId}/candidates/${applicationId}`, body),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['recruiter'] }),
  });
}

export interface RecruiterAnalyticsFilters {
  from?: string;
  to?: string;
  driveId?: string;
  company?: string;
  department?: string;
  status?: string;
}

export interface RecruiterAnalytics {
  overview: {
    totalApplications: number;
    uniqueApplicants: number;
    statusShared: boolean;
    funnel: RecruiterFunnel;
    selection: { selected: number; offersReleased: number; rejected: number; selectionRate: number; rejectionRate: number; shortlistRate: number; interviewConversionRate: number; offerAcceptanceRate: number };
    interviews: { total: number; scheduled: number; upcoming: number; pendingFeedback: number; completed: number; successRate: number };
  };
  applications: { bucket: 'day' | 'week'; from: string; to: string; points: { date: string; applications: number; shortlisted: number; selected: number; offers: number }[] };
  drives: { driveId: string; companyName: string; roleTitle: string; lifecycle: RecruiterDriveLifecycle; applicants: number; shortlisted: number | null; interviews: number; offers: number | null; selected: number | null; rejected: number | null }[];
  branches: { shared: boolean; items: { branch: string; applications: number; students: number; selected: number }[] };
  filterOptions: { drives: { driveId: string; companyName: string; roleTitle: string }[]; departments: string[] };
}

export function useRecruiterAnalytics(filters: RecruiterAnalyticsFilters) {
  return useQuery({
    queryKey: ['recruiter', 'analytics', filters],
    queryFn: () => apiClient.get<RecruiterAnalytics>('/recruiter/analytics', { params: toParams(filters) }),
    placeholderData: (previous) => previous,
  });
}

export function useRecruiterDrive(driveId?: string) {
  return useQuery({
    queryKey: ['recruiter', 'drives', driveId, 'detail'],
    queryFn: () => apiClient.get<RecruiterDashboardDrive>(`/recruiter/drives/${driveId}`),
    enabled: !!driveId,
  });
}
