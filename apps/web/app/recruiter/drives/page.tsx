'use client';

import { useRecruiterDrives } from '@/features/recruiter/hooks/use-recruiter-portal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { Calendar, Building, MapPin, Briefcase } from 'lucide-react';
import Link from 'next/link';

export default function RecruiterDrivesPage() {
  const { data: drives, isLoading, error, refetch } = useRecruiterDrives();

  if (isLoading) return <LoadingState text="Loading authorized drives..." />;
  if (error) return <ErrorState title="Failed to load drives" description="Unable to fetch authorized drives" onRetry={refetch} />;

  if (!drives || drives.length === 0) {
    return (
      <EmptyState
        title="No active drives"
        description="You have not been granted access to any active placement drives at this time."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-navy-900 dark:text-navy-50">Authorized Drives</h1>
        <p className="text-navy-600 dark:text-navy-300 mt-2">
          View candidates for drives where you have active access.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {drives.map((grant) => (
          <Card key={grant.grantId} className="flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <Badge variant={grant.drive.status === 'PUBLISHED' ? 'success' : 'secondary'}>
                  {grant.drive.status}
                </Badge>
              </div>
              <CardTitle className="text-xl">{grant.drive.companyName}</CardTitle>
              <CardDescription className="text-base text-navy-900 font-medium">{grant.drive.roleTitle}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div className="space-y-2 text-sm text-navy-600">
                {grant.drive.location && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{grant.drive.location}</span>
                  </div>
                )}
                {grant.drive.workMode && (
                  <div className="flex items-center">
                    <Briefcase className="h-4 w-4 mr-2" />
                    <span>{grant.drive.workMode}</span>
                  </div>
                )}
                <div className="flex items-center text-orange-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Access expires: {new Date(grant.expiresAt).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Link href={`/recruiter/drives/${grant.drive.id}/candidates`} className="w-full">
                <Button className="w-full">View Candidates</Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
