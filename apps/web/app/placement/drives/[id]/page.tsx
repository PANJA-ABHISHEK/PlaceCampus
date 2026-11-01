"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  usePlacementDrive,
  usePublishDrive,
  useCloseDrive,
} from "@/features/drives/hooks/use-drives";
import {
  ArrowLeft,
  Building2,
  Calendar,
  MapPin,
  Briefcase,
  GraduationCap,
  CheckCircle,
  AlertTriangle,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DriveStatus } from "@placecampus/shared-types";
import { RecruiterAccessManager } from "@/features/recruiter-access/components/recruiter-access-manager";

export default function PlacementDriveDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { data: drive, isLoading } = usePlacementDrive(id);
  const publishMutation = usePublishDrive();
  const closeMutation = useCloseDrive();

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Loading drive details...
      </div>
    );
  }

  if (!drive) {
    return <div className="p-8 text-center text-red-500">Drive not found.</div>;
  }

  const handlePublish = async () => {
    if (
      confirm(
        "Are you sure you want to publish this drive? It will become visible to all students.",
      )
    ) {
      try {
        await publishMutation.mutateAsync(id);
        alert("Drive published successfully!");
      } catch (e: unknown) {
        const error = e as { response?: { data?: { message?: string } } };
        alert(
          error.response?.data?.message ||
            "Failed to publish drive. Ensure required fields are complete.",
        );
      }
    }
  };

  const handleClose = async () => {
    if (
      confirm(
        "Are you sure you want to close this drive? Students will no longer be able to apply.",
      )
    ) {
      try {
        await closeMutation.mutateAsync(id);
      } catch (e) {
        alert("Failed to close drive.");
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <Link
            href="/placement/drives"
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-heading mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Drives
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-heading">
              {drive.companyName}
            </h1>
            <span
              className={`text-xs px-3 py-1 rounded-full font-medium border ${
                drive.status === DriveStatus.PUBLISHED
                  ? "bg-green-50 text-green-700 border-green-200"
                  : drive.status === DriveStatus.DRAFT
                    ? "bg-orange-50 text-orange-700 border-orange-200"
                    : drive.status === DriveStatus.CLOSED
                      ? "bg-gray-50 text-gray-700 border-gray-200"
                      : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              {drive.status}
            </span>
          </div>
          <p className="text-lg text-muted-foreground mt-1">
            {drive.roleTitle}
          </p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          {drive.status === DriveStatus.DRAFT && (
            <>
              {/* For now we don't have an edit page, just a button placeholder or we could link to it if we built one */}
              <Button
                onClick={handlePublish}
                disabled={publishMutation.isPending}
                className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white"
              >
                {publishMutation.isPending ? "Publishing..." : "Publish Drive"}
              </Button>
            </>
          )}
          {drive.status === DriveStatus.PUBLISHED && (
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={closeMutation.isPending}
              className="w-full md:w-auto text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Close Drive
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-100">
            <h2 className="text-xl font-semibold text-heading mb-4">
              About the Role
            </h2>
            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-sm">
              {drive.description}
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-100">
            <h2 className="text-xl font-semibold text-heading mb-4">
              Eligibility Requirements
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                  Min CGPA
                </p>
                <p className="font-semibold text-heading">
                  {drive.requirements.minimumCGPA || "No minimum"}
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                  Max Backlogs
                </p>
                <p className="font-semibold text-heading">
                  {drive.requirements.maximumBacklogs ?? "No limit"}
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                  Batch / Year
                </p>
                <p className="font-semibold text-heading">
                  {drive.requirements.graduationYear || "Any"}
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                  Departments
                </p>
                <p className="font-semibold text-heading">
                  {drive.requirements.allowedDepartments?.length
                    ? drive.requirements.allowedDepartments.join(", ")
                    : "All"}
                </p>
              </div>
            </div>

            {drive.requirements.skills &&
              drive.requirements.skills.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-heading mb-3 border-b pb-2">
                    Skill Requirements
                  </p>
                  <div className="space-y-2">
                    {drive.requirements.skills.map((skill) => (
                      <div
                        key={skill.skillId}
                        className="flex justify-between items-center p-3 border rounded-md bg-white"
                      >
                        <div>
                          <p className="font-medium text-sm text-heading">
                            {skill.skillName || skill.skillId}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Minimum Level: {skill.minimumLevel}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded ${skill.isOptional ? "bg-gray-100 text-gray-600" : "bg-orange-100 text-orange-700 font-medium"}`}
                        >
                          {skill.isOptional ? "OPTIONAL" : "REQUIRED"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>

          {/* Placement Officer Matching Summary */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-100">
            <h2 className="text-xl font-semibold text-heading mb-4">
              Cohort Matching Overview
            </h2>
            <div className="p-8 border-2 border-dashed border-gray-200 rounded-xl text-center bg-gray-50">
              <h3 className="text-lg font-medium text-heading mb-2">
                Skill Supply Analytics
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Real-time gap analysis and candidate skill supply matching will
                be available in the next lifecycle update. This will allow you
                to see exactly how the student cohort matches against these
                specific requirements before opening applications.
              </p>
            </div>
          </div>
          
          <RecruiterAccessManager driveId={id} />
        </div>

        {/* Right Column: Meta Info */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-100">
            <h2 className="text-sm font-semibold text-heading uppercase mb-4 tracking-wider">
              Drive Details
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-orange-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-heading">Location</p>
                  <p className="text-sm text-muted-foreground">
                    {drive.location || "Not specified"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Briefcase className="w-5 h-5 text-orange-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-heading">Work Mode</p>
                  <p className="text-sm text-muted-foreground">
                    {drive.workMode || "Not specified"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Coins className="w-5 h-5 text-orange-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-heading">
                    Package / CTC
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {drive.package || "Not specified"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-orange-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-heading">Drive Date</p>
                  <p className="text-sm text-muted-foreground">
                    {drive.driveDate
                      ? new Date(drive.driveDate).toLocaleDateString()
                      : "To be decided"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-heading">Deadline</p>
                  <p className="text-sm text-muted-foreground">
                    {drive.applicationDeadline
                      ? new Date(drive.applicationDeadline).toLocaleDateString()
                      : "Not specified"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
