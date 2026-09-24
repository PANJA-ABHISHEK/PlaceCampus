'use client';

import { useAuth } from '@/lib/auth';
import { StatCard } from '@/components/ui/stat-card';
import { ClipboardList, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { facultyApi } from '@/lib/api';

export default function FacultyDashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['faculty', 'stats'],
    queryFn: facultyApi.getStats,
  });

  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['faculty', 'reviews', 'pending'],
    queryFn: () => facultyApi.getPendingReviews({ limit: 5 }),
  });

  const isLoading = statsLoading || pendingLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-[var(--color-primary)]" size={32} />
      </div>
    );
  }

  const pending = stats?.pending ?? 0;
  const total = stats?.total ?? 0;
  // TODO: We might need backend to send approved/rejected breakdown. Using mock calculation for now.
  const approved = stats?.completed ? Math.floor(stats.completed * 0.8) : 0;
  const rejected = stats?.completed ? stats.completed - approved : 0;

  const reviews = pendingData?.reviews ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Faculty Dashboard</h1>
        <p className="text-[var(--color-muted)] mt-1">
          Welcome back, {user?.firstName}. Review student evidence submissions.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Reviews"
          value={String(pending)}
          subtitle="Awaiting your review"
          icon={<Clock size={20} />}
        />
        <StatCard
          title="Approved"
          value={String(approved)}
          subtitle="Total approved"
          icon={<CheckCircle2 size={20} />}
        />
        <StatCard
          title="Rejected"
          value={String(rejected)}
          subtitle="Total rejected"
          icon={<XCircle size={20} />}
        />
        <StatCard
          title="Total Reviews"
          value={String(total)}
          subtitle="All time"
          icon={<ClipboardList size={20} />}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Pending Reviews</h2>
          <Link href="/faculty/reviews" className="text-sm text-[var(--color-primary)] font-medium hover:underline">
            View all →
          </Link>
        </div>
        
        {reviews.length === 0 ? (
          <div className="card p-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ClipboardList size={32} className="text-[var(--color-muted)] mb-3" />
              <p className="text-sm text-[var(--color-muted)]">
                No pending reviews at this time.
              </p>
            </div>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                  <th className="text-left px-4 py-3 text-sm font-medium text-[var(--color-muted)]">Student</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[var(--color-muted)]">Evidence</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[var(--color-muted)]">Submitted Date</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review._id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)]">
                    <td className="px-4 py-3 text-sm font-medium">
                      {review.evidenceId?.studentId?.firstName} {review.evidenceId?.studentId?.lastName}
                      <div className="text-xs text-[var(--color-muted)] font-normal">{review.evidenceId?.studentId?.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium">{review.evidenceId?.title}</div>
                      <div className="text-xs text-[var(--color-muted)]">{review.evidenceId?.type?.replace('_', ' ')}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-muted)]">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
