"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Award,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  ChevronRight,
  GraduationCap,
  Layers3,
  Megaphone,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  Target,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { DriveStatus, type PlacementDrive } from "@placecampus/shared-types";
import { HeroWaves, lightHeroClassName } from "@/components/brand/hero-waves";
import { useAnalytics } from "@/features/analytics/hooks/use-analytics";
import { usePlacementDrives } from "@/features/drives/hooks/use-drives";
import { cn } from "@/lib/utils";
import { isUnknownGroup } from "@/features/placement-head/components/head-ui";

const NAVY = "#10264A";
const ORANGE = "#FF6500";
const numberFormat = new Intl.NumberFormat();

const panelClassName =
  "rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_4px_18px_-12px_rgba(16,38,74,0.22)] sm:p-6";

function percent(value: number | null | undefined) {
  return value == null || Number.isNaN(value) ? null : Math.round(value);
}

function relativeTime(value: string | number) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "Recently";
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(time).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function PlacementHeadDashboardPage() {
  const analytics = useAnalytics();
  const drivesQuery = usePlacementDrives();

  const overview = analytics.overview.data;
  const readiness = analytics.readiness.data;
  const placements = analytics.placements.data;

  // Overview cards — every number comes from the analytics API.
  const averageReadiness = percent(overview?.readiness.average ?? readiness?.mean);
  const assessed = overview?.students.withReadinessSnapshots ?? readiness?.studentsWithSnapshots ?? 0;

  const departments = React.useMemo(
    () => [...(readiness?.byDepartment ?? [])].filter((d) => d.count > 0 && !isUnknownGroup(d.group)).sort((a, b) => b.average - a.average),
    [readiness],
  );
  const topDepartment = departments[0];
  const departmentAverage = departments.length
    ? departments.reduce((sum, d) => sum + d.average, 0) / departments.length
    : null;

  const statusCount = (status: string) => placements?.byStatus.find((s) => s.status === status)?.count ?? 0;
  const totalApplications = placements?.byStatus.reduce((sum, s) => sum + s.count, 0) ?? 0;
  const shortlisted = statusCount("SHORTLISTED");
  const progressed = totalApplications - statusCount("APPLIED") - statusCount("WITHDRAWN");
  const processRate = totalApplications ? (Math.max(progressed, 0) / totalApplications) * 100 : null;
  // The API already returns this conversion as a percentage.
  const shortlistConversion = percent(placements?.conversion.underReviewToShortlisted);
  const publishedDrives = overview?.drives.published ?? 0;

  const loadingOverview = analytics.overview.isLoading;
  const loadingReadiness = analytics.readiness.isLoading;
  const loadingPlacements = analytics.placements.isLoading;

  return (
    <div className="-mt-1 space-y-5 sm:-mt-2 lg:-mt-4">
      <PlacementHeadHero />

      <section aria-label="Institution overview" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewCard
          title="Institution Readiness"
          icon={BarChart3}
          tone="orange"
          href="/placement-head/readiness"
          loading={loadingOverview}
          value={averageReadiness == null ? null : `${averageReadiness}%`}
          detail={averageReadiness == null ? "No readiness snapshots yet" : `Average across ${numberFormat.format(assessed)} assessed students`}
        />
        <OverviewCard
          title="Department Comparison"
          icon={Building2}
          tone="blue"
          href="/placement-head/departments"
          loading={loadingReadiness}
          value={departments.length ? `${departments.length} ${departments.length === 1 ? "dept" : "depts"}` : null}
          detail={topDepartment ? `Leading: ${topDepartment.group} (${Math.round(topDepartment.average)}%)` : "Appears once departments have readiness data"}
        />
        <OverviewCard
          title="Placement Outcomes"
          icon={Award}
          tone="violet"
          href="/placement-head/outcomes"
          loading={loadingPlacements}
          value={totalApplications ? numberFormat.format(shortlisted) : null}
          detail={totalApplications ? `Shortlisted of ${numberFormat.format(totalApplications)} applications` : "No applications recorded yet"}
        />
        <OverviewCard
          title="Drive Performance"
          icon={Target}
          tone="green"
          href="/placement-head/outcomes"
          loading={loadingOverview}
          value={publishedDrives ? numberFormat.format(publishedDrives) : null}
          detail={
            publishedDrives
              ? shortlistConversion == null
                ? "Published drives"
                : `Published · ${shortlistConversion}% review-to-shortlist`
              : "No published drives yet"
          }
        />
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <ReadinessOverview
          loading={loadingReadiness || loadingPlacements}
          error={analytics.readiness.isError}
          onRetry={() => {
            void analytics.readiness.refetch();
            void analytics.placements.refetch();
          }}
          overall={percent(readiness?.mean ?? overview?.readiness.average)}
          rows={[
            { label: "Student Readiness", hint: "Mean latest readiness score", value: percent(readiness?.mean), icon: GraduationCap, tone: "orange" },
            { label: "Department Readiness", hint: "Average of department averages", value: percent(departmentAverage), icon: Layers3, tone: "blue" },
            { label: "Placement Process", hint: "Applications moved past “Applied”", value: percent(processRate), icon: UsersRound, tone: "violet" },
            { label: "Infrastructure Readiness", hint: "Not tracked by PlaceCampus yet", value: null, icon: ShieldCheck, tone: "green", untracked: true },
          ]}
          assessed={assessed}
        />
        <RecentActivity
          drives={drivesQuery.data ?? []}
          applicationActivity={placements?.activity ?? []}
          loading={drivesQuery.isLoading || loadingPlacements}
          error={drivesQuery.isError}
          onRetry={() => void drivesQuery.refetch()}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

const quickActions: { label: string; href: string; icon: LucideIcon; tone: string }[] = [
  { label: "View Analytics", href: "/placement-head/analytics", icon: BarChart3, tone: "bg-orange-50 text-[#FF6500]" },
  { label: "Compare Departments", href: "/placement-head/departments", icon: UsersRound, tone: "bg-rose-50 text-rose-500" },
  { label: "Track Outcomes", href: "/placement-head/outcomes", icon: Target, tone: "bg-red-50 text-red-500" },
];

function PlacementHeadHero() {
  return (
    <section className={cn(lightHeroClassName, "rounded-3xl px-5 py-5 sm:px-7 sm:py-6 lg:px-8")}>
      <HeroWaves />
      <div className="relative flex items-center gap-6">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200/70 bg-orange-50/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#E25A00]">
            <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
            Placement Head Workspace
          </span>
          <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-[34px]" style={{ color: NAVY }}>
            Placement Head <span style={{ color: ORANGE }}>Dashboard</span>
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Institution-level oversight of placement readiness and outcomes.
          </p>
          <nav aria-label="Quick actions" className="mt-4 flex flex-wrap gap-2 sm:gap-2.5">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="group inline-flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white/90 py-1 pl-1 pr-3 text-sm font-semibold shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:text-[#E25A00] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6500]"
                style={{ color: NAVY }}
              >
                <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", action.tone)}>
                  <action.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {action.label}
                <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            ))}
          </nav>
        </div>
        <div className="pointer-events-none hidden h-[140px] w-[240px] shrink-0 lg:block xl:w-[270px]" aria-hidden="true">
          <InstitutionIllustration />
        </div>
      </div>
    </section>
  );
}

