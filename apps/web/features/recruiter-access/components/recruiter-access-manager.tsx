'use client';

import { useState } from 'react';
import { useRecruiterAccessGrants, useGrantRecruiterAccess, useRevokeRecruiterAccess, useExtendRecruiterAccess } from '../hooks/use-recruiter-access';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { AlertCircle, Plus } from 'lucide-react';

const AVAILABLE_FIELDS = [
  { id: 'studentName', label: 'Student Name' },
  { id: 'department', label: 'Department' },
  { id: 'graduationYear', label: 'Graduation Year' },
  { id: 'cgpa', label: 'CGPA' },
  { id: 'skills', label: 'Skill Match' },
  { id: 'readinessScore', label: 'Readiness Score' },
  { id: 'skillMatchCoverage', label: 'Skill Match Coverage' },
  { id: 'applicationStatus', label: 'Application Status' },
  { id: 'linkedinUrl', label: 'LinkedIn URL' },
  { id: 'portfolioUrl', label: 'Portfolio URL' },
];

export function RecruiterAccessManager({ driveId }: { driveId: string }) {
  const { data: grants, isLoading } = useRecruiterAccessGrants(driveId);
  const grantMutation = useGrantRecruiterAccess(driveId);
  const revokeMutation = useRevokeRecruiterAccess(driveId);
  const extendMutation = useExtendRecruiterAccess(driveId);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [recruiterId, setRecruiterId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>(['studentName', 'department', 'graduationYear', 'applicationStatus']);

  const handleToggleField = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) ? prev.filter(f => f !== fieldId) : [...prev, fieldId]
    );
  };

  const handleGrant = async () => {
    try {
      if (!recruiterId || !expiresAt || selectedFields.length === 0) {
        toast.error('Please fill all required fields');
        return;
      }
      
      await grantMutation.mutateAsync({
        recruiterId,
        expiresAt: new Date(expiresAt).toISOString(),
        releasedFields: selectedFields,
      });
      toast.success('Recruiter access granted successfully');
      setIsDialogOpen(false);
      setRecruiterId('');
      setExpiresAt('');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to grant access');
    }
  };

  const handleRevoke = async (grantId: string) => {
    if (confirm('Are you sure you want to revoke this access?')) {
      try {
        await revokeMutation.mutateAsync(grantId);
        toast.success('Access revoked');
      } catch {
        toast.error('Failed to revoke access');
      }
    }
  };

  if (isLoading) return <div className="animate-pulse">Loading access grants...</div>;

  return (
    <Card className="border border-orange-100 shadow-sm mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recruiter Access Management</CardTitle>
          <CardDescription>Grant and manage recruiter access to candidate data for this drive.</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> Grant Access
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Grant Recruiter Access</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Recruiter ID</Label>
                <Input 
                  value={recruiterId} 
                  onChange={e => setRecruiterId(e.target.value)} 
                  placeholder="Enter user ID of the recruiter"
                />
              </div>
              <div className="space-y-2">
                <Label>Access Expiry</Label>
                <Input 
                  type="date"
                  value={expiresAt}
                  onChange={e => setExpiresAt(e.target.value)}
                />
              </div>
              <div className="space-y-2 pt-2">
                <Label>Released Fields</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {AVAILABLE_FIELDS.map(field => (
                    <label key={field.id} className="flex items-center space-x-2 text-sm border p-2 rounded cursor-pointer hover:bg-gray-50">
                      <input 
                        type="checkbox"
                        checked={selectedFields.includes(field.id)}
                        onChange={() => handleToggleField(field.id)}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-600"
                      />
                      <span>{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Button onClick={handleGrant} disabled={grantMutation.isPending} className="w-full mt-4">
                {grantMutation.isPending ? 'Granting...' : 'Grant Access'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {!grants || grants.length === 0 ? (
          <div className="text-center p-6 bg-gray-50 rounded-lg text-muted-foreground border-2 border-dashed">
            No recruiters have been granted access to this drive.
          </div>
        ) : (
          <div className="space-y-4">
            {grants.map(grant => (
              <div key={grant.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-heading">{(grant.recruiterId as any)?.fullName || 'Recruiter'}</span>
                    <Badge variant={grant.status === 'ACTIVE' ? 'success' : grant.status === 'REVOKED' ? 'destructive' : 'secondary'}>
                      {grant.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Expires: {new Date(grant.expiresAt).toLocaleDateString()}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {grant.releasedFields.map(f => (
                      <span key={f} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {AVAILABLE_FIELDS.find(af => af.id === f)?.label || f}
                      </span>
                    ))}
                  </div>
                </div>
                {grant.status === 'ACTIVE' && (
                  <Button variant="outline" size="sm" onClick={() => handleRevoke(grant.id)} className="text-red-600 border-red-200 hover:bg-red-50">
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
