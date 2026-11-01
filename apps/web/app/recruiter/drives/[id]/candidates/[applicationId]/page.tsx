'use client';

import { useParams, useRouter } from 'next/navigation';
import { useRecruiterCandidate } from '@/features/recruiter/hooks/use-recruiter-portal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { ArrowLeft, User, GraduationCap, Briefcase, ExternalLink, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function RecruiterCandidateDetailPage() {
  const { id, applicationId } = useParams() as { id: string; applicationId: string };
  const router = useRouter();

  const { data: candidate, isLoading, error, refetch } = useRecruiterCandidate(id, applicationId);

  if (isLoading) return <LoadingState text="Loading candidate details..." />;
  if (error || !candidate) return <ErrorState title="Access Denied" description="Cannot access candidate profile." onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.push(`/recruiter/drives/${id}/candidates`)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Candidates
      </Button>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Column: Basic Info */}
        <div className="w-full md:w-1/3 space-y-6">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto bg-orange-100 p-4 rounded-full w-24 h-24 flex items-center justify-center mb-4 text-orange-600">
                <User size={48} />
              </div>
              <CardTitle className="text-2xl">{candidate.studentName || 'Confidential Candidate'}</CardTitle>
              {candidate.department && (
                <CardDescription className="text-lg">{candidate.department}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-navy-600 flex items-center"><GraduationCap className="w-4 h-4 mr-2" /> Batch</span>
                <span className="font-medium">{candidate.graduationYear || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-navy-600 flex items-center"><Briefcase className="w-4 h-4 mr-2" /> CGPA</span>
                <span className="font-medium">{candidate.cgpa || 'N/A'}</span>
              </div>
              
              {(candidate.linkedinUrl || candidate.portfolioUrl) && (
                <div className="pt-4 space-y-3">
                  <h4 className="text-sm font-semibold text-navy-500 uppercase tracking-wider">Links</h4>
                  <div className="flex flex-col gap-2">
                    {candidate.linkedinUrl && (
                      <Link href={candidate.linkedinUrl} target="_blank" className="flex items-center text-orange-600 hover:underline">
                        <ExternalLink className="w-4 h-4 mr-2" /> LinkedIn Profile
                      </Link>
                    )}
                    {candidate.portfolioUrl && (
                      <Link href={candidate.portfolioUrl} target="_blank" className="flex items-center text-orange-600 hover:underline">
                        <ExternalLink className="w-4 h-4 mr-2" /> Portfolio
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4 flex items-center text-orange-800 text-sm">
              <Calendar className="w-4 h-4 mr-2 shrink-0" />
              <span>Access to this candidate's data expires on {new Date(candidate.expiresAt).toLocaleDateString()}</span>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Detailed Insights */}
        <div className="w-full md:w-2/3 space-y-6">
          {candidate.readinessScore !== undefined && (
            <Card>
              <CardHeader>
                <CardTitle>Overall Readiness</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold text-orange-600">
                    {Math.round(candidate.readinessScore)}<span className="text-xl text-navy-400">/100</span>
                  </div>
                  <div>
                    <Badge variant={candidate.readinessScore > 75 ? 'success' : 'secondary'}>
                      {candidate.readinessScore > 75 ? 'Highly Ready' : 'Developing'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
                  {candidate.skills.map((skill: any) => (
                    <div key={skill.skillId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <span className="font-medium text-navy-900">{skill.skillName}</span>
                        <p className="text-sm text-navy-600">
                          {skill.status === 'SATISFIED' ? 'Satisfied' : skill.status === 'GAP' ? 'Gap Identified' : 'Missing'}
                        </p>
                      </div>
                      <Badge variant={skill.status === 'SATISFIED' ? 'success' : 'destructive'}>
                        {skill.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