function InstitutionIllustration() {
  return (
    <svg viewBox="0 0 300 160" className="h-full w-full">
      <ellipse cx="160" cy="152" rx="130" ry="6" fill="#FF6500" opacity="0.12" />
      {/* Trees */}
      <circle cx="30" cy="118" r="18" fill="#22C55E" opacity="0.85" />
      <circle cx="46" cy="126" r="14" fill="#16A34A" opacity="0.85" />
      <rect x="35" y="128" width="4" height="20" rx="2" fill="#7C5A3A" />
      <circle cx="58" cy="140" r="7" fill="#FBBF24" opacity="0.9" />
      {/* Building */}
      <path d="M62 78 L122 50 L182 78 Z" fill="#F97316" />
      <rect x="66" y="78" width="112" height="8" rx="2" fill="#FDBA74" />
      <rect x="66" y="86" width="112" height="56" fill="#FED7AA" />
      {[74, 94, 140, 160].map((x) => (
        <g key={x}>
          <rect x={x} y="94" width="12" height="10" rx="1.5" fill="#93C5FD" />
          <rect x={x} y="112" width="12" height="10" rx="1.5" fill="#93C5FD" />
        </g>
      ))}
      {[110, 120, 130].map((x) => (
        <rect key={x} x={x} y="90" width="5" height="44" rx="1" fill="#FFF7ED" />
      ))}
      <rect x="114" y="120" width="16" height="22" rx="2" fill={NAVY} />
      <circle cx="122" cy="68" r="5" fill="#FFF7ED" />
      <rect x="62" y="142" width="120" height="6" rx="2" fill="#E2E8F0" />
      <line x1="122" y1="50" x2="122" y2="30" stroke={NAVY} strokeWidth="2" />
      <path d="M122 30 h14 l-4 5 l4 5 h-14 z" fill="#FF6500" />
      {/* Clipboard */}
      <rect x="196" y="22" width="78" height="112" rx="10" fill={NAVY} />
      <rect x="202" y="30" width="66" height="98" rx="6" fill="#FFFFFF" />
      <rect x="222" y="16" width="26" height="12" rx="4" fill="#334E7A" />
      {[46, 66, 86].map((y) => (
        <g key={y}>
          <path d={`M210 ${y} l4 4 l7 -8`} fill="none" stroke="#FF6500" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="226" y={y - 3} width="34" height="4" rx="2" fill="#CBD5E1" />
        </g>
      ))}
      {/* Chart card */}
      <rect x="230" y="92" width="62" height="50" rx="8" fill="#FFFFFF" stroke="#E2E8F0" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={240 + i * 12} y={130 - (i + 1) * 7} width="8" height={(i + 1) * 7} rx="1.5" fill="#FB923C" />
      ))}
      <path d="M238 118 L254 108 L266 112 L284 98" fill="none" stroke="#FF6500" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M278 97 h7 v7" fill="none" stroke="#FF6500" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Overview cards                                                      */
