'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Search, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useRecruiterCandidates, useRecruiterDrives } from '@/features/recruiter/hooks/use-recruiter-portal';

export function RecruiterCandidateDirectory({ mode }: { mode: 'all' | 'shortlists' }) {
  const router = useRouter();
  const drivesQuery = useRecruiterDrives();
  const availableDrives = React.useMemo(() => {
    const drives = drivesQuery.data ?? [];
    return mode === 'shortlists'
      ? drives.filter((grant) => grant.releasedFields.includes('applicationStatus'))
      : drives;
  }, [drivesQuery.data, mode]);
  const [selectedId, setSelectedId] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [searchDraft, setSearchDraft] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('');
  const driveId = availableDrives.some((grant) => grant.drive.id === selectedId)
    ? selectedId
    : availableDrives[0]?.drive.id ?? '';
  const selectedGrant = availableDrives.find((grant) => grant.drive.id === driveId);
  const canSearchByName = selectedGrant?.releasedFields.includes('studentName') ?? false;
  const canFilterByStatus = selectedGrant?.releasedFields.includes('applicationStatus') ?? false;
  const candidatesQuery = useRecruiterCandidates(
    driveId,
    page,
    25,
    mode === 'shortlists' ? 'SHORTLISTED' : canFilterByStatus ? status || undefined : undefined,
    canSearchByName ? search || undefined : undefined,
  );

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchDraft.trim());
  };

  if (drivesQuery.isLoading) return <LoadingState text="Loading your authorized drives..." />;
  if (drivesQuery.isError) return <ErrorState title="Could not load your assigned drives" description="Please try again." onRetry={() => void drivesQuery.refetch()} />;

  if (mode === 'all' && availableDrives.length === 0) {
    return <EmptyState title="No assigned drives" description="Candidate access appears here after a placement officer grants access to a drive." />;
  }

  if (mode === 'shortlists' && availableDrives.length === 0) {
    return (
      <div className="space-y-5">
        <PageTitle title="Shortlists" description="Candidates shortlisted on drives where application status is shared with you." />
        <EmptyState title="Shortlist data is unavailable" description="No assigned drive currently shares application-status information with your recruiter account." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Back to recruiter dashboard" onClick={() => router.push('/recruiter/dashboard')} className="rounded-xl text-slate-500 hover:bg-white"><ArrowLeft className="h-4 w-4" /></Button>
        <PageTitle
          title={mode === 'shortlists' ? 'Shortlists' : 'Candidates'}
          description={mode === 'shortlists' ? 'Review candidates shortlisted on your assigned drives.' : 'Browse applicants for drives you are authorized to access.'}
        />
      </div>

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(250px,0.8fr)_1fr] lg:items-end">
        <label className="block text-sm font-semibold text-[#142b4d]">
          Assigned drive
          <span className="relative mt-2 block">
            <select value={driveId} onChange={(event) => { setSelectedId(event.target.value); setPage(1); setSearch(''); setSearchDraft(''); setStatus(''); }} className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-sm font-normal outline-none focus:border-[#ff6b1a] focus:ring-2 focus:ring-[#ff6b1a]/15">
              {availableDrives.map((grant) => <option value={grant.drive.id} key={grant.grantId}>{grant.drive.companyName} — {grant.drive.roleTitle}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          </span>
        </label>
        {mode === 'all' && <form onSubmit={submitSearch} className="flex flex-wrap gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search candidates</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} disabled={!canSearchByName} placeholder={canSearchByName ? 'Search candidates' : 'Name search not shared for this drive'} className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-[#ff6b1a] focus:ring-2 focus:ring-[#ff6b1a]/15 disabled:bg-slate-50 disabled:text-slate-400" />
          </label>
          {canFilterByStatus && <select aria-label="Filter application status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-11 max-w-40 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#ff6b1a]">
            <option value="">All statuses</option><option value="APPLIED">Applied</option><option value="UNDER_REVIEW">Under review</option><option value="SHORTLISTED">Shortlisted</option><option value="REJECTED">Rejected</option>
          </select>}
          <Button type="submit" disabled={!canSearchByName} className="h-11 rounded-xl bg-[#ff6b1a] px-4 text-white hover:bg-[#e95b0c] disabled:cursor-not-allowed disabled:opacity-50">Search</Button>
        </form>}
      </section>

      {candidatesQuery.isLoading ? <LoadingState text="Loading authorized candidates..." /> : candidatesQuery.isError ? <ErrorState title="Could not load candidates" description="Candidate data may be unavailable or your drive access may have expired." onRetry={() => void candidatesQuery.refetch()} /> : !candidatesQuery.data?.candidates.length ? (
        <EmptyState icon={<UsersRound className="h-8 w-8" />} title={mode === 'shortlists' ? 'No shortlisted candidates yet' : 'No candidates found'} description={mode === 'shortlists' ? 'Shortlisted applicants will appear here when available.' : 'There are no applicants matching this drive and filter.'} />
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold text-[#142b4d]">{mode === 'shortlists' ? 'Shortlisted candidates' : 'Registered candidates'}</h2>
            <p className="text-sm text-slate-500">{candidatesQuery.data.total.toLocaleString()} candidates</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3.5 font-semibold">Candidate</th><th className="px-5 py-3.5 font-semibold">Department</th><th className="px-5 py-3.5 font-semibold">Application status</th><th className="px-5 py-3.5 text-right font-semibold">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{candidatesQuery.data.candidates.map((candidate) => <tr key={candidate.id} className="hover:bg-slate-50/80"><td className="px-5 py-4"><p className="font-semibold text-[#142b4d]">{candidate.studentName || 'Confidential candidate'}</p><p className="mt-0.5 text-xs text-slate-500">{candidate.studentId}</p></td><td className="px-5 py-4 text-slate-600">{candidate.department || 'Not shared'}</td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{candidate.applicationStatus?.replaceAll('_', ' ') || 'Not shared'}</span></td><td className="px-5 py-4 text-right"><Link href={`/recruiter/drives/${driveId}/candidates/${candidate.id}`} className="font-semibold text-[#e9570c] hover:underline">View profile <ChevronRight className="inline h-4 w-4" /></Link></td></tr>)}</tbody>
            </table>
          </div>
          {candidatesQuery.data.totalPages > 1 && <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft className="h-4 w-4" />Previous</Button><span className="text-xs text-slate-500">Page {page} of {candidatesQuery.data.totalPages}</span><Button variant="outline" size="sm" disabled={page >= candidatesQuery.data.totalPages} onClick={() => setPage((current) => current + 1)}>Next<ChevronRight className="h-4 w-4" /></Button></div>}
        </section>
      )}
    </div>
  );
}

function PageTitle({ title, description }: { title: string; description: string }) {
  return <div><h1 className="text-2xl font-bold text-[#142b4d] sm:text-3xl">{title}</h1><p className="mt-1 text-sm text-slate-600">{description}</p></div>;
}
