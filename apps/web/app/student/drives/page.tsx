"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useDrives } from "@/features/drives/hooks/use-drives";
import { Briefcase, Calendar, MapPin, Search } from "lucide-react";
import { DriveStatus } from "@placecampus/shared-types";

export default function StudentDrivesPage() {
  const { data: drives, isLoading } = useDrives();
  const [search, setSearch] = useState("");

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Loading available drives...
      </div>
    );
  }

  const filteredDrives = (drives || []).filter((drive) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !drive.companyName.toLowerCase().includes(q) &&
        !drive.roleTitle.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Placement Drives</h1>
        <p className="text-muted-foreground">
          Discover and evaluate your eligibility for upcoming recruitment
          drives.
        </p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-100">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search company or role..."
            className="w-full pl-9 pr-4 py-2 border rounded-md focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filteredDrives.length === 0 ? (
        <div className="bg-white border border-dashed rounded-xl p-12 text-center shadow-sm">
          <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-heading mb-1">
            No upcoming drives
          </h3>
          <p className="text-muted-foreground mb-6">
            There are currently no active placement drives published.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDrives.map((drive) => (
            <Link
              key={drive.id}
              href={`/student/drives/${drive.id}`}
              className="block group"
            >
              <div className="bg-white border shadow-sm rounded-xl p-5 hover:border-orange-300 hover:shadow-md transition-all h-full flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-orange-100 to-transparent rounded-bl-full opacity-50 group-hover:scale-110 transition-transform"></div>

                <div className="mb-4 relative z-10">
                  <h3 className="font-semibold text-xl text-heading group-hover:text-orange-600 transition-colors">
                    {drive.companyName}
                  </h3>
                  <p className="font-medium text-muted-foreground">
                    {drive.roleTitle}
                  </p>
                </div>

                <div className="space-y-3 mb-6 flex-grow relative z-10">
                  <div className="flex items-center text-sm text-muted-foreground gap-3">
                    <div className="p-1.5 bg-muted rounded-md">
                      <MapPin className="w-3.5 h-3.5 text-navy-600" />
                    </div>
                    <span>
                      {drive.location || "Not specified"}{" "}
                      {drive.workMode ? `(${drive.workMode})` : ""}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground gap-3">
                    <div className="p-1.5 bg-muted rounded-md">
                      <Briefcase className="w-3.5 h-3.5 text-navy-600" />
                    </div>
                    <span className="font-medium text-heading">
                      {drive.package || "Competitive"}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground gap-3">
                    <div className="p-1.5 bg-muted rounded-md">
                      <Calendar className="w-3.5 h-3.5 text-navy-600" />
                    </div>
                    <span>
                      Deadline:{" "}
                      {drive.applicationDeadline
                        ? new Date(
                            drive.applicationDeadline,
                          ).toLocaleDateString()
                        : "TBD"}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t text-sm font-medium text-orange-600 flex justify-between items-center group-hover:text-orange-700">
                  <span>View & Check Eligibility</span>
                  <span className="transform translate-x-0 group-hover:translate-x-1 transition-transform">
                    &rarr;
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
