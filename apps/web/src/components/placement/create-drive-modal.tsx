'use client';

import { useState } from 'react';
import { useForm } from 'react-query-form'; // or react-hook-form?
import { useForm as useHookForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { officerApi } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface CreateDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateDriveModal({ isOpen, onClose, onSuccess }: CreateDriveModalProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useHookForm();
  
  const createDriveMutation = useMutation({
    mutationFn: (data: any) => officerApi.createDrive(data),
    onSuccess: () => {
      toast.success('Placement drive created successfully');
      reset();
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create drive');
    }
  });

  const onSubmit = (data: any) => {
    // Transform form data to match API schema
    const payload = {
      companyId: data.companyId,
      title: data.title,
      jobRole: data.jobRole,
      description: data.description,
      location: data.location,
      packageLpa: parseFloat(data.packageLpa),
      applicationDeadline: new Date(data.applicationDeadline).toISOString(),
      driveDate: new Date(data.driveDate).toISOString(),
      eligibilityCriteria: {
        minimumCgpa: parseFloat(data.minimumCgpa || '0'),
        maximumActiveBacklogs: parseInt(data.maximumActiveBacklogs || '0'),
        eligibleBranches: data.eligibleBranches ? data.eligibleBranches.split(',').map((s: string) => s.trim()) : [],
      }
    };
    
    createDriveMutation.mutate(payload);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Placement Drive</DialogTitle>
          <DialogDescription>
            Enter the details of the new placement drive. This will be visible to eligible students once published.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyId">Company Name</Label>
              <Input id="companyId" {...register('companyId', { required: true })} placeholder="e.g., Google" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Drive Title</Label>
              <Input id="title" {...register('title', { required: true })} placeholder="e.g., Software Engineer Intern" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jobRole">Job Role</Label>
              <Input id="jobRole" {...register('jobRole', { required: true })} placeholder="SDE-1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="packageLpa">Package (LPA)</Label>
              <Input id="packageLpa" type="number" step="0.1" {...register('packageLpa', { required: true })} placeholder="12.5" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" {...register('location', { required: true })} placeholder="e.g., Bangalore, Remote" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Job Description</Label>
            <Textarea id="description" {...register('description', { required: true })} placeholder="Detailed description of the role..." className="h-24" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="applicationDeadline">Application Deadline</Label>
              <Input id="applicationDeadline" type="date" {...register('applicationDeadline', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driveDate">Drive Date</Label>
              <Input id="driveDate" type="date" {...register('driveDate', { required: true })} />
            </div>
          </div>

          <div className="border-t pt-4 mt-4 space-y-4">
            <h3 className="font-semibold text-sm">Eligibility Criteria</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minimumCgpa">Minimum CGPA</Label>
                <Input id="minimumCgpa" type="number" step="0.1" {...register('minimumCgpa')} placeholder="7.5" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maximumActiveBacklogs">Max Active Backlogs</Label>
                <Input id="maximumActiveBacklogs" type="number" {...register('maximumActiveBacklogs')} placeholder="0" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="eligibleBranches">Eligible Branches (comma-separated)</Label>
              <Input id="eligibleBranches" {...register('eligibleBranches')} placeholder="CSE, ECE, IT" />
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-[#5B2A86] hover:bg-[#5B2A86]/90" disabled={createDriveMutation.isPending}>
              {createDriveMutation.isPending ? 'Creating...' : 'Create Drive'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
