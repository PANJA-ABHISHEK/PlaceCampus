import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { SkillGapAnalysis } from "@placecampus/shared-types";

export const SKILL_GAP_KEYS = {
  all: ["skill-gaps"] as const,
  mine: () => [...SKILL_GAP_KEYS.all, "me"] as const,
};

/** Student-wide gaps: every published drive's requirements vs. the verified skill profile. */
export function useSkillGaps() {
  return useQuery({
    queryKey: SKILL_GAP_KEYS.mine(),
    queryFn: () => apiClient.get<SkillGapAnalysis>("/student/skill-gaps"),
  });
}
