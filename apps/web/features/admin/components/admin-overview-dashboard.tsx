'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  BookOpenCheck,
  BriefcaseBusiness,
  ArrowRight,
  ArrowUpRight,
  GraduationCap,
  Shield,
  ShieldCheck,
  TrendingUp,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type {
  AnalyticsPlacements,
  AnalyticsReadiness,
  AnalyticsSkills,
} from '@placecampus/shared-types';
import { Card, CardContent } from '@/components/ui/card';
import { HeroWaves, lightHeroClassName } from '@/components/brand/hero-waves';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/components/auth-provider';
import { useAnalytics } from '@/features/analytics/hooks/use-analytics';

const numberFormatter = new Intl.NumberFormat('en-US');
const readinessColors = [
  'hsl(var(--primary))',
  'hsl(var(--color-info))',
  'hsl(var(--color-success))',
  'hsl(var(--color-warning))',
  'hsl(var(--color-error))',
];

export function AdminOverviewDashboard() {
  const { user } = useAuth();
  const analytics = useAnalytics();
  const queries = [
    analytics.overview,
    analytics.readiness,
    analytics.skills,
    analytics.placements,
    analytics.evidence,
    analytics.preparation,
  ];

  if (queries.every((query) => query.isLoading)) {
    return <AdminOverviewSkeleton />;
  }

  const overview = analytics.overview.data;
  const readiness = analytics.readiness.data;
  const skills = analytics.skills.data;
  const placements = analytics.placements.data;
  const evidence = analytics.evidence.data;
  const preparation = analytics.preparation.data;
  const administratorName = user?.fullName?.trim() || 'Administrator';

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6">
      <WelcomeBanner name={administratorName} />

      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[hsl(var(--primary))]">Institutional overview</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0B1F44] sm:text-[28px]">Placement health</h1>
          <p className="max-w-3xl text-[15px] leading-6 text-[#0B1F44]/75">
            Monitor student readiness, placement activity, and institutional signals from one operational view.
          </p>
        </div>
        <Link href="/admin/analytics" className="inline-flex items-center gap-1.5 self-start rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-2 text-sm font-semibold text-[#0B1F44] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-[#FF6B1A]/40 hover:text-[#FF6B1A] sm:self-auto">
          View full analytics
          <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </header>

      <section aria-label="Platform key metrics">
        {analytics.overview.isLoading ? (
          <MetricSkeleton />
        ) : analytics.overview.isError ? (
          <SectionError query={analytics.overview} />
        ) : !overview ? (
          <EmptyState title="Overview data is unavailable" description="No platform summary was returned for this scope." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Registered students" value={formatCount(overview.students.registered)} icon={UsersRound} tile="bg-blue-50 text-blue-600" />
            <MetricCard title="Usable profiles" value={formatCount(overview.students.usableProfiles)} icon={GraduationCap} tile="bg-orange-50 text-[#FF6B1A]" />
            <MetricCard title="Average readiness" value={formatPercent(overview.readiness.average)} icon={TrendingUp} tile="bg-emerald-50 text-emerald-600" />
            <MetricCard title="Published drives" value={formatCount(overview.drives.published)} icon={BriefcaseBusiness} tile="bg-orange-50 text-[#FF6B1A]" />
          </div>
        )}
      </section>

      <section aria-label="Placement and readiness analytics">
        <SectionHeading eyebrow="Institutional signals" title="Placement and readiness trends" description="Track activity and the latest readiness distribution across the platform." />
        <div className="grid gap-6 xl:grid-cols-2">
          <AnalyticsPanel query={analytics.placements} data={placements} title="Placement activity" description="Applications submitted by day, based on persisted application records." icon={Activity} action={<ViewAll href="/admin/analytics" />}>
            {(data) => <PlacementTrendChart data={data} />}
          </AnalyticsPanel>
          <AnalyticsPanel query={analytics.readiness} data={readiness} title="Student readiness" description="Latest persisted readiness snapshot for each student, grouped by status." icon={TrendingUp} action={<ViewAll href="/admin/analytics" />}>
            {(data) => <ReadinessChart data={data} />}
          </AnalyticsPanel>
        </div>
      </section>

      <section aria-label="Skill demand analytics">
        <SectionHeading eyebrow="Capability planning" title="Skill demand and supply" description="Compare published-drive requirements with verified student skills to surface the largest gaps." />
        <AnalyticsPanel query={analytics.skills} data={skills} title="Skill demand and verified supply" description="Showing the largest current supply gaps." icon={GraduationCap} action={<ViewAll href="/admin/analytics" />}>
          {(data) => <SkillChart data={data} />}
        </AnalyticsPanel>
      </section>

      <section aria-label="Evidence and preparation insights">
        <SectionHeading eyebrow="Student enablement" title="Evidence and preparation" description="Review the signals that support trusted profiles and student progress." />
        <div className="grid gap-4 md:grid-cols-2">
          <InsightPanel query={analytics.evidence} data={evidence} title="Evidence verification" icon={ShieldCheck} action={<ViewAll href="/admin/reviews" />}>
            {(data) => <InsightCard title="Evidence verification" value={formatPercent(data.verifiedPercentage)} icon={ShieldCheck} description={data.total === 0 ? 'No evidence records are available yet.' : `${formatCount(data.verified)} verified out of ${formatCount(data.total)} evidence records.`} linkHref="/admin/reviews" linkLabel="Open review queue" />}
          </InsightPanel>
          <InsightPanel query={analytics.preparation} data={preparation} title="Preparation progress" icon={BookOpenCheck}>
            {(data) => <InsightCard title="Preparation progress" value={formatPercent(data.averageCompletionPercentage)} icon={BookOpenCheck} description={data.byStatus.length === 0 ? 'No preparation plans are available yet.' : `${formatCount(data.byStatus.reduce((total, item) => total + item.count, 0))} plans in the selected reporting scope.`} />}
          </InsightPanel>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-4 space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">{eyebrow}</p>
      <h2 className="text-xl font-bold tracking-tight text-heading">{title}</h2>
      <p className="text-sm text-[hsl(var(--muted-foreground))]">{description}</p>
    </div>
  );
}

