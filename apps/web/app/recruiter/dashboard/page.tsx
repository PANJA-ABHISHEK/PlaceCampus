'use client';

import * as React from 'react';
import Link from 'next/link';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Activity,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  ExternalLink,
  CalendarCheck,
  RefreshCw,
  Send,
  Star,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { DriveStatus, type NotificationItem } from '@placecampus/shared-types';
import { Button } from '@/components/ui/button';
import { HeroWaves, lightHeroClassName } from '@/components/brand/hero-waves';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/features/notifications/hooks/use-notifications';
import {
  useRecruiterDashboardSummary,
} from '@/features/recruiter/hooks/use-recruiter-portal';

const chartColors = {
  Active: '#ff6b1a',
  Upcoming: '#3b82f6',
  Completed: '#64748b',
  Expired: '#94a3b8',
  Cancelled: '#cbd5e1',
};

function dateLabel(value?: string) {
  if (!value) return 'Not announced';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not announced';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function relativeTime(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return 'Recently';
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function statusClass(status: string) {
  if (status === DriveStatus.PUBLISHED) return 'bg-emerald-50 text-emerald-700';
  if (status === DriveStatus.DRAFT) return 'bg-orange-50 text-orange-700';
  if (status === DriveStatus.CLOSED) return 'bg-slate-100 text-slate-600';
  return 'bg-rose-50 text-rose-700';
}

export default function RecruiterDashboardPage() {
  const drivesQuery = useRecruiterDashboardSummary();
  const grants = React.useMemo(() => drivesQuery.data ?? [], [drivesQuery.data]);
  const statusGrants = grants.filter((grant) => grant.releasedFields.includes('applicationStatus'));
  const notificationsQuery = useNotifications({ limit: 5 });
  const [now, setNow] = React.useState(0);

  React.useEffect(() => {
    const initial = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, []);

  const totalCandidates = grants.reduce((sum, grant) => sum + grant.candidateCount, 0);

  const shortlistCount = grants.length === 0
    ? 0
    : statusGrants.length === 0
      ? null
      : statusGrants.reduce((sum, grant) => sum + (grant.shortlistedCount ?? 0), 0);

  const expiringSoon = grants.filter((grant) => {
    const remaining = new Date(grant.expiresAt).getTime() - now;
    return remaining >= 0 && remaining <= 48 * 60 * 60 * 1000;
  }).length;

  const overview = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const counts = { Active: 0, Upcoming: 0, Completed: 0, Expired: 0, Cancelled: 0 };
    for (const grant of grants) {
      const expiresAt = new Date(grant.expiresAt).getTime();
      const drive = grant.drive;
      const startsAt = drive.applicationStart ? new Date(drive.applicationStart).getTime() : NaN;
      const deadline = drive.applicationDeadline ? new Date(drive.applicationDeadline).getTime() : NaN;
      if (drive.status === DriveStatus.CANCELLED) counts.Cancelled += 1;
      else if (!Number.isNaN(expiresAt) && expiresAt <= now) counts.Expired += 1;
      else if (drive.status === DriveStatus.CLOSED || (!Number.isNaN(deadline) && deadline < today.getTime())) counts.Completed += 1;
      else if (drive.status === DriveStatus.DRAFT || (!Number.isNaN(startsAt) && startsAt > now)) counts.Upcoming += 1;
      else counts.Active += 1;
    }
    return counts;
  }, [grants, now]);

  const recentDrives = React.useMemo(
    () => [...grants].sort((a, b) => new Date(b.drive.createdAt).getTime() - new Date(a.drive.createdAt).getTime()).slice(0, 4),
    [grants],
  );

  const activities = (notificationsQuery.data?.items ?? []).slice(0, 4);
  const chartTotal = grants.length;

  if (drivesQuery.isLoading) return <DashboardSkeleton />;
  if (drivesQuery.isError) {
    return (
      <section role="alert" className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <BriefcaseBusiness className="mx-auto h-9 w-9 text-slate-300" aria-hidden="true" />
        <h1 className="mt-3 text-lg font-semibold text-[#142b4d]">Could not load your recruiter dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Your authorized drive information could not be retrieved.</p>
        <Button onClick={() => void drivesQuery.refetch()} className="mt-5 rounded-xl bg-[#ff6b1a] text-white hover:bg-[#e95b0c]">
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </section>
    );
  }

  return (
    <div className="-mt-1 space-y-5 sm:-mt-2 lg:-mt-4">
      <RecruiterHero />

      <section aria-label="Recruiter overview" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Active Drives" value={grants.length} detail="Drives with active candidate access" icon={<BriefcaseBusiness className="h-5 w-5" />} tone="orange" href="/recruiter/drives" />
        <MetricCard title="Total Candidates" value={totalCandidates} detail="Applicants across assigned drives" icon={<UsersRound className="h-5 w-5" />} tone="blue" href="/recruiter/candidates" />
        <MetricCard title="Shortlisted" value={shortlistCount ?? '—'} detail={shortlistCount === null ? 'Application status is not shared for these drives' : statusGrants.length < grants.length ? 'On drives sharing application status' : 'Candidates in your shortlist'} icon={<Star className="h-5 w-5" />} tone="violet" href="/recruiter/shortlists" />
        <MetricCard title="Expiring Soon" value={expiringSoon} detail="Access expires within 48 hours" icon={<Clock3 className="h-5 w-5" />} tone="green" href="/recruiter/drives" />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className={panelClassName}>
          <SectionHeader icon={BriefcaseBusiness} title="Your Recent Drives" href="/recruiter/drives" className="mb-4" />
          {recentDrives.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-gradient-to-b from-slate-50/80 to-white px-5 py-10 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 text-[#ff6b1a] shadow-[0_10px_24px_-14px_rgba(255,107,26,0.7)] ring-1 ring-orange-100"><BriefcaseBusiness className="h-7 w-7" aria-hidden="true" /></span>
              <h3 className="mt-5 text-lg font-bold text-[#142b4d]">No Active Drives</h3>
              <p className="mt-1.5 max-w-md text-sm leading-6 text-slate-500">You haven&apos;t been granted access to any placement drives yet, or your previous access has expired.</p>
              <Button asChild className="mt-6 h-11 rounded-xl bg-[#ff6b1a] px-6 text-sm font-semibold text-white shadow-[0_10px_22px_-12px_rgba(255,107,26,0.9)] transition hover:-translate-y-0.5 hover:bg-[#e95b0c]"><Link href="/recruiter/drives">View Assigned Drives <ArrowRight className="h-4 w-4" /></Link></Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentDrives.map((grant) => (
                <article key={grant.grantId} className="flex flex-col gap-4 py-4 first:pt-1 sm:flex-row sm:items-center">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff0e8] text-sm font-bold text-[#e9570c]" aria-label={`${grant.drive.companyName} mark`}>
                    {grant.drive.companyName.trim().slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold text-[#142b4d]">{grant.drive.companyName}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusClass(grant.drive.status)}`}>{grant.drive.status.toLocaleLowerCase()}</span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-600">{grant.drive.roleTitle}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />Deadline: {dateLabel(grant.drive.applicationDeadline)}</span>
                    </div>
                  </div>
                  <Link href={`/recruiter/drives/${grant.drive.id}/candidates`} className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 self-start rounded-lg border border-slate-200 px-3 text-sm font-semibold text-[#142b4d] transition hover:border-orange-200 hover:bg-orange-50 hover:text-[#e9570c] sm:self-center">
                    View Details <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-1">
          <DriveOverview counts={overview} total={chartTotal} />
          <RecentActivity items={activities} isLoading={notificationsQuery.isLoading} isError={notificationsQuery.isError} retry={() => void notificationsQuery.refetch()} />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, detail, icon, tone, href, loading }: {
  title: string; value: number | string; detail: string; icon: React.ReactNode;
  tone: 'orange' | 'blue' | 'violet' | 'green'; href: string; loading?: boolean;
}) {
  const tones = {
    orange: { card: 'from-orange-50/90 border-orange-100 group-hover:border-orange-200', icon: 'text-orange-600 ring-orange-100', glow: 'bg-orange-200/40' },
    blue: { card: 'from-blue-50/90 border-blue-100 group-hover:border-blue-200', icon: 'text-blue-600 ring-blue-100', glow: 'bg-blue-200/40' },
    violet: { card: 'from-violet-50/90 border-violet-100 group-hover:border-violet-200', icon: 'text-violet-600 ring-violet-100', glow: 'bg-violet-200/40' },
    green: { card: 'from-emerald-50/90 border-emerald-100 group-hover:border-emerald-200', icon: 'text-emerald-600 ring-emerald-100', glow: 'bg-emerald-200/40' },
  }[tone];
  return (
    <Link href={href} className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b1a] focus-visible:ring-offset-2">
      <article className={cn('relative h-full overflow-hidden rounded-2xl border bg-gradient-to-br to-white p-5 shadow-[0_4px_18px_-12px_rgba(20,43,77,0.25)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_14px_30px_-18px_rgba(20,43,77,0.35)]', tones.card)}>
        <span aria-hidden="true" className={cn('pointer-events-none absolute -bottom-10 -right-10 h-28 w-28 rounded-full blur-2xl', tones.glow)} />
        <div className="relative flex items-start gap-4">
          <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1', tones.icon)}>{icon}</span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-[#142b4d]">{title}</h2>
            {loading ? <div className="mt-2 h-8 w-16 animate-pulse rounded bg-slate-100" /> : <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-[#142b4d]">{value}</p>}
            <p className="mt-1.5 text-xs leading-5 text-slate-500">{detail}</p>
          </div>
        </div>
      </article>
    </Link>
  );
}

const panelClassName = 'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_4px_18px_-12px_rgba(20,43,77,0.22)] sm:p-6';

function SectionHeader({ icon: Icon, title, href, className }: { icon: LucideIcon; title: string; href?: string; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <h2 className="flex items-center gap-2.5 text-lg font-bold text-[#142b4d]">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-[#ff6b1a]"><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
        {title}
      </h2>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-[#e9570c] transition-colors hover:bg-orange-50">
          View All <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

const quickActions: { label: string; href: string; icon: LucideIcon; tone: string }[] = [
  { label: 'Review Applications', href: '/recruiter/candidates', icon: Send, tone: 'bg-orange-50 text-[#ff6b1a]' },
  { label: 'Manage Drives', href: '/recruiter/drives', icon: CalendarCheck, tone: 'bg-rose-50 text-rose-500' },
  { label: 'Shortlist Talent', href: '/recruiter/shortlists', icon: UsersRound, tone: 'bg-violet-50 text-violet-600' },
];

function RecruiterHero() {
  return (
    <section className={cn(lightHeroClassName, 'rounded-3xl px-5 py-5 sm:px-7 sm:py-5 lg:px-8')}>
      <HeroWaves />
      <div className="relative flex items-center gap-6">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200/70 bg-orange-50/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#e9570c]">
            <BriefcaseBusiness className="h-3 w-3" aria-hidden="true" />
            Recruiter Workspace
          </span>
          <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-[#142b4d] sm:text-3xl lg:text-[34px]">
            Recruiter <span className="text-[#ff6b1a]">Portal</span>
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Access candidates, review applications, and manage your placement drives efficiently.
          </p>
          <nav aria-label="Quick actions" className="mt-4 flex flex-wrap gap-2 sm:gap-2.5">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="inline-flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white/90 py-1 pl-1 pr-3.5 text-sm font-semibold text-[#142b4d] shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:text-[#e9570c] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b1a]"
              >
                <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', action.tone)}><action.icon className="h-4 w-4" aria-hidden="true" /></span>
                {action.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="pointer-events-none hidden h-[140px] w-[230px] shrink-0 lg:block xl:w-[250px]" aria-hidden="true">
          <RecruitmentIllustration />
        </div>
      </div>
    </section>
  );
}

function RecruitmentIllustration() {
  return (
    <svg viewBox="0 0 340 200" className="h-full w-full">
      <ellipse cx="190" cy="190" rx="140" ry="7" fill="#FF6B1A" opacity="0.12" />
      {/* Books */}
      <rect x="40" y="168" width="70" height="10" rx="2.5" fill="#FF6B1A" />
      <rect x="46" y="158" width="60" height="10" rx="2.5" fill="#142B4D" />
      <rect x="40" y="178" width="76" height="6" rx="2" fill="#E2E8F0" />
      {/* Plant */}
      <path d="M72 120 C 60 100 58 86 66 74 C 76 90 78 104 72 120 Z" fill="#22C55E" opacity="0.85" />
      <path d="M76 124 C 82 100 94 90 106 88 C 104 104 94 118 76 124 Z" fill="#16A34A" opacity="0.85" />
      <path d="M70 124 C 56 112 44 108 34 110 C 40 122 54 128 70 124 Z" fill="#4ADE80" opacity="0.8" />
      <path d="M62 124 h24 l-4 34 h-16 z" fill="#93C5FD" />
      <rect x="60" y="120" width="28" height="7" rx="2" fill="#BFDBFE" />
      {/* Accent strokes */}
      <path d="M44 64 l10 12 M36 82 l14 4 M58 54 l3 14" stroke="#FFB27A" strokeWidth="4" strokeLinecap="round" />
      {/* Laptop */}
      <rect x="112" y="34" width="168" height="114" rx="10" fill="#142B4D" />
      <rect x="120" y="42" width="152" height="98" rx="5" fill="#F1F5FF" />
      <rect x="96" y="148" width="200" height="10" rx="5" fill="#334E7A" />
      <rect x="176" y="148" width="40" height="4" rx="2" fill="#1E3A6B" />
      {/* Candidate list */}
      {[58, 84, 110].map((y) => (
        <g key={y}>
          <circle cx="138" cy={y} r="7" fill="#C7D2FE" />
          <rect x="152" y={y - 5} width="44" height="4" rx="2" fill="#CBD5E1" />
          <rect x="152" y={y + 2} width="30" height="3" rx="1.5" fill="#E2E8F0" />
        </g>
      ))}
      {/* Profile card */}
      <rect x="206" y="50" width="96" height="76" rx="8" fill="#FFFFFF" stroke="#E2E8F0" />
      <rect x="216" y="60" width="28" height="28" rx="6" fill="#FFF0E8" />
      <circle cx="230" cy="70" r="6" fill="#FF6B1A" />
      <path d="M220 86 c 2 -8 18 -8 20 0 z" fill="#FF6B1A" />
      <rect x="250" y="64" width="40" height="5" rx="2.5" fill="#CBD5E1" />
      <rect x="250" y="74" width="28" height="4" rx="2" fill="#E2E8F0" />
      <rect x="216" y="98" width="74" height="4" rx="2" fill="#E2E8F0" />
      <rect x="216" y="108" width="56" height="4" rx="2" fill="#E2E8F0" />
      {/* Magnifier */}
      <circle cx="292" cy="128" r="20" fill="#FFFFFF" fillOpacity="0.6" stroke="#FF6B1A" strokeWidth="6" />
      <path d="M284 128 l6 6 l10 -12" fill="none" stroke="#16A34A" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M306 143 l16 16" stroke="#142B4D" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

function DriveOverview({ counts, total }: { counts: Record<string, number>; total: number }) {
  const entries = Object.entries(counts).map(([name, value]) => ({ name, value, color: chartColors[name as keyof typeof chartColors] }));
  const chartItems = entries.filter((entry) => entry.value > 0);
  return (
    <section className={panelClassName}>
      <SectionHeader icon={Activity} title="Drive Overview" />
      {total === 0 ? (
        <div className="flex min-h-[188px] flex-col items-center justify-center gap-5 py-5 sm:flex-row sm:gap-6">
          <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200/70">
            <div className="flex h-[92px] w-[92px] flex-col items-center justify-center rounded-full bg-white shadow-[0_6px_16px_-10px_rgba(20,43,77,0.35)]">
              <p className="text-3xl font-bold leading-none tabular-nums text-[#142b4d]">{total}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Drives</p>
            </div>
          </div>
          <p className="max-w-[190px] border-slate-200 text-center text-sm leading-6 text-slate-500 sm:border-l sm:pl-6 sm:text-left">Drive counts will appear here when access is assigned.</p>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(140px,0.85fr)_1fr]">
          <div className="relative mx-auto h-[170px] w-full max-w-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartItems} dataKey="value" nameKey="name" innerRadius={56} outerRadius={74} paddingAngle={2} cornerRadius={4} stroke="none">
                  {chartItems.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Drives']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold leading-none tabular-nums text-[#142b4d]">{total}</span><span className="mt-1 text-xs font-medium text-slate-500">Drives</span>
            </div>
          </div>
          <ul className="space-y-1 border-slate-100 sm:border-l sm:pl-4">
            {entries.map((entry) => (
              <li key={entry.name} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-slate-50">
                <span className="inline-flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />{entry.name}</span>
                <span className="font-semibold text-[#142b4d]">{entry.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function RecentActivity({ items, isLoading, isError, retry }: {
  items: NotificationItem[]; isLoading: boolean; isError: boolean; retry: () => void;
}) {
  return (
    <section className={panelClassName}>
      <SectionHeader icon={Clock3} title="Recent Activity" href="/recruiter/notifications" />
      <div className="mt-4 border-t border-slate-100 pt-2">
        {isLoading ? (
          <div className="space-y-3 py-3" aria-label="Loading recent activity" aria-busy="true">{[0, 1, 2].map((item) => <div key={item} className="flex gap-3"><span className="h-9 w-9 animate-pulse rounded-xl bg-slate-100" /><span className="flex-1 space-y-2 pt-1"><span className="block h-3 w-3/4 animate-pulse rounded bg-slate-100" /><span className="block h-3 w-1/3 animate-pulse rounded bg-slate-50" /></span></div>)}</div>
        ) : isError ? (
          <div className="py-5 text-center"><p className="text-sm text-slate-500">Activity updates could not be loaded.</p><button type="button" onClick={retry} className="mt-2 text-sm font-semibold text-[#e9570c] hover:underline">Retry</button></div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[145px] flex-col items-center justify-center py-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-100"><Clock3 className="h-6 w-6" aria-hidden="true" /></span>
            <h3 className="mt-3 text-sm font-semibold text-[#142b4d]">No recent activity</h3>
            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">Updates about drives, shortlists, and candidates will appear here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => <ActivityItem key={item.id} item={item} />)}
          </ul>
        )}
      </div>
    </section>
  );
}

function ActivityItem({ item }: { item: NotificationItem }) {
  return (
    <li className="flex items-start gap-3 py-3 first:pt-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#e9570c]"><Activity className="h-4 w-4" aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#142b4d]">{item.title}</p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-500">{item.message}</p>
      </div>
      <time dateTime={item.createdAt} className="shrink-0 pt-0.5 text-[11px] text-slate-400">{relativeTime(item.createdAt)}</time>
    </li>
  );
}

function DashboardSkeleton() {
  return (
    <div className="-mt-1 space-y-5 sm:-mt-2 lg:-mt-4" aria-label="Loading recruiter dashboard" aria-busy="true">
      <div className="rounded-3xl border border-orange-100 bg-white p-6"><div className="h-5 w-40 animate-pulse rounded-full bg-orange-50" /><div className="mt-3 h-8 w-64 max-w-full animate-pulse rounded bg-slate-100" /><div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-slate-100" /><div className="mt-4 flex flex-wrap gap-2.5">{[0, 1, 2].map((item) => <div key={item} className="h-9 w-40 animate-pulse rounded-xl bg-slate-100" />)}</div></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white" />)}</div>
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]"><div className="h-[390px] animate-pulse rounded-2xl border border-slate-200 bg-white" /><div className="space-y-5"><div className="h-[220px] animate-pulse rounded-2xl border border-slate-200 bg-white" /><div className="h-[220px] animate-pulse rounded-2xl border border-slate-200 bg-white" /></div></div>
    </div>
  );
}
