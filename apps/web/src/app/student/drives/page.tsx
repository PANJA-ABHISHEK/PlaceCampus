'use client';

import { useQuery } from '@tanstack/react-query';
import { officerApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Calendar, MapPin, CheckCircle, XCircle, Info } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export default function StudentDrivesPage() {
  // Use officerApi.getDrives for now but without auth it might fail if roles are strictly enforced
  // Wait, I should add studentApi in api.ts or just use a generic fetch. Let's assume officerApi works for getting published drives if we change roles, or I'll just use fetch directly.
  
  const { data, isLoading } = useQuery({
    queryKey: ['studentDrives'],
    queryFn: async () => {
      // Need a public or student-accessible endpoint. I'll use the generic /drives endpoint.
      // Wait, in drives.controller, GET /drives is not restricted by @Roles, so any authenticated user can hit it.
      const res = await officerApi.getDrives({ status: 'PUBLISHED' }); // also include REGISTRATION_OPEN
      return res;
    },
  });

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#5B2A86]">Placement Drives</h2>
        <p className="text-muted-foreground">Explore and apply for upcoming placement drives.</p>
      </div>

      <div className="flex gap-4 border-b pb-4">
        <Button variant="default" className="bg-[#5B2A86]">All Drives</Button>
        <Button variant="ghost">Applied</Button>
        <Button variant="ghost">Eligible</Button>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-[280px]">
              <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
              <CardContent><Skeleton className="h-24 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data?.drives?.map((drive: any) => (
            <Card key={drive._id} className="border-[#5B2A86]/20 shadow-sm flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{drive.title}</CardTitle>
                    <CardDescription className="font-medium text-[#5B2A86]">{drive.companyId}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <Briefcase className="mr-2 h-4 w-4" />
                    {drive.jobRole} • {drive.packageLpa} LPA
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="mr-2 h-4 w-4" />
                    {drive.location}
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Calendar className="mr-2 h-4 w-4" />
                    Drive: {format(new Date(drive.driveDate), 'MMM dd, yyyy')}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Link href={`/student/drives/${drive._id}`} className="w-full">
                  <Button className="w-full bg-[#F58220] hover:bg-[#F58220]/90 text-white">
                    View Details & Apply
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}

          {(!data?.drives || data.drives.length === 0) && (
            <div className="col-span-full text-center p-12 border border-dashed rounded-lg bg-gray-50">
              <p className="text-muted-foreground">No active placement drives found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