function WelcomeBanner({ name }: { name: string }) {
  return (
    <section className={lightHeroClassName}>
      <HeroWaves />
      <div className="relative flex items-center gap-5">
        <span className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-[#0B1F44] shadow-[0_8px_20px_-12px_rgba(255,107,26,0.6)] ring-1 ring-orange-100 sm:flex">
          <Shield className="h-8 w-8" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0B1F44] sm:text-[28px]">
            Welcome back, <span className="text-[#FF6B1A]">{name}!</span>
          </h1>
          <p className="text-[15px] text-[#0B1F44]/75">
            Keep your institution&apos;s placement operations moving with a clear view of readiness, applications, and student support signals.
          </p>
          <p className="text-sm font-medium text-[#0B1F44]">System Administrator</p>
        </div>
        <div aria-hidden="true" className="pointer-events-none hidden h-[104px] w-[170px] shrink-0 lg:block xl:mr-6">
          <AdminIllustration />
        </div>
      </div>
    </section>
  );
}

function AdminIllustration() {
  return (
    <svg viewBox="0 0 170 104" className="h-full w-full">
      <ellipse cx="88" cy="98" rx="72" ry="5" fill="#FF6B1A" opacity="0.12" />
      <rect x="20" y="74" width="120" height="14" rx="3" fill="#FF6B1A" />
      <rect x="30" y="60" width="104" height="14" rx="3" fill="#0B1F44" />
      <rect x="26" y="88" width="112" height="6" rx="2" fill="#E2E8F0" />
      <rect x="22" y="26" width="52" height="34" rx="4" fill="#475569" transform="rotate(-14 48 42)" />
      <rect x="26" y="30" width="44" height="26" rx="2" fill="#94A3B8" transform="rotate(-14 48 42)" />
      <path d="M118 12 L156 26 L118 40 L80 26 Z" fill="#0B1F44" />
      <path d="M96 33 v13 c0 6 44 6 44 0 v-13 l-22 8 z" fill="#1E3A6B" />
      <line x1="152" y1="27" x2="152" y2="48" stroke="#FF6B1A" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="152" cy="50" r="3.5" fill="#FF6B1A" />
    </svg>
  );
}

function SectionError({ query }: { query: { refetch: () => Promise<unknown> } }) {
  return <ErrorState title="This section is unavailable" description="The analytics service could not return this data. Other dashboard sections remain available." onRetry={() => void query.refetch()} className="rounded-[var(--radius-lg)] border border-[hsl(var(--border))] py-10" />;
}

function AnalyticsPanel<T>({ query, data, title, description, icon, action, children }: { query: { isLoading: boolean; isError: boolean; refetch: () => Promise<unknown> }; data: T | undefined; title: string; description: string; icon: LucideIcon; action?: ReactNode; children: (data: T) => ReactNode }) {
  return (
    <ChartCard title={title} description={description} icon={icon} action={action}>
      {query.isLoading ? <Skeleton className="h-[260px] w-full" /> : query.isError ? <SectionError query={query} /> : data ? children(data) : <EmptyState title="No data available" description="There is no persisted data in this reporting scope." className="py-10" />}
    </ChartCard>
  );
}

