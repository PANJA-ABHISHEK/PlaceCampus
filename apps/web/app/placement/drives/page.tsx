"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { usePlacementDrives } from "@/features/drives/hooks/use-drives";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  Filter,
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
      return "bg-orange-50 text-orange-700 ring-orange-100";
    case DriveStatus.CLOSED:
      return "bg-slate-100 text-slate-600 ring-slate-200";
    case DriveStatus.CANCELLED:
      return "bg-rose-50 text-rose-700 ring-rose-100";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
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

  return (
    <div className="space-y-6 sm:space-y-7">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#fff0e8] text-[#ff6b1a] sm:flex">
            <BriefcaseBusiness className="h-7 w-7" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-sm">
              Recruitment Management
            </p>
            <h1 className="mt-1 text-3xl font-bold leading-tight tracking-tight text-[#142b4d] sm:text-[34px]">
              Placement Drives
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Create, publish, and manage campus recruitment opportunities from one place.
            </p>
          </div>
        </div>
        <Button
          asChild
          className="h-11 w-full shrink-0 rounded-xl bg-[#ff6b1a] px-5 font-semibold text-white shadow-sm transition-all hover:bg-[#ed5c12] hover:shadow-md sm:w-auto"
        >
          <Link href="/placement/drives/new">
            <Plus className="h-4 w-4" /> Create Drive
          </Link>
        </Button>
      </header>

      <section aria-label="Search and filter placement drives" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <label className="relative block w-full xl:max-w-sm">
            <span className="sr-only">Search company name or job role</span>
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search by company or role..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-[#142b4d] outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#ff6b1a] focus:ring-2 focus:ring-[#ff6b1a]/15"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center xl:justify-end">
            <div className="flex min-w-0 items-center gap-2">
              <Filter className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" aria-hidden="true" />
              <div role="group" aria-label="Filter by status" className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-50 p-1">
                {statuses.map((status) => {
                  const active = statusFilter === status.value;
                  return (
                    <button
                      key={status.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setStatusFilter(status.value)}
                      className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b1a]/40 sm:px-3.5 sm:text-sm ${
                        active
                          ? "bg-[#fff0e8] text-[#e9570c] shadow-sm"
                          : "text-[#142b4d] hover:bg-white hover:text-[#e9570c]"
                      }`}
                    >
                      {status.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-[#142b4d] transition hover:border-slate-300 focus-within:border-[#ff6b1a] focus-within:ring-2 focus-within:ring-[#ff6b1a]/15">
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
              <span className="text-slate-400" aria-hidden="true">⌄</span>
            </label>
          </div>
        </div>
      </section>

      {isError ? (
        <section role="alert" className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <BriefcaseBusiness className="mx-auto h-9 w-9 text-slate-300" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-semibold text-[#142b4d]">We couldn’t load placement drives</h2>
          <p className="mt-1 text-sm text-slate-500">Check your connection and try again.</p>
          <Button onClick={() => void refetch()} disabled={isFetching} className="mt-5 rounded-xl bg-[#ff6b1a] text-white hover:bg-[#ed5c12]">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Try again
          </Button>
        </section>
      ) : isLoading ? (
        <div aria-label="Loading placement drives" aria-busy="true" className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="min-h-[248px] animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4"><div className="h-6 w-2/3 rounded bg-slate-100" /><div className="h-6 w-20 rounded-full bg-slate-100" /></div>
              <div className="mt-3 h-4 w-3/5 rounded bg-slate-100" />
              <div className="mt-7 space-y-3"><div className="h-4 w-1/2 rounded bg-slate-100" /><div className="h-4 w-2/3 rounded bg-slate-100" /></div>
              <div className="mt-7 border-t border-slate-100 pt-4"><div className="h-4 w-40 rounded bg-slate-100" /></div>
            </div>
          ))}
        </div>
      ) : allDrives.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm sm:py-14">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff0e8] text-[#ff6b1a]"><BriefcaseBusiness className="h-6 w-6" aria-hidden="true" /></span>
          <h2 className="mt-4 text-lg font-semibold text-[#142b4d]">No placement drives yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">Create your first placement drive to start managing recruitment opportunities.</p>
          <Button asChild className="mt-5 rounded-xl bg-[#ff6b1a] text-white hover:bg-[#ed5c12]"><Link href="/placement/drives/new"><Plus className="h-4 w-4" /> Create Drive</Link></Button>
        </section>
      ) : filteredDrives.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <Search className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-semibold text-[#142b4d]">No matching drives found</h2>
          <p className="mt-1 text-sm text-slate-500">Try another company name, job role, or status filter.</p>
          <button type="button" onClick={clearFilters} className="mt-4 text-sm font-semibold text-[#e9570c] transition hover:text-[#c94708]">Clear filters</button>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredDrives.map((drive) => {
            const departments = drive.requirements?.allowedDepartments ?? [];
            return (
              <Link
                key={drive.id}
                href={`/placement/drives/${drive.id}`}
                aria-label={`View ${drive.companyName} ${drive.roleTitle} drive details`}
                className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b1a] focus-visible:ring-offset-2"
              >
                <article className="flex h-full min-h-[248px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-orange-200 group-hover:shadow-md sm:p-6">
                  <div className="flex min-h-[52px] items-start justify-between gap-3">
                    <h2 className="line-clamp-2 text-lg font-bold leading-6 text-[#142b4d] transition-colors group-hover:text-[#e9570c] sm:text-xl">{drive.companyName}</h2>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ring-1 ring-inset ${statusStyles(drive.status)}`}>
                      {drive.status.toLocaleLowerCase()}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 min-h-10 text-sm font-medium leading-5 text-slate-600">{drive.roleTitle}</p>

                  <div className="mt-5 space-y-3 text-sm text-slate-600">
                    <div className="flex items-start gap-2.5">
                      <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[#526985]" aria-hidden="true" />
                      <span>{formatDate(drive.driveDate)}</span>
                    </div>
                    {drive.applicationDeadline && (
                      <div className="flex items-start gap-2.5">
                        <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#526985]" aria-hidden="true" />
                        <span>Apply by {formatDate(drive.applicationDeadline)}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2.5">
                      <UsersRound className="mt-0.5 h-4 w-4 shrink-0 text-[#526985]" aria-hidden="true" />
                      <span className="line-clamp-2">{departments.length ? departments.join(", ") : "All departments"}</span>
                    </div>
                  </div>

                  <div className="mt-auto border-t border-slate-100 pt-4">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#e9570c] transition-colors group-hover:text-[#c94708]">
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
