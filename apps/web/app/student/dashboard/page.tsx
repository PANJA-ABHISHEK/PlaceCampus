"use client";

import * as React from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import { useStudentProfile } from "@/features/student/hooks/use-student-profile";
import { useStudentReadiness } from "@/features/readiness/hooks/use-readiness";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Target,
  Briefcase,
  AlertCircle,
  FileText,
  Github,
  Linkedin,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";

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

  // Calculate realistic profile completion based on schema
  const getCompletionPercentage = () => {
    if (!profile) return 0;

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

    const filledFields = requiredFields.filter(Boolean).length;
    return Math.round((filledFields / requiredFields.length) * 100);
  };

  const completion = getCompletionPercentage();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Welcome Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-heading">
          Good morning, {user?.fullName?.split(" ")[0] || "Student"}.
        </h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          Let’s keep building your placement readiness.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Completion Card (REAL DATA) */}
        <div className="md:col-span-2 bg-white rounded-xl border border-[hsl(var(--border))] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-heading mb-2">
              Profile Completion
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
              A complete profile helps the readiness engine evaluate your skills
              and match you with drives.
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-[hsl(var(--primary))]">
                  {completion}%
                </span>
                <span className="text-[hsl(var(--muted-foreground))]">
                  100%
                </span>
              </div>
              <Progress value={completion} className="h-2" />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {!profile?.university && (
              <Button variant="outline" size="sm" asChild className="gap-2">
                <Link href="/student/profile">
                  <GraduationCap className="h-4 w-4" /> Add Academics
                </Link>
              </Button>
            )}
            {!profile?.linkedinUrl && (
              <Button variant="outline" size="sm" asChild className="gap-2">
                <Link href="/student/profile">
                  <Linkedin className="h-4 w-4" /> Add LinkedIn
                </Link>
              </Button>
            )}
            {!profile?.githubUrl && (
              <Button variant="outline" size="sm" asChild className="gap-2">
                <Link href="/student/profile">
                  <Github className="h-4 w-4" /> Add GitHub
                </Link>
              </Button>
            )}
            {!profile?.bio && (
              <Button variant="outline" size="sm" asChild className="gap-2">
                <Link href="/student/profile">
                  <FileText className="h-4 w-4" /> Add Bio
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Readiness Card */}
        {readiness ? (
          <div className="bg-gradient-to-br from-[hsl(var(--primary))] to-orange-600 rounded-xl p-6 text-white shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold mb-1">Overall Readiness</h2>
                <div className="text-xs uppercase font-bold tracking-widest text-white/80">
                  {readiness.status.replace("_", " ")}
                </div>
              </div>
              <div className="text-4xl font-black">
                {Math.round(readiness.overallScore)}
              </div>
            </div>

            <div className="mt-6 relative z-10 space-y-3">
              <div className="text-xs text-white/80 flex justify-between">
                <span>Coverage</span>
                <span>{readiness.coverageCount} / 5 Factors</span>
              </div>
              <Button
                variant="secondary"
                className="w-full gap-2 text-[hsl(var(--primary))]"
                asChild
              >
                <Link href="/student/readiness">
                  View Analysis <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-[hsl(var(--primary))] to-orange-600 rounded-xl p-6 text-white shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-lg font-bold mb-2">Overall Readiness</h2>
              <p className="text-white/80 text-sm leading-relaxed">
                Readiness will appear here after your profile and evidence are
                evaluated.
              </p>
            </div>
            <div className="mt-6 relative z-10">
              <Button
                variant="secondary"
                className="w-full gap-2 text-[hsl(var(--primary))]"
                asChild
              >
                <Link href="/student/readiness">
                  Build Profile <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Verified Skills Placeholder */}
        <div className="bg-white rounded-xl border border-[hsl(var(--border))] p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
              <Target className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-heading">Verified Skills</h3>
          </div>
          <div className="py-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
            <p>Your verified skills will appear after evidence review.</p>
          </div>
        </div>

        {/* Placement Drives Placeholder */}
        <div className="bg-white rounded-xl border border-[hsl(var(--border))] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Briefcase className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-heading">Placement Drives</h3>
            </div>
            <div className="py-2 text-sm text-[hsl(var(--muted-foreground))]">
              <p>
                Explore active placement drives and apply for roles that match
                your skills.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Button variant="outline" className="w-full" asChild>
              <Link href="/student/drives">View Drives</Link>
            </Button>
          </div>
        </div>

        {/* Skill Gaps Placeholder */}
        <div className="bg-white rounded-xl border border-[hsl(var(--border))] p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-red-50 text-red-600">
              <AlertCircle className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-heading">Top Skill Gaps</h3>
          </div>
          <div className="py-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
            <p>
              Analysis will appear once your verified skill profile is
              available.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-[hsl(var(--border))] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[hsl(var(--border))]">
          <h3 className="font-bold text-heading">Recent Activity</h3>
        </div>
        <div className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted)/0.3)]">
          No recent activity yet.
        </div>
      </div>
    </div>
  );
}
