'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  GitCompareArrows,
  RotateCcw,
  Search,
  UsersRound,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import {
  useRecruiterCandidateList,
  useRecruiterCandidateProfile,
  useRecruiterDrives,
  useUpdateRecruiterApplication,
} from '@/features/recruiter/hooks/use-recruiter-portal';
import type { RecruiterCandidate, RecruiterCandidateListFilters } from '@/features/recruiter/hooks/use-recruiter-portal';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

const PAGE_SIZE = 20;
export const applicationStatuses = [
  ['APPLIED', 'Applied'],
  ['UNDER_REVIEW', 'Under review'],
  ['SHORTLISTED', 'Shortlisted'],
  ['INTERVIEW_SCHEDULED', 'Interview scheduled'],
  ['OFFER_RELEASED', 'Offer released'],
  ['SELECTED', 'Selected'],
  ['REJECTED', 'Rejected'],
  ['WITHDRAWN', 'Withdrawn'],
] as const;
export const nextStages: Record<string, string[]> = {
  APPLIED: ['UNDER_REVIEW', 'REJECTED'],
  UNDER_REVIEW: ['SHORTLISTED', 'REJECTED'],
  SHORTLISTED: ['INTERVIEW_SCHEDULED', 'REJECTED'],
  INTERVIEW_SCHEDULED: ['OFFER_RELEASED', 'REJECTED'],
  OFFER_RELEASED: ['SELECTED', 'REJECTED'],
};
const statusLabel = (status?: string) => applicationStatuses.find(([value]) => value === status)?.[1] ?? status?.replaceAll('_', ' ') ?? '—';
const statusTone: Record<string, string> = {
  APPLIED: 'bg-sky-50 text-sky-800', UNDER_REVIEW: 'bg-violet-50 text-violet-800', SHORTLISTED: 'bg-orange-50 text-orange-800',
  INTERVIEW_SCHEDULED: 'bg-indigo-50 text-indigo-800', OFFER_RELEASED: 'bg-emerald-50 text-emerald-800', SELECTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-rose-50 text-rose-700', WITHDRAWN: 'bg-slate-100 text-slate-600',
};
const branches = ['Computer Science Engineering', 'Information Technology', 'Electronics and Communication', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering'];
const inputClass = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-[#142b4d] outline-none focus:border-[#ff6b1a] focus:ring-2 focus:ring-[#ff6b1a]/15 disabled:bg-slate-50 disabled:text-slate-400';

interface Draft { q: string; driveId: string; company: string; status: string; department: string; minCgpa: string; maxCgpa: string; graduationYear: string; skill: string }
const emptyDraft: Draft = { q: '', driveId: '', company: '', status: '', department: '', minCgpa: '', maxCgpa: '', graduationYear: '', skill: '' };

export function RecruiterCandidateDirectory({ mode, lockedDriveId }: { mode: 'all' | 'shortlists'; lockedDriveId?: string }) {
  const router = useRouter();
  const drivesQuery = useRecruiterDrives();
  const drives = React.useMemo(() => drivesQuery.data ?? [], [drivesQuery.data]);
  const companies = React.useMemo(() => [...new Set(drives.map((grant) => grant.drive.companyName))].sort(), [drives]);
  const anyReleases = (field: string) => drives.some((grant) => (!lockedDriveId || grant.drive.id === lockedDriveId) && grant.releasedFields.includes(field));

  const [draft, setDraft] = React.useState<Draft>({ ...emptyDraft, driveId: lockedDriveId ?? '' });
  const [applied, setApplied] = React.useState<Draft>({ ...emptyDraft, driveId: lockedDriveId ?? '' });
  const [page, setPage] = React.useState(1);
  const [compared, setCompared] = React.useState<RecruiterCandidate[]>([]);
  const comparisonIds = compared.map((candidate) => candidate.id);
  const [previewId, setPreviewId] = React.useState<string>();
  const [exporting, setExporting] = React.useState(false);
  const update = useUpdateRecruiterApplication();

  const filters: RecruiterCandidateListFilters = {
    page,
    limit: PAGE_SIZE,
    q: applied.q || undefined,
    driveId: applied.driveId || undefined,
    company: applied.company || undefined,
    status: mode === 'shortlists' ? undefined : applied.status || undefined,
    department: applied.department || undefined,
    minCgpa: applied.minCgpa !== '' ? Number(applied.minCgpa) : undefined,
    maxCgpa: applied.maxCgpa !== '' ? Number(applied.maxCgpa) : undefined,
    graduationYear: applied.graduationYear !== '' ? Number(applied.graduationYear) : undefined,
    skill: applied.skill || undefined,
  };
  const candidatesQuery = useRecruiterCandidateList(filters, mode === 'shortlists');
  const candidates = React.useMemo(() => candidatesQuery.data?.candidates ?? [], [candidatesQuery.data]);

  const set = (key: keyof Draft) => (value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const apply = (next: Draft) => { setApplied(next); setPage(1); };
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const min = draft.minCgpa === '' ? undefined : Number(draft.minCgpa);
    const max = draft.maxCgpa === '' ? undefined : Number(draft.maxCgpa);
    if (min !== undefined && max !== undefined && min > max) { toast.error('Minimum CGPA cannot exceed maximum CGPA'); return; }
    apply({ ...draft, q: draft.q.trim(), skill: draft.skill.trim() });
  };
  const reset = () => { const next = { ...emptyDraft, driveId: lockedDriveId ?? '' }; setDraft(next); apply(next); };
  // Selects apply immediately; text inputs apply on submit.
  const setAndApply = (key: keyof Draft) => (value: string) => { const next = { ...draft, [key]: value }; setDraft(next); apply(next); };

  const moveStage = async (candidate: RecruiterCandidate, status: string) => {
    if (!candidate.driveId) return;
    try {
      await update.mutateAsync({ driveId: candidate.driveId, applicationId: candidate.id, status });
      toast.success(`${candidate.studentName || 'Candidate'} moved to ${statusLabel(status)}`);
    } catch {
      toast.error('Could not update this candidate stage');
    }
  };

  // Keeps the full row so comparisons survive paging and filter changes.
  const toggleComparison = (candidate: RecruiterCandidate) => setCompared((selected) => selected.some((item) => item.id === candidate.id)
    ? selected.filter((item) => item.id !== candidate.id)
    : selected.length < 3 ? [...selected, candidate] : selected);

  const exportCandidates = async () => {
    if (!filters.driveId) return;
    setExporting(true);
    try {
      const blob = await apiClient.get<Blob>(`/recruiter/drives/${filters.driveId}/candidates/export`, { responseType: 'blob', params: mode === 'shortlists' ? { status: 'SHORTLISTED' } : {} });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = mode === 'shortlists' ? 'placecampus-shortlist.csv' : 'placecampus-candidates.csv';
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success('Candidate export downloaded');
    } catch {
      toast.error('Could not export candidate records');
    } finally {
      setExporting(false);
    }
  };

  if (drivesQuery.isLoading) return <LoadingState text="Loading your authorized drives..." />;
  if (drivesQuery.isError) return <ErrorState title="Could not load your assigned drives" description="Please try again." onRetry={() => void drivesQuery.refetch()} />;
  if (drives.length === 0) return <EmptyState title="No assigned drives" description="Candidate access appears here after a placement officer grants access to a drive." />;
  if (mode === 'shortlists' && !anyReleases('applicationStatus')) {
    return <div className="space-y-5"><PageTitle title="Shortlists" description="Review candidates shortlisted on your assigned drives." /><EmptyState title="Shortlist data is unavailable" description="No assigned drive currently shares application-status information with your recruiter account." /></div>;
  }

  const total = candidatesQuery.data?.total ?? 0;
  const totalPages = candidatesQuery.data?.totalPages ?? 0;

  return (
    <div className="space-y-5">
      {!lockedDriveId && <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Back to recruiter dashboard" onClick={() => router.push('/recruiter/dashboard')} className="rounded-xl text-slate-500 hover:bg-white"><ArrowLeft className="h-4 w-4" /></Button>
        <PageTitle
          title={mode === 'shortlists' ? 'Shortlists' : 'Candidates'}
          description={mode === 'shortlists' ? 'Compare shortlisted candidates, keep notes, and move them to the next recruitment stage.' : 'Every applicant on your assigned drives. Only the student details shared for each drive are shown.'}
        />
      </div>}

      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(3,minmax(150px,1fr))]">
          <Field label="Search">
            <span className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input value={draft.q} onChange={(event) => set('q')(event.target.value)} disabled={!anyReleases('studentName') && !anyReleases('registrationNumber') && !anyReleases('studentEmail')} placeholder="Name, registration no. or email" className={`${inputClass} pl-9`} /></span>
          </Field>
          {!lockedDriveId && <Field label="Placement drive"><select value={draft.driveId} onChange={(event) => setAndApply('driveId')(event.target.value)} className={inputClass}><option value="">All assigned drives</option>{drives.map((grant) => <option key={grant.grantId} value={grant.drive.id}>{grant.drive.companyName} · {grant.drive.roleTitle}</option>)}</select></Field>}
          {!lockedDriveId && <Field label="Company"><select value={draft.company} onChange={(event) => setAndApply('company')(event.target.value)} className={inputClass}><option value="">All companies</option>{companies.map((company) => <option key={company}>{company}</option>)}</select></Field>}
          {mode === 'all' && anyReleases('applicationStatus') && <Field label="Application status"><select value={draft.status} onChange={(event) => setAndApply('status')(event.target.value)} className={inputClass}><option value="">All statuses</option>{applicationStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>}
          {anyReleases('department') && <Field label="Branch"><select value={draft.department} onChange={(event) => setAndApply('department')(event.target.value)} className={inputClass}><option value="">All branches</option>{branches.map((branch) => <option key={branch}>{branch}</option>)}</select></Field>}
          {anyReleases('cgpa') && <div className="grid grid-cols-2 gap-2"><Field label="Min CGPA"><input type="number" min="0" max="10" step="0.1" value={draft.minCgpa} onChange={(event) => set('minCgpa')(event.target.value)} placeholder="0.0" className={inputClass} /></Field><Field label="Max CGPA"><input type="number" min="0" max="10" step="0.1" value={draft.maxCgpa} onChange={(event) => set('maxCgpa')(event.target.value)} placeholder="10.0" className={inputClass} /></Field></div>}
          {anyReleases('graduationYear') && <Field label="Graduation year"><input type="number" min="2000" max="2100" value={draft.graduationYear} onChange={(event) => set('graduationYear')(event.target.value)} placeholder="2027" className={inputClass} /></Field>}
          {anyReleases('skills') && <Field label="Skill"><input value={draft.skill} onChange={(event) => set('skill')(event.target.value)} placeholder="e.g. React, SQL" className={inputClass} /></Field>}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <Button type="submit" className="h-10 rounded-xl bg-[#ff6b1a] px-4 text-white hover:bg-[#e95b0c]">Apply filters</Button>
          <Button type="button" variant="ghost" onClick={reset} className="h-10 rounded-xl text-slate-500"><RotateCcw className="h-4 w-4" />Reset</Button>
          <p className="ml-auto text-xs text-slate-500">Filters on a field only include drives that share that field.</p>
        </div>
      </form>

      {candidatesQuery.isLoading ? <TableSkeleton /> : candidatesQuery.isError ? <ErrorState title="Could not load candidates" description="Candidate data may be unavailable or your drive access may have expired." onRetry={() => void candidatesQuery.refetch()} /> : !candidates.length ? (
        <EmptyState icon={<UsersRound className="h-8 w-8" />} title={mode === 'shortlists' ? 'No shortlisted candidates match' : 'No candidates found'} description={mode === 'shortlists' ? 'Shortlisted applicants appear here once candidates reach the shortlist stage.' : 'No applicants match these filters.'} />
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-busy={candidatesQuery.isFetching}>
          <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div><h2 className="font-semibold text-[#142b4d]">{mode === 'shortlists' ? 'Shortlisted candidates' : 'Applications'}</h2><p className="mt-0.5 text-xs text-slate-500">{total.toLocaleString()} application records{filters.driveId ? ' on this drive' : ' across your assigned drives'}</p></div>
            <div className="flex flex-wrap items-center gap-3"><div className="flex items-center gap-2 text-xs text-slate-500"><GitCompareArrows className="h-4 w-4" />Select up to 3 to compare</div><Button type="button" variant="outline" onClick={() => void exportCandidates()} disabled={exporting || !filters.driveId} title={filters.driveId ? undefined : 'Choose a drive to export its candidates'} className="h-9 rounded-xl border-slate-200 text-[#142b4d]"><Download className="h-4 w-4" />{exporting ? 'Preparing…' : mode === 'shortlists' ? 'Export shortlist' : 'Export drive'}</Button></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="w-12 px-4 py-3.5"><span className="sr-only">Compare</span></th><th className="px-4 py-3.5 font-semibold">Candidate</th>{!filters.driveId && <th className="px-4 py-3.5 font-semibold">Drive</th>}<th className="px-4 py-3.5 font-semibold">Branch</th><th className="px-4 py-3.5 font-semibold">CGPA</th><th className="px-4 py-3.5 font-semibold">Skills</th><th className="px-4 py-3.5 font-semibold">Status</th><th className="px-4 py-3.5 text-right font-semibold">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{candidates.map((candidate) => <CandidateRow key={candidate.id} candidate={candidate} showDrive={!filters.driveId} selected={comparisonIds.includes(candidate.id)} canCompare={comparisonIds.includes(candidate.id) || comparisonIds.length < 3} busy={update.isPending} onToggle={() => toggleComparison(candidate)} onPreview={() => setPreviewId(candidate.id)} onStatusChange={(status) => void moveStage(candidate, status)} />)}</tbody>
            </table>
          </div>
          {totalPages > 1 && <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-5"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft className="h-4 w-4" />Previous</Button><span className="text-xs text-slate-500">Page {page} of {totalPages}</span><Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next<ChevronRight className="h-4 w-4" /></Button></div>}
        </section>
      )}

      {compared.length > 0 && <CandidateComparison candidates={compared} onRemove={(id) => setCompared((selected) => selected.filter((item) => item.id !== id))} />}
      {previewId && <CandidatePreview applicationId={previewId} onClose={() => setPreviewId(undefined)} />}
    </div>
  );
}

function CandidateRow({ candidate, showDrive, selected, canCompare, busy, onToggle, onPreview, onStatusChange }: {
  candidate: RecruiterCandidate; showDrive: boolean; selected: boolean; canCompare: boolean; busy: boolean;
  onToggle: () => void; onPreview: () => void; onStatusChange: (status: string) => void;
}) {
  const fields = candidate.releasedFields ?? [];
  const satisfied = candidate.skills?.filter((skill) => skill.status === 'SATISFIED') ?? [];
  const stages = candidate.canManageApplications ? nextStages[candidate.applicationStatus || ''] ?? [] : [];
  return <tr className="transition-colors hover:bg-slate-50/80">
    <td className="px-4 py-4"><input type="checkbox" checked={selected} disabled={!canCompare} onChange={onToggle} aria-label={`Compare ${candidate.studentName || 'confidential candidate'}`} className="h-4 w-4 rounded border-slate-300 accent-[#ff6b1a] disabled:opacity-40" /></td>
    <td className="px-4 py-4"><p className="font-semibold text-[#142b4d]">{candidate.studentName || 'Confidential candidate'}</p><p className="mt-0.5 font-mono text-xs text-slate-500">{fields.includes('registrationNumber') ? candidate.registrationNumber || '—' : `Application · ${candidate.id.slice(-8)}`}</p></td>
    {showDrive && <td className="max-w-[200px] px-4 py-4"><p className="truncate font-medium text-slate-700">{candidate.companyName}</p><p className="truncate text-xs text-slate-500">{candidate.roleTitle}</p></td>}
    <td className="px-4 py-4 text-slate-600">{fields.includes('department') ? candidate.department || '—' : <Hidden />}</td>
    <td className="px-4 py-4 tabular-nums text-slate-700">{fields.includes('cgpa') ? candidate.cgpa ?? '—' : <Hidden />}</td>
    <td className="max-w-[220px] px-4 py-4">{!fields.includes('skills') ? <Hidden /> : satisfied.length ? <div className="flex flex-wrap gap-1">{satisfied.slice(0, 3).map((skill) => <span key={skill.skillId} className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-800">{skill.skillName}</span>)}</div> : <span className="text-xs text-slate-400">No required skill matched</span>}</td>
    <td className="px-4 py-4">{fields.includes('applicationStatus') ? <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[candidate.applicationStatus ?? ''] ?? 'bg-slate-100 text-slate-700'}`}>{statusLabel(candidate.applicationStatus)}</span> : <Hidden />}</td>
    <td className="px-4 py-4 text-right"><div className="flex items-center justify-end gap-2">
      <Button type="button" variant="ghost" size="sm" onClick={onPreview} className="h-8 rounded-lg px-2 text-[#142b4d]"><Eye className="h-4 w-4" />Preview</Button>
      {candidate.driveId && <Link href={`/recruiter/drives/${candidate.driveId}/candidates/${candidate.id}`} className="text-sm font-semibold text-[#e9570c] hover:underline">Profile<ChevronRight className="ml-0.5 inline h-4 w-4" /></Link>}
      {stages.length > 0 && <select aria-label={`Move ${candidate.studentName || 'candidate'} to next stage`} value="" disabled={busy} onChange={(event) => { if (event.target.value) onStatusChange(event.target.value); }} className="max-w-36 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"><option value="">Move stage</option>{stages.map((stage) => <option key={stage} value={stage}>{statusLabel(stage)}</option>)}</select>}
    </div></td>
  </tr>;
}

function Hidden() {
  return <span className="text-xs text-slate-400" title="Not shared for this drive">Not shared</span>;
}

function CandidateComparison({ candidates, onRemove }: { candidates: RecruiterCandidate[]; onRemove: (id: string) => void }) {
  const rows: { label: string; field: string; value: (candidate: RecruiterCandidate) => React.ReactNode }[] = [
    { label: 'Drive', field: '', value: (c) => c.companyName ? `${c.companyName} · ${c.roleTitle}` : '—' },
    { label: 'Branch', field: 'department', value: (c) => c.department || 'Not on record' },
    { label: 'CGPA', field: 'cgpa', value: (c) => c.cgpa ?? 'Not on record' },
    { label: 'Graduation year', field: 'graduationYear', value: (c) => c.graduationYear ?? 'Not on record' },
    { label: 'Required-skill coverage', field: 'skillMatchCoverage', value: (c) => c.skillMatchCoverage != null ? `${Math.round(c.skillMatchCoverage)}%` : 'Not on record' },
    { label: 'Matched skills', field: 'skills', value: (c) => c.skills?.filter((s) => s.status === 'SATISFIED').map((s) => s.skillName).join(', ') || 'None' },
    { label: 'Projects', field: 'projects', value: (c) => c.projects?.length ? c.projects.join('; ') : 'None on record' },
    { label: 'Internships', field: 'internshipExperience', value: (c) => c.internshipExperience?.length ? c.internshipExperience.join('; ') : 'None on record' },
    { label: 'Application stage', field: 'applicationStatus', value: (c) => statusLabel(c.applicationStatus) },
  ];
  const visible = (field: string, candidate: RecruiterCandidate) => !field || (candidate.releasedFields ?? []).includes(field);
  return <section aria-label="Candidate comparison" className="overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-sm">
    <div className="flex items-center justify-between border-b border-orange-100 bg-orange-50/70 px-4 py-3"><div><h2 className="font-semibold text-[#142b4d]">Candidate comparison</h2><p className="text-xs text-slate-500">Each column shows only the fields shared for that candidate&apos;s drive.</p></div><GitCompareArrows className="h-5 w-5 text-orange-600" /></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr><th className="w-40 px-4 py-3 text-xs font-semibold uppercase text-slate-500">Attribute</th>{candidates.map((candidate) => <th key={candidate.id} className="min-w-48 px-4 py-3"><span className="flex items-center justify-between gap-2"><span className="font-semibold text-[#142b4d]">{candidate.studentName || 'Confidential candidate'}</span><button type="button" onClick={() => onRemove(candidate.id)} aria-label={`Remove ${candidate.studentName || 'candidate'} from comparison`} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button></span></th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.label}><th scope="row" className="px-4 py-3 align-top text-xs font-medium text-slate-500">{row.label}</th>{candidates.map((candidate) => <td key={candidate.id} className="px-4 py-3 align-top text-slate-700">{visible(row.field, candidate) ? row.value(candidate) : <Hidden />}</td>)}</tr>)}</tbody></table></div>
  </section>;
}

/** Slide-over profile preview with recruiter notes and stage actions. */
export function CandidatePreview({ applicationId, onClose }: { applicationId: string; onClose: () => void }) {
  const profileQuery = useRecruiterCandidateProfile(applicationId);
  const update = useUpdateRecruiterApplication();
  const candidate = profileQuery.data;
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const fields = candidate?.releasedFields ?? [];
  const stages = candidate?.canManageApplications ? nextStages[candidate.applicationStatus || ''] ?? [] : [];
  const save = async (body: { status?: string; recruiterNotes?: string }, message: string) => {
    if (!candidate) return;
    try { await update.mutateAsync({ driveId: candidate.driveId, applicationId, ...body }); toast.success(message); await profileQuery.refetch(); } catch { toast.error('Could not save this change'); }
  };

  return <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Candidate preview">
    <button type="button" aria-label="Close preview" onClick={onClose} className="absolute inset-0 bg-slate-900/30" />
    <aside className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-2xl">
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4">
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-700">Candidate preview</p><h2 className="mt-1 truncate text-xl font-bold text-[#142b4d]">{candidate?.studentName || (profileQuery.isLoading ? 'Loading…' : 'Confidential candidate')}</h2>{candidate?.registrationNumber && <p className="font-mono text-xs text-slate-500">{candidate.registrationNumber}</p>}</div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close preview" className="rounded-xl"><X className="h-4 w-4" /></Button>
      </div>
      {profileQuery.isLoading ? <div className="space-y-3 p-5" aria-busy="true">{[0, 1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div> : profileQuery.isError || !candidate ? <div className="p-5"><ErrorState title="Could not load this candidate" description="Access may have expired." onRetry={() => void profileQuery.refetch()} /></div> : <div className="space-y-5 p-5 text-sm">
        <dl className="grid grid-cols-2 gap-3">
          {[['Branch', 'department', candidate.department], ['CGPA', 'cgpa', candidate.cgpa], ['Graduation', 'graduationYear', candidate.graduationYear], ['Email', 'studentEmail', candidate.studentEmail]].map(([label, field, value]) => fields.includes(String(field)) ? <div key={String(label)} className="min-w-0 rounded-xl bg-slate-50 p-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-0.5 truncate font-semibold text-[#142b4d]">{value ?? '—'}</dd></div> : null)}
        </dl>
        {fields.includes('skills') && <div><h3 className="font-semibold text-[#142b4d]">Required-skill match{candidate.skillMatchCoverage != null ? ` · ${Math.round(candidate.skillMatchCoverage)}%` : ''}</h3><div className="mt-2 flex flex-wrap gap-1.5">{candidate.skills?.length ? candidate.skills.map((skill) => <span key={skill.skillId} className={`rounded-full px-2.5 py-1 text-xs font-medium ${skill.status === 'SATISFIED' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{skill.skillName} · {skill.status === 'SATISFIED' ? 'Matched' : skill.status.startsWith('OPTIONAL') ? 'Optional' : 'Gap'}</span>) : <span className="text-slate-500">No skill data recorded.</span>}</div></div>}
        {candidate.projects?.length ? <div><h3 className="font-semibold text-[#142b4d]">Projects</h3><ul className="mt-2 list-inside list-disc space-y-1 text-slate-700">{candidate.projects.map((project) => <li key={project}>{project}</li>)}</ul></div> : null}
        {candidate.internshipExperience?.length ? <div><h3 className="font-semibold text-[#142b4d]">Internships</h3><ul className="mt-2 list-inside list-disc space-y-1 text-slate-700">{candidate.internshipExperience.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
        {candidate.resumeUrl && <a href={candidate.resumeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center font-semibold text-orange-700 hover:underline"><ExternalLink className="mr-1.5 h-4 w-4" />Open resume</a>}
        <ApplicationHistory items={candidate.applicationHistory} />
        {candidate.canManageApplications && <div className="space-y-3 rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between"><h3 className="font-semibold text-[#142b4d]">Stage &amp; notes</h3><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[candidate.applicationStatus ?? ''] ?? 'bg-slate-100'}`}>{statusLabel(candidate.applicationStatus)}</span></div>
          {stages.length > 0 && <div className="flex flex-wrap gap-2">{stages.map((stage) => <Button key={stage} type="button" size="sm" variant={stage === 'REJECTED' ? 'outline' : 'default'} disabled={update.isPending} onClick={() => void save({ status: stage }, `Moved to ${statusLabel(stage)}`)} className={stage === 'REJECTED' ? 'rounded-lg border-rose-200 text-rose-700 hover:bg-rose-50' : 'rounded-lg bg-[#ff6b1a] text-white hover:bg-[#e95b0c]'}>{stage === 'REJECTED' ? 'Reject' : `Move to ${statusLabel(stage)}`}</Button>)}</div>}
          <NotesEditor key={`${applicationId}:${candidate.recruiterNotes ?? ''}`} initial={candidate.recruiterNotes ?? ''} busy={update.isPending} onSave={(recruiterNotes) => void save({ recruiterNotes }, 'Recruiter note saved')} />
        </div>}
        <Link href={`/recruiter/drives/${candidate.driveId}/candidates/${applicationId}`} className="inline-flex items-center text-sm font-semibold text-[#e9570c] hover:underline">Open full profile<ChevronRight className="h-4 w-4" /></Link>
      </div>}
    </aside>
  </div>;
}

/** Remounted (via key) whenever the saved note changes, so it never needs an effect to sync. */
function NotesEditor({ initial, busy, onSave }: { initial: string; busy: boolean; onSave: (notes: string) => void }) {
  const [notes, setNotes] = React.useState(initial);
  return <>
    <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} rows={4} aria-label="Recruiter notes" placeholder="Add screening notes…" className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-orange-500" />
    <div className="flex items-center justify-between"><span className="text-xs text-slate-400">{notes.length}/2000</span><Button type="button" size="sm" disabled={busy || notes === initial} onClick={() => onSave(notes)} className="rounded-lg">Save note</Button></div>
  </>;
}

export function ApplicationHistory({ items }: { items?: { applicationId: string; companyName: string; roleTitle: string; appliedAt: string; status?: string; interviews: { id: string; round: string; startsAt: string; status: string; recommendation?: string; technicalScore?: number; communicationScore?: number }[] }[] }) {
  if (!items?.length) return null;
  return <div>
    <h3 className="font-semibold text-[#142b4d]">Placement application history</h3>
    <p className="text-xs text-slate-500">Applications on drives assigned to you.</p>
    <ol className="mt-2 space-y-2">{items.map((item) => <li key={item.applicationId} className="rounded-xl border border-slate-100 p-3">
      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-medium text-[#142b4d]">{item.companyName}</p><p className="truncate text-xs text-slate-500">{item.roleTitle} · applied {new Date(item.appliedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>{item.status && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone[item.status] ?? 'bg-slate-100'}`}>{statusLabel(item.status)}</span>}</div>
      {item.interviews.length > 0 && <ul className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-xs text-slate-600">{item.interviews.map((interview) => <li key={interview.id} className="flex flex-wrap justify-between gap-2"><span>{interview.round} · {new Date(interview.startsAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span><span className="text-slate-500">{interview.status === 'COMPLETED' ? `Tech ${interview.technicalScore ?? '—'}/5 · Comm ${interview.communicationScore ?? '—'}/5 · ${interview.recommendation?.replaceAll('_', ' ').toLowerCase() ?? 'no recommendation'}` : interview.status.toLowerCase()}</span></li>)}</ul>}
    </li>)}</ol>
  </div>;
}

function TableSkeleton() {
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-busy="true" aria-label="Loading candidates">{[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="mb-3 h-11 animate-pulse rounded-lg bg-slate-100 last:mb-0" />)}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block min-w-0 text-xs font-semibold text-slate-600">{label}<span className="mt-1.5 block">{children}</span></label>;
}

function PageTitle({ title, description }: { title: string; description: string }) {
  return <div><h1 className="text-2xl font-bold text-[#142b4d] sm:text-3xl">{title}</h1><p className="mt-1 text-sm text-slate-600">{description}</p></div>;
}
