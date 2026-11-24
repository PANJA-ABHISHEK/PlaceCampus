'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRecruiterCandidateProfile, useUpdateRecruiterApplication } from '@/features/recruiter/hooks/use-recruiter-portal';
import { ApplicationHistory, applicationStatuses, nextStages } from '@/features/recruiter/components/recruiter-candidate-directory';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { ArrowLeft, User, GraduationCap, Briefcase, ExternalLink, Calendar, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface CandidateSkill {
  skillId: string;
  skillName: string;
  status: string;
}

export default function RecruiterCandidateDetailPage() {
  const { id, applicationId } = useParams() as { id: string; applicationId: string };
  const router = useRouter();

  const { data: candidate, isLoading, error, refetch } = useRecruiterCandidateProfile(applicationId);
  const updateApplication = useUpdateRecruiterApplication();
  const stages = candidate?.canManageApplications ? nextStages[candidate.applicationStatus || ''] ?? [] : [];
  const label = (status: string) => applicationStatuses.find(([value]) => value === status)?.[1] ?? status;
  const moveStage = async (status: string) => {
    try { await updateApplication.mutateAsync({ driveId: id, applicationId, status }); toast.success(`Moved to ${label(status)}`); await refetch(); } catch { toast.error('Could not update this candidate stage'); }
  };
  const [recruiterNotes, setRecruiterNotes] = React.useState('');
  const [savingNote, setSavingNote] = React.useState(false);

  React.useEffect(() => setRecruiterNotes(candidate?.recruiterNotes ?? ''), [candidate?.recruiterNotes]);

  if (isLoading) return <LoadingState text="Loading candidate details..." />;
  if (error || !candidate || candidate.driveId !== id) return <ErrorState title="Access Denied" description="Cannot access candidate profile." onRetry={refetch} />;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Button variant="ghost" onClick={() => router.push(`/recruiter/drives/${id}/candidates`)} className="rounded-xl text-slate-600 hover:bg-white">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to candidates
      </Button>

      <header className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-700">Candidate profile</p><h1 className="mt-1 text-2xl font-bold text-[#142b4d]">{candidate.studentName || 'Confidential candidate'}</h1><p className="mt-1 text-sm text-slate-500">Application reference · {candidate.id}</p></div>
        {candidate.applicationStatus && <Badge variant="outline" className="w-fit rounded-full px-3 py-1 text-xs font-semibold">{candidate.applicationStatus.replaceAll('_', ' ')}</Badge>}
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
        {/* Left Column: Basic Info */}
        <div className="space-y-5">
          {candidate.projects?.length ? <Card><CardHeader><CardTitle>Projects</CardTitle></CardHeader><CardContent><ul className="list-inside list-disc space-y-2 text-sm text-slate-700">{candidate.projects.map((project) => <li key={project}>{project}</li>)}</ul></CardContent></Card> : null}
          {candidate.internshipExperience?.length ? <Card><CardHeader><CardTitle>Internship experience</CardTitle></CardHeader><CardContent><ul className="list-inside list-disc space-y-2 text-sm text-slate-700">{candidate.internshipExperience.map((item) => <li key={item}>{item}</li>)}</ul></CardContent></Card> : null}
          {candidate.resumeUrl && <Card><CardHeader><CardTitle>Resume</CardTitle><CardDescription>Resume reference shared for this assigned drive.</CardDescription></CardHeader><CardContent><Link href={candidate.resumeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center font-semibold text-orange-700 hover:underline"><ExternalLink className="mr-2 h-4 w-4" />Open resume</Link></CardContent></Card>}
          {stages.length > 0 && <Card><CardHeader><CardTitle>Recruitment stage</CardTitle><CardDescription>Move this demonstration application to its next stage.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2">{stages.map((stage) => <Button key={stage} variant={stage === 'REJECTED' ? 'outline' : 'default'} disabled={updateApplication.isPending} onClick={() => void moveStage(stage)}>{stage === 'REJECTED' ? 'Reject' : `Move to ${label(stage)}`}</Button>)}</CardContent></Card>}
          {candidate.canManageApplications && <Card><CardHeader><CardTitle>Recruiter notes</CardTitle><CardDescription>Private notes for this demonstration application.</CardDescription></CardHeader><CardContent className="space-y-3"><textarea value={recruiterNotes} onChange={(event) => setRecruiterNotes(event.target.value)} maxLength={2000} rows={4} aria-label="Recruiter notes" className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-orange-500" placeholder="Add candidate notes..." /><Button disabled={savingNote || recruiterNotes.length > 2000} onClick={async () => { setSavingNote(true); try { await apiClient.patch(`/recruiter/drives/${id}/candidates/${applicationId}`, { recruiterNotes }); toast.success('Recruiter note saved'); await refetch(); } catch { toast.error('Could not save recruiter note'); } finally { setSavingNote(false); } }}>{savingNote ? 'Saving...' : 'Save note'}</Button></CardContent></Card>}
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-700 ring-1 ring-orange-100">
                <User size={32} />
              </div>
              <CardTitle className="text-xl">{candidate.studentName || 'Confidential candidate'}</CardTitle>
              {candidate.department && <CardDescription>{candidate.department}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex items-center justify-between gap-4 border-t py-3 text-sm">
                <span className="flex items-center text-slate-500"><GraduationCap className="mr-2 h-4 w-4" /> Graduation year</span>
                <span className="font-medium text-[#142b4d]">{candidate.graduationYear ?? 'Not shared'}</span>
              </div>
              {candidate.registrationNumber && <div className="flex items-center justify-between gap-4 border-t py-3 text-sm"><span className="text-slate-500">Registration no.</span><span className="font-medium text-[#142b4d]">{candidate.registrationNumber}</span></div>}
              {candidate.studentEmail && <div className="flex items-center justify-between gap-4 border-t py-3 text-sm"><span className="text-slate-500">Email</span><a href={`mailto:${candidate.studentEmail}`} className="truncate font-medium text-orange-700 hover:underline">{candidate.studentEmail}</a></div>}
              <div className="flex items-center justify-between gap-4 border-t py-3 text-sm">
                <span className="flex items-center text-slate-500"><Briefcase className="mr-2 h-4 w-4" /> CGPA</span>
                <span className="font-medium text-[#142b4d]">{candidate.cgpa ?? 'Not shared'}</span>
              </div>
              
              {(candidate.linkedinUrl || candidate.githubUrl || candidate.portfolioUrl) && (
                <div className="pt-4 space-y-3">
                  <h4 className="text-sm font-semibold text-navy-500 uppercase tracking-wider">Links</h4>
                  <div className="flex flex-col gap-2">
                    {candidate.linkedinUrl && (
                      <Link href={candidate.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center text-orange-600 hover:underline">
                        <ExternalLink className="w-4 h-4 mr-2" /> LinkedIn Profile
                      </Link>
                    )}
                    {candidate.githubUrl && (
                      <Link href={candidate.githubUrl} target="_blank" rel="noreferrer" className="flex items-center text-orange-600 hover:underline">
                        <ExternalLink className="w-4 h-4 mr-2" /> GitHub Profile
                      </Link>
                    )}
                    {candidate.portfolioUrl && (
                      <Link href={candidate.portfolioUrl} target="_blank" rel="noreferrer" className="flex items-center text-orange-600 hover:underline">
                        <ExternalLink className="w-4 h-4 mr-2" /> Portfolio
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {candidate.expiresAt && (
            <Card className="bg-orange-50 border-orange-200">
            <CardContent className="flex items-center p-4 text-sm text-orange-800">
                <Calendar className="w-4 h-4 mr-2 shrink-0" />
                <span>
                  Access to this candidate&apos;s data expires on{" "}
                  {new Date(candidate.expiresAt).toLocaleDateString()}
                </span>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Detailed Insights */}
        <div className="space-y-5">
          {candidate.skills && candidate.skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Skill Match</CardTitle>
                <CardDescription>
                  {candidate.skillMatchCoverage !== undefined ? `Matches ${Math.round(candidate.skillMatchCoverage)}% of required skills.` : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {candidate.skills.map((skill: CandidateSkill) => (
                    <div key={skill.skillId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <span className="font-medium text-navy-900">{skill.skillName}</span>
                        <p className="text-sm text-navy-600">
                          {skill.status === 'SATISFIED' ? 'Satisfied' : skill.status === 'GAP' ? 'Gap identified' : skill.status.startsWith('OPTIONAL') ? 'Optional skill not verified' : 'Missing'}
                        </p>
                      </div>
                      <Badge variant={skill.status === 'SATISFIED' ? 'success' : skill.status.startsWith('OPTIONAL') ? 'secondary' : 'destructive'}>
                        {skill.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {candidate.applicationHistory?.length ? <Card><CardContent className="p-5 text-sm"><ApplicationHistory items={candidate.applicationHistory} /></CardContent></Card> : null}

          {!candidate.skills?.length && <Card><CardHeader><CardTitle>Skills</CardTitle><CardDescription>{candidate.releasedFields?.includes('skills') ? 'No matched skill data is recorded for this application.' : 'Skill match information has not been shared for this drive.'}</CardDescription></CardHeader></Card>}

          <Card className="border-slate-200 bg-slate-50/70 shadow-none">
            <CardContent className="flex items-start gap-3 p-4 text-sm text-slate-600"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><p>Profile details are limited to fields the placement team shared for this drive. Candidate access may expire on {candidate.expiresAt ? new Date(candidate.expiresAt).toLocaleDateString() : 'the date set by the placement team'}.</p></CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
