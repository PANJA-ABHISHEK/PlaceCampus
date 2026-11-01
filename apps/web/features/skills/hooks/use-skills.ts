import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  StudentSkillProfile,
  SkillCluster,
  Skill,
} from "@placecampus/shared-types";

export const SKILL_KEYS = {
  all: ["skills"] as const,
  profile: (studentId: string) =>
    [...SKILL_KEYS.all, "profile", studentId] as const,
  myProfile: () => [...SKILL_KEYS.all, "profile", "me"] as const,
  clusters: () => [...SKILL_KEYS.all, "clusters"] as const,
  taxonomy: () => [...SKILL_KEYS.all, "taxonomy"] as const,
};

export function useMySkills() {
  return useQuery({
    queryKey: SKILL_KEYS.myProfile(),
    queryFn: () => apiClient.get<StudentSkillProfile>("/student/skills"),
  });
}

export function useClusters() {
  return useQuery({
    queryKey: SKILL_KEYS.clusters(),
    queryFn: () => apiClient.get<SkillCluster[]>("/skills/clusters"),
  });
}

export function useTaxonomy() {
  return useQuery({
    queryKey: SKILL_KEYS.taxonomy(),
    queryFn: () => apiClient.get<Skill[]>("/skills/taxonomy"),
  });
}
