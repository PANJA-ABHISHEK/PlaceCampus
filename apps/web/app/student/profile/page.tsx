"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useStudentProfile,
  useUpdateStudentProfile,
} from "@/features/student/hooks/use-student-profile";
import { useAuth } from "@/features/auth/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2 } from "lucide-react";

const profileSchema = z.object({
  phone: z
    .string()
    .min(10, "Phone must be at least 10 digits")
    .max(15)
    .optional()
    .or(z.literal("")),
  bio: z.string().max(500).optional().or(z.literal("")),
  university: z.string().optional().or(z.literal("")),
  department: z.string().optional().or(z.literal("")),
  program: z.string().optional().or(z.literal("")),
  batch: z.string().optional().or(z.literal("")),
  graduationYear: z.coerce
    .number()
    .min(1900)
    .max(2100)
    .optional()
    .or(z.literal(0)),
  cgpa: z.coerce.number().min(0).max(10).optional().or(z.literal(0)),
  backlogs: z.coerce.number().min(0).optional().or(z.literal(0)),
  linkedinUrl: z
    .string()
    .url("Invalid LinkedIn URL")
    .optional()
    .or(z.literal("")),
  githubUrl: z.string().url("Invalid GitHub URL").optional().or(z.literal("")),
  portfolioUrl: z
    .string()
    .url("Invalid Portfolio URL")
    .optional()
    .or(z.literal("")),
});

type ProfileValues = z.infer<typeof profileSchema>;

export default function StudentProfilePage() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useStudentProfile();
  const updateMutation = useUpdateStudentProfile();

  const [successMsg, setSuccessMsg] = React.useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      phone: "",
      bio: "",
      university: "",
      department: "",
      program: "",
      batch: "",
      graduationYear: 0,
      cgpa: 0,
      backlogs: 0,
      linkedinUrl: "",
      githubUrl: "",
      portfolioUrl: "",
    },
  });

  React.useEffect(() => {
    if (profile) {
      reset({
        phone: profile.phone || "",
        bio: profile.bio || "",
        university: profile.university || "",
        department: profile.department || "",
        program: profile.program || "",
        batch: profile.batch || "",
        graduationYear: profile.graduationYear || 0,
        cgpa: profile.cgpa || 0,
        backlogs: profile.backlogs || 0,
        linkedinUrl: profile.linkedinUrl || "",
        githubUrl: profile.githubUrl || "",
        portfolioUrl: profile.portfolioUrl || "",
      });
    }
  }, [profile, reset]);

  const onSubmit = async (data: ProfileValues) => {
    setSuccessMsg("");
    try {
      // Clean up empty zeros from coerce
      const payload = {
        ...data,
        graduationYear:
          data.graduationYear === 0 ? undefined : data.graduationYear,
        cgpa: data.cgpa === 0 ? undefined : data.cgpa,
        backlogs: data.backlogs === 0 ? undefined : data.backlogs,
      };

      await updateMutation.mutateAsync(payload);
      setSuccessMsg("Profile updated successfully");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-heading">
          Student Profile
        </h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          Manage your personal, academic, and professional information.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[hsl(var(--border))] overflow-hidden shadow-sm">
        {/* Profile Header (Read Only from User model) */}
        <div className="bg-[hsl(var(--primary)/0.05)] px-8 py-8 border-b border-[hsl(var(--border))] flex items-center gap-6">
          <div className="h-20 w-20 rounded-full bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] flex items-center justify-center text-2xl font-bold border-2 border-white shadow-sm">
            {user?.fullName
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase() || "ST"}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-heading">
              {user?.fullName}
            </h2>
            <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] mt-1">
              <span>{user?.email}</span>
              <span>•</span>
              <span className="capitalize">{user?.role}</span>
            </div>
          </div>
        </div>

        <div className="p-8">
          {successMsg && (
            <div className="mb-6 flex items-center gap-2 p-3 text-sm rounded bg-green-50 text-green-700 border border-green-200">
              <CheckCircle2 className="h-4 w-4" />
              {successMsg}
            </div>
          )}

          {updateMutation.isError && (
            <div className="mb-6 p-3 text-sm rounded bg-red-50 text-red-700 border border-red-200">
              Failed to update profile. Please check your inputs.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-heading border-b border-[hsl(var(--border))] pb-2">
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input placeholder="+1234567890" {...register("phone")} />
                  {errors.phone && (
                    <p className="text-xs text-destructive">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Bio / About Me</Label>
                  <Textarea
                    placeholder="Tell us a little about yourself..."
                    className="resize-none h-24"
                    {...register("bio")}
                  />
                  {errors.bio && (
                    <p className="text-xs text-destructive">
                      {errors.bio.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-heading border-b border-[hsl(var(--border))] pb-2">
                Academic Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>University / College</Label>
                  <Input
                    placeholder="E.g. Technical University"
                    {...register("university")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input
                    placeholder="E.g. Computer Science"
                    {...register("department")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Program</Label>
                  <Input placeholder="E.g. B.Tech" {...register("program")} />
                </div>
                <div className="space-y-2">
                  <Label>Batch</Label>
                  <Input placeholder="E.g. 2021-2025" {...register("batch")} />
                </div>
                <div className="space-y-2">
                  <Label>Graduation Year</Label>
                  <Input
                    type="number"
                    placeholder="2025"
                    {...register("graduationYear")}
                  />
                  {errors.graduationYear && (
                    <p className="text-xs text-destructive">
                      {errors.graduationYear.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>CGPA (0-10)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="8.5"
                    {...register("cgpa")}
                  />
                  {errors.cgpa && (
                    <p className="text-xs text-destructive">
                      {errors.cgpa.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Active Backlogs</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    {...register("backlogs")}
                  />
                  {errors.backlogs && (
                    <p className="text-xs text-destructive">
                      {errors.backlogs.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-heading border-b border-[hsl(var(--border))] pb-2">
                Links & Social
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>LinkedIn URL</Label>
                  <Input
                    type="url"
                    placeholder="https://linkedin.com/in/username"
                    {...register("linkedinUrl")}
                  />
                  {errors.linkedinUrl && (
                    <p className="text-xs text-destructive">
                      {errors.linkedinUrl.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>GitHub URL</Label>
                  <Input
                    type="url"
                    placeholder="https://github.com/username"
                    {...register("githubUrl")}
                  />
                  {errors.githubUrl && (
                    <p className="text-xs text-destructive">
                      {errors.githubUrl.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Portfolio URL</Label>
                  <Input
                    type="url"
                    placeholder="https://yourportfolio.com"
                    {...register("portfolioUrl")}
                  />
                  {errors.portfolioUrl && (
                    <p className="text-xs text-destructive">
                      {errors.portfolioUrl.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Resume Placeholder */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-heading border-b border-[hsl(var(--border))] pb-2">
                Resume
              </h3>
              <div className="p-4 rounded-lg border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] text-center">
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Secure resume upload and AI parsing will be available in the
                  next phase.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 opacity-50 cursor-not-allowed"
                >
                  Upload Resume (Coming Soon)
                </Button>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end border-t border-[hsl(var(--border))]">
              <Button
                type="submit"
                disabled={isSubmitting || !isDirty}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
