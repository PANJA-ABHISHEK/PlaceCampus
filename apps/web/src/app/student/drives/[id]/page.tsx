'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { officerApi, studentApplicationsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, MapPin, Briefcase, Calendar, Info, Building } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function DriveDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const driveId = params.id as string;
  const queryClient = useQueryClient();

  const { data: drive, isLoading: isDriveLoading } = useQuery({
    queryKey: ['drive', driveId],
    queryFn: () => officerApi.getDrive(driveId),
  });

  const { data: eligibility, isLoading: isEligibilityLoading } = useQuery({
    queryKey: ['driveEligibility', driveId],
    queryFn: () => studentApplicationsApi.checkEligibility(driveId),
  });

  const applyMutation = useMutation({
    mutationFn: () => studentApplicationsApi.applyForDrive(driveId),
    onSuccess: () => {
      toast.success('Successfully applied for the drive!');
      router.push('/student/drives');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to apply for drive');
    }
  });

  if (isDriveLoading) {
    return <div className="p-8">Loading drive details...</div>;
  }

  if (!drive) {
    return <div className="p-8">Drive not found.</div>;
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#5B2A86]">{drive.title}</h2>
          <div className="flex items-center text-muted-foreground mt-2">
            <Building className="mr-2 h-4 w-4" />
            <span className="font-medium text-lg">{drive.companyId}</span>
          </div>
        </div>
        <Badge className={drive.status === 'REGISTRATION_OPEN' ? 'bg-green-500 text-lg py-1 px-3' : 'bg-blue-500 text-lg py-1 px-3'}>
          {drive.status}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-[#5B2A86]/20 shadow-sm">
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{drive.description}</p>
            </CardContent>
          </Card>

          <Card className="border-[#5B2A86]/20 shadow-sm">
            <CardHeader>
              <CardTitle>Eligibility Criteria</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-700 list-disc pl-5">
                <li>Minimum CGPA: {drive.eligibilityCriteria?.minimumCgpa || 'N/A'}</li>
                <li>Maximum Active Backlogs: {drive.eligibilityCriteria?.maximumActiveBacklogs || 0}</li>
                <li>Eligible Branches: {drive.eligibilityCriteria?.eligibleBranches?.join(', ') || 'All Branches'}</li>
                {drive.eligibilityCriteria?.minimumTenthPercentage && (
                  <li>10th Percentage &gt;= {drive.eligibilityCriteria.minimumTenthPercentage}%</li>
                )}
                {drive.eligibilityCriteria?.minimumTwelfthPercentage && (
                  <li>12th Percentage &gt;= {drive.eligibilityCriteria.minimumTwelfthPercentage}%</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-[#5B2A86]/20 shadow-sm bg-gray-50">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center">
                <Briefcase className="mr-3 h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Role</p>
                  <p className="font-medium">{drive.jobRole}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Info className="mr-3 h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Package</p>
                  <p className="font-medium">{drive.packageLpa} LPA</p>
                </div>
              </div>
              <div className="flex items-center">
                <MapPin className="mr-3 h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-medium">{drive.location}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Calendar className="mr-3 h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Drive Date</p>
                  <p className="font-medium">{format(new Date(drive.driveDate), 'MMM dd, yyyy')}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Calendar className="mr-3 h-5 w-5 text-red-500" />
                <div>
                  <p className="text-xs text-muted-foreground text-red-500">Apply By</p>
                  <p className="font-medium text-red-600">{format(new Date(drive.applicationDeadline), 'MMM dd, yyyy')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#5B2A86]/20 shadow-sm border-l-4 border-l-[#F58220]">
            <CardHeader>
              <CardTitle className="text-lg">Application Status</CardTitle>
            </CardHeader>
            <CardContent>
              {isEligibilityLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : eligibility?.isEligible ? (
                <div className="space-y-4">
                  <div className="flex items-start text-green-600">
                    <CheckCircle className="mr-2 h-5 w-5 mt-0.5" />
                    <p className="text-sm font-medium">You meet all eligibility criteria for this drive.</p>
                  </div>
                  <Button 
                    className="w-full bg-[#5B2A86] hover:bg-[#5B2A86]/90" 
                    onClick={() => applyMutation.mutate()}
                    disabled={applyMutation.isPending || drive.status !== 'REGISTRATION_OPEN'}
                  >
                    {applyMutation.isPending ? 'Applying...' : 'Apply Now'}
                  </Button>
                  {drive.status !== 'REGISTRATION_OPEN' && (
                    <p className="text-xs text-center text-red-500 mt-2">Registration is not open.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start text-red-600">
                    <XCircle className="mr-2 h-5 w-5 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Not Eligible</p>
                      <ul className="text-xs mt-1 space-y-1 list-disc pl-4">
                        {eligibility?.reasons?.map((reason: string, i: number) => (
                          <li key={i}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <Button className="w-full" disabled variant="secondary">Cannot Apply</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
