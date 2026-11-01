import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  PreparationItemStatus,
  PreparationPlan,
} from "@placecampus/shared-types";

export const PREPARATION_KEYS = {
  all: ["preparation"] as const,
  plans: () => [...PREPARATION_KEYS.all, "plans"] as const,
  plan: (id: string) => [...PREPARATION_KEYS.plans(), id] as const,
};

export function usePreparationPlans() {
  return useQuery({
    queryKey: PREPARATION_KEYS.plans(),
    queryFn: () => apiClient.get<PreparationPlan[]>("/preparation/plans/me"),
  });
}

export function usePreparationPlan(id: string) {
  return useQuery({
    queryKey: PREPARATION_KEYS.plan(id),
    queryFn: () => apiClient.get<PreparationPlan>(`/preparation/plans/${id}`),
    enabled: !!id,
  });
}

export function useCreatePreparationPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (driveId: string) =>
      apiClient.post<PreparationPlan>(`/preparation/plans/drive/${driveId}`),
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: PREPARATION_KEYS.plans() });
      queryClient.setQueryData(PREPARATION_KEYS.plan(plan.id), plan);
    },
  });
}

export function useUpdatePreparationItemStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      planId,
      itemId,
      status,
    }: {
      planId: string;
      itemId: string;
      status: PreparationItemStatus;
    }) =>
      apiClient.patch<PreparationPlan>(
        `/preparation/plans/${planId}/items/${itemId}/status`,
        { status },
      ),
    onSuccess: (plan) => {
      queryClient.setQueryData(PREPARATION_KEYS.plan(plan.id), plan);
      queryClient.invalidateQueries({ queryKey: PREPARATION_KEYS.plans() });
    },
  });
}

export function useRegeneratePreparationPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<PreparationPlan>(`/preparation/plans/${id}/regenerate`),
    onSuccess: (plan, previousId) => {
      queryClient.setQueryData(PREPARATION_KEYS.plan(plan.id), plan);
      queryClient.invalidateQueries({ queryKey: PREPARATION_KEYS.plans() });
      queryClient.invalidateQueries({ queryKey: PREPARATION_KEYS.plan(previousId) });
    },
  });
}
