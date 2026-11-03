"use client";

import * as React from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import { useStudentProfile } from "@/features/student/hooks/use-student-profile";
import { useStudentReadiness } from "@/features/readiness/hooks/use-readiness";
import { getProfileCompletion } from "@/features/student/lib/profile-completion";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  CircleAlert,
  FileText,
  Github,
  GraduationCap,
  History,
  Linkedin,
  Target,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const cardClassName =
  "relative overflow-hidden rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white p-6 shadow-[var(--shadow-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)]";

const chipClassName =
  "inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-white px-3.5 py-2 text-sm font-medium text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--primary)/0.4)] hover:bg-[hsl(var(--primary)/0.05)] hover:text-[hsl(var(--primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)] [&_svg]:h-4 [&_svg]:w-4";

function IconTile({
  icon: Icon,
  className,
}: {
  icon: React.ElementType;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
        className,
      )}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </div>
  );
}

/** Large faded icon anchored to a card's corner. Purely decorative. */
function CornerIcon({
  icon: Icon,
  className,
}: {
  icon: React.ElementType;
  className?: string;
}) {
  return (
    <Icon
      aria-hidden="true"
      strokeWidth={1.25}
      className={cn(
        "pointer-events-none absolute -bottom-5 -right-5 h-28 w-28",
        className,
      )}
    />
  );
}

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const { data: profile, isLoading: isProfileLoading } = useStudentProfile();
  const { data: readiness, isLoading: isReadinessLoading } =
    useStudentReadiness();

  if (isProfileLoading || isReadinessLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]"></div>
      </div>
    );
  }

  const completion = getProfileCompletion(profile).percentage;

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Welcome Header */}
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))] sm:text-3xl">
          Good morning, {user?.fullName?.split(" ")[0] || "Student"}.{" "}
          <span aria-hidden="true">👋</span>
        </h1>
        <p className="text-[15px] text-[hsl(var(--muted-foreground))]">
          Let’s keep building your placement readiness.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Completion Card (REAL DATA) */}
        <section
          aria-labelledby="profile-completion-heading"
          className={cn(cardClassName, "flex flex-col gap-6 lg:col-span-2")}
        >
          <div className="flex items-start gap-4">
            <IconTile
              icon={UserRound}
              className="bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
            />
            <div className="min-w-0">
              <h2
                id="profile-completion-heading"
                className="text-lg font-bold text-[hsl(var(--foreground))]"
              >
                Profile Completion
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
                A complete profile helps the readiness engine evaluate your
                skills and match you with drives.
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-[hsl(var(--primary))]">{completion}%</span>
              <span className="text-[hsl(var(--muted-foreground))]">100%</span>
            </div>
            <Progress
              value={completion}
              aria-label="Profile completion"
              className="h-2.5"
            />
          </div>

          <div className="flex flex-wrap gap-2.5">
            {!profile?.university && (
              <Link href="/student/profile" className={chipClassName}>
                <GraduationCap /> Add Academics
              </Link>
            )}
            {!profile?.linkedinUrl && (
              <Link href="/student/profile" className={chipClassName}>
                <Linkedin /> Add LinkedIn
              </Link>
            )}
            {!profile?.githubUrl && (
              <Link href="/student/profile" className={chipClassName}>
                <Github /> Add GitHub
              </Link>
            )}
            {!profile?.bio && (
              <Link href="/student/profile" className={chipClassName}>
                <FileText /> Add Bio
              </Link>
            )}
          </div>
        </section>

        {/* Readiness Card */}
        <section
          aria-labelledby="readiness-heading"
          className="relative flex flex-col justify-between gap-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(var(--color-primary-400))] via-[hsl(var(--primary))] to-[hsl(var(--color-primary-600))] p-6 text-white shadow-[0_12px_32px_-12px_hsl(var(--primary)/0.55)]"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10"
          />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <IconTile
                icon={ChartNoAxesColumnIncreasing}
                className="bg-white/15 text-white ring-1 ring-white/25"
              />
              <div>
                <h2 id="readiness-heading" className="text-lg font-bold">
                  Overall Readiness
                </h2>
                {readiness ? (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/85">
                    {readiness.status.replace(/_/g, " ")}
                  </p>
                ) : (
                  <p className="mt-1 text-sm leading-relaxed text-white/85">
                    Readiness will appear here after your profile and evidence
                    are evaluated.
                  </p>
                )}
              </div>
            </div>
            {readiness && (
              <div className="text-5xl font-extrabold leading-none tracking-tight">
                {Math.round(readiness.overallScore)}
              </div>
            )}
          </div>

          <div className="relative space-y-3">
            {readiness && (
              <div className="flex justify-between text-sm text-white/85">
                <span>Coverage</span>
                <span className="font-medium">
                  {readiness.coverageCount} / 5 Factors
                </span>
              </div>
            )}
            <Link
              href="/student/readiness"
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--secondary))] px-4 py-3 text-sm font-semibold text-[hsl(var(--color-primary-light))] transition-colors hover:bg-[hsl(var(--color-navy-dark))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              {readiness ? "View Analysis" : "Build Profile"}
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Verified Skills Placeholder */}
        <section
          className={cn(
            cardClassName,
            "bg-gradient-to-br from-white to-[hsl(var(--color-primary-50))]",
          )}
        >
          <div className="flex items-center gap-3">
            <IconTile
              icon={BadgeCheck}
              className="bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
            />
            <h3 className="text-base font-bold text-[hsl(var(--foreground))]">
              Verified Skills
            </h3>
          </div>
          <p className="relative mt-4 max-w-[85%] pb-10 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
            Your verified skills will appear after evidence review.
          </p>
          <CornerIcon
            icon={BadgeCheck}
            className="text-[hsl(var(--primary)/0.12)]"
          />
        </section>

        {/* Placement Drives Placeholder */}
        <section
          className={cn(
            cardClassName,
            "flex flex-col justify-between bg-gradient-to-br from-white to-[hsl(var(--color-navy-50))]",
          )}
        >
          <div>
            <div className="flex items-center gap-3">
              <IconTile
                icon={Briefcase}
                className="bg-[hsl(var(--color-navy-100))] text-[hsl(var(--secondary))]"
              />
              <h3 className="text-base font-bold text-[hsl(var(--foreground))]">
                Placement Drives
              </h3>
            </div>
            <p className="mt-4 max-w-[85%] text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
              Explore active placement drives and apply for roles that match
              your skills.
            </p>
          </div>
          <Link
            href="/student/drives"
            className="relative z-10 mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-white px-4 py-2.5 text-sm font-semibold text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--secondary)/0.3)] hover:bg-[hsl(var(--color-navy-50))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)] sm:w-auto sm:self-start sm:px-6"
          >
            View Drives
          </Link>
          <CornerIcon
            icon={CalendarDays}
            className="text-[hsl(var(--secondary)/0.08)]"
          />
        </section>

        {/* Skill Gaps Placeholder */}
        <section
          className={cn(
            cardClassName,
            "bg-gradient-to-br from-white to-red-50/70 sm:col-span-2 lg:col-span-1",
          )}
        >
          <div className="flex items-center gap-3">
            <IconTile icon={CircleAlert} className="bg-red-50 text-red-600" />
            <h3 className="text-base font-bold text-[hsl(var(--foreground))]">
              Top Skill Gaps
            </h3>
          </div>
          <p className="relative mt-4 max-w-[85%] pb-10 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
            Analysis will appear once your verified skill profile is available.
          </p>
          <CornerIcon icon={Target} className="text-red-500/10" />
        </section>
      </div>

      {/* Recent Activity */}
      <section
        aria-labelledby="recent-activity-heading"
        className="overflow-hidden rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white shadow-[var(--shadow-card)]"
      >
        <div className="flex items-center justify-between px-6 py-4">
          <h3
            id="recent-activity-heading"
            className="text-base font-bold text-[hsl(var(--foreground))]"
          >
            Recent Activity
          </h3>
          <Link
            href="/student/notifications"
            className="group inline-flex items-center gap-1 text-sm font-medium text-[hsl(var(--foreground)/0.8)] transition-colors hover:text-[hsl(var(--primary))]"
          >
            View All
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
        <div className="flex flex-col items-center gap-3 border-t border-[hsl(var(--border)/0.7)] bg-[hsl(var(--muted)/0.4)] px-6 py-10 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[hsl(var(--muted-foreground))] shadow-[var(--shadow-xs)]">
            <History className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            No recent activity yet.
          </p>
        </div>
      </section>
    </div>
  );
}
