"use client";

import * as React from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import { useStudentProfile } from "@/features/student/hooks/use-student-profile";
import { useReadinessHistory, useStudentReadiness } from "@/features/readiness/hooks/use-readiness";
import { useMySkills } from "@/features/skills/hooks/use-skills";
import { useMyApplications } from "@/features/applications/hooks/use-applications";
import { useNotifications } from "@/features/notifications/hooks/use-notifications";
import { useSkillGaps } from "@/features/skill-gaps/hooks/use-skill-gaps";
import { useDrives, useDrivesEligibility } from "@/features/drives/hooks/use-drives";
import { useStudentInterviews } from "@/features/interviews/hooks/use-interviews";
import { useNow } from "@/features/interviews/hooks/use-now";
import { useStudentAssessmentHistory } from "@/features/assessments/hooks/use-assessments";
import { useAnalysisHistory, useCurrentResume } from "@/features/resume-analyzer/hooks/use-resume-analyzer";
import { getProfileCompletion } from "@/features/student/lib/profile-completion";
import {
  applicationStats,
  profileSections,
  readinessTrend,
  recommendedDrives,
  topSkillGaps,
  upcomingEvents,
  verifiedSkills,
} from "@/features/student-dashboard/lib/dashboard-data";
import { KpiCards, WelcomeBanner } from "@/features/student-dashboard/components/top-section";
import { ProfileCompletionCard, RecommendedDrivesCard } from "@/features/student-dashboard/components/main-section";
import {
  CareerBanner,
  RecentActivityCard,
  SkillGapsCard,
  UpcomingEventsCard,
  VerifiedSkillsCard,
  type ActivityEntry,
} from "@/features/student-dashboard/components/lower-section";
import { CardSkeleton } from "@/features/student-dashboard/components/dashboard-ui";

/**
 * Student Overview. Every figure comes from the existing student APIs (the
 * same hooks and cache keys the detail pages use, so navigating between them
 * reuses responses). The estimated ATS score is shown only on the AI Resume
 * Analyzer page, never here.
 */
export default function StudentDashboardPage() {
  const { user } = useAuth();
  const now = useNow(60_000);

  const profileQuery = useStudentProfile();
  const readinessQuery = useStudentReadiness();
  const readinessHistoryQuery = useReadinessHistory();
  const skillsQuery = useMySkills();
  const applicationsQuery = useMyApplications();
  const gapsQuery = useSkillGaps();
  const activityQuery = useNotifications({ limit: 6 });
  const drivesQuery = useDrives();
  const interviewsQuery = useStudentInterviews();
  const attemptsQuery = useStudentAssessmentHistory();
  const resumeQuery = useCurrentResume();
  const analysesQuery = useAnalysisHistory();

  const drives = React.useMemo(() => drivesQuery.data ?? [], [drivesQuery.data]);
  const eligibilityQueries = useDrivesEligibility(drives.map((d) => d.id));
  const eligibilityLoading = eligibilityQueries.some((q) => q.isLoading);
  const eligibility = eligibilityQueries.map((q) => q.data);

  const skills = verifiedSkills(skillsQuery.data?.skills);
  const apps = applicationStats(applicationsQuery.data);
  const recommended = recommendedDrives(drives, eligibility, applicationsQuery.data, now);
  const events = upcomingEvents({
    interviews: interviewsQuery.data,
    applications: applicationsQuery.data,
    drives,
    recommended,
    attempts: attemptsQuery.data,
    now,
  });

  // Notifications plus completed resume analyses (status only, never the score), newest first.
  const activity: ActivityEntry[] = [
    ...(activityQuery.data?.items ?? []).map((item) => ({
      id: item.id,
      kind: item.type,
      title: item.title,
      message: item.message,
      at: item.createdAt,
      href: item.actionUrl || "/student/notifications",
      unread: !item.readAt,
    })),
    ...(analysesQuery.data ?? []).slice(0, 3).map((row) => ({
      id: `analysis-${row.id}`,
      kind: "RESUME_ANALYZED" as const,
      title: "Resume analysis completed",
      message: `${row.fileName}${row.jobTitle ? ` · matched against ${row.jobTitle}` : ""}`,
      at: row.createdAt,
      href: "/student/resume-analyzer",
      unread: false,
    })),
  ]
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, 6);

  const firstName = user?.fullName?.split(" ")[0] || "there";
  const readinessScore = readinessQuery.data ? Math.round(readinessQuery.data.overallScore) : null;
  const statsLoading = readinessQuery.isLoading || skillsQuery.isLoading || applicationsQuery.isLoading;

  return (
    <div className="space-y-6">
      <WelcomeBanner firstName={firstName} now={new Date(now)} />

      <KpiCards
        loading={statsLoading}
        readiness={readinessScore}
        trend={readinessTrend(readinessQuery.data, readinessHistoryQuery.data)}
        verifiedSkills={skills.length}
        activeApplications={apps.active}
        shortlisted={apps.shortlisted}
      />

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
        {profileQuery.isLoading ? (
          <CardSkeleton lines={6} />
        ) : (
          <ProfileCompletionCard
            percentage={getProfileCompletion(profileQuery.data).percentage}
            sections={profileSections(profileQuery.data, skills.length, resumeQuery.data)}
          />
        )}
        <RecommendedDrivesCard
          drives={recommended}
          loading={drivesQuery.isLoading || eligibilityLoading}
          error={drivesQuery.isError}
          onRetry={() => drivesQuery.refetch()}
          now={now}
          totalDrives={drives.length}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <VerifiedSkillsCard skills={skills} loading={skillsQuery.isLoading} error={skillsQuery.isError} onRetry={() => skillsQuery.refetch()} />
        <SkillGapsCard
          gaps={topSkillGaps(gapsQuery.data?.gaps)}
          noVerifiedSkills={gapsQuery.data ? !gapsQuery.data.sufficientData : false}
          loading={gapsQuery.isLoading}
          error={gapsQuery.isError}
          onRetry={() => gapsQuery.refetch()}
        />
        <UpcomingEventsCard
          events={events}
          loading={interviewsQuery.isLoading || applicationsQuery.isLoading || drivesQuery.isLoading || attemptsQuery.isLoading}
        />
        <RecentActivityCard
          entries={activity}
          loading={activityQuery.isLoading}
          error={activityQuery.isError}
          onRetry={() => activityQuery.refetch()}
          now={now}
        />
      </div>

      <CareerBanner />
    </div>
  );
}
