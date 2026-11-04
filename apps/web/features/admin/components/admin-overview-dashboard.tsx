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
  ArrowUpRight,
  GraduationCap,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
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

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-8">
      <header className="flex flex-col gap-3 border-b border-[hsl(var(--border))] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[hsl(var(--primary))]">PlaceCampus administration</p>
          <h1 className="text-3xl font-bold tracking-tight text-heading sm:text-4xl">Platform overview</h1>
          <p className="max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))] sm:text-base">
            Monitor student readiness, placement activity, and institutional signals from one operational view.
          </p>
        </div>
        <p className="shrink-0 text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
          Current reporting scope
        </p>
      </header>

      <section aria-label="Platform key metrics">
        <SectionHeading eyebrow="At a glance" title="Platform health" description="Key measures from the current institutional reporting scope." />
        {analytics.overview.isLoading ? (
          <MetricSkeleton />
        ) : analytics.overview.isError ? (
          <SectionError query={analytics.overview} />
        ) : !overview ? (
          <EmptyState title="Overview data is unavailable" description="No platform summary was returned for this scope." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Registered students" value={formatCount(overview.students.registered)} detail="Student accounts" icon={UsersRound} />
            <MetricCard title="Usable profiles" value={formatCount(overview.students.usableProfiles)} detail="Profiles with placement data" icon={GraduationCap} />
            <MetricCard title="Average readiness" value={formatPercent(overview.readiness.average)} detail={`${formatCount(overview.students.withReadinessSnapshots)} students with a readiness snapshot`} icon={TrendingUp} />
            <MetricCard title="Published drives" value={formatCount(overview.drives.published)} detail="Currently published" icon={BriefcaseBusiness} />
          </div>
        )}
      </section>

      <section aria-label="Placement and readiness analytics">
        <SectionHeading eyebrow="Institutional signals" title="Placement and readiness" description="Track activity and the latest readiness distribution across the platform." />
        <div className="grid gap-6 xl:grid-cols-2">
          <AnalyticsPanel query={analytics.placements} data={placements} title="Placement activity" description="Applications submitted by day, based on persisted application records." icon={Activity}>
            {(data) => <PlacementTrendChart data={data} />}
          </AnalyticsPanel>
          <AnalyticsPanel query={analytics.readiness} data={readiness} title="Student readiness" description="Latest persisted readiness snapshot for each student, grouped by status." icon={TrendingUp}>
            {(data) => <ReadinessChart data={data} />}
          </AnalyticsPanel>
        </div>
      </section>

      <section aria-label="Skill demand analytics">
        <SectionHeading eyebrow="Capability planning" title="Skill demand and supply" description="Compare published-drive requirements with verified student skills to surface the largest gaps." />
        <AnalyticsPanel query={analytics.skills} data={skills} title="Skill demand and verified supply" description="Showing the largest current supply gaps." icon={GraduationCap}>
          {(data) => <SkillChart data={data} />}
        </AnalyticsPanel>
      </section>

      <section aria-label="Evidence and preparation insights">
        <SectionHeading eyebrow="Student enablement" title="Evidence and preparation" description="Review the signals that support trusted profiles and student progress." />
        <div className="grid gap-4 md:grid-cols-2">
          <InsightPanel query={analytics.evidence} data={evidence}>
            {(data) => <InsightCard title="Evidence verification" value={formatPercent(data.verifiedPercentage)} icon={ShieldCheck} description={data.total === 0 ? 'No evidence records are available yet.' : `${formatCount(data.verified)} verified out of ${formatCount(data.total)} evidence records.`} linkHref="/admin/reviews" linkLabel="Open review queue" />}
          </InsightPanel>
          <InsightPanel query={analytics.preparation} data={preparation}>
            {(data) => <InsightCard title="Preparation progress" value={formatPercent(data.averageCompletionPercentage)} icon={BookOpenCheck} description={data.byStatus.length === 0 ? 'No preparation plans are available yet.' : `${formatCount(data.byStatus.reduce((total, item) => total + item.count, 0))} plans in the selected reporting scope.`} />}
          </InsightPanel>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-4 space-y-1">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">{eyebrow}</p>
      <h2 className="text-xl font-bold tracking-tight text-heading">{title}</h2>
      <p className="text-sm text-[hsl(var(--muted-foreground))]">{description}</p>
    </div>
  );
}

function SectionError({ query }: { query: { refetch: () => Promise<unknown> } }) {
  return <ErrorState title="This section is unavailable" description="The analytics service could not return this data. Other dashboard sections remain available." onRetry={() => void query.refetch()} className="rounded-[var(--radius-lg)] border border-[hsl(var(--border))] py-10" />;
}

function AnalyticsPanel<T>({ query, data, title, description, icon, children }: { query: { isLoading: boolean; isError: boolean; refetch: () => Promise<unknown> }; data: T | undefined; title: string; description: string; icon: LucideIcon; children: (data: T) => ReactNode }) {
  return (
    <ChartCard title={title} description={description} icon={icon}>
      {query.isLoading ? <Skeleton className="h-[260px] w-full" /> : query.isError ? <SectionError query={query} /> : data ? children(data) : <EmptyState title="No data available" description="There is no persisted data in this reporting scope." className="py-10" />}
    </ChartCard>
  );
}

function InsightPanel<T>({ query, data, children }: { query: { isLoading: boolean; isError: boolean; refetch: () => Promise<unknown> }; data: T | undefined; children: (data: T) => ReactNode }) {
  return query.isLoading ? <Card><CardContent className="space-y-4 p-5 sm:p-6"><Skeleton className="h-6 w-40" /><Skeleton className="h-10 w-24" /><Skeleton className="h-4 w-full" /></CardContent></Card> : query.isError ? <SectionError query={query} /> : data ? <>{children(data)}</> : <EmptyState title="No insight data available" description="There is no persisted data in this reporting scope." className="rounded-[var(--radius-lg)] border border-[hsl(var(--border))] py-10" />;
}

function MetricSkeleton() {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{['metric-1', 'metric-2', 'metric-3', 'metric-4'].map((key) => <Card key={key}><CardContent className="space-y-4 p-5 sm:p-6"><Skeleton className="h-4 w-32" /><Skeleton className="h-9 w-24" /><Skeleton className="h-3 w-40" /></CardContent></Card>)}</div>;
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">{title}</p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-heading">{value}</p>
          </div>
          <span className="rounded-lg bg-[hsl(var(--primary)/0.1)] p-2.5 text-[hsl(var(--primary))]">
            <Icon aria-hidden="true" className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">{detail}</p>
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-md bg-[hsl(var(--muted))] p-2 text-[hsl(var(--primary))]">
            <Icon aria-hidden="true" className="h-4 w-4" />
          </span>
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
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
    <Card>
      <CardContent className="flex items-start gap-4 p-5 sm:p-6">
        <span className="rounded-lg bg-[hsl(var(--muted))] p-2.5 text-[hsl(var(--primary))]">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">{title}</p>
          <p className="mt-1 text-2xl font-bold text-heading">{value}</p>
          <p className="mt-2 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
            {description}
          </p>
          {linkHref && linkLabel && (
            <Link href={linkHref} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[hsl(var(--primary))] hover:underline">
              {linkLabel}
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          )}
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
        {['activity', 'readiness'].map((key) => (
          <Card key={key}>
            <CardHeader className="space-y-2">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-full max-w-sm" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[260px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-52" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
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
