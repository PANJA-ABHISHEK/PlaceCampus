import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  StudentPreferences,
  StudentSettings,
  UpdateStudentPreferencesDto,
} from "@placecampus/shared-types";

export const SETTINGS_KEY = ["student", "settings"] as const;

export function useStudentSettings(enabled = true) {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => apiClient.get<StudentSettings>("/students/me/settings"),
    enabled,
    staleTime: 60_000,
  });
}

/**
 * Saves a partial preference change. The cache is updated optimistically so
 * switches respond instantly, and rolled back if the server rejects it.
 */
export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateStudentPreferencesDto) =>
      apiClient.patch<StudentPreferences>("/students/me/preferences", dto),
    onMutate: async (dto) => {
      await queryClient.cancelQueries({ queryKey: SETTINGS_KEY });
      const previous = queryClient.getQueryData<StudentSettings>(SETTINGS_KEY);
      if (previous) {
        queryClient.setQueryData<StudentSettings>(SETTINGS_KEY, {
          ...previous,
          preferences: {
            notifications: { ...previous.preferences.notifications, ...dto.notifications },
            privacy: { ...previous.preferences.privacy, ...dto.privacy },
            theme: dto.theme ?? previous.preferences.theme,
          },
        });
      }
      return { previous };
    },
    onError: (_error, _dto, context) => {
      if (context?.previous) queryClient.setQueryData(SETTINGS_KEY, context.previous);
    },
    onSuccess: (preferences) => {
      queryClient.setQueryData<StudentSettings>(SETTINGS_KEY, (current) =>
        current ? { ...current, preferences } : current,
      );
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (dto: { currentPassword: string; newPassword: string }) =>
      apiClient.post<{ accessToken: string }>("/auth/change-password", dto),
  });
}