/* ------------------------------------------------------------------ */

type Tone = "orange" | "blue" | "violet" | "green";

const TONES: Record<Tone, { card: string; icon: string; glow: string; bar: string; chip: string }> = {
  orange: { card: "from-orange-50/90 border-orange-100 group-hover:border-orange-200", icon: "text-[#FF6500] ring-orange-100", glow: "bg-orange-200/40", bar: "bg-[#FF6500]", chip: "bg-orange-50/80 text-[#FF6500]" },
  blue: { card: "from-blue-50/90 border-blue-100 group-hover:border-blue-200", icon: "text-blue-600 ring-blue-100", glow: "bg-blue-200/40", bar: "bg-blue-500", chip: "bg-blue-50/80 text-blue-600" },
  violet: { card: "from-violet-50/90 border-violet-100 group-hover:border-violet-200", icon: "text-violet-600 ring-violet-100", glow: "bg-violet-200/40", bar: "bg-violet-500", chip: "bg-violet-50/80 text-violet-600" },
  green: { card: "from-emerald-50/90 border-emerald-100 group-hover:border-emerald-200", icon: "text-emerald-600 ring-emerald-100", glow: "bg-emerald-200/40", bar: "bg-emerald-500", chip: "bg-emerald-50/80 text-emerald-600" },
};