function InsightPanel<T>({ query, data, title, icon, action, children }: { query: { isLoading: boolean; isError: boolean; refetch: () => Promise<unknown> }; data: T | undefined; title: string; icon: LucideIcon; action?: ReactNode; children: (data: T) => ReactNode }) {
  if (query.isLoading) {
    return (
      <Card className="min-w-0 overflow-hidden rounded-2xl border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-18px_rgba(15,23,42,0.18)]">
        <PanelHeader icon={icon} title={title}>{action}</PanelHeader>
        <CardContent className="space-y-4 p-5 sm:p-6"><Skeleton className="h-10 w-24" /><Skeleton className="h-4 w-full" /></CardContent>
      </Card>
    );
  }
  if (query.isError) return <Card className="min-w-0 overflow-hidden rounded-2xl border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-18px_rgba(15,23,42,0.18)]"><PanelHeader icon={icon} title={title}>{action}</PanelHeader><SectionError query={query} /></Card>;
  if (!data) return <Card className="min-w-0 overflow-hidden rounded-2xl border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-18px_rgba(15,23,42,0.18)]"><PanelHeader icon={icon} title={title}>{action}</PanelHeader><EmptyState title="No insight data available" description="There is no persisted data in this reporting scope." className="py-10" /></Card>;
  return <>{children(data)}</>;
}

function MetricSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {['metric-1', 'metric-2', 'metric-3', 'metric-4'].map((key) => (
        <Card key={key} className="rounded-2xl border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-18px_rgba(15,23,42,0.18)]">
          <CardContent className="flex min-h-[100px] items-center gap-4 p-4 sm:p-5">
            <Skeleton className="h-11 w-11 shrink-0 rounded-full sm:h-14 sm:w-14" />
            <span className="space-y-2"><Skeleton className="h-8 w-20" /><Skeleton className="h-4 w-28" /></span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  tile,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  tile: string;
}) {
  return (
    <Card className="rounded-2xl border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-18px_rgba(15,23,42,0.18)]">
      <CardContent className="flex min-h-[100px] items-center gap-4 p-4 sm:p-5">
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full sm:h-14 sm:w-14", tile)}>
          <Icon aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" />
        </span>
        <span className="min-w-0">
          <span className="block text-2xl font-extrabold tabular-nums leading-none text-[#0B1F44] sm:text-3xl">{value}</span>
          <span className="mt-1.5 block text-sm font-medium text-[#64748B]">{title}</span>
        </span>
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  description,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="min-w-0 overflow-hidden rounded-2xl border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-18px_rgba(15,23,42,0.18)]">
      <PanelHeader icon={Icon} title={title}>{action}</PanelHeader>
      <CardContent className="p-5 sm:p-6">
        <p className="mb-4 text-sm leading-6 text-[#64748B]">{description}</p>
        {children}
      </CardContent>
    </Card>
  );
}

function PanelHeader({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-[68px] flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] px-5 py-4">
      <h3 className="flex items-center gap-2.5 text-lg font-bold text-[#0B1F44]">
        <Icon className="h-5 w-5 shrink-0 text-[#FF6B1A]" aria-hidden="true" />
        {title}
      </h3>
      {children && <div className="flex items-center gap-4">{children}</div>}
    </div>
  );
}

