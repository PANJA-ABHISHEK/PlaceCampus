'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CalendarCheck, CalendarDays, GraduationCap, MapPin, Star, UsersRound, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ErrorState } from '@/components/ui/error-state';
import { RecruiterCandidateDirectory } from '@/features/recruiter/components/recruiter-candidate-directory';
import { useRecruiterDrive } from '@/features/recruiter/hooks/use-recruiter-portal';

const lifecycleLabel = { ACTIVE: 'Active', UPCOMING: 'Upcoming', COMPLETED: 'Completed', EXPIRED: 'Expired', CANCELLED: 'Cancelled' } as const;
const dateLabel = (date?: string) => date ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not announced';

export default function RecruiterDriveCandidatesPage() {
  const { id } = useParams() as { id: string };
  const driveQuery = useRecruiterDrive(id);
  const grant = driveQuery.data;
  const drive = grant?.drive;
  const counts = grant?.statusCounts;

  if (driveQuery.isError) return <ErrorState title="Drive unavailable" description="You may not have active access to this drive." onRetry={() => void driveQuery.refetch()} />;

  return <div className="mx-auto max-w-[1440px] space-y-5">
    <Link href="/recruiter/drives" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-[#e9570c]"><ArrowLeft className="h-4 w-4" />Assigned drives</Link>
    {driveQuery.isLoading || !drive ? <div className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white" aria-busy="true" /> : <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {drive.companyLogo
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={drive.companyLogo} alt="" className="h-14 w-14 rounded-xl border border-orange-100 object-cover" />
          : <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-50 font-bold text-orange-800">{drive.companyName.slice(0, 2).toUpperCase()}</span>}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold text-[#142b4d]">{drive.roleTitle}</h1><Badge variant={grant.lifecycle === 'ACTIVE' ? 'success' : grant.lifecycle === 'EXPIRED' ? 'destructive' : 'secondary'}>{lifecycleLabel[grant.lifecycle]}</Badge></div>
          <p className="text-sm font-medium text-slate-600">{drive.companyName}{drive.companyIndustry ? ` · ${drive.companyIndustry}` : ''}</p>
          {drive.description && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{drive.description}</p>}
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" />{drive.package || 'CTC not specified'}{drive.employmentType ? ` · ${drive.employmentType}` : ''}</span>
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{[drive.location, drive.workMode].filter(Boolean).join(' · ') || 'Location not specified'}</span>
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Opens {dateLabel(drive.applicationStart)} · Deadline {dateLabel(drive.applicationDeadline)}</span>
            <span className="inline-flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" />{drive.requirements?.allowedDepartments?.length ? drive.requirements.allowedDepartments.join(', ') : 'All branches'}{drive.requirements?.minimumCGPA != null ? ` · Min CGPA ${drive.requirements.minimumCGPA}` : ''}{drive.requirements?.graduationYear ? ` · Batch ${drive.requirements.graduationYear}` : ''}</span>
          </div>
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
        <Stat icon={<UsersRound className="h-4 w-4" />} label="Applicants" value={grant.candidateCount} />
        <Stat icon={<Star className="h-4 w-4" />} label="Shortlisted or later" value={counts ? counts.shortlisted + counts.interviewScheduled + counts.offerReleased + counts.selected : 'Not shared'} />
        <Stat icon={<CalendarCheck className="h-4 w-4" />} label="Interviews" value={`${grant.interviewCounts.total} (${grant.interviewCounts.scheduled} upcoming)`} />
        <Stat icon={<Star className="h-4 w-4" />} label="Selected" value={counts ? counts.selected : 'Not shared'} />
      </dl>
    </section>}
    <RecruiterCandidateDirectory mode="all" lockedDriveId={id} />
  </div>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return <div><dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">{icon}{label}</dt><dd className="mt-1 text-lg font-bold tabular-nums text-[#142b4d]">{value}</dd></div>;
}
