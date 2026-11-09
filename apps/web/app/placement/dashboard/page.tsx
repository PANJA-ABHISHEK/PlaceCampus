'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Clock3,
  FileText,
  GraduationCap,
  Plus,
  Send,
  Users,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePlacementDrives } from '@/features/drives/hooks/use-drives';
import { DriveStatus } from '@placecampus/shared-types';

const dateLabel = (value?: string) => {
  if (!value) return 'Date not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : format(date, 'MMM d, yyyy');
};

const statusStyle: Record<string, string> = {
  [DriveStatus.PUBLISHED]: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  [DriveStatus.DRAFT]: 'bg-orange-50 text-orange-700 ring-orange-600/15',
  [DriveStatus.CLOSED]: 'bg-slate-100 text-slate-600 ring-slate-500/15',
  [DriveStatus.CANCELLED]: 'bg-rose-50 text-rose-700 ring-rose-600/15',
};

export default function PlacementDashboardPage() {
  const { data: drives, isLoading, isError, refetch } = usePlacementDrives();
  const allDrives = drives ?? [];
  const activeCount = allDrives.filter((drive) => drive.status === DriveStatus.PUBLISHED).length;
  const draftCount = allDrives.filter((drive) => drive.status === DriveStatus.DRAFT).length;
  const recentDrives = [...allDrives]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  return (
    <div className="space-y-7 pb-6">
      <section className="relative isolate overflow-hidden rounded-[26px] border border-[#ffd9c4] bg-gradient-to-br from-[#fffaf6] via-[#fff3e8] to-[#ffe4ce] px-6 py-6 shadow-[0_10px_30px_rgba(255,105,40,0.07)] sm:px-9 sm:py-7 lg:min-h-[190px] lg:px-10 lg:py-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-28 -z-10 h-72 w-72 rounded-full border-[34px] border-white/35 lg:right-[20%] lg:top-[-185px] lg:h-[420px] lg:w-[420px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 right-[18%] -z-10 hidden h-56 w-[45%] rotate-[-12deg] rounded-[50%] bg-gradient-to-r from-transparent via-white/30 to-white/50 lg:block"
        />
        <div className="relative z-10 flex h-full flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="max-w-[700px]">
            <p className="mb-2 text-sm font-semibold text-[#e6531b]">Placement Officer workspace</p>
            <h1 className="text-[28px] font-bold leading-tight tracking-[-0.04em] text-[#172b4d] sm:text-[32px] lg:text-[36px]">
              Placement <span className="text-[#ff5a1f]">Operations</span>
            </h1>
            <p className="mt-2 max-w-[660px] text-sm leading-6 text-slate-600 sm:text-[15px] sm:leading-6">
              Manage recruitment drives, eligibility, applications and placement activity.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/90 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Campus hiring workspace
              </span>
              <span className="hidden h-5 w-px bg-orange-200 sm:block" />
              <span className="flex items-center gap-2 text-xs font-medium text-slate-600 sm:text-sm">
                <CalendarDays className="h-4 w-4 text-[#ee6b36]" />
                {today}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-5 lg:justify-end">
            <div
              aria-hidden="true"
              className="relative hidden h-32 w-40 shrink-0 items-center justify-center sm:flex lg:mr-4"
            >
              <div className="absolute left-3 top-7 h-[74px] w-[74px] rotate-[-12deg] rounded-2xl border border-orange-100 bg-white/55 shadow-sm" />
              <div className="absolute right-3 top-3 flex h-[86px] w-[86px] rotate-[7deg] items-center justify-center rounded-2xl border border-white bg-white/90 text-[#ff5a1f] shadow-[0_12px_24px_rgba(177,84,29,0.14)]">
                <GraduationCap className="h-10 w-10" strokeWidth={1.7} />
              </div>
              <span className="absolute bottom-3 right-5 flex h-10 w-10 items-center justify-center rounded-full border-[5px] border-[#ffe7d6] bg-[#ff6a24] text-white shadow-sm">
                <BriefcaseBusiness className="h-4 w-4" />
              </span>
              <span className="absolute left-0 top-4 h-2 w-2 rounded-full bg-[#ff873f]" />
              <span className="absolute bottom-5 left-8 h-1.5 w-1.5 rounded-full bg-[#ffc29f]" />
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-xl border-orange-200 bg-white/85 px-4 font-semibold text-[#172b4d] hover:border-orange-300 hover:bg-white"
              >
                <Link href="/placement/drives">Manage Drives</Link>
              </Button>
              <Button
                asChild
                className="h-12 rounded-xl bg-[#ff5a1f] px-5 font-semibold text-white shadow-[0_8px_18px_rgba(255,90,31,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#ed4e17] hover:shadow-lg"
              >
                <Link href="/placement/drives/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Drive
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Placement overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Active Drives"
          value={isLoading ? null : isError ? '—' : activeCount}
          description="Currently published to students"
          icon={BriefcaseBusiness}
          tone="orange"
        />
        <MetricCard
          title="Draft Drives"
          value={isLoading ? null : isError ? '—' : draftCount}
          description="Saved and ready to publish"
          icon={FileText}
          tone="slate"
        />
        <MetricCard
          title="Eligible Students"
          value="--"
          description="Eligibility engine · Coming soon"
          icon={Users}
          tone="green"
        />
        <MetricCard
          title="Applications"
          value="--"
          description="Application reporting · Coming soon"
          icon={Send}
          tone="blue"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(290px,0.85fr)]">
        <Card className="overflow-hidden rounded-2xl border-[#e5e7eb] bg-white shadow-[0_2px_12px_rgba(23,43,77,0.045)] hover:shadow-[0_8px_24px_rgba(23,43,77,0.075)]">
          <CardHeader className="flex-row items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <CardTitle className="text-base">Recent Placement Drives</CardTitle>
              <p className="mt-1 text-xs text-slate-500">Latest updated recruitment drives</p>
            </div>
            <Link
              href="/placement/drives"
              className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[#f15a24] hover:text-[#d9440f]"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-5" aria-label="Loading drives">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-[58px] animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : isError ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm text-slate-600">Drives could not be loaded.</p>
                <button
                  onClick={() => void refetch()}
                  className="mt-2 text-sm font-semibold text-[#f15a24] hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : recentDrives.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-[#f15a24]">
                  <BriefcaseBusiness className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-[#172b4d]">No placement drives yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Create a drive to start organizing campus recruitment.
                </p>
                <Button asChild className="mt-4 rounded-xl bg-[#ff5a1f] hover:bg-[#ed4e17]">
                  <Link href="/placement/drives/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Drive
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentDrives.map((drive) => (
                  <Link
                    key={drive.id}
                    href={`/placement/drives/${drive.id}`}
                    className="group flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center sm:gap-4 sm:px-6"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#f15a24]">
                        <BriefcaseBusiness className="h-[18px] w-[18px]" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#172b4d] group-hover:text-[#f15a24]">
                          {drive.companyName}
                        </p>
                        <p className="truncate text-xs text-slate-500">{drive.roleTitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 pl-[52px] sm:justify-end sm:pl-0">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${statusStyle[drive.status] ?? statusStyle[DriveStatus.CLOSED]}`}
                      >
                        {drive.status.toLowerCase()}
                      </span>
                      <span className="flex min-w-[118px] items-center gap-1.5 text-xs text-slate-500">
                        <Clock3 className="h-3.5 w-3.5" />
                        Updated {dateLabel(drive.updatedAt)}
                      </span>
                      <ArrowRight className="hidden h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#f15a24] sm:block" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-[#e5e7eb] bg-white shadow-[0_2px_12px_rgba(23,43,77,0.045)] hover:shadow-[0_8px_24px_rgba(23,43,77,0.075)]">
          <CardHeader className="px-5 pb-3 pt-5 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-[18px] w-[18px] text-[#f15a24]" />
              Quick Actions
            </CardTitle>
            <p className="text-xs text-slate-500">Jump back into your daily workflow</p>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 px-5 pb-5 sm:px-6">
            <QuickAction href="/placement/drives/new" label="Create Drive" icon={Plus} />
            <QuickAction href="/placement/drives" label="Manage Drives" icon={BriefcaseBusiness} />
            <QuickAction href="/placement/applications" label="Applications" icon={Send} />
            <QuickAction href="/placement/notifications" label="Notifications" icon={Check} />
          </CardContent>
        </Card>
      </section>

      <p className="px-1 text-xs text-slate-400">
        Drive counts and details reflect the latest data available from your account.
      </p>
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string | number | null;
  description: string;
  icon: typeof BriefcaseBusiness;
  tone: 'orange' | 'slate' | 'green' | 'blue';
}) {
  const iconTone = {
    orange: 'bg-orange-50 text-[#f15a24]',
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-sky-50 text-sky-600',
  }[tone];
  const cardTone = {
    orange: 'from-white to-orange-50/75',
    slate: 'from-white to-slate-50',
    green: 'from-white to-emerald-50/70',
    blue: 'from-white to-sky-50/70',
  }[tone];
  return (
    <Card
      className={`group rounded-2xl border-[#e9e9eb] bg-gradient-to-br ${cardTone} shadow-[0_2px_12px_rgba(23,43,77,0.045)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(23,43,77,0.08)]`}
    >
      <CardContent className="p-5 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-600">{title}</p>
            <div className="mt-3 min-h-10 text-[32px] font-bold leading-none tracking-[-0.04em] text-[#172b4d]">
              {value === null ? (
                <span className="inline-block h-8 w-14 animate-pulse rounded-md bg-slate-100 align-middle" />
              ) : (
                value
              )}
            </div>
          </div>
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] transition-transform duration-200 group-hover:scale-105 ${iconTone}`}
          >
            <Icon className="h-[21px] w-[21px]" />
          </span>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">{description}</p>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof BriefcaseBusiness;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[104px] flex-col items-start justify-between rounded-xl border border-slate-100 bg-[#fafbfc] p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50/60"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#f15a24] shadow-sm ring-1 ring-slate-100 transition-colors group-hover:bg-[#ff5a1f] group-hover:text-white">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="flex w-full items-center justify-between gap-1 text-xs font-semibold text-[#34445e] group-hover:text-[#f15a24]">
        {label}
        <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
      </span>
    </Link>
  );
}
