"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowDownUp,
  BookOpen,
  BriefcaseBusiness,
  CalendarClock,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  FilterX,
  MapPin,
  RotateCcw,
  Search,
  SearchX,
  Send,
  UserCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Application, PlacementDrive } from "@placecampus/shared-types";
import { useDrives, useDrivesEligibility } from "@/features/drives/hooks/use-drives";
import { useMyApplications } from "@/features/applications/hooks/use-applications";
import { useTaxonomy } from "@/features/skills/hooks/use-skills";
import { useNow } from "@/features/interviews/hooks/use-now";
import {
  getApplicationWindow,
  getEligibilityState,
  getWindowState,
  hasUpcomingDeadline,
  summarizeEligibility,
  UPCOMING_DAYS,
  type EligibilityState,
} from "@/features/drives/lib/drive-meta";
import { DriveCard, DrivesHero } from "@/features/drives/components/drive-ui";
import { EligibilityModal } from "@/features/drives/components/eligibility-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Tab = "ALL" | "ELIGIBLE" | "NOT_ELIGIBLE" | "APPLIED";
type EligibilityFilter = "ALL" | "ELIGIBLE" | "NOT_ELIGIBLE" | "MISSING_INFO";
type SortOrder = "NEWEST" | "DEADLINE";

const NOT_SPECIFIED = "__none__";

const controlClassName =
  "h-11 w-full appearance-none rounded-xl border border-[hsl(var(--input))] bg-white pl-10 pr-9 text-sm font-medium shadow-[var(--shadow-xs)] transition-[border-color,box-shadow] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-4 focus:ring-[hsl(var(--primary)/0.12)]";

function FilterSelect({ label, icon: Icon, value, onChange, children }: { label: string; icon: LucideIcon; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <Icon aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={controlClassName}>
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
    </div>
  );
}

