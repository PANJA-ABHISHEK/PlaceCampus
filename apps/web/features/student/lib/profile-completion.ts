import { StudentProfile } from "@placecampus/shared-types";

/**
 * Profile fields that count towards completion. Shared by the dashboard and
 * the profile page so both always report the same percentage.
 */
export function getProfileCompletion(profile: StudentProfile | null | undefined) {
  if (!profile) return { percentage: 0, filled: 0, total: 11 };

  const requiredFields = [
    profile.phone,
    profile.university,
    profile.department,
    profile.program,
    profile.batch,
    profile.graduationYear,
    profile.cgpa,
    profile.bio,
    profile.linkedinUrl,
    profile.githubUrl,
    profile.portfolioUrl,
  ];

  const filled = requiredFields.filter(Boolean).length;
  return {
    percentage: Math.round((filled / requiredFields.length) * 100),
    filled,
    total: requiredFields.length,
  };
}
