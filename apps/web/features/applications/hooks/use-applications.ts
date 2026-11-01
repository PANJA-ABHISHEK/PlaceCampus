import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Application, ReviewApplicationDto } from "@placecampus/shared-types";

// --- Student Hooks ---

export function useApplyToDrive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (driveId: string) => {
      return await apiClient.post<Application>(
        `/drives/${driveId}/applications`,
      );
    },
    onSuccess: (_, driveId) => {
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
      // Invalidate the specific drive match/eligibility checks if they cache application status (or fetch separately)
    },
  });
}

export function useMyApplications() {
  return useQuery({
    queryKey: ["my-applications"],
    queryFn: async () => {
      return await apiClient.get<Application[]>("/applications/me");
    },
  });
}

export function useMyApplication(id: string) {
  return useQuery({
    queryKey: ["my-application", id],
    queryFn: async () => {
      return await apiClient.get<Application>(`/applications/${id}`);
    },
    enabled: !!id,
  });
}

export function useWithdrawApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.patch<Application>(`/applications/${id}/withdraw`);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
      queryClient.invalidateQueries({ queryKey: ["my-application", id] });
    },
  });
}

// --- Placement Officer Hooks ---

export function useDriveApplications(driveId: string) {
  return useQuery({
    queryKey: ["placement-applications", driveId],
    queryFn: async () => {
      return await apiClient.get<Application[]>(
        `/placement/drives/${driveId}/applications`,
      );
    },
    enabled: !!driveId,
  });
}

export function usePlacementApplication(id: string) {
  return useQuery({
    queryKey: ["placement-application", id],
    queryFn: async () => {
      return await apiClient.get<Application>(`/placement/applications/${id}`);
    },
    enabled: !!id,
  });
}

export function useReviewApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: ReviewApplicationDto;
    }) => {
      return await apiClient.patch<Application>(
        `/placement/applications/${id}/review`,
        data,
      );
    },
    onSuccess: (updatedApp) => {
      queryClient.invalidateQueries({
        queryKey: ["placement-application", updatedApp.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["placement-applications", updatedApp.driveId],
      });
    },
  });
}
