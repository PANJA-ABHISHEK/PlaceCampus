import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  PlacementDrive,
  CreatePlacementDriveDto,
  UpdatePlacementDriveDto,
  EligibilityResult,
  SkillMatchResult,
} from "@placecampus/shared-types";

// ==========================================
// STUDENT HOOKS
// ==========================================

export function useDrives() {
  return useQuery({
    queryKey: ["student", "drives"],
    queryFn: async () => {
      const res = await apiClient.get<PlacementDrive[]>("/student/drives");
      return res;
    },
  });
}

export function useDrive(id: string) {
  return useQuery({
    queryKey: ["student", "drives", id],
    queryFn: async () => {
      const res = await apiClient.get<PlacementDrive>(`/student/drives/${id}`);
      return res;
    },
    enabled: !!id,
  });
}

export function useDriveEligibility(id: string) {
  return useQuery({
    queryKey: ["student", "drives", id, "eligibility"],
    queryFn: async () => {
      const res = await apiClient.get<EligibilityResult>(
        `/student/drives/${id}/eligibility`,
      );
      return res;
    },
    enabled: !!id,
  });
}

export function useDriveMatch(id: string) {
  return useQuery({
    queryKey: ["student", "drives", id, "match"],
    queryFn: async () => {
      const res = await apiClient.get<SkillMatchResult>(
        `/student/drives/${id}/match`,
      );
      return res;
    },
    enabled: !!id,
  });
}

// ==========================================
// PLACEMENT OFFICER HOOKS
// ==========================================

export function usePlacementDrives() {
  return useQuery({
    queryKey: ["placement", "drives"],
    queryFn: async () => {
      const res = await apiClient.get<PlacementDrive[]>("/placement/drives");
      return res;
    },
  });
}

export function usePlacementDrive(id: string) {
  return useQuery({
    queryKey: ["placement", "drives", id],
    queryFn: async () => {
      const res = await apiClient.get<PlacementDrive>(
        `/placement/drives/${id}`,
      );
      return res;
    },
    enabled: !!id,
  });
}

export function useCreateDrive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePlacementDriveDto) => {
      const res = await apiClient.post<PlacementDrive>(
        "/placement/drives",
        data,
      );
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["placement", "drives"] });
    },
  });
}

export function useUpdateDrive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdatePlacementDriveDto;
    }) => {
      const res = await apiClient.patch<PlacementDrive>(
        `/placement/drives/${id}`,
        data,
      );
      return res;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["placement", "drives"] });
      queryClient.invalidateQueries({ queryKey: ["placement", "drives", id] });
    },
  });
}

export function usePublishDrive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.patch<PlacementDrive>(
        `/placement/drives/${id}/publish`,
      );
      return res;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["placement", "drives"] });
      queryClient.invalidateQueries({ queryKey: ["placement", "drives", id] });
    },
  });
}

export function useCloseDrive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.patch<PlacementDrive>(
        `/placement/drives/${id}/close`,
      );
      return res;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["placement", "drives"] });
      queryClient.invalidateQueries({ queryKey: ["placement", "drives", id] });
    },
  });
}
