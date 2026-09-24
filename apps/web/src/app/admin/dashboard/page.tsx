'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Briefcase, FileText, TrendingUp, Activity, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['adminPlatformStats'],
    queryFn: () => analyticsApi.getPlatformStats(),
  });

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6">
        <h2 className="text-3xl font-bold tracking-tight">Platform Analytics</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#5B2A86]">Platform Analytics</h2>
          <p className="text-muted-foreground">High-level overview of PlaceCampus activity.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-[#5B2A86]/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-[#F58220]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalStudents?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>

        <Card className="border-[#5B2A86]/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Drives</CardTitle>
            <Briefcase className="h-4 w-4 text-[#5B2A86]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeDrives}</div>
            <p className="text-xs text-muted-foreground">Across {stats?.topCompanies?.length || 5} companies</p>
          </CardContent>
        </Card>

        <Card className="border-[#5B2A86]/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <FileText className="h-4 w-4 text-[#F58220]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.applicationsSubmitted?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+24% from last drive</p>
          </CardContent>
        </Card>

        <Card className="border-[#5B2A86]/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Placement Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.placementRate}%</div>
            <p className="text-xs text-muted-foreground">+4% from last year</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-[#5B2A86]/20 shadow-sm">
          <CardHeader>
            <CardTitle>Top Recruiting Companies</CardTitle>
            <CardDescription>Companies with the most active drives or hires.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats?.topCompanies?.map((company: string, i: number) => (
                <div key={i} className="px-4 py-2 bg-gray-100 rounded-md font-medium text-gray-700">
                  {company}
                </div>
              ))}
            </div>
            <div className="h-[200px] mt-6 flex items-center justify-center border border-dashed rounded-lg bg-gray-50 text-muted-foreground">
              [Chart Component Placeholder]
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 border-[#5B2A86]/20 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center"><Activity className="mr-2 h-5 w-5" /> Recent Activity</CardTitle>
            <CardDescription>Latest events across the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {stats?.recentActivity?.map((activity: any, i: number) => (
                <div key={i} className="flex items-start">
                  <div className="mr-4 mt-0.5 rounded-full p-1.5 bg-[#5B2A86]/10 text-[#5B2A86]">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-none">{activity.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(activity.time), 'MMM dd, hh:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
