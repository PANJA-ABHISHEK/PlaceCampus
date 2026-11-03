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
import type { FormEvent } from 'react';

interface RecruiterCandidate {
  id: string;
  studentName?: string;
  department?: string;
  cgpa?: number;
  applicationStatus?: string;
}

export default function RecruiterCandidatesPage() {
  const { id } = useParams() as { id: string };
  const searchParams = useSearchParams();
  const router = useRouter();

  const page = Number(searchParams.get('page')) || 1;
  const status = searchParams.get('status') || '';
  const query = searchParams.get('q') || '';

  const { data, isLoading, error, refetch } = useRecruiterCandidates(
    id,
    page,
    10,
    status,
    query,
  );

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextQuery = String(formData.get('q') || '').trim();
    const nextStatus = String(formData.get('status') || '');
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    if (nextQuery) params.set('q', nextQuery);
    else params.delete('q');
    if (nextStatus) params.set('status', nextStatus);
    else params.delete('status');
    router.push(`/recruiter/drives/${id}/candidates?${params.toString()}`);
  };

  const searchForm = (
    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
      <input
        aria-label="Search candidate names"
        name="q"
        type="search"
        defaultValue={query}
        placeholder="Search candidate names"
        className="h-10 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm"
      />
      <select
        aria-label="Filter application status"
        name="status"
        defaultValue={status}
        className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
      >
        <option value="">All statuses</option>
        <option value="APPLIED">Applied</option>
        <option value="UNDER_REVIEW">Under review</option>
        <option value="SHORTLISTED">Shortlisted</option>
        <option value="REJECTED">Rejected</option>
      </select>
      <Button type="submit">Search</Button>
    </form>
  );

  if (isLoading) return <LoadingState text="Loading candidates..." />;
  if (error) return <ErrorState title="Access Denied" description="You do not have access to this drive or it has expired." onRetry={refetch} />;

  if (!data || data.candidates.length === 0) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/recruiter/drives')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Drives
        </Button>
        {searchForm}
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

      {searchForm}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                {data.candidates[0]?.department && <TableHead>Department</TableHead>}
                {data.candidates[0]?.cgpa !== undefined && <TableHead>CGPA</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.candidates.map((c: RecruiterCandidate) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    {c.studentName || 'Confidential Candidate'}
                  </TableCell>
                  {c.department && <TableCell>{c.department}</TableCell>}
                  {c.cgpa !== undefined && <TableCell>{c.cgpa}</TableCell>}
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
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set('page', String(page - 1));
              router.push(`?${params.toString()}`);
            }}
          >
            <ChevronLeft className="h-4 w-4 mr-2" /> Previous
          </Button>
          <span className="text-sm text-navy-600">
            Page {page} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page === data.totalPages}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set('page', String(page + 1));
              router.push(`?${params.toString()}`);
            }}
          >
            Next <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
