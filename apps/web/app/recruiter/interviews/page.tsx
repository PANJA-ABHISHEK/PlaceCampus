'use client';

import * as React from 'react';
import { CalendarClock, CalendarDays, CheckCircle2, Clock3, ExternalLink, MessageSquareText, Plus, RefreshCw, UserRound, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useRecruiterCandidates, useRecruiterDrives } from '@/features/recruiter/hooks/use-recruiter-portal';
import { useCancelRecruiterInterview, useRecruiterInterviews, useRescheduleRecruiterInterview, useScheduleRecruiterInterview, useSubmitRecruiterInterviewFeedback } from '@/features/recruiter/hooks/use-recruiter-portal';
import type { RecruiterInterview } from '@/features/recruiter/hooks/use-recruiter-portal';
import { ApiError } from '@/lib/api-client';
import { toast } from 'sonner';

const panel = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5';
const localDateTime = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const dateTimeLabel = (value: string) => new Date(value).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function RecruiterInterviewsPage() {
  const drivesQuery = useRecruiterDrives();
  const interviewsQuery = useRecruiterInterviews();
  const schedule = useScheduleRecruiterInterview();
  const [driveId, setDriveId] = React.useState('');
  const [applicationId, setApplicationId] = React.useState('');
  const [startsAt, setStartsAt] = React.useState('');
  const [round, setRound] = React.useState('Technical');
  const [instructions, setInstructions] = React.useState('');
  const [meetingUrl, setMeetingUrl] = React.useState('');
  const [now, setNow] = React.useState(0);
  const candidatesQuery = useRecruiterCandidates(driveId, 1, 100);
  const drives = drivesQuery.data ?? [];
  const interviews = interviewsQuery.data ?? [];

  React.useEffect(() => { const timer = window.setTimeout(() => setNow(Date.now()), 0); return () => window.clearTimeout(timer); }, []);
  React.useEffect(() => { if (!drives.some((grant) => grant.drive.id === driveId)) setDriveId(drives[0]?.drive.id ?? ''); }, [drives, driveId]);

  const upcoming = interviews.filter((item) => item.status === 'SCHEDULED' && new Date(item.startsAt).getTime() >= now);
  const completed = interviews.filter((item) => item.status === 'COMPLETED');
  const pendingFeedback = interviews.filter((item) => item.status === 'SCHEDULED' && new Date(item.startsAt).getTime() < now);
  const cancelled = interviews.filter((item) => item.status === 'CANCELLED');

  const submitSchedule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!driveId || !applicationId || !startsAt) return;
    try {
      await schedule.mutateAsync({
        driveId,
        applicationId,
        startsAt: new Date(startsAt).toISOString(),
        round,
        instructions: instructions.trim() || undefined,
        meetingUrl: meetingUrl.trim() || undefined,
      });
      setApplicationId(''); setStartsAt(''); setInstructions(''); setMeetingUrl('');
      toast.success('Interview scheduled');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not schedule this interview');
    }
  };

  if (drivesQuery.isLoading || interviewsQuery.isLoading) return <LoadingState text="Loading interview management..." />;
  if (drivesQuery.isError) return <ErrorState title="Could not load assigned drives" description="Interview scheduling needs an active drive assignment." onRetry={() => void drivesQuery.refetch()} />;
  if (interviewsQuery.isError) return <ErrorState title="Could not load interviews" description="Your authorized interview schedule could not be retrieved." onRetry={() => void interviewsQuery.refetch()} />;

  return <div className="mx-auto max-w-[1440px] space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">Recruiter workspace</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-[#142b4d]">Interview management</h1><p className="mt-1 text-sm text-slate-600">Schedule candidate interviews, manage changes, and record structured feedback.</p></header>

    <section aria-label="Interview overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <CountCard label="Upcoming" count={upcoming.length} icon={<CalendarClock className="h-5 w-5" />} tone="orange" />
      <CountCard label="Completed" count={completed.length} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" />
      <CountCard label="Pending feedback" count={pendingFeedback.length} icon={<MessageSquareText className="h-5 w-5" />} tone="violet" />
      <CountCard label="Cancelled" count={cancelled.length} icon={<XCircle className="h-5 w-5" />} tone="slate" />
    </section>

    {drives.length === 0 ? <EmptyState icon={<CalendarDays className="h-8 w-8" />} title="No assigned drives" description="Interview management is available after a placement officer grants access to a drive." /> : <section className={panel}>
      <div className="mb-4 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-700"><Plus className="h-5 w-5" /></span><div><h2 className="font-semibold text-[#142b4d]">Schedule an interview</h2><p className="text-xs text-slate-500">Choose an applicant and an assigned drive.</p></div></div>
      <form onSubmit={submitSchedule} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <label className="text-xs font-semibold text-slate-600">Assigned drive<select value={driveId} onChange={(event) => { setDriveId(event.target.value); setApplicationId(''); }} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-[#142b4d] outline-none focus:border-[#ff6b1a]">{drives.map((grant) => <option key={grant.grantId} value={grant.drive.id}>{grant.drive.companyName} · {grant.drive.roleTitle}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-600">Candidate application<select required value={applicationId} onChange={(event) => setApplicationId(event.target.value)} disabled={candidatesQuery.isLoading || !candidatesQuery.data?.candidates.length} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-[#142b4d] outline-none focus:border-[#ff6b1a] disabled:bg-slate-50"><option value="">{candidatesQuery.isLoading ? 'Loading applicants…' : candidatesQuery.data?.candidates.length ? 'Select applicant' : 'No applications available'}</option>{candidatesQuery.data?.candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.studentName || `Application ${candidate.id.slice(-6)}`}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-600">Interview round<select value={round} onChange={(event) => setRound(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-[#142b4d] outline-none focus:border-[#ff6b1a]"><option>Screening</option><option>Technical</option><option>HR</option><option>Final</option><option>Other</option></select></label>
        <label className="text-xs font-semibold text-slate-600">Date and time<input required type="datetime-local" min={localDateTime(new Date(Date.now() + 5 * 60_000))} value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal text-[#142b4d] outline-none focus:border-[#ff6b1a]" /></label>
        <label className="text-xs font-semibold text-slate-600">Meeting link <span className="font-normal text-slate-400">(optional)</span><input type="url" value={meetingUrl} onChange={(event) => setMeetingUrl(event.target.value)} placeholder="https://…" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal text-[#142b4d] outline-none focus:border-[#ff6b1a]" /></label>
        <label className="text-xs font-semibold text-slate-600 sm:col-span-2 xl:col-span-1">Instructions<textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} maxLength={1000} rows={2} placeholder="Share interview instructions" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-[#142b4d] outline-none focus:border-[#ff6b1a]" /></label>
        <div className="sm:col-span-2 xl:col-span-3"><Button type="submit" disabled={schedule.isPending || !applicationId || !startsAt} className="h-10 rounded-xl bg-[#ff6b1a] px-4 text-white hover:bg-[#e95b0c]">{schedule.isPending ? 'Scheduling…' : 'Schedule interview'}</Button><p className="mt-2 text-xs text-slate-500">The assigned interviewer is you. Notifications go to the recruiter team; candidate email delivery is not configured.</p></div>
      </form>
      {candidatesQuery.isError && <p role="alert" className="mt-3 text-sm text-rose-700">Applicant choices could not be loaded for the selected drive.</p>}
    </section>}

    <section className={panel}>
      <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-semibold text-[#142b4d]">Interview schedule</h2><p className="mt-1 text-xs text-slate-500">Interviews appear only while you have active access to their drive.</p></div><button type="button" onClick={() => void interviewsQuery.refetch()} aria-label="Refresh interviews" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><RefreshCw className="h-4 w-4" /></button></div>
      {interviews.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center"><CalendarDays className="mx-auto h-8 w-8 text-slate-400" /><h3 className="mt-3 font-semibold text-[#142b4d]">No interviews scheduled</h3><p className="mt-1 text-sm text-slate-500">Schedule an interview above for a candidate from an assigned drive.</p></div> : <div className="space-y-3">{interviews.map((interview) => <InterviewItem key={interview.id} interview={interview} now={now} />)}</div>}
    </section>
  </div>;
}

function InterviewItem({ interview, now }: { interview: RecruiterInterview; now: number }) {
  const [rescheduleAt, setRescheduleAt] = React.useState('');
  const [cancelReason, setCancelReason] = React.useState('');
  const reschedule = useRescheduleRecruiterInterview();
  const cancel = useCancelRecruiterInterview();
  const feedback = useSubmitRecruiterInterviewFeedback();
  const past = new Date(interview.startsAt).getTime() < now;

  const rescheduleInterview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try { await reschedule.mutateAsync({ id: interview.id, startsAt: new Date(rescheduleAt).toISOString() }); setRescheduleAt(''); toast.success('Interview rescheduled'); }
    catch (error) { toast.error(error instanceof ApiError ? error.message : 'Could not reschedule interview'); }
  };

  const cancelInterview = async () => {
    if (!window.confirm('Cancel this interview?')) return;
    try { await cancel.mutateAsync({ id: interview.id, reason: cancelReason.trim() || undefined }); toast.success('Interview cancelled'); }
    catch (error) { toast.error(error instanceof ApiError ? error.message : 'Could not cancel interview'); }
  };

  return <article className="rounded-xl border border-slate-200 p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600"><UserRound className="h-5 w-5" /></span><div className="min-w-0"><h3 className="truncate font-semibold text-[#142b4d]">{interview.candidateName}</h3><p className="mt-0.5 text-sm text-slate-600">{interview.drive?.companyName || 'Assigned drive'} · {interview.drive?.roleTitle || 'Role'} · {interview.round}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" />{dateTimeLabel(interview.startsAt)}</p>{interview.instructions && <p className="mt-2 text-sm leading-5 text-slate-600">{interview.instructions}</p>}</div></div>
      <div className="flex shrink-0 flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${interview.status === 'SCHEDULED' ? 'bg-blue-50 text-blue-700' : interview.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{interview.status.toLowerCase()}</span>{interview.meetingUrl && <a href={interview.meetingUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-[#142b4d] hover:bg-slate-50">Join / view<ExternalLink className="h-3.5 w-3.5" /></a>}</div>
    </div>
    {interview.feedback && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">Recommendation: {interview.feedback.recommendation.replaceAll('_', ' ')} · feedback submitted</p>}
    {interview.status === 'SCHEDULED' && (interview.canManage || interview.canSubmitFeedback) && <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
      {interview.canManage && <><details className="group"><summary className="cursor-pointer list-none rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#142b4d]">Reschedule</summary><form onSubmit={rescheduleInterview} className="mt-2 flex flex-wrap gap-2 rounded-xl bg-slate-50 p-3"><input required type="datetime-local" min={localDateTime(new Date(Date.now() + 5 * 60_000))} value={rescheduleAt} onChange={(event) => setRescheduleAt(event.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-xs" /><Button size="sm" disabled={reschedule.isPending || !rescheduleAt} className="h-9 rounded-lg bg-[#ff6b1a] text-white">Save time</Button></form></details>
      <details><summary className="cursor-pointer list-none rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">Cancel</summary><div className="mt-2 flex flex-wrap gap-2 rounded-xl bg-rose-50/70 p-3"><input value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Optional reason" maxLength={500} className="h-9 rounded-lg border border-rose-100 px-2 text-xs" /><Button type="button" size="sm" variant="destructive" disabled={cancel.isPending} onClick={() => void cancelInterview()} className="h-9 rounded-lg">Confirm cancel</Button></div></details></>}
      {past && interview.canSubmitFeedback && <InterviewFeedbackForm interview={interview} feedback={feedback} />}
    </div>}
    {interview.status === 'COMPLETED' && interview.feedback && <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 text-xs sm:grid-cols-4">{[['Technical', interview.feedback.technicalKnowledge], ['Problem solving', interview.feedback.problemSolving], ['Communication', interview.feedback.communication], ['Project understanding', interview.feedback.projectUnderstanding]].map(([label, value]) => <p key={String(label)} className="rounded-lg bg-slate-50 px-3 py-2 text-slate-600">{label}: <b className="text-[#142b4d]">{value}/5</b></p>)}</div>}
  </article>;
}

function InterviewFeedbackForm({ interview, feedback }: { interview: RecruiterInterview; feedback: ReturnType<typeof useSubmitRecruiterInterviewFeedback> }) {
  const [scores, setScores] = React.useState({ technicalKnowledge: '', problemSolving: '', communication: '', projectUnderstanding: '' });
  const [comments, setComments] = React.useState('');
  const [recommendation, setRecommendation] = React.useState<'ADVANCE' | 'HOLD' | 'DO_NOT_ADVANCE' | ''>('');
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recommendation || Object.values(scores).some((score) => !score)) return;
    try { await feedback.mutateAsync({ id: interview.id, technicalKnowledge: Number(scores.technicalKnowledge), problemSolving: Number(scores.problemSolving), communication: Number(scores.communication), projectUnderstanding: Number(scores.projectUnderstanding), comments, recommendation }); toast.success('Interview feedback saved'); }
    catch (error) { toast.error(error instanceof ApiError ? error.message : 'Could not save feedback'); }
  };
  if (interview.feedback) return null;
  return <details className="group"><summary className="cursor-pointer list-none rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800">Submit feedback</summary><form onSubmit={submit} className="mt-2 grid gap-2 rounded-xl border border-orange-100 bg-orange-50/40 p-3 sm:grid-cols-2">{Object.entries(scores).map(([key, value]) => <label key={key} className="text-xs font-medium capitalize text-slate-600">{key.replace(/([A-Z])/g, ' $1')}<select required value={value} onChange={(event) => setScores((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm"><option value="">Rate 1–5</option>{[1, 2, 3, 4, 5].map((score) => <option key={score}>{score}</option>)}</select></label>)}<label className="text-xs font-medium text-slate-600 sm:col-span-2">Interviewer comments<textarea required maxLength={2000} value={comments} onChange={(event) => setComments(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label><label className="text-xs font-medium text-slate-600">Final recommendation<select required value={recommendation} onChange={(event) => setRecommendation(event.target.value as typeof recommendation)} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm"><option value="">Choose recommendation</option><option value="ADVANCE">Advance</option><option value="HOLD">Hold</option><option value="DO_NOT_ADVANCE">Do not advance</option></select></label><div className="flex items-end"><Button type="submit" disabled={feedback.isPending || !comments.trim() || !recommendation || Object.values(scores).some((score) => !score)} className="h-9 rounded-lg bg-[#ff6b1a] text-white">Save feedback</Button></div><p className="text-xs text-slate-500 sm:col-span-2">Feedback is an advisory record. It does not change the candidate&apos;s application status.</p></form></details>;
}

function CountCard({ label, count, icon, tone }: { label: string; count: number; icon: React.ReactNode; tone: 'orange' | 'green' | 'violet' | 'slate' }) {
  const styles = { orange: 'bg-orange-50 text-orange-700', green: 'bg-emerald-50 text-emerald-700', violet: 'bg-violet-50 text-violet-700', slate: 'bg-slate-100 text-slate-600' }[tone];
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles}`}>{icon}</span><span className="text-2xl font-bold tabular-nums text-[#142b4d]">{count}</span></div><p className="mt-3 text-sm font-semibold text-[#142b4d]">{label}</p></article>;
}
