import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { PlacementDrive } from '@placecampus/shared-types';

export interface RecruiterCandidateSkill {
  skillId: string;
  skillName: string;
  status: string;
}

export interface RecruiterCandidate {
  id: string;
  studentId: string;
  studentName?: string;
  department?: string;
  graduationYear?: number;
  cgpa?: number;
  skillMatchCoverage?: number;
  applicationStatus?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  expiresAt?: string;
  skills?: RecruiterCandidateSkill[];
}

export interface RecruiterCandidatePage {
  candidates: RecruiterCandidate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RecruiterDriveView {
  grantId: string;
  drive: PlacementDrive;
  expiresAt: string;
  releasedFields: string[];
}

export function useRecruiterDrives() {
  return useQuery({
    queryKey: ['recruiter', 'drives'],
    queryFn: async () => {
      return apiClient.get<RecruiterDriveView[]>('/recruiter/drives');
    },
  });
}

export function useRecruiterCandidates(driveId: string, page = 1, limit = 10, status?: string, q?: string) {
  return useQuery({
    queryKey: ['recruiter', 'drives', driveId, 'candidates', { page, limit, status, q }],
    queryFn: async () => {
      return apiClient.get<RecruiterCandidatePage>(`/recruiter/drives/${driveId}/candidates`, {
        params: { page: page.toString(), limit: limit.toString(), ...(status ? { status } : {}), ...(q ? { q } : {}) },
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
