"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { usePlacementDrives } from "@/features/drives/hooks/use-drives";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  CircleCheck,
  Clock3,
  FilePenLine,
  Filter,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  UsersRound,
} from "lucide-react";
import { DriveStatus } from "@placecampus/shared-types";

const statuses = [
  { value: "ALL", label: "All" },
  { value: DriveStatus.DRAFT, label: "Draft" },
  { value: DriveStatus.PUBLISHED, label: "Published" },
  { value: DriveStatus.CLOSED, label: "Closed" },
  { value: DriveStatus.CANCELLED, label: "Cancelled" },
];

type SortMode = "upcoming" | "recent" | "company";

function formatDate(value?: string) {
  if (!value) return "Date not announced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not announced";
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function driveTimestamp(value?: string) {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

function compareDates(left?: string, right?: string, newestFirst = false) {
  const leftTime = driveTimestamp(left);
  const rightTime = driveTimestamp(right);
  const leftMissing = !Number.isFinite(leftTime);
  const rightMissing = !Number.isFinite(rightTime);
  if (leftMissing && rightMissing) return 0;
  if (leftMissing) return 1;
  if (rightMissing) return -1;
  return newestFirst ? rightTime - leftTime : leftTime - rightTime;
}

function statusStyles(status: string) {
  switch (status) {
    case DriveStatus.PUBLISHED:
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case DriveStatus.DRAFT:
      return "bg-[#FFF3EB] text-[#D94A08] ring-[#FFD8C2]";
    case DriveStatus.CLOSED:
      return "bg-[#EEF2F6] text-[#536A84] ring-[#DCE4ED]";
    case DriveStatus.CANCELLED:
      return "bg-rose-50 text-rose-700 ring-rose-100";
    default:
      return "bg-[#EEF2F6] text-[#536A84] ring-[#DCE4ED]";
  }
}

export default function PlacementDrivesPage() {
  const { data: drives, isLoading, isError, refetch, isFetching } = usePlacementDrives();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("upcoming");
  const allDrives = useMemo(() => drives ?? [], [drives]);

  const filteredDrives = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const result = allDrives.filter((drive) => {
      if (statusFilter !== "ALL" && drive.status !== statusFilter) return false;
      return !query ||
        drive.companyName.toLocaleLowerCase().includes(query) ||
        drive.roleTitle.toLocaleLowerCase().includes(query);
    });

    return result.sort((a, b) => {
      if (sortMode === "recent") {
        return compareDates(a.createdAt, b.createdAt, true);
      }
      if (sortMode === "company") {
        return a.companyName.localeCompare(b.companyName) || a.roleTitle.localeCompare(b.roleTitle);
      }
      const aDate = driveTimestamp(a.driveDate);
      const bDate = driveTimestamp(b.driveDate);
      const aHasDate = Number.isFinite(aDate);
      const bHasDate = Number.isFinite(bDate);
      if (aHasDate !== bHasDate) return aHasDate ? -1 : 1;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const aUpcoming = aDate >= today.getTime();
      const bUpcoming = bDate >= today.getTime();
      if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
      return aUpcoming
        ? compareDates(a.driveDate, b.driveDate)
        : compareDates(b.driveDate, a.driveDate);
    });
  }, [allDrives, search, statusFilter, sortMode]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setSortMode("upcoming");
  };

  const kpis = [
    { label: "Total Drives", value: allDrives.length, icon: BriefcaseBusiness, tone: "orange" },
    { label: "Published", value: allDrives.filter((drive) => drive.status === DriveStatus.PUBLISHED).length, icon: CircleCheck, tone: "green" },
    { label: "Draft", value: allDrives.filter((drive) => drive.status === DriveStatus.DRAFT).length, icon: FilePenLine, tone: "orange" },
    { label: "Closed", value: allDrives.filter((drive) => drive.status === DriveStatus.CLOSED).length, icon: LockKeyhole, tone: "navy" },
  ] as const;

  return (
    <div className="-m-4 min-h-[calc(100vh-68px)] space-y-5 bg-[#F6F7F9] p-4 sm:-m-6 sm:space-y-6 sm:p-6 lg:-m-8 lg:p-8">
      <header className="pc-enter relative isolate overflow-hidden rounded-[24px] border border-[#F3E4DB] bg-gradient-to-r from-white via-[#FFFAF7] to-[#FFF1E9] px-5 py-5 shadow-[0_8px_24px_rgba(20,46,82,0.055)] sm:px-6 sm:py-6 lg:min-h-[176px] lg:px-7 lg:py-6">
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-0 hidden w-[48%] bg-[radial-gradient(ellipse_at_75%_100%,rgba(255,90,10,0.10),transparent_68%)] xl:block" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:min-h-[120px]">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5 lg:max-w-[68%]">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[17px] bg-[#FFF1E9] text-[#FF5A0A] shadow-[0_5px_14px_rgba(255,90,10,0.08)] ring-1 ring-[#FFE1D0] sm:h-[58px] sm:w-[58px] sm:rounded-[19px]">
              <BriefcaseBusiness className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.1} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#FF5A0A] sm:text-xs">
                Recruitment Management
              </p>
              <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.035em] text-[#142E52] sm:text-[34px] lg:text-[36px]">
                Placement Drives
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#687C96] sm:text-[15px]">
                Create, publish, and manage campus recruitment opportunities from one place.
              </p>
            </div>
          </div>
          <Button
            asChild
            className="h-11 w-full shrink-0 rounded-xl bg-[#FF5A0A] px-5 font-semibold text-white shadow-[0_5px_14px_rgba(255,90,10,0.18)] transition-all hover:-translate-y-0.5 hover:bg-[#E94E05] hover:shadow-[0_8px_20px_rgba(255,90,10,0.24)] sm:w-auto lg:absolute lg:right-7 lg:top-6"
          >
            <Link href="/placement/drives/new">
              <Plus className="h-4 w-4" /> Create Drive
            </Link>
          </Button>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-7 z-0 hidden h-[142px] w-[270px] opacity-80 xl:block 2xl:right-12 2xl:h-[152px] 2xl:w-[300px]">
          <RecruitmentHeaderIllustration />
        </div>
      </header>

      <section aria-label="Placement drive statistics" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, tone }) => (
          <article key={label} className="flex min-h-[88px] items-center gap-3 rounded-2xl border border-[#E3E8EF] bg-white px-3.5 py-3 shadow-[0_3px_12px_rgba(20,46,82,0.045)] transition-shadow hover:shadow-[0_7px_18px_rgba(20,46,82,0.08)] sm:gap-3.5 sm:px-4">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone === "green" ? "bg-emerald-50 text-emerald-700" : tone === "navy" ? "bg-[#EEF2F7] text-[#365273]" : "bg-[#FFF0E7] text-[#FF5A0A]"}`}>
              <Icon className="h-[19px] w-[19px]" strokeWidth={2.1} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#687C96] sm:text-[13px]">{label}</p>
              <p className="mt-0.5 text-[25px] font-bold leading-none tracking-tight text-[#142E52] tabular-nums">{isLoading || isError ? "..." : value}</p>
            </div>
          </article>
        ))}
      </section>

      <section aria-label="Search and filter placement drives" className="rounded-2xl border border-[#E3E8EF] bg-white p-3.5 shadow-[0_3px_12px_rgba(20,46,82,0.045)] sm:p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <label className="relative block w-full xl:max-w-sm">
            <span className="sr-only">Search company name or job role</span>
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8291A5]" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search by company or role..."
              className="h-11 w-full rounded-xl border border-[#E0E6ED] bg-white pl-10 pr-3 text-sm text-[#193354] outline-none transition placeholder:text-[#91A0B2] hover:border-[#C9D3DF] focus:border-[#FF5A0A] focus:ring-2 focus:ring-[#FF5A0A]/15"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center xl:justify-end">
            <div className="flex min-w-0 items-center gap-2">
              <Filter className="hidden h-4 w-4 shrink-0 text-[#687C96] sm:block" aria-hidden="true" />
              <div role="group" aria-label="Filter by status" className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-[#F2F4F7] p-1">
                {statuses.map((status) => {
                  const active = statusFilter === status.value;
                  return (
                    <button
                      key={status.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setStatusFilter(status.value)}
                      className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A0A]/40 sm:px-3.5 sm:text-sm ${
                        active
                          ? "bg-white text-[#E94E05] shadow-sm"
                          : "text-[#193354] hover:bg-white hover:text-[#E94E05]"
                      }`}
                    >
                      {status.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-[#E0E6ED] bg-white px-3 text-sm text-[#193354] transition hover:border-[#C9D3DF] focus-within:border-[#FF5A0A] focus-within:ring-2 focus-within:ring-[#FF5A0A]/15">
              <span className="sr-only">Sort placement drives</span>
              <select
                aria-label="Sort placement drives"
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="h-full min-w-0 flex-1 appearance-none bg-transparent pr-1 outline-none"
              >
                <option value="upcoming">Upcoming first</option>
                <option value="recent">Recently created</option>
                <option value="company">Company name</option>
              </select>
              <ChevronDown className="h-4 w-4 text-[#687C96]" aria-hidden="true" />
            </label>
          </div>
        </div>
      </section>

      {isError ? (
        <section role="alert" className="rounded-2xl border border-[#E3E8EF] bg-white px-6 py-12 text-center shadow-[0_3px_12px_rgba(20,46,82,0.045)]">
          <BriefcaseBusiness className="mx-auto h-9 w-9 text-[#9AA9BA]" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-semibold text-[#142E52]">We couldn’t load placement drives</h2>
          <p className="mt-1 text-sm text-[#687C96]">Check your connection and try again.</p>
          <Button onClick={() => void refetch()} disabled={isFetching} className="mt-5 rounded-xl bg-[#FF5A0A] text-white hover:bg-[#E94E05]">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Try again
          </Button>
        </section>
      ) : isLoading ? (
        <div aria-label="Loading placement drives" aria-busy="true" className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="min-h-[228px] animate-pulse rounded-2xl border border-[#E3E8EF] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4"><div className="h-6 w-2/3 rounded bg-slate-100" /><div className="h-6 w-20 rounded-full bg-slate-100" /></div>
              <div className="mt-3 h-4 w-3/5 rounded bg-slate-100" />
              <div className="mt-7 space-y-3"><div className="h-4 w-1/2 rounded bg-slate-100" /><div className="h-4 w-2/3 rounded bg-slate-100" /></div>
              <div className="mt-7 border-t border-slate-100 pt-4"><div className="h-4 w-40 rounded bg-slate-100" /></div>
            </div>
          ))}
        </div>
      ) : allDrives.length === 0 ? (
        <section className="rounded-2xl border border-[#E3E8EF] bg-white px-6 py-12 text-center shadow-[0_3px_12px_rgba(20,46,82,0.045)] sm:py-14">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF0E7] text-[#FF5A0A]"><BriefcaseBusiness className="h-6 w-6" aria-hidden="true" /></span>
          <h2 className="mt-4 text-lg font-semibold text-[#142E52]">No placement drives yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#687C96]">Create your first placement drive to start managing recruitment opportunities.</p>
          <Button asChild className="mt-5 rounded-xl bg-[#FF5A0A] text-white hover:bg-[#E94E05]"><Link href="/placement/drives/new"><Plus className="h-4 w-4" /> Create Drive</Link></Button>
        </section>
      ) : filteredDrives.length === 0 ? (
        <section className="rounded-2xl border border-[#E3E8EF] bg-white px-6 py-12 text-center shadow-[0_3px_12px_rgba(20,46,82,0.045)]">
          <Search className="mx-auto h-8 w-8 text-[#9AA9BA]" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-semibold text-[#142E52]">No matching drives found</h2>
          <p className="mt-1 text-sm text-[#687C96]">Try another company name, job role, or status filter.</p>
          <button type="button" onClick={clearFilters} className="mt-4 text-sm font-semibold text-[#FF5A0A] transition hover:text-[#D94705]">Clear filters</button>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-5">
          {filteredDrives.map((drive) => {
            const departments = drive.requirements?.allowedDepartments ?? [];
            return (
              <Link
                key={drive.id}
                href={`/placement/drives/${drive.id}`}
                aria-label={`View ${drive.companyName} ${drive.roleTitle} drive details`}
                className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A0A] focus-visible:ring-offset-2"
              >
                <article className="flex h-full min-h-[228px] flex-col rounded-2xl border border-[#E3E8EF] bg-white p-4 shadow-[0_3px_12px_rgba(20,46,82,0.045)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-[#FFC9AA] group-hover:shadow-[0_10px_24px_rgba(20,46,82,0.09)] sm:p-5">
                  <div className="flex min-h-[52px] items-start justify-between gap-3">
                    <h2 className="line-clamp-2 text-lg font-bold leading-6 text-[#142E52] transition-colors group-hover:text-[#D94705] sm:text-xl">{drive.companyName}</h2>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ring-1 ring-inset ${statusStyles(drive.status)}`}>
                      {drive.status.toLocaleLowerCase()}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 min-h-10 text-sm font-medium leading-5 text-[#526985]">{drive.roleTitle}</p>

                  <div className="mt-4 space-y-2.5 text-sm text-[#687C96]">
                    <div className="flex items-start gap-2.5">
                      <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[#687C96]" aria-hidden="true" />
                      <span>{formatDate(drive.driveDate)}</span>
                    </div>
                    {drive.applicationDeadline && (
                      <div className="flex items-start gap-2.5">
                        <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#687C96]" aria-hidden="true" />
                        <span>Apply by {formatDate(drive.applicationDeadline)}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2.5">
                      <UsersRound className="mt-0.5 h-4 w-4 shrink-0 text-[#687C96]" aria-hidden="true" />
                      <span className="line-clamp-2">{departments.length ? departments.join(", ") : "All departments"}</span>
                    </div>
                  </div>

                  <div className="mt-auto border-t border-[#EDF0F4] pt-3.5">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#FF5A0A] transition-colors group-hover:text-[#D94705]">
                      View Drive Details <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RecruitmentHeaderIllustration() {
  return (
    <svg viewBox="0 0 360 180" className="h-full w-full" fill="none">
      <ellipse cx="192" cy="169" rx="152" ry="8" fill="#FF5A0A" opacity=".10" />

      {/* Low contrast campus backdrop */}
      <path d="M153 71 245 35l91 36v83H153V71Z" fill="#142E52" opacity=".055" />
      <path d="M167 68h77v86h-77zM249 78h75v76h-75z" fill="#FFFFFF" opacity=".66" />
      <path d="M158 68 206 48l50 20M245 78l40-18 43 18" stroke="#142E52" strokeWidth="3" strokeLinecap="round" opacity=".14" />
      {[0, 1, 2].map((row) => [0, 1, 2].map((col) => (
        <rect key={`campus-${row}-${col}`} x={178 + col * 22} y={83 + row * 21} width="9" height="11" rx="2" fill="#142E52" opacity=".10" />
      )))}
      {[0, 1, 2].map((row) => [0, 1].map((col) => (
        <rect key={`wing-${row}-${col}`} x={261 + col * 25} y={92 + row * 19} width="10" height="10" rx="2" fill="#FF5A0A" opacity=".12" />
      )))}

      {/* Students */}
      <path d="M34 166c2-34 13-52 35-52s34 18 36 52H34Z" fill="#142E52" />
      <circle cx="69" cy="91" r="14" fill="#F6C7A8" />
      <path d="M55 92c0-17 8-24 17-24 12 0 18 9 17 21-5-5-10-8-17-8-6 0-11 4-17 11Z" fill="#142E52" />
      <path d="M41 121c-12 8-16 24-16 43h17l7-34M96 122c11 10 14 23 14 42H94l-6-33" fill="#FF5A0A" opacity=".88" />
      <path d="M60 117h18l7 49H53l7-49Z" fill="#FFFFFF" opacity=".93" />

      <path d="M108 166c2-36 14-55 38-55 23 0 36 19 38 55h-76Z" fill="#142E52" opacity=".92" />
      <circle cx="146" cy="88" r="14" fill="#F6C7A8" />
      <path d="M132 89c0-16 6-23 16-23 10 0 16 8 15 20-6-5-11-7-17-7-5 0-9 3-14 10Z" fill="#142E52" />
      <path d="M116 122c-9 8-12 22-13 44h18l7-35M175 122c10 9 13 22 14 44h-18l-8-35" fill="#FF5A0A" opacity=".82" />
      <path d="M136 114h20l8 52h-36l8-52Z" fill="#FFFFFF" opacity=".94" />

      <path d="M188 166c2-33 13-50 34-50s32 17 34 50h-68Z" fill="#142E52" />
      <circle cx="222" cy="91" r="13" fill="#F6C7A8" />
      <path d="M209 91c0-15 6-21 14-21 10 0 15 7 14 19-5-5-9-7-14-7s-9 3-14 9Z" fill="#142E52" />
      <path d="M195 123c-9 8-12 21-13 43h17l7-34M250 123c9 8 12 21 13 43h-17l-7-34" fill="#FF5A0A" opacity=".78" />

      {/* Recruiter holding a candidate profile */}
      <path d="M275 166c1-31 11-47 30-47 20 0 30 16 31 47h-61Z" fill="#142E52" opacity=".88" />
      <circle cx="305" cy="83" r="13" fill="#F6C7A8" />
      <path d="M292 83c0-14 6-21 14-21 10 0 15 7 14 18-5-4-9-6-14-6s-9 3-14 9Z" fill="#142E52" />
      <path d="m298 119 7 12 7-12" fill="#FF5A0A" />
      <rect x="321" y="92" width="25" height="36" rx="4" fill="#FFFFFF" stroke="#142E52" strokeOpacity=".14" />
      <circle cx="330" cy="103" r="4" fill="#F6C7A8" />
      <path d="M327 112h12M327 118h10" stroke="#142E52" strokeWidth="2" strokeLinecap="round" opacity=".28" />
    </svg>
  );
}
