"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePlacementDrives } from "@/features/drives/hooks/use-drives";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, Calendar, Users, Filter, Search } from "lucide-react";
import { DriveStatus } from "@placecampus/shared-types";

export default function PlacementDrivesPage() {
  const { data: drives, isLoading } = usePlacementDrives();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Loading drives...
      </div>
    );
  }

  const filteredDrives = (drives || []).filter((drive) => {
    if (statusFilter !== "ALL" && drive.status !== statusFilter) return false;
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Placement Drives</h1>
          <p className="text-muted-foreground">
            Manage campus recruitment drives
          </p>
        </div>
        <Link href="/placement/drives/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Create Drive
          </Button>
        </Link>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-100 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search company or role..."
            className="w-full pl-9 pr-4 py-2 border rounded-md focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          <Filter className="w-4 h-4 text-muted-foreground hidden md:block" />
          {[
            "ALL",
            DriveStatus.DRAFT,
            DriveStatus.PUBLISHED,
            DriveStatus.CLOSED,
            DriveStatus.CANCELLED,
          ].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? "bg-navy-900 text-white font-medium"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {filteredDrives.length === 0 ? (
        <div className="bg-white border border-dashed rounded-xl p-12 text-center">
          <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-heading mb-1">
            No drives found
          </h3>
          <p className="text-muted-foreground mb-6">
            Create your first placement drive or adjust filters.
          </p>
          <Link href="/placement/drives/new">
            <Button variant="outline">Create Drive</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredDrives.map((drive) => (
            <Link
              key={drive.id}
              href={`/placement/drives/${drive.id}`}
              className="block group"
            >
              <div className="bg-white border shadow-sm rounded-xl p-5 hover:border-orange-300 hover:shadow-md transition-all h-full flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg text-heading group-hover:text-orange-600 transition-colors">
                      {drive.companyName}
                    </h3>
                    <p className="text-sm font-medium text-muted-foreground">
                      {drive.roleTitle}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      drive.status === DriveStatus.PUBLISHED
                        ? "bg-green-100 text-green-700"
                        : drive.status === DriveStatus.DRAFT
                          ? "bg-orange-100 text-orange-700"
                          : drive.status === DriveStatus.CLOSED
                            ? "bg-gray-100 text-gray-700"
                            : "bg-red-100 text-red-700"
                    }`}
                  >
                    {drive.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4 flex-grow">
                  <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <Calendar className="w-4 h-4 opacity-70" />
                    <span>{drive.driveDate || "TBD"}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <Users className="w-4 h-4 opacity-70" />
                    <span>
                      {drive.requirements?.allowedDepartments?.length
                        ? drive.requirements.allowedDepartments.join(", ")
                        : "All Depts"}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t text-sm font-medium text-orange-600 flex justify-between items-center">
                  View Details &rarr;
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
