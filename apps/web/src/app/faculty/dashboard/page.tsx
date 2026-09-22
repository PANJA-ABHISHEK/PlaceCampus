'use client';

import { useAuth } from '@/lib/auth';
import { StatCard } from '@/components/ui/stat-card';
import { ClipboardList, CheckCircle2, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';

export default function FacultyDashboard() {
  const { user } = useAuth();

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
          value="0"
          subtitle="Awaiting your review"
          icon={<Clock size={20} />}
        />
        <StatCard
          title="Approved"
          value="0"
          subtitle="This month"
          icon={<CheckCircle2 size={20} />}
        />
        <StatCard
          title="Rejected"
          value="0"
          subtitle="This month"
          icon={<XCircle size={20} />}
        />
        <StatCard
          title="Total Reviews"
          value="0"
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
        <div className="card p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ClipboardList size={32} className="text-[var(--color-muted)] mb-3" />
            <p className="text-sm text-[var(--color-muted)]">
              No pending reviews at this time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
