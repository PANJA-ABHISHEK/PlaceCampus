'use client';

import { useAuth } from '@/lib/auth';
import { StatCard } from '@/components/ui/stat-card';
import {
  FileCheck,
  Award,
  Building2,
  Target,
  User,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { studentsApi, evidenceApi } from '@/lib/api';

export default function StudentDashboard() {
  const { user } = useAuth();

  const { data: completionData } = useQuery({
    queryKey: ['student', 'completion'],
    queryFn: studentsApi.getCompletion,
  });

  const { data: evidenceStats } = useQuery({
    queryKey: ['evidence', 'stats'],
    queryFn: evidenceApi.getStats,
  });

  const completionPercentage = completionData?.percentage ?? 0;
  const verifiedSkills = evidenceStats?.verified ?? 0;
  const evidenceSubmitted = evidenceStats?.total ?? 0;
  // TODO: Fetch eligible drives when placement module is ready
  const eligibleDrives = 0;

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
          Welcome back, {user?.firstName ?? 'Student'}
        </h1>
        <p className="text-[var(--color-muted)] mt-1">
          Here&apos;s an overview of your placement readiness.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Profile Completion"
          value={`${completionPercentage}%`}
          subtitle={completionPercentage === 100 ? "Ready for placement" : "Complete your profile"}
          icon={<User size={20} />}
        />
        <StatCard
          title="Verified Skills"
          value={String(verifiedSkills)}
          subtitle="Upload evidence to verify"
          icon={<Award size={20} />}
        />
        <StatCard
          title="Evidence Submitted"
          value={String(evidenceSubmitted)}
          subtitle="Certificates & projects"
          icon={<FileCheck size={20} />}
        />
        <StatCard
          title="Eligible Drives"
          value={String(eligibleDrives)}
          subtitle="Placement drives"
          icon={<Building2 size={20} />}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/student/profile"
            className="card card-hover p-5 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-lg bg-[var(--color-info-bg)] flex items-center justify-center">
              <User size={20} className="text-[var(--color-primary)]" />
            </div>
            <div>
              <p className="font-medium text-sm">Complete Profile</p>
              <p className="text-xs text-[var(--color-muted)]">Add your academic details</p>
            </div>
          </Link>

          <Link
            href="/student/evidence"
            className="card card-hover p-5 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-lg bg-[var(--color-success-bg)] flex items-center justify-center">
              <FileCheck size={20} className="text-[var(--color-success)]" />
            </div>
            <div>
              <p className="font-medium text-sm">Upload Evidence</p>
              <p className="text-xs text-[var(--color-muted)]">Certificates & achievements</p>
            </div>
          </Link>

          <Link
            href="/student/drives"
            className="card card-hover p-5 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-lg bg-[var(--color-warning-bg)] flex items-center justify-center">
              <Building2 size={20} className="text-[var(--color-warning)]" />
            </div>
            <div>
              <p className="font-medium text-sm">View Drives</p>
              <p className="text-xs text-[var(--color-muted)]">Check eligibility</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="card p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock size={32} className="text-[var(--color-muted)] mb-3" />
            <p className="text-sm text-[var(--color-muted)]">
              No recent activity. Start by completing your profile or uploading evidence.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
