"use client";

import * as React from "react";
import Link from "next/link";
import { CircleAlert, RotateCcw, Search, Users, X } from "lucide-react";
import type { FacultyAssignmentPurpose } from "@placecampus/shared-types";
import { useFacultyStudents } from "@/features/faculty/hooks/use-faculty-portal";
import { ReadinessBar, StudentCell, facultyCard } from "@/features/faculty/components/faculty-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const PURPOSE_LABEL: Record<FacultyAssignmentPurpose, string> = {
  MENTOR: "Mentor",
  EVIDENCE_REVIEWER: "Reviewer",
  INTERVIEWER: "Interviewer",
  PROJECT_GUIDE: "Project guide",
};

export default function FacultyStudentsPage() {
  const { data: students, isLoading, isError, refetch } = useFacultyStudents();
  const [search, setSearch] = React.useState("");

  const query = search.trim().toLowerCase();
  const visible = (students ?? []).filter((s) =>
    !query || `${s.fullName} ${s.registrationNumber ?? ""} ${s.email ?? ""}`.toLowerCase().includes(query),
  );

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-[#0B1F44]">My Assigned Students</h2>
          <p className="mt-1 text-sm text-[#64748B]">Students you mentor, review or interview. Only your assigned students are listed.</p>
        </div>
        <label className="relative block sm:w-72">
          <span className="sr-only">Search students</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or registration no."
            className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#FF6B1A]/50 focus:ring-2 focus:ring-[#FF6B1A]/15"
          />
        </label>
      </div>

      <section className={cn(facultyCard, "overflow-hidden")}>
        {isLoading ? (
          <div className="space-y-3 p-5" aria-busy="true">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <CircleAlert className="h-8 w-8 text-red-600" aria-hidden="true" />
            <p className="font-semibold text-red-900">Couldn&apos;t load your students</p>
            <button type="button" onClick={() => refetch()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-red-700 ring-1 ring-red-200">
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Retry
            </button>
          </div>
        ) : !students?.length ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-[#64748B]"><Users className="h-5 w-5" aria-hidden="true" /></span>
            <p className="text-sm text-[#64748B]">No students are currently assigned to your account.</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <p className="text-sm text-[#64748B]">No students match “{search}”.</p>
            <button type="button" onClick={() => setSearch("")} className="inline-flex items-center gap-1 text-sm font-semibold text-[#FF6B1A] hover:underline"><X className="h-4 w-4" aria-hidden="true" /> Clear search</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                <tr>
                  <th scope="col" className="px-5 py-3">Student</th>
                  <th scope="col" className="px-5 py-3">Your role</th>
                  <th scope="col" className="px-5 py-3">Readiness</th>
                  <th scope="col" className="px-5 py-3 text-center">Verified Skills</th>
                  <th scope="col" className="px-5 py-3 text-center">Pending Reviews</th>
                  <th scope="col" className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {visible.map((s) => (
                  <tr key={s.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-5 py-3.5"><StudentCell student={s} full /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {s.purposes.map((p) => (
                          <span key={p} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-[#0B1F44]/80">{PURPOSE_LABEL[p]}</span>
                        ))}
                      </div>
                    </td>
                    <td className="w-[26%] px-5 py-3.5"><ReadinessBar score={s.readinessScore} /></td>
                    <td className="px-5 py-3.5 text-center font-semibold tabular-nums text-[#0B1F44]">{s.verifiedSkills}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={cn("inline-flex min-w-7 justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums", s.pendingReviews ? "bg-orange-50 text-[#FF6B1A]" : "bg-slate-100 text-[#64748B]")}>{s.pendingReviews}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link href={`/faculty/students/${s.id}`} className="inline-flex h-9 items-center rounded-lg border border-[#E5E7EB] px-4 text-sm font-semibold text-[#0B1F44] transition-colors hover:border-[#FF6B1A]/50 hover:text-[#FF6B1A]">
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
