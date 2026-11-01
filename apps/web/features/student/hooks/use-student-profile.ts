import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  StudentProfile,
  UpdateStudentProfileDto,
} from "@placecampus/shared-types";

const PROFILE_QUERY_KEY = ["student", "profile"];

export function useStudentProfile() {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: async () => {
      const response = await apiClient.get<{
        success: boolean;
        data: StudentProfile;
      }>("/students/me/profile");
      return response.data;
    },
  });
}

export function useUpdateStudentProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateStudentProfileDto) => {
      const response = await apiClient.patch<{
        success: boolean;
        data: StudentProfile;
      }>("/students/me/profile", data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, data);
    },
  });
}
