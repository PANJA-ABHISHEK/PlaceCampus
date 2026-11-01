"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useMyApplications } from "@/features/applications/hooks/use-applications";
import { ApplicationStatus } from "@placecampus/shared-types";
import {
  Building2,
  Calendar,
  ChevronRight,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StudentApplicationsPage() {
  const { data: applications, isLoading } = useMyApplications();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Loading your applications...
      </div>
    );
  }

  const filteredApps =
    applications?.filter((app) => {
      // We would ideally fetch drive details populated in the applications endpoint,
      // but right now it's just ID. We can handle this by expanding the API later or showing basic info.
      // For now, let's assume we can filter by status.
      if (statusFilter !== "ALL" && app.status !== statusFilter) return false;
      // Note: since drive company Name is not populated in the model natively, it might just show Drive ID.
      // We'll just display it as is or handle it.
      if (
        searchTerm &&
        !app.driveId.toLowerCase().includes(searchTerm.toLowerCase())
      )
        return false;
      return true;
    }) || [];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="bg-navy-900 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl font-bold mb-4">My Applications</h1>
          <p className="text-navy-100 text-lg font-light leading-relaxed">
            Track your placement applications, review snapshots, and manage your
            progress.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search drives..."
            className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
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
            Under Review
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredApps.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <p className="text-lg text-muted-foreground font-medium mb-2">
              No applications found
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              You haven&apos;t applied to any drives matching this filter.
            </p>
            <Link href="/student/drives">
              <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                Browse Drives
              </Button>
            </Link>
          </div>
        ) : (
          filteredApps.map((app) => (
            <Link
              key={app.id}
              href={`/student/applications/${app.id}`}
              className="block group"
            >
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-orange-200 hover:shadow-md transition-all duration-200 h-full flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center border text-muted-foreground group-hover:border-orange-200 group-hover:text-orange-500 transition-colors">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
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
                </div>

                <h3 className="text-lg font-bold text-heading mb-1 group-hover:text-orange-600 transition-colors">
                  Drive {app.driveId.slice(-6)}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Application ID: {app.id.slice(-6)}
                </p>

                <div className="mt-auto space-y-3">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-2" />
                    Applied {new Date(app.appliedAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                    Match Coverage: {app.matchSnapshot.requiredSkillCoverage}%
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
