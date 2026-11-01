"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Calendar, Users, Send, Plus } from "lucide-react";
import { usePlacementDrives } from "@/features/drives/hooks/use-drives";
import { DriveStatus } from "@placecampus/shared-types";

export default function PlacementDashboardPage() {
  const { data: drives, isLoading } = usePlacementDrives();

  const activeDrives =
    drives?.filter((d) => d.status === DriveStatus.PUBLISHED) || [];
  const draftDrives =
    drives?.filter((d) => d.status === DriveStatus.DRAFT) || [];
  const closedDrives =
    drives?.filter((d) => d.status === DriveStatus.CLOSED) || [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-heading">
            Placement Operations
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage recruitment drives, eligibility, applications and placement
            activity.
          </p>
        </div>
        <Link href="/placement/drives/new">
          <Button className="gap-2 bg-orange-600 hover:bg-orange-700 text-white">
            <Plus className="w-4 h-4" /> Create Drive
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-[hsl(var(--border))] shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-orange-500" />
              Active Drives
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 bg-gray-200 animate-pulse rounded w-16 mb-2"></div>
            ) : (
              <div className="text-3xl font-bold text-heading">
                {activeDrives.length}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Currently published to students
            </p>
            <Button asChild className="w-full mt-4" variant="outline">
              <Link href="/placement/drives">Manage Drives</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--border))] shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              Draft Drives
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 bg-gray-200 animate-pulse rounded w-16 mb-2"></div>
            ) : (
              <div className="text-3xl font-bold text-heading">
                {draftDrives.length}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Ready to be published
            </p>
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--border))] shadow-sm transition-shadow hover:shadow-md opacity-70">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Eligible Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-heading">--</div>
            <p className="text-xs text-muted-foreground mt-1">
              Eligibility Engine (Coming Soon)
            </p>
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--border))] shadow-sm transition-shadow hover:shadow-md opacity-70">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-heading">--</div>
            <p className="text-xs text-muted-foreground mt-1">
              Applications (Coming Soon)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
