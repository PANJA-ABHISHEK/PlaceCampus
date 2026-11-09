'use client';

import { useState } from 'react';
import { useRecruiterAccessGrants, useGrantRecruiterAccess, useRevokeRecruiterAccess, useExtendRecruiterAccess } from '../hooks/use-recruiter-access';
import { DriveCardTitle, driveCardClassName } from '@/features/drives/components/drive-admin-ui';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, ShieldCheck, UserCog, UsersRound } from 'lucide-react';
import { ApiError } from '@/lib/api-client';

const AVAILABLE_FIELDS = [
  { id: 'studentName', label: 'Student Name' },
  { id: 'department', label: 'Department' },
  { id: 'graduationYear', label: 'Graduation Year' },
  { id: 'cgpa', label: 'CGPA' },
  { id: 'skills', label: 'Skill Match' },
  { id: 'skillMatchCoverage', label: 'Skill Match Coverage' },
  { id: 'applicationStatus', label: 'Application Status' },
  { id: 'linkedinUrl', label: 'LinkedIn URL' },
  { id: 'githubUrl', label: 'GitHub URL' },
  { id: 'portfolioUrl', label: 'Portfolio URL' },
];

export function RecruiterAccessManager({ driveId, sectionId }: { driveId: string; sectionId?: string }) {
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
    } catch (error: unknown) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to grant access',
      );
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


  if (isLoading) {
    return (
      <section id={sectionId} aria-label="Recruiter access" className={cn(driveCardClassName, 'scroll-mt-24 p-5')}>
        <div className="h-10 w-48 animate-pulse rounded-xl bg-slate-100" />
        <div className="mt-4 h-11 animate-pulse rounded-xl bg-slate-100" />
        <div className="mt-3 h-20 animate-pulse rounded-xl bg-slate-50" />
      </section>
    );
  }

  const activeCount = grants?.filter((g) => g.status === 'ACTIVE').length ?? 0;

  return (
    <section id={sectionId} aria-labelledby="recruiter-access-title" className={cn(driveCardClassName, 'scroll-mt-24 p-5')}>
      <DriveCardTitle
        id="recruiter-access-title"
        icon={UsersRound}
        title="Recruiter Access"
        description={grants?.length ? `${activeCount} active of ${grants.length} grant${grants.length === 1 ? '' : 's'}` : 'Share candidate data with recruiters.'}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="mt-4 h-11 w-full rounded-xl border-[#FFB98A] bg-white font-semibold text-[#FF6500] hover:border-[#FF9A5C] hover:bg-[#FFF6F0] hover:text-[#E85C00]"
          >
            {grants?.length ? <UserCog className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {grants?.length ? 'Grant More Access' : 'Grant Access'}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-[#10264A]">Grant Recruiter Access</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="grant-recruiter-id" className="text-[#10264A]">Recruiter ID</Label>
              <Input
                id="grant-recruiter-id"
                value={recruiterId}
                onChange={(e) => setRecruiterId(e.target.value)}
                placeholder="Enter user ID of the recruiter"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grant-expiry" className="text-[#10264A]">Access Expiry</Label>
              <Input
                id="grant-expiry"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <fieldset className="space-y-2 pt-1">
              <legend className="text-sm font-medium text-[#10264A]">Released Fields</legend>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {AVAILABLE_FIELDS.map((field) => (
                  <label
                    key={field.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-sm transition-colors',
                      selectedFields.includes(field.id) ? 'border-[#FFC9A3] bg-[#FFF6F0] text-[#10264A]' : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.id)}
                      onChange={() => handleToggleField(field.id)}
                      className="rounded border-gray-300 accent-[#FF6500]"
                    />
                    <span>{field.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Button
              onClick={handleGrant}
              disabled={grantMutation.isPending}
              className="mt-2 h-11 w-full rounded-xl bg-[#FF6500] font-semibold text-white hover:bg-[#E85C00]"
            >
              {grantMutation.isPending ? 'Granting...' : 'Grant Access'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!grants || grants.length === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold text-[#10264A]">No recruiters yet</p>
          <p className="text-xs leading-5 text-slate-500">No recruiters have been granted access to this drive.</p>
        </div>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {grants.map((grant) => (
            <li key={grant.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEF2F8] text-xs font-bold text-[#10264A]" aria-hidden="true">
                    R
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#10264A]" title={grant.recruiterId}>
                      Recruiter <span className="font-mono text-xs font-medium text-slate-500">…{grant.recruiterId.slice(-6)}</span>
                    </p>
                    <p className="text-xs text-slate-500">Expires {new Date(grant.expiresAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <Badge variant={grant.status === 'ACTIVE' ? 'success' : grant.status === 'REVOKED' ? 'destructive' : 'secondary'}>
                  {grant.status}
                </Badge>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1">
                {grant.releasedFields.map((f) => (
                  <span key={f} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                    {AVAILABLE_FIELDS.find((af) => af.id === f)?.label || f}
                  </span>
                ))}
              </div>
              {grant.status === 'ACTIVE' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRevoke(grant.id)}
                  disabled={revokeMutation.isPending}
                  className="mt-3 h-8 w-full rounded-lg border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  Revoke access
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
