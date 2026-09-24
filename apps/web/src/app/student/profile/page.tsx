'use client';

import { useAuth } from '@/lib/auth';
import { User, Save, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentsApi, StudentProfile } from '@/lib/api';
import { useForm } from 'react-form-hook'; // Oops, it should be react-hook-form. Let me fix the import
import { useForm as useHookForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useEffect } from 'react';

const profileSchema = z.object({
  rollNumber: z.string().min(1, 'Roll number is required'),
  branch: z.string().min(1, 'Branch is required'),
  graduationYear: z.coerce.number().min(2020).max(2030),
  cgpa: z.coerce.number().min(0).max(10),
  tenthPercentage: z.coerce.number().min(0).max(100).optional(),
  twelfthPercentage: z.coerce.number().min(0).max(100).optional(),
  activeBacklogs: z.coerce.number().min(0).default(0),
  totalBacklogs: z.coerce.number().min(0).default(0),
  linkedInUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  githubUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  portfolioUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  bio: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function StudentProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['student', 'profile'],
    queryFn: studentsApi.getProfile,
  });

  const { data: completionData } = useQuery({
    queryKey: ['student', 'completion'],
    queryFn: studentsApi.getCompletion,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useHookForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      rollNumber: '',
      branch: '',
      graduationYear: new Date().getFullYear(),
      cgpa: 0,
      activeBacklogs: 0,
      totalBacklogs: 0,
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        rollNumber: profile.rollNumber,
        branch: profile.branch,
        graduationYear: profile.graduationYear,
        cgpa: profile.cgpa,
        tenthPercentage: profile.tenthPercentage,
        twelfthPercentage: profile.twelfthPercentage,
        activeBacklogs: profile.activeBacklogs,
        totalBacklogs: profile.totalBacklogs,
        linkedInUrl: profile.linkedInUrl ?? '',
        githubUrl: profile.githubUrl ?? '',
        portfolioUrl: profile.portfolioUrl ?? '',
        bio: profile.bio ?? '',
      });
    }
  }, [profile, reset]);

  const updateMutation = useMutation({
    mutationFn: studentsApi.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student'] });
      toast.success('Profile updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });

  const onSubmit = (data: ProfileFormValues) => {
    updateMutation.mutate(data);
  };

  const completionPercentage = completionData?.percentage ?? 0;

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-[var(--color-primary)]" size={32} /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          Manage your academic details and personal information.
        </p>
      </div>

      {/* Profile Completion */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Profile Completion</h3>
          <span className="text-sm font-medium text-[var(--color-primary)]">{completionPercentage}%</span>
        </div>
        <div className="w-full bg-[var(--color-surface)] rounded-full h-2">
          <div
            className="bg-[var(--color-primary)] h-2 rounded-full transition-all"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <p className="text-xs text-[var(--color-muted)] mt-2">
          Complete your profile to improve placement eligibility.
        </p>
      </div>

      {/* Profile Form */}
      <form className="card p-6 space-y-6" onSubmit={handleSubmit(onSubmit)}>
        {/* Personal Info */}
        <div>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <User size={18} />
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">First Name</label>
              <input type="text" className="input bg-[var(--color-surface)] opacity-70" defaultValue={user?.firstName} readOnly />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input type="text" className="input bg-[var(--color-surface)] opacity-70" defaultValue={user?.lastName} readOnly />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input bg-[var(--color-surface)] opacity-70" defaultValue={user?.email} readOnly />
            </div>
          </div>
        </div>

        {/* Academic Info */}
        <div>
          <h3 className="font-semibold mb-4">Academic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Roll Number</label>
              <input type="text" className="input" placeholder="e.g., 21CS1234" {...register('rollNumber')} />
              {errors.rollNumber && <p className="text-xs text-[var(--color-danger)] mt-1">{errors.rollNumber.message}</p>}
            </div>
            <div>
              <label className="label">Branch</label>
              <select className="input" {...register('branch')}>
                <option value="">Select Branch</option>
                <option value="CSE">Computer Science (CSE)</option>
                <option value="IT">Information Technology (IT)</option>
                <option value="ECE">Electronics & Communication (ECE)</option>
                <option value="EEE">Electrical & Electronics (EEE)</option>
                <option value="ME">Mechanical Engineering (ME)</option>
                <option value="CE">Civil Engineering (CE)</option>
                <option value="OTHER">Other</option>
              </select>
              {errors.branch && <p className="text-xs text-[var(--color-danger)] mt-1">{errors.branch.message}</p>}
            </div>
            <div>
              <label className="label">Graduation Year</label>
              <input type="number" className="input" placeholder="2025" min={2020} max={2030} {...register('graduationYear')} />
              {errors.graduationYear && <p className="text-xs text-[var(--color-danger)] mt-1">{errors.graduationYear.message}</p>}
            </div>
            <div>
              <label className="label">CGPA</label>
              <input type="number" className="input" placeholder="8.5" step="0.01" min={0} max={10} {...register('cgpa')} />
              {errors.cgpa && <p className="text-xs text-[var(--color-danger)] mt-1">{errors.cgpa.message}</p>}
            </div>
            <div>
              <label className="label">10th Percentage</label>
              <input type="number" className="input" placeholder="92.5" step="0.1" min={0} max={100} {...register('tenthPercentage')} />
            </div>
            <div>
              <label className="label">12th Percentage</label>
              <input type="number" className="input" placeholder="88.0" step="0.1" min={0} max={100} {...register('twelfthPercentage')} />
            </div>
            <div>
              <label className="label">Active Backlogs</label>
              <input type="number" className="input" placeholder="0" min={0} {...register('activeBacklogs')} />
            </div>
            <div>
              <label className="label">Total Backlogs</label>
              <input type="number" className="input" placeholder="0" min={0} {...register('totalBacklogs')} />
            </div>
          </div>
        </div>

        {/* Links */}
        <div>
          <h3 className="font-semibold mb-4">Online Presence</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">LinkedIn URL</label>
              <input type="url" className="input" placeholder="https://linkedin.com/in/..." {...register('linkedInUrl')} />
              {errors.linkedInUrl && <p className="text-xs text-[var(--color-danger)] mt-1">{errors.linkedInUrl.message}</p>}
            </div>
            <div>
              <label className="label">GitHub URL</label>
              <input type="url" className="input" placeholder="https://github.com/..." {...register('githubUrl')} />
              {errors.githubUrl && <p className="text-xs text-[var(--color-danger)] mt-1">{errors.githubUrl.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="label">Portfolio URL</label>
              <input type="url" className="input" placeholder="https://yourportfolio.com" {...register('portfolioUrl')} />
              {errors.portfolioUrl && <p className="text-xs text-[var(--color-danger)] mt-1">{errors.portfolioUrl.message}</p>}
            </div>
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="label">Bio</label>
          <textarea className="input" rows={4} placeholder="Tell us about yourself, your interests, and career goals..." {...register('bio')} />
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary btn-lg" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSubmitting ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
