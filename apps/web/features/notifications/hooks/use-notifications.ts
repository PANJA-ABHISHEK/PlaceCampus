import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { NotificationItem, NotificationListResponse } from "@placecampus/shared-types";

export const NOTIFICATION_KEYS = {
  all: ["notifications"] as const,
  list: (filters: Record<string, string>) => [...NOTIFICATION_KEYS.all, "list", filters] as const,
  unread: () => [...NOTIFICATION_KEYS.all, "unread"] as const,
};

export function useNotifications(filters: { page?: number; limit?: number; unread?: boolean; type?: string } = {}) {
  const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)]));
  return useQuery({
    queryKey: NOTIFICATION_KEYS.list(params),
    queryFn: () => apiClient.get<NotificationListResponse>("/notifications/me", { params }),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.unread(),
    queryFn: () => apiClient.get<{ count: number }>("/notifications/me/unread-count"),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch<NotificationItem>(`/notifications/${id}/read`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all }); },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.patch<{ updated: number }>("/notifications/me/read-all"),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all }); },
  });
}
