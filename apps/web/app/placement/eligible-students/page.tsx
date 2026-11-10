'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Search,
  UsersRound,
  X,
} from 'lucide-react';
import { DriveStatus } from '@placecampus/shared-types';
import { apiClient } from '@/lib/api-client';
import { usePlacementDrives } from '@/features/drives/hooks/use-drives';
import { GapAnalysisDialog } from '@/features/drives/components/drive-insights';

type EligibilityCheck = { type: string; result?: string; reason?: string };
type EligibleStudent = {
  id: string;
  name: string;
  email: string;
  registrationNumber: string | null;
  department: string;
  program: string | null;
  graduationYear: number | null;
  cgpa: number | null;
  isDemoData: boolean;
  eligibility: { eligible: boolean; checks: EligibilityCheck[] };
};
type EligibleStudentsResponse = {
  drive: { id: string; companyName: string; roleTitle: string };
  total: number;
  eligible: number;
  students: EligibleStudent[];
};

export default function EligibleStudentsPage() {
  const drivesQuery = usePlacementDrives();
  const publishedDrives = React.useMemo(
    () => drivesQuery.data?.filter((drive) => drive.status === DriveStatus.PUBLISHED) ?? [],
    [drivesQuery.data],
  );
  const [driveId, setDriveId] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [expandedRowKey, setExpandedRowKey] = React.useState<string | null>(null);
  const [gapStudentId, setGapStudentId] = React.useState<string | null>(null);

  const selectedId = publishedDrives.some((drive) => drive.id === driveId)
    ? driveId
    : publishedDrives[0]?.id ?? '';

  const studentsQuery = useQuery({
    queryKey: ['placement', 'eligible-students', selectedId],
    queryFn: () => apiClient.get<EligibleStudentsResponse>(
      `/placement/drives/${selectedId}/eligible-students`,
    ),
    enabled: Boolean(selectedId),
  });

  const eligibleStudents = React.useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return (studentsQuery.data?.students ?? []).filter((student) => {
      if (!student.eligibility.eligible) return false;
      if (!query) return true;
      return [student.name, student.registrationNumber, student.id, student.department]
        .some((value) => String(value ?? '').toLocaleLowerCase().includes(query));
    });
  }, [studentsQuery.data?.students, search]);

  return (
    <div className="space-y-6 sm:space-y-7">
      <header className="flex items-center gap-4">
        <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#fff0e8] text-[#ff6b1a] sm:flex">
          <UsersRound className="h-7 w-7" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-sm">
            Placement Management
          </p>
          <h1 className="mt-1 text-3xl font-bold leading-tight tracking-tight text-[#142b4d] sm:text-[34px]">
            Eligible Students
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Find students who meet the eligibility requirements for each published placement drive.
          </p>
        </div>
      </header>

      <section aria-label="Select a drive and search students" className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:grid-cols-2 lg:gap-6">
        <div className="min-w-0">
          <label htmlFor="eligible-drive" className="mb-2 block text-sm font-semibold text-[#142b4d]">
            Select Placement Drive
          </label>
          <div className="relative">
            <select
              id="eligible-drive"
              value={selectedId}
              disabled={drivesQuery.isLoading || publishedDrives.length === 0}
              onChange={(event) => setDriveId(event.target.value)}
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-sm text-[#142b4d] outline-none transition hover:border-slate-300 focus:border-[#ff6b1a] focus:ring-2 focus:ring-[#ff6b1a]/15 disabled:bg-slate-50 disabled:text-slate-400"
            >
              {publishedDrives.length === 0 ? (
                <option value="">No published drives available</option>
              ) : publishedDrives.map((drive) => (
                <option value={drive.id} key={drive.id}>
                  {drive.companyName} — {drive.roleTitle}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          </div>
        </div>

        <div className="min-w-0 lg:border-l lg:border-slate-100 lg:pl-6">
          <label htmlFor="student-search" className="mb-2 block text-sm font-semibold text-[#142b4d]">
            Search Students
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              id="student-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, ID, or department"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-[#142b4d] outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#ff6b1a] focus:ring-2 focus:ring-[#ff6b1a]/15"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b1a]/40"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </section>

      {drivesQuery.isError ? (
        <ErrorCard
          retry={() => void drivesQuery.refetch()}
          title="Unable to load placement drives."
          message="We couldn’t retrieve published drives. Please check your connection and try again."
        />
      ) : drivesQuery.isLoading ? (
        <StudentListSkeleton />
      ) : publishedDrives.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
          <CalendarDays className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
          <h2 className="mt-3 text-base font-semibold text-[#142b4d]">No published drives available</h2>
          <p className="mt-1 text-sm text-slate-500">Published placement drives will appear here when they are available.</p>
        </section>
      ) : (
        <section aria-labelledby="eligible-list-heading" className="space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="eligible-list-heading" className="text-xl font-bold text-[#142b4d]">Eligible Students</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {studentsQuery.data
                  ? `${studentsQuery.data.eligible.toLocaleString()} students meet this drive’s requirements`
                  : 'Students who meet this drive’s requirements'}
              </p>
            </div>
            {studentsQuery.data && search.trim() && (
              <p className="text-sm text-slate-500">Showing {eligibleStudents.length.toLocaleString()} matching</p>
            )}
          </div>

          {studentsQuery.isError ? (
            <ErrorCard retry={() => void studentsQuery.refetch()} />
          ) : studentsQuery.isLoading ? (
            <StudentListSkeleton />
          ) : eligibleStudents.length === 0 ? (
            search.trim() ? (
              <section className="rounded-2xl border border-slate-200 bg-white px-6 py-9 text-center shadow-sm">
                <Search className="mx-auto h-7 w-7 text-slate-300" aria-hidden="true" />
                <h3 className="mt-3 font-semibold text-[#142b4d]">No students match this search</h3>
                <p className="mt-1 text-sm text-slate-500">Try another name, student ID, or department.</p>
                <button type="button" onClick={() => setSearch('')} className="mt-3 text-sm font-semibold text-[#e9570c] hover:underline">Clear search</button>
              </section>
            ) : (
              <section className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
                <UsersRound className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
                <h3 className="mt-3 font-semibold text-[#142b4d]">No eligible students found.</h3>
                <p className="mt-1 text-sm text-slate-600">No students currently meet the eligibility requirements for this placement drive.</p>
                <p className="mt-1 text-xs text-slate-500">Try another placement drive or review the eligibility criteria.</p>
              </section>
            )
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-5 py-3.5 font-semibold">Student</th>
                      <th scope="col" className="px-5 py-3.5 font-semibold">Department</th>
                      <th scope="col" className="px-5 py-3.5 font-semibold">CGPA</th>
                      <th scope="col" className="px-5 py-3.5 font-semibold">Graduation Year</th>
                      <th scope="col" className="px-5 py-3.5 font-semibold">Eligibility</th>
                      <th scope="col" className="px-5 py-3.5 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {eligibleStudents.map((student) => {
                      const rowKey = `${selectedId}:${student.id}`;
                      const expanded = expandedRowKey === rowKey;
                      const passingChecks = student.eligibility.checks.filter((check) => check.result === 'PASS');
                      return (
                        <React.Fragment key={student.id}>
                          <tr className="transition-colors hover:bg-slate-50/80">
                            <td className="px-5 py-4">
                              <p className="font-semibold text-[#142b4d]">{student.name}{student.isDemoData && <span className="ml-2 rounded-full border border-orange-200 px-2 py-0.5 text-[10px] font-medium text-orange-700">Demo data</span>}</p>
                              <p className="mt-0.5 text-xs text-slate-500">{student.registrationNumber || student.id}</p>
                            </td>
                            <td className="px-5 py-4 text-slate-700">{student.department || 'Not provided'}</td>
                            <td className="px-5 py-4 text-slate-700">{student.cgpa == null ? '—' : student.cgpa.toFixed(2)}</td>
                            <td className="px-5 py-4 text-slate-700">{student.graduationYear ?? '—'}</td>
                            <td className="px-5 py-4">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Eligible
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <button
                                type="button"
                                aria-expanded={expanded}
                                onClick={() => setExpandedRowKey(expanded ? null : rowKey)}
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-[#e9570c] transition hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b1a]/40"
                              >
                                {expanded ? 'Hide details' : 'View details'}
                                <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} aria-hidden="true" />
                              </button>
                            </td>
                          </tr>
                          {expanded && (
                            <tr className="bg-slate-50/70">
                              <td colSpan={6} className="px-5 py-4">
                                <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                                  <Detail label="Student ID" value={student.registrationNumber || student.id} />
                                  <Detail label="Email" value={student.email} />
                                  <Detail label="Programme" value={student.program || 'Not provided'} />
                                  <div className="sm:col-span-2 lg:col-span-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Requirements met</p>
                                    <p className="mt-1 text-[#142b4d]">{passingChecks.length ? passingChecks.map((check) => check.type.replaceAll('_', ' ').toLocaleLowerCase()).join(' · ') : 'Eligibility confirmed for this drive.'}</p>
                                  </div>
                                  <div className="sm:col-span-2 lg:col-span-3">
                                    <button
                                      type="button"
                                      onClick={() => setGapStudentId(student.id)}
                                      className="inline-flex h-9 items-center rounded-lg border border-orange-200 bg-white px-3.5 text-sm font-semibold text-[#e9570c] transition hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b1a]/40"
                                    >
                                      View skill gap analysis
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}
      <GapAnalysisDialog driveId={selectedId} studentId={gapStudentId} onClose={() => setGapStudentId(null)} />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 break-all font-medium text-[#142b4d]">{value}</p></div>;
}

function StudentListSkeleton() {
  return (
    <section aria-label="Loading eligible students" aria-busy="true" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden grid-cols-5 gap-4 bg-slate-50 px-5 py-3.5 sm:grid">
        {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-3 w-24 animate-pulse rounded bg-slate-200" />)}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="grid min-h-[68px] animate-pulse grid-cols-2 items-center gap-4 px-5 py-4 sm:grid-cols-5">
            <div className="space-y-2"><div className="h-3.5 w-32 rounded bg-slate-200" /><div className="h-3 w-24 rounded bg-slate-100" /></div>
            <div className="hidden h-3.5 w-24 rounded bg-slate-100 sm:block" />
            <div className="hidden h-3.5 w-12 rounded bg-slate-100 sm:block" />
            <div className="hidden h-3.5 w-16 rounded bg-slate-100 sm:block" />
            <div className="justify-self-end sm:justify-self-start"><div className="h-6 w-20 rounded-full bg-slate-100" /></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ErrorCard({
  retry,
  title = 'Unable to load eligible students.',
  message = 'We couldn’t retrieve the eligible student list. Please check your connection and try again.',
}: { retry: () => void; title?: string; message?: string }) {
  return (
    <section role="alert" className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600"><AlertCircle className="h-5 w-5" aria-hidden="true" /></span>
        <div>
          <h2 className="text-sm font-semibold text-[#142b4d]">{title}</h2>
          <p className="mt-0.5 text-sm leading-5 text-slate-500">{message}</p>
        </div>
      </div>
      <button type="button" onClick={retry} className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 px-3.5 text-sm font-semibold text-[#142b4d] transition hover:border-orange-200 hover:bg-orange-50 hover:text-[#e9570c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b1a]/40">Retry</button>
    </section>
  );
}