function StatCard({ label, value, hint, icon: Icon, tile, delay }: { label: string; value: number; hint?: string; icon: LucideIcon; tile: string; delay: number }) {
  return (
    <div
      style={{ "--pc-delay": `${delay}ms` } as React.CSSProperties}
      className="pc-enter flex items-center gap-4 rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
    >
      <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", tile)}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-[hsl(var(--foreground)/0.75)]">{label}</p>
        <p className="text-2xl font-bold tabular-nums text-[hsl(var(--foreground))]">{value}</p>
        {hint && <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">{hint}</p>}
      </div>
    </div>
  );
}

export default function StudentDrivesPage() {
  const drivesQuery = useDrives();
  const appsQuery = useMyApplications();
  const { data: taxonomy } = useTaxonomy();
  const now = useNow(60_000);

  const drives = React.useMemo(() => drivesQuery.data ?? [], [drivesQuery.data]);
  const eligibilityQueries = useDrivesEligibility(drives.map((d) => d.id));

  const [tab, setTab] = React.useState<Tab>("ALL");
  const [search, setSearch] = React.useState("");
  const [location, setLocation] = React.useState("ALL");
  const [workMode, setWorkMode] = React.useState("ALL");
  const [eligibilityFilter, setEligibilityFilter] = React.useState<EligibilityFilter>("ALL");
  const [sort, setSort] = React.useState<SortOrder>("NEWEST");
  const [modalId, setModalId] = React.useState<string | null>(null);

  const skillName = React.useCallback(
    (id?: string) => {
      if (!id) return "Skill";
      for (const drive of drives) {
        const name = drive.requirements?.skills?.find((s) => s.skillId === id)?.skillName;
        if (name) return name;
      }
      return taxonomy?.find((s) => s.id === id)?.name ?? "Required skill";
    },
    [drives, taxonomy],
  );

  // Live (not withdrawn) application per drive.
  const applicationByDrive = React.useMemo(() => {
    const map = new Map<string, Application>();
    for (const app of appsQuery.data ?? []) {
      if (app.status !== "WITHDRAWN") map.set(String(app.driveId), app);
    }
    return map;
  }, [appsQuery.data]);

  const rows = React.useMemo(
    () =>
      drives.map((drive, index) => {
        const query = eligibilityQueries[index];
        const state = getEligibilityState(query?.data, !!query?.isLoading);
        return {
          drive,
          state,
          result: query?.data,
          refetch: () => query?.refetch(),
          summary: summarizeEligibility(state, query?.data, skillName),
          windowState: getWindowState(drive, now),
          application: applicationByDrive.get(drive.id),
        };
      }),
    [drives, eligibilityQueries, skillName, now, applicationByDrive],
  );

  const isNotEligible = (s: EligibilityState) => s === "NOT_ELIGIBLE" || s === "MISSING_INFO";
  const counts = {
    ALL: rows.length,
    ELIGIBLE: rows.filter((r) => r.state === "ELIGIBLE").length,
    NOT_ELIGIBLE: rows.filter((r) => isNotEligible(r.state)).length,
    APPLIED: rows.filter((r) => r.application).length,
  };
  const activeCount = rows.filter((r) => r.windowState !== "CLOSED").length;
  const upcomingCount = rows.filter((r) => !r.application && hasUpcomingDeadline(r.drive, now)).length;

  const locations = React.useMemo(
    () => [...new Set(drives.map((d) => d.location?.trim()).filter((v): v is string => !!v))].sort(),
    [drives],
  );
  const workModes = React.useMemo(
    () => [...new Set(drives.map((d) => d.workMode?.trim()).filter((v): v is string => !!v))].sort(),
    [drives],
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const matchValue = (value: string | undefined, filter: string) =>
      filter === "ALL" || (filter === NOT_SPECIFIED ? !value?.trim() : value?.trim() === filter);
    const deadline = (d: PlacementDrive) => getApplicationWindow(d).closesAt ?? Number.POSITIVE_INFINITY;
    return rows
      .filter((r) =>
        tab === "ALL" ? true : tab === "ELIGIBLE" ? r.state === "ELIGIBLE" : tab === "NOT_ELIGIBLE" ? isNotEligible(r.state) : !!r.application,
      )
      .filter((r) => !q || r.drive.companyName.toLowerCase().includes(q) || r.drive.roleTitle.toLowerCase().includes(q))
      .filter((r) => matchValue(r.drive.location, location) && matchValue(r.drive.workMode, workMode))
      .filter((r) => eligibilityFilter === "ALL" || r.state === eligibilityFilter)
      .sort((a, b) =>
        sort === "DEADLINE"
          ? deadline(a.drive) - deadline(b.drive)
          : new Date(b.drive.createdAt).getTime() - new Date(a.drive.createdAt).getTime(),
      );
  }, [rows, tab, search, location, workMode, eligibilityFilter, sort]);

  const hasFilters = !!search.trim() || location !== "ALL" || workMode !== "ALL" || eligibilityFilter !== "ALL" || sort !== "NEWEST" || tab !== "ALL";
  const clearFilters = () => {
    setTab("ALL");
    setSearch("");
    setLocation("ALL");
    setWorkMode("ALL");
    setEligibilityFilter("ALL");
    setSort("NEWEST");
  };

  const modalRow = rows.find((r) => r.drive.id === modalId) ?? null;

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      <DrivesHero />

      {drivesQuery.isLoading ? (
        <div className="space-y-6" aria-busy="true">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[92px] rounded-2xl" />)}
          </div>
          <Skeleton className="h-[52px] rounded-2xl" />
          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[380px] rounded-2xl" />)}
          </div>
        </div>
      ) : drivesQuery.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50/60 px-6 py-12 text-center">
          <CircleAlert className="h-8 w-8 text-red-600" aria-hidden="true" />
          <p className="font-semibold text-red-900">We couldn&apos;t load placement drives</p>
          <button type="button" onClick={() => drivesQuery.refetch()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50">
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Retry
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Active Drives" value={activeCount} icon={BriefcaseBusiness} tile="bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]" delay={40} />
            <StatCard label="Eligible Drives" value={counts.ELIGIBLE} icon={UserCheck} tile="bg-emerald-50 text-emerald-600" delay={80} />
            <StatCard label="Applied Drives" value={counts.APPLIED} icon={Send} tile="bg-blue-50 text-blue-600" delay={120} />
            <StatCard label="Upcoming Deadlines" value={upcomingCount} hint={`In the next ${UPCOMING_DAYS} days`} icon={CalendarClock} tile="bg-amber-50 text-amber-600" delay={160} />
          </div>

          {drives.length === 0 ? (
            <section className="pc-enter flex flex-col items-center gap-6 rounded-2xl border border-[hsl(var(--border)/0.8)] bg-gradient-to-br from-white to-[hsl(var(--color-primary-50))] px-6 py-10 text-center shadow-[var(--shadow-card)] md:flex-row md:px-10 md:text-left">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl bg-white shadow-[var(--shadow-md)] ring-1 ring-[hsl(var(--primary)/0.15)]">
                <BriefcaseBusiness className="h-14 w-14 text-[hsl(var(--primary))]" strokeWidth={1.5} aria-hidden="true" />
              </div>
              <div className="flex-1 space-y-2">
                <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">No Placement Drives Available Yet</h2>
                <p className="max-w-[38rem] text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
                  New recruitment opportunities will appear here when your Placement Cell publishes them.
                </p>
                <Link href="/student/preparation" className="mt-2 inline-flex h-11 items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-white px-5 text-sm font-semibold transition-colors hover:border-[hsl(var(--primary)/0.4)] hover:text-[hsl(var(--primary))]">
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                  Explore Preparation
                </Link>
              </div>
            </section>
          ) : (
            <>
              <div role="tablist" aria-label="Drive categories" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
                {([
                  ["ALL", "All Drives"],
                  ["ELIGIBLE", "Eligible"],
                  ["NOT_ELIGIBLE", "Not Eligible"],
                  ["APPLIED", "Applied"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={tab === value}
                    onClick={() => setTab(value)}
                    className={cn(
                      "shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200",
                      tab === value
                        ? "bg-[hsl(var(--primary))] text-white shadow-[0_6px_16px_-8px_hsl(var(--primary)/0.8)]"
                        : "bg-white text-[hsl(var(--foreground)/0.8)] ring-1 ring-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]",
                    )}
                  >
                    {label} ({counts[value]})
                  </button>
                ))}
              </div>

              {/* One row needs ~1100px; below 2xl the search gets its own row. */}
              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white p-3 shadow-[var(--shadow-card)] sm:grid-cols-2 sm:p-4 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] 2xl:grid-cols-[minmax(240px,1fr)_170px_170px_180px_170px_auto]">
                <div className="relative sm:col-span-2 lg:col-span-5 2xl:col-span-1">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                  <input
                    type="search"
                    aria-label="Search drives"
                    placeholder="Search company or job role…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={cn(controlClassName, "font-normal")}
                  />
                  {search && (
                    <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <FilterSelect label="Filter by location" icon={MapPin} value={location} onChange={setLocation}>
                  <option value="ALL">All Locations</option>
                  {locations.map((l) => <option key={l} value={l}>{l}</option>)}
                  <option value={NOT_SPECIFIED}>Not specified</option>
                </FilterSelect>
                <FilterSelect label="Filter by work mode" icon={BriefcaseBusiness} value={workMode} onChange={setWorkMode}>
                  <option value="ALL">All Work Modes</option>
                  {workModes.map((m) => <option key={m} value={m}>{m}</option>)}
                  <option value={NOT_SPECIFIED}>Not specified</option>
                </FilterSelect>
                <FilterSelect label="Filter by eligibility" icon={UserCheck} value={eligibilityFilter} onChange={(v) => setEligibilityFilter(v as EligibilityFilter)}>
                  <option value="ALL">All Eligibility</option>
                  <option value="ELIGIBLE">Eligible</option>
                  <option value="NOT_ELIGIBLE">Not eligible</option>
                  <option value="MISSING_INFO">Missing information</option>
                </FilterSelect>
                <FilterSelect label="Sort drives" icon={ArrowDownUp} value={sort} onChange={(v) => setSort(v as SortOrder)}>
                  <option value="NEWEST">Newest First</option>
                  <option value="DEADLINE">Deadline Soonest</option>
                </FilterSelect>
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!hasFilters}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[hsl(var(--primary)/0.45)] bg-white px-4 text-sm font-semibold text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(var(--primary)/0.06)] disabled:cursor-not-allowed disabled:border-[hsl(var(--border))] disabled:text-[hsl(var(--muted-foreground))]"
                >
                  <FilterX className="h-4 w-4" aria-hidden="true" />
                  Clear Filters
                </button>
              </div>

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-white px-6 py-12 text-center">
                  <SearchX className="mb-3 h-8 w-8 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
                  <p className="font-semibold text-[hsl(var(--foreground))]">No drives match your filters</p>
                  <button type="button" onClick={clearFilters} className="mt-4 rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-sm font-semibold hover:bg-[hsl(var(--muted))]">
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
                  {filtered.map((row, index) => (
                    <DriveCard
                      key={row.drive.id}
                      drive={row.drive}
                      eligibility={row.state}
                      summary={row.summary}
                      windowState={row.windowState}
                      application={row.application}
                      onCheck={() => setModalId(row.drive.id)}
                      style={{ "--pc-delay": `${Math.min(index, 6) * 50}ms` } as React.CSSProperties}
                    />
                  ))}
                </div>
              )}
              <p className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Eligibility is checked live against your verified profile using the placement cell&apos;s rules.
              </p>
            </>
          )}
        </>
      )}

      <EligibilityModal
        drive={modalRow?.drive ?? null}
        result={modalRow?.result}
        state={modalRow?.state ?? "CHECKING"}
        windowState={modalRow?.windowState ?? "OPEN"}
        application={modalRow?.application}
        skillName={skillName}
        onRetry={() => modalRow?.refetch()}
        onOpenChange={(open) => !open && setModalId(null)}
      />
    </div>
  );
}
