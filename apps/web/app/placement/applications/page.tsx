"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useDrives } from "@/features/drives/hooks/use-drives";
import { useDriveApplications } from "@/features/applications/hooks/use-applications";
import { ApplicationStatus, DriveStatus } from "@placecampus/shared-types";
import { Building2, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PlacementApplicationsPage() {
  const { data: drives, isLoading: isDrivesLoading } = useDrives();

  // We'll select the first published drive by default for demo purposes,
  // or allow the user to select one.
  const publishedDrives =
    drives?.filter((d) => d.status === DriveStatus.PUBLISHED) || [];
  const [selectedDriveId, setSelectedDriveId] = useState<string>(
    publishedDrives[0]?.id || "",
  );

  // If selectedDriveId is empty but we just loaded drives, set it
  React.useEffect(() => {
    if (!selectedDriveId && publishedDrives.length > 0) {
      setSelectedDriveId(publishedDrives[0].id);
    }
  }, [publishedDrives, selectedDriveId]);

  const { data: applications, isLoading: isAppsLoading } =
    useDriveApplications(selectedDriveId);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredApps =
    applications?.filter((app) => {
      if (statusFilter !== "ALL" && app.status !== statusFilter) return false;
      return true;
    }) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-heading">Applications</h1>
          <p className="text-muted-foreground mt-1">
            Review and manage student applications for active drives.
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex gap-4 items-center w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <select
              className="w-full pl-3 pr-8 py-2 border rounded-xl text-sm appearance-none bg-gray-50 font-medium"
              value={selectedDriveId}
              onChange={(e) => setSelectedDriveId(e.target.value)}
            >
              <option value="" disabled>
                Select a Drive
              </option>
              {publishedDrives.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.companyName} - {d.roleTitle}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Button
            variant={statusFilter === "ALL" ? "default" : "outline"}
            className={statusFilter === "ALL" ? "bg-navy-900 text-white" : ""}
            onClick={() => setStatusFilter("ALL")}
          >
            All
          </Button>
          <Button
            variant={
              statusFilter === ApplicationStatus.APPLIED ? "default" : "outline"
            }
            className={
              statusFilter === ApplicationStatus.APPLIED
                ? "bg-blue-600 text-white"
                : ""
            }
            onClick={() => setStatusFilter(ApplicationStatus.APPLIED)}
          >
            Applied
          </Button>
          <Button
            variant={
              statusFilter === ApplicationStatus.UNDER_REVIEW
                ? "default"
                : "outline"
            }
            className={
              statusFilter === ApplicationStatus.UNDER_REVIEW
                ? "bg-yellow-500 text-white"
                : ""
            }
            onClick={() => setStatusFilter(ApplicationStatus.UNDER_REVIEW)}
          >
            Reviewing
          </Button>
          <Button
            variant={
              statusFilter === ApplicationStatus.SHORTLISTED
                ? "default"
                : "outline"
            }
            className={
              statusFilter === ApplicationStatus.SHORTLISTED
                ? "bg-green-600 text-white"
                : ""
            }
            onClick={() => setStatusFilter(ApplicationStatus.SHORTLISTED)}
          >
            Shortlisted
          </Button>
        </div>
      </div>

      {isDrivesLoading || isAppsLoading ? (
        <div className="p-12 text-center text-muted-foreground animate-pulse bg-white rounded-xl border">
          Loading applications...
        </div>
      ) : !selectedDriveId ? (
        <div className="p-12 text-center text-muted-foreground bg-gray-50 rounded-xl border-2 border-dashed">
          Please select an active drive to view applications.
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground bg-gray-50 rounded-xl border-2 border-dashed">
          No applications found for this filter.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Student ID
                </th>
                <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Match
                </th>
                <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Readiness
                </th>
                <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Applied Date
                </th>
                <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredApps.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center font-bold text-xs">
                        {app.studentId.slice(-2).toUpperCase()}
                      </div>
                      <span className="font-medium text-heading font-mono text-sm">
                        {app.studentId}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                        app.status === ApplicationStatus.APPLIED
                          ? "bg-blue-50 text-blue-700"
                          : app.status === ApplicationStatus.UNDER_REVIEW
                            ? "bg-yellow-50 text-yellow-700"
                            : app.status === ApplicationStatus.SHORTLISTED
                              ? "bg-green-50 text-green-700"
                              : app.status === ApplicationStatus.REJECTED
                                ? "bg-red-50 text-red-700"
                                : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {app.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="p-4 text-sm font-medium">
                    {app.matchSnapshot.requiredSkillCoverage}%
                  </td>
                  <td className="p-4 text-sm font-medium">
                    {Math.round(app.readinessSnapshot?.overallScore || 0)}/100
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(app.appliedAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <Link href={`/placement/applications/${app.id}`}>
                      <Button variant="outline" size="sm">
                        Review
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
