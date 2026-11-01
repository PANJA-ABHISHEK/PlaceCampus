'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useRecruiterCandidates } from '@/features/recruiter/hooks/use-recruiter-portal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

export default function RecruiterCandidatesPage() {
  const { id } = useParams() as { id: string };
  const searchParams = useSearchParams();
  const router = useRouter();

  const page = Number(searchParams.get('page')) || 1;
  const status = searchParams.get('status') || '';
  
  const { data, isLoading, error, refetch } = useRecruiterCandidates(id, page, 10, status);

  if (isLoading) return <LoadingState text="Loading candidates..." />;
  if (error) return <ErrorState title="Access Denied" description="You do not have access to this drive or it has expired." onRetry={refetch} />;

  if (!data || data.candidates.length === 0) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/recruiter/drives')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Drives
        </Button>
        <EmptyState
          title="No candidates found"
          description="There are no applicants matching the current criteria."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.push('/recruiter/drives')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Drives
      </Button>

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-navy-900 dark:text-navy-50">Registered Candidates</h1>
        <p className="text-navy-600 dark:text-navy-300 mt-2">
          Review candidates who have applied to this drive.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                {data.candidates[0]?.department && <TableHead>Department</TableHead>}
                {data.candidates[0]?.cgpa !== undefined && <TableHead>CGPA</TableHead>}
                {data.candidates[0]?.readinessScore !== undefined && <TableHead>Readiness</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.candidates.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    {c.studentName || 'Confidential Candidate'}
                  </TableCell>
                  {c.department && <TableCell>{c.department}</TableCell>}
                  {c.cgpa !== undefined && <TableCell>{c.cgpa}</TableCell>}
                  {c.readinessScore !== undefined && (
                    <TableCell>{Math.round(c.readinessScore)}/100</TableCell>
                  )}
                  <TableCell>
                    <Badge variant="outline">{c.applicationStatus || 'UNKNOWN'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(`/recruiter/drives/${id}/candidates/${c.id}`)}
                    >
                      View Profile
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => router.push(`?page=${page - 1}`)}
          >
            <ChevronLeft className="h-4 w-4 mr-2" /> Previous
          </Button>
          <span className="text-sm text-navy-600">
            Page {page} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page === data.totalPages}
            onClick={() => router.push(`?page=${page + 1}`)}
          >
            Next <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
