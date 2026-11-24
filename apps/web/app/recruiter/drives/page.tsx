'use client';

import * as React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useRecruiterDashboardSummary } from '@/features/recruiter/hooks/use-recruiter-portal';
import type { RecruiterDashboardDrive, RecruiterDriveLifecycle } from '@/features/recruiter/hooks/use-recruiter-portal';
import { BriefcaseBusiness, Building2, CalendarCheck, CalendarDays, ChevronLeft, ChevronRight, GraduationCap, MapPin, Search, SlidersHorizontal, Star, UsersRound, Wallet } from 'lucide-react';

type DriveGroup = 'Active' | 'Upcoming' | 'Completed' | 'Expired';
const PAGE_SIZE = 6;
const groupLabel: Record<RecruiterDriveLifecycle, DriveGroup> = { ACTIVE: 'Active', UPCOMING: 'Upcoming', COMPLETED: 'Completed', EXPIRED: 'Expired', CANCELLED: 'Completed' };
const dateLabel = (date?: string) => date ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not announced';
const shortlistedOrLater = (item: RecruiterDashboardDrive) => item.statusCounts
  ? item.statusCounts.shortlisted + item.statusCounts.interviewScheduled + item.statusCounts.offerReleased + item.statusCounts.selected
  : null;

export default function RecruiterDrivesPage() {
  const summaryQuery = useRecruiterDashboardSummary();
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<'All drives' | DriveGroup>('All drives');
  const [sort, setSort] = React.useState('deadline');
  const [page, setPage] = React.useState(1);

  const drives = React.useMemo(() => summaryQuery.data ?? [], [summaryQuery.data]);
  const counts = React.useMemo(() => drives.reduce<Record<DriveGroup, number>>((result, item) => {
    result[groupLabel[item.lifecycle] ?? 'Active'] += 1;
    return result;
  }, { Active: 0, Upcoming: 0, Completed: 0, Expired: 0 }), [drives]);
  const filtered = React.useMemo(() => drives
    .filter((item) => {
      const text = `${item.drive.companyName} ${item.drive.roleTitle} ${item.drive.location ?? ''} ${(item.drive.requirements?.allowedDepartments ?? []).join(' ')}`.toLowerCase();
      return (!search || text.includes(search.trim().toLowerCase())) && (status === 'All drives' || groupLabel[item.lifecycle] === status);
    })
    .sort((a, b) => {
      if (sort === 'company') return a.drive.companyName.localeCompare(b.drive.companyName);
      if (sort === 'applicants') return b.candidateCount - a.candidateCount;
      if (sort === 'shortlisted') return (shortlistedOrLater(b) ?? -1) - (shortlistedOrLater(a) ?? -1);
      return new Date(a.drive.applicationDeadline ?? '9999-12-31').getTime() - new Date(b.drive.applicationDeadline ?? '9999-12-31').getTime();
    }), [drives, search, status, sort]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (summaryQuery.isLoading) return <LoadingState text="Loading your assigned drives..." />;
  if (summaryQuery.isError) return <ErrorState title="Could not load assigned drives" description="The drive list and counts could not be retrieved." onRetry={() => void summaryQuery.refetch()} />;

  return <div className="mx-auto max-w-[1440px] space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">Recruiter workspace</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-[#142b4d]">Assigned drives</h1><p className="mt-1 text-sm text-slate-600">Review roles, deadlines, and applicant volume for drives shared with you.</p></div>
      <Link href="/recruiter/candidates" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#ff6b1a] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e95b0c]">Open candidate directory<ChevronRight className="h-4 w-4" /></Link>
    </header>

    <section aria-label="Drive overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {(['Active', 'Upcoming', 'Completed', 'Expired'] as const).map((label, index) => {
        const Icon = [BriefcaseBusiness, CalendarDays, Building2, SlidersHorizontal][index];
        const hint = { Active: 'Accepting applications now', Upcoming: 'Applications open soon', Completed: 'Hiring process finished', Expired: 'Deadline passed' }[label];
        return <button type="button" key={label} aria-pressed={status === label} onClick={() => { setStatus(status === label ? 'All drives' : label); setPage(1); }} className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${status === label ? 'border-orange-300 ring-2 ring-orange-100' : 'border-slate-200'}`}><div className="flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-700"><Icon className="h-5 w-5" /></span><span className="text-2xl font-bold tabular-nums text-[#142b4d]">{counts[label]}</span></div><p className="mt-3 text-sm font-semibold text-[#142b4d]">{label} drives</p><p className="mt-0.5 text-xs text-slate-500">{hint}</p></button>;
      })}
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div><h2 className="font-semibold text-[#142b4d]">Drive list</h2><p className="mt-0.5 text-xs text-slate-500">{filtered.length} of {drives.length} assigned drives</p></div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative"><span className="sr-only">Search drives</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search company, role or branch" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-[#ff6b1a] sm:w-60" /></label>
          <label><span className="sr-only">Filter drive status</span><select value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPage(1); }} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#ff6b1a] sm:w-40"><option>All drives</option><option>Active</option><option>Upcoming</option><option>Completed</option><option>Expired</option></select></label>
          <label><span className="sr-only">Sort drives</span><select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#ff6b1a] sm:w-44"><option value="deadline">Sort: Deadline</option><option value="company">Sort: Company</option><option value="applicants">Sort: Applicants</option><option value="shortlisted">Sort: Shortlisted</option></select></label>
        </div>
      </div>

      {drives.length === 0 ? <div className="p-5"><EmptyState icon={<BriefcaseBusiness className="h-8 w-8" />} title="No drives assigned" description="No placement drives are currently available to this recruiter account. A placement officer can assign a drive and choose which candidate details to share." /></div> : filtered.length === 0 ? <div className="p-8 text-center"><p className="font-semibold text-[#142b4d]">No matching drives</p><p className="mt-1 text-sm text-slate-500">Change your search or status filter.</p><Button variant="ghost" onClick={() => { setSearch(''); setStatus('All drives'); }} className="mt-2 text-orange-700">Clear filters</Button></div> : <>
        <div className="divide-y divide-slate-100">
          {visible.map((grant) => {
            const drive = grant.drive;
            const group = groupLabel[grant.lifecycle] ?? 'Active';
            const branches = drive.requirements?.allowedDepartments ?? [];
            const shortlisted = shortlistedOrLater(grant);
            return <article key={grant.grantId} className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(230px,1.3fr)_repeat(3,minmax(92px,0.6fr))_minmax(150px,1fr)_auto] lg:items-center">
              <div className="flex min-w-0 items-center gap-3">
                {drive.companyLogo
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={drive.companyLogo} alt="" className="h-11 w-11 shrink-0 rounded-xl border border-orange-100 object-cover" />
                  : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-sm font-bold text-orange-800">{drive.companyName.trim().slice(0, 2).toUpperCase()}</span>}
                <div className="min-w-0"><h3 className="truncate font-semibold text-[#142b4d]">{drive.companyName}</h3><p className="truncate text-sm text-slate-600">{drive.roleTitle}</p><div className="mt-1 flex flex-wrap items-center gap-1.5"><Badge variant={group === 'Active' ? 'success' : group === 'Expired' ? 'destructive' : 'secondary'}>{group}</Badge>{drive.employmentType && <span className="text-[11px] text-slate-500">{drive.employmentType}</span>}</div></div>
              </div>
              <DriveFact label="Applicants" value={grant.candidateCount.toLocaleString()} icon={<UsersRound className="h-4 w-4" />} />
              <DriveFact label="Shortlisted" value={shortlisted === null ? 'Not shared' : shortlisted.toLocaleString()} icon={<Star className="h-4 w-4" />} extra={shortlisted === null ? undefined : 'Incl. later stages'} />
              <DriveFact label="Interviews" value={grant.interviewCounts.total.toLocaleString()} icon={<CalendarCheck className="h-4 w-4" />} extra={grant.interviewCounts.scheduled ? `${grant.interviewCounts.scheduled} upcoming` : undefined} />
              <div className="grid min-w-0 gap-2">
                <DriveFact label="CTC · Location" value={[drive.package, drive.location || drive.workMode].filter(Boolean).join(' · ') || 'Not specified'} icon={<Wallet className="h-4 w-4" />} />
                <DriveFact label="Deadline" value={dateLabel(drive.applicationDeadline)} icon={<CalendarDays className="h-4 w-4" />} />
              </div>
              <Link href={`/recruiter/drives/${drive.id}/candidates`} className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-[#142b4d] transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-800">View details<ChevronRight className="h-4 w-4" /></Link>
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 lg:col-span-6">
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Eligible: {branches.length ? branches.join(', ') : 'All branches'}</span>
                {drive.requirements?.minimumCGPA != null && <span className="inline-flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" />Min CGPA {drive.requirements.minimumCGPA}{drive.requirements.graduationYear ? ` · Batch ${drive.requirements.graduationYear}` : ''}</span>}
                {drive.requirements?.skills?.length ? <span>Skills: {drive.requirements.skills.map((skill) => skill.skillName || skill.skillId).join(', ')}</span> : null}
              </p>
            </article>;
          })}
        </div>
        {totalPages > 1 && <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-5"><Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft className="h-4 w-4" />Previous</Button><span className="text-xs text-slate-500">Page {currentPage} of {totalPages}</span><Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Next<ChevronRight className="h-4 w-4" /></Button></div>}
      </>}
    </section>
  </div>;
}

function DriveFact({ label, value, icon, extra }: { label: string; value: string; icon: React.ReactNode; extra?: string }) {
  return <div className="min-w-0"><p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{icon}{label}</p><p className="mt-1 truncate text-sm font-medium text-slate-700" title={value}>{value}</p>{extra && <p className="mt-0.5 truncate text-xs text-slate-500" title={extra}>{extra}</p>}</div>;
}
