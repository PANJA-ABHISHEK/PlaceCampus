import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { RecruiterAccessGrant, CreateRecruiterAccessGrantDto, ExtendAccessGrantDto } from '@placecampus/shared-types';

export function useRecruiterAccessGrants(driveId: string) {
  return useQuery({
    queryKey: ['placement', 'drives', driveId, 'recruiter-access'],
    queryFn: async () => {
      return apiClient.get<RecruiterAccessGrant[]>(`/placement/drives/${driveId}/recruiter-access`);
    },
    enabled: !!driveId,
  });
}

export function useGrantRecruiterAccess(driveId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateRecruiterAccessGrantDto) => {
      return apiClient.post<RecruiterAccessGrant>(`/placement/drives/${driveId}/recruiter-access`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placement', 'drives', driveId, 'recruiter-access'] });
    },
  });
}

export function useRevokeRecruiterAccess(driveId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (grantId: string) => {
      return apiClient.patch<RecruiterAccessGrant>(`/placement/recruiter-access/${grantId}/revoke`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placement', 'drives', driveId, 'recruiter-access'] });
    },
  });
}

export function useExtendRecruiterAccess(driveId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ grantId, data }: { grantId: string, data: ExtendAccessGrantDto }) => {
      return apiClient.patch<RecruiterAccessGrant>(`/placement/recruiter-access/${grantId}/extend`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placement', 'drives', driveId, 'recruiter-access'] });
    },
  });
}

export function useUpdateRecruiterAccessFields(driveId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ grantId, releasedFields }: { grantId: string, releasedFields: string[] }) => {
      return apiClient.patch<RecruiterAccessGrant>(`/placement/recruiter-access/${grantId}/fields`, { releasedFields });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placement', 'drives', driveId, 'recruiter-access'] });
    },
  });
}
