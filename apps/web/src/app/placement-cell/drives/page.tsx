'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { officerApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Briefcase, Calendar, MapPin, ExternalLink } from 'lucide-react';
import { CreateDriveModal } from '@/components/placement/create-drive-modal';
import { format } from 'date-fns';

export default function DrivesPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['officerDrives'],
    queryFn: () => officerApi.getDrives(),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-500';
      case 'PUBLISHED': return 'bg-blue-500';
      case 'REGISTRATION_OPEN': return 'bg-green-500';
      case 'REGISTRATION_CLOSED': return 'bg-orange-500';
      case 'COMPLETED': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#5B2A86]">Placement Drives</h2>
          <p className="text-muted-foreground">Manage upcoming and active campus placement drives.</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="bg-[#F58220] hover:bg-[#F58220]/90">
          <Plus className="mr-2 h-4 w-4" /> Create Drive
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">Loading drives...</div>
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
                  <Badge className={getStatusColor(drive.status)}>{drive.status}</Badge>
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
                  <div className="flex items-center text-muted-foreground">
                    <Calendar className="mr-2 h-4 w-4" />
                    Deadline: {format(new Date(drive.applicationDeadline), 'MMM dd, yyyy')}
                  </div>
                </div>
                
                <div className="mt-6 flex gap-2">
                  <Button variant="outline" className="w-full">
                    View Details
                  </Button>
                  <Button variant="default" className="w-full bg-[#5B2A86] hover:bg-[#5B2A86]/90">
                    Candidates <ExternalLink className="ml-2 h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {(!data?.drives || data.drives.length === 0) && (
            <div className="col-span-full text-center p-8 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
              No placement drives found. Create your first drive to get started.
            </div>
          )}
        </div>
      )}

      <CreateDriveModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['officerDrives'] });
        }}
      />
    </div>
  );
}
