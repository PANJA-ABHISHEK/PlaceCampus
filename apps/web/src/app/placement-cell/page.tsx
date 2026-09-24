'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Users, CheckCircle, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { officerApi } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

export default function PlacementOfficerDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['officerDrivesStats'],
    queryFn: () => officerApi.getDrives(),
  });

  const totalDrives = data?.total || 0;
  const activeDrives = data?.drives?.filter((d) => d.status === 'PUBLISHED' || d.status === 'REGISTRATION_OPEN').length || 0;

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-[#5B2A86]">Dashboard</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-[#5B2A86]/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Drives</CardTitle>
            <Briefcase className="h-4 w-4 text-[#5B2A86]" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{totalDrives}</div>}
          </CardContent>
        </Card>
        
        <Card className="border-[#5B2A86]/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Drives</CardTitle>
            <Clock className="h-4 w-4 text-[#F58220]" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{activeDrives}</div>}
          </CardContent>
        </Card>

        <Card className="border-[#5B2A86]/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Applications coming soon</p>
          </CardContent>
        </Card>

        <Card className="border-[#5B2A86]/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected Students</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Selection sync pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Add more widgets like Recent Drives, Pending Approvals here */}
    </div>
  );
}
