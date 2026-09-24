'use client';

import { useQuery } from '@tanstack/react-query';
import { officerApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, FileText, Filter } from 'lucide-react';
import { format } from 'date-fns';

export default function CandidatesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['officerApplications'],
    queryFn: () => officerApi.getApplications(),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPLIED': return <Badge className="bg-blue-500">Applied</Badge>;
      case 'SHORTLISTED': return <Badge className="bg-purple-500">Shortlisted</Badge>;
      case 'INTERVIEW_SCHEDULED': return <Badge className="bg-orange-500">Interview</Badge>;
      case 'SELECTED': return <Badge className="bg-green-500">Selected</Badge>;
      case 'REJECTED': return <Badge className="bg-red-500">Rejected</Badge>;
      case 'WITHDRAWN': return <Badge className="bg-gray-500">Withdrawn</Badge>;
      default: return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#5B2A86]">Candidate Applications</h2>
          <p className="text-muted-foreground">Review and manage student applications for placement drives.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" /> Filter
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <Card className="border-[#5B2A86]/20 shadow-sm">
        <CardHeader>
          <CardTitle>All Applications</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-4 text-center">Loading applications...</div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-4 py-3 font-medium">Student Name</th>
                    <th className="px-4 py-3 font-medium">Roll No.</th>
                    <th className="px-4 py-3 font-medium">Branch</th>
                    <th className="px-4 py-3 font-medium">Drive (Company)</th>
                    <th className="px-4 py-3 font-medium">Applied On</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data?.applications?.map((app: any) => (
                    <tr key={app._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{app.studentId?.firstName} {app.studentId?.lastName}</td>
                      <td className="px-4 py-3">{app.studentId?.rollNumber || 'N/A'}</td>
                      <td className="px-4 py-3">{app.studentId?.branch || 'N/A'}</td>
                      <td className="px-4 py-3">
                        {app.driveId?.companyId} - {app.driveId?.jobRole}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(new Date(app.createdAt), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(app.status)}
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" className="h-8 text-[#5B2A86]">
                          <FileText className="mr-2 h-4 w-4" /> View Profile
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {(!data?.applications || data.applications.length === 0) && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No applications found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