function OverviewCard({ title, icon: Icon, tone, href, value, detail, loading }: {
  title: string; icon: LucideIcon; tone: Tone; href: string; value: string | null; detail: string; loading?: boolean;
}) {
  const t = TONES[tone];
  return (
    <Link href={href} className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6500] focus-visible:ring-offset-2">
      <article className={cn("relative h-full overflow-hidden rounded-2xl border bg-gradient-to-br to-white p-5 shadow-[0_4px_18px_-12px_rgba(16,38,74,0.25)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_14px_30px_-18px_rgba(16,38,74,0.35)]", t.card)}>
        <span aria-hidden="true" className={cn("pointer-events-none absolute -bottom-10 -right-10 h-28 w-28 rounded-full blur-2xl", t.glow)} />
        <div className="relative flex items-start gap-4">
          <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1", t.icon)}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold" style={{ color: NAVY }}>{title}</h2>
            {loading ? (
              <div className="mt-2 h-8 w-20 animate-pulse rounded bg-slate-100" />
            ) : (
              <p className={cn("mt-1 font-bold tracking-tight", value ? "text-3xl tabular-nums" : "text-xl text-slate-400")} style={value ? { color: NAVY } : undefined}>
                {value ?? "No data yet"}
              </p>
            )}
            <p className="mt-1.5 text-xs leading-5 text-slate-500">{detail}</p>
          </div>
        </div>
      </article>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Shared section header                                               */
/* ------------------------------------------------------------------ */

function SectionHeader({ icon: Icon, title, href, className }: { icon: LucideIcon; title: string; href?: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <h2 className="flex items-center gap-2.5 text-lg font-bold" style={{ color: NAVY }}>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-[#FF6500]">
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        {title}
      </h2>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-[#E25A00] transition-colors hover:bg-orange-50">
          View All <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Readiness overview                                                  */
/* ------------------------------------------------------------------ */

interface ReadinessRow { label: string; hint: string; value: number | null; icon: LucideIcon; tone: Tone; untracked?: boolean }

function ReadinessOverview({ overall, rows, assessed, loading, error, onRetry }: {
  overall: number | null; rows: ReadinessRow[]; assessed: number; loading: boolean; error: boolean; onRetry: () => void;
}) {
  return (
    <section className={panelClassName}>
      <SectionHeader icon={BarChart3} title="Placement Readiness Overview" href="/placement-head/readiness" />
      {error ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
          <p className="text-sm text-slate-500">Readiness analytics could not be loaded.</p>
          <button type="button" onClick={onRetry} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#E25A00] hover:underline">
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Retry
          </button>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 items-center gap-6 md:grid-cols-[200px_minmax(0,1fr)]">
          <div className="flex flex-col items-center">
            <ReadinessRing value={loading ? null : overall} loading={loading} />
            <p className="mt-3 text-center text-xs text-slate-500">
              {loading ? "Loading…" : overall == null ? "No readiness snapshots yet" : `${numberFormat.format(assessed)} students assessed`}
            </p>
          </div>
          <ul className="space-y-2.5 border-slate-100 md:border-l md:pl-6">
            {rows.map((row) => {
              const t = TONES[row.tone];
              return (
                <li key={row.label} className={cn("rounded-xl px-3 py-2.5", t.chip.split(" ")[0])}>
                  <div className="flex items-center gap-3">
                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm", t.chip.split(" ")[1])}>
                      <row.icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 text-sm font-semibold leading-5" style={{ color: NAVY }}>{row.label}</p>
                        {loading ? (
                          <span className="h-4 w-10 animate-pulse rounded bg-white/80" />
                        ) : (
                          <span className={cn("shrink-0 text-sm font-bold tabular-nums", row.value == null && "font-medium text-slate-400")} style={row.value == null ? undefined : { color: NAVY }}>
                            {row.value == null ? (row.untracked ? "N/A" : "-- %") : `${row.value}%`}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white">
                          <div className={cn("h-full rounded-full transition-[width] duration-700", t.bar)} style={{ width: `${loading || row.value == null ? 0 : Math.min(100, Math.max(0, row.value))}%` }} />
                        </div>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">{row.hint}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function ReadinessRing({ value, loading }: { value: number | null; loading: boolean }) {
  const r = 70;
  const circumference = 2 * Math.PI * r;
  const filled = value == null ? 0 : (Math.min(100, Math.max(0, value)) / 100) * circumference;
  const id = React.useId();
  return (
    <div className="relative h-[176px] w-[176px]">
      <svg viewBox="0 0 176 176" className="h-full w-full -rotate-90" role="img" aria-label={value == null ? "Overall readiness unavailable" : `Overall readiness ${value}%`}>
        <defs>
          <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFB27A" />
            <stop offset="1" stopColor="#FF6500" />
          </linearGradient>
        </defs>
        <circle cx="88" cy="88" r={r} fill="none" stroke="#FFF1E6" strokeWidth="16" />
        <circle
          cx="88" cy="88" r={r} fill="none" stroke={`url(#${id}-g)`} strokeWidth="16" strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`} className="transition-[stroke-dasharray] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {loading ? (
          <span className="h-8 w-16 animate-pulse rounded bg-slate-100" />
        ) : (
          <span className="text-3xl font-extrabold tabular-nums" style={{ color: NAVY }}>{value == null ? "-- %" : `${value}%`}</span>
        )}
        <span className="mt-0.5 text-center text-xs font-medium leading-4 text-slate-500">Overall<br />Readiness</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Recent activity (derived from real drive and application records)   */
/* ------------------------------------------------------------------ */

interface ActivityEntry { id: string; title: string; subtitle: string; at: number; icon: LucideIcon; tone: string }

function buildActivity(drives: PlacementDrive[], applicationActivity: { date: string; count: number }[]): ActivityEntry[] {
  const entries: ActivityEntry[] = [];
  for (const d of drives) {
    const created = new Date(d.createdAt).getTime();
    const updated = new Date(d.updatedAt).getTime();
    const label = `${d.companyName} · ${d.roleTitle}`;
    if (Number.isFinite(created)) {
      entries.push({ id: `${d.id}-created`, title: "New placement drive created", subtitle: label, at: created, icon: PlusCircle, tone: "bg-emerald-50 text-emerald-600 ring-emerald-100" });
    }
    if (Number.isFinite(updated) && updated - created > 60_000) {
      const published = d.status === DriveStatus.PUBLISHED;
      entries.push({
        id: `${d.id}-updated`,
        title: published ? "Drive published or updated" : d.status === DriveStatus.CLOSED ? "Drive closed" : "Drive schedule updated",
        subtitle: d.applicationDeadline ? `${label} · deadline ${new Date(d.applicationDeadline).toLocaleDateString(undefined, { day: "numeric", month: "short" })}` : label,
        at: updated,
        icon: published ? Megaphone : CalendarClock,
        tone: "bg-orange-50 text-[#FF6500] ring-orange-100",
      });
    }
  }
  for (const day of applicationActivity) {
    const at = new Date(day.date).getTime();
    if (!Number.isFinite(at) || !day.count) continue;
    entries.push({
      id: `apps-${day.date}`,
      title: `${numberFormat.format(day.count)} application${day.count === 1 ? "" : "s"} submitted`,
      subtitle: "Students applied to placement drives",
      at: at + 12 * 3600_000, // day buckets: place at midday
      icon: UsersRound,
      tone: "bg-violet-50 text-violet-600 ring-violet-100",
    });
  }
  return entries.sort((a, b) => b.at - a.at).slice(0, 5);
}

function RecentActivity({ drives, applicationActivity, loading, error, onRetry }: {
  drives: PlacementDrive[]; applicationActivity: { date: string; count: number }[]; loading: boolean; error: boolean; onRetry: () => void;
}) {
  const items = React.useMemo(() => buildActivity(drives, applicationActivity), [drives, applicationActivity]);
  return (
    <section className={panelClassName}>
      <SectionHeader icon={Activity} title="Recent Placement Activity" href="/placement-head/notifications" />
      <div className="mt-4 border-t border-slate-100 pt-1">
        {loading ? (
          <div className="space-y-4 py-3" aria-busy="true" aria-label="Loading recent activity">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <span className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
                <span className="flex-1 space-y-2 pt-1">
                  <span className="block h-3 w-3/4 animate-pulse rounded bg-slate-100" />
                  <span className="block h-3 w-1/3 animate-pulse rounded bg-slate-50" />
                </span>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-500">Activity could not be loaded.</p>
            <button type="button" onClick={onRetry} className="mt-2 text-sm font-semibold text-[#E25A00] hover:underline">Retry</button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center py-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-100">
              <BriefcaseBusiness className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 className="mt-3 text-sm font-semibold" style={{ color: NAVY }}>No placement activity yet</h3>
            <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">New drives, schedule changes and applications will appear here.</p>
          </div>
        ) : (
          <ol className="relative">
            {items.map((item, index) => (
              <li key={item.id} className="relative flex items-start gap-3 py-3">
                {index < items.length - 1 && (
                  <span aria-hidden="true" className="absolute left-5 top-[52px] h-[calc(100%-40px)] w-px bg-slate-100" />
                )}
                <span className={cn("relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1", item.tone)}>
                  <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="truncate text-sm font-semibold" style={{ color: NAVY }}>{item.title}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{item.subtitle}</p>
                </div>
                <time dateTime={new Date(item.at).toISOString()} className="shrink-0 pt-1 text-[11px] text-slate-400">
                  {relativeTime(item.at)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