function ViewAll({ href, label = 'View All' }: { href: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-[#FF6B1A] hover:underline">
      {label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

function PlacementTrendChart({ data }: { data: AnalyticsPlacements }) {
  if (data.activity.length === 0) {
    return (
      <EmptyState
        title="No placement activity yet"
        description="Application activity will appear here when students apply to drives."
        className="py-10"
      />
    );
  }

  return (
    <div role="img" aria-label="Daily application submissions over time">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data.activity} margin={{ top: 12, right: 12, left: -16, bottom: 4 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateTick}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            labelFormatter={(label) => `Date: ${formatDateTick(String(label))}`}
            formatter={(value) => [formatCount(Number(value)), 'Applications']}
            contentStyle={tooltipStyle}
          />
          <Line
            type="monotone"
            dataKey="count"
            name="Applications"
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            dot={{ r: 3, fill: 'hsl(var(--primary))' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ReadinessChart({ data }: { data: AnalyticsReadiness }) {
  if (data.byStatus.length === 0) {
    return (
      <EmptyState
        title="No readiness snapshots yet"
        description="Student readiness distribution will appear after snapshots are calculated."
        className="py-10"
      />
    );
  }

  const total = data.byStatus.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(140px,0.8fr)]">
      <div role="img" aria-label="Distribution of students by readiness status">
        <ResponsiveContainer width="100%" height={230}>
          <PieChart>
            <Pie
              data={data.byStatus}
              dataKey="count"
              nameKey="status"
              innerRadius={58}
              outerRadius={86}
              paddingAngle={3}
              stroke="hsl(var(--card))"
              strokeWidth={3}
            >
              {data.byStatus.map((item, index) => (
                <Cell key={item.status} fill={readinessColors[index % readinessColors.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [
                `${formatCount(Number(value))} students`,
                String(name).replaceAll('_', ' '),
              ]}
              contentStyle={tooltipStyle}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-3" aria-label="Readiness status totals">
        {data.byStatus.map((item, index) => (
          <li className="flex items-center justify-between gap-3 text-sm" key={item.status}>
            <span className="flex min-w-0 items-center gap-2 text-[hsl(var(--muted-foreground))]">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: readinessColors[index % readinessColors.length] }}
              />
              <span className="truncate">{formatLabel(item.status)}</span>
            </span>
            <span className="shrink-0 font-semibold text-heading">
              {formatCount(item.count)}
              {total > 0 && (
                <span className="ml-1 font-normal text-[hsl(var(--muted-foreground))]">
                  ({Math.round((item.count / total) * 100)}%)
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SkillChart({ data }: { data: AnalyticsSkills }) {
  const skills = [...data.skills]
    .sort((left, right) => right.supplyGap - left.supplyGap)
    .slice(0, 8);

  if (skills.length === 0) {
    return (
      <EmptyState
        title="No skill demand data yet"
        description="Skill demand appears when published drives include skill requirements."
        className="py-10"
      />
    );
  }

  return (
    <div role="img" aria-label="Required drive skill demand and verified student supply">
      <ResponsiveContainer width="100%" height={Math.max(260, skills.length * 38 + 64)}>
        <BarChart
          data={skills}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
          barGap={4}
        >
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis
            type="category"
            dataKey="skillName"
            width={112}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value, name) => [formatCount(Number(value)), String(name)]}
            contentStyle={tooltipStyle}
          />
          <Bar
            dataKey="requiredDemand"
            name="Required drive mentions"
            fill="hsl(var(--primary))"
            radius={[0, 4, 4, 0]}
            maxBarSize={14}
          />
          <Bar
            dataKey="verifiedStudents"
            name="Verified students"
            fill="hsl(var(--color-info))"
            radius={[0, 4, 4, 0]}
            maxBarSize={14}
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-[hsl(var(--muted-foreground))]">
        <LegendItem color="hsl(var(--primary))" label="Required drive mentions" />
        <LegendItem color="hsl(var(--color-info))" label="Verified students" />
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className="h-2.5 w-2.5 rounded-sm"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function InsightCard({
  title,
  value,
  icon: Icon,
  description,
  linkHref,
  linkLabel,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  description: string;
  linkHref?: string;
  linkLabel?: string;
}) {
  return (
    <Card className="min-w-0 overflow-hidden rounded-2xl border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-18px_rgba(15,23,42,0.18)]">
      <PanelHeader icon={Icon} title={title}>{linkHref && <ViewAll href={linkHref} label={linkLabel ?? 'View All'} />}</PanelHeader>
      <CardContent className="flex min-h-[150px] items-start gap-4 p-5 sm:p-6">
        <div className="min-w-0 flex-1">
          <p className="text-3xl font-extrabold tabular-nums text-[#0B1F44]">{value}</p>
          <p className="mt-2 text-sm leading-6 text-[#64748B]">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminOverviewSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading dashboard" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {['metric-1', 'metric-2', 'metric-3', 'metric-4'].map((key) => (
          <Card key={key}>
            <CardContent className="space-y-4 p-5 sm:p-6">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {[
          ['activity', Activity],
          ['readiness', TrendingUp],
        ].map(([key, icon]) => (
          <Card key={String(key)} className="min-w-0 overflow-hidden rounded-2xl border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-18px_rgba(15,23,42,0.18)]">
            <PanelHeader icon={icon as LucideIcon} title="Loading analytics" />
            <CardContent className="p-5 sm:p-6"><Skeleton className="mb-4 h-4 w-full max-w-sm" /><Skeleton className="h-[260px] w-full" /></CardContent>
          </Card>
        ))}
      </div>
      <Card className="min-w-0 overflow-hidden rounded-2xl border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-18px_rgba(15,23,42,0.18)]">
        <PanelHeader icon={GraduationCap} title="Loading skill analytics" />
        <CardContent className="p-5 sm:p-6"><Skeleton className="mb-4 h-4 w-full max-w-lg" /><Skeleton className="h-[300px] w-full" /></CardContent>
      </Card>
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 'var(--radius-md)',
  color: 'hsl(var(--card-foreground))',
};

function formatCount(value: number) {
  return numberFormatter.format(value);
}

function formatPercent(value: number | null) {
  return value === null ? '—' : `${numberFormatter.format(value)}%`;
}

function formatDateTick(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
