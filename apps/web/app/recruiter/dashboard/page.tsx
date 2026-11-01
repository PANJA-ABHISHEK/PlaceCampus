"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Briefcase, Clock, AlertTriangle } from "lucide-react";
import { useRecruiterDrives } from "@/features/recruiter/hooks/use-recruiter-portal";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LoadingState } from "@/components/ui/loading-state";

export default function RecruiterDashboardPage() {
  const { data: drives, isLoading } = useRecruiterDrives();

  if (isLoading) return <LoadingState text="Loading dashboard..." />;

  const activeDrivesCount = drives?.length || 0;
  
  // Calculate drives expiring within 48 hours
  const now = new Date().getTime();
  const expiringSoonCount = drives?.filter(d => {
    const expiresAt = new Date(d.expiresAt).getTime();
    return expiresAt - now < 48 * 60 * 60 * 1000 && expiresAt > now;
  }).length || 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-heading">
          Recruiter Portal
        </h1>
        <p className="text-muted-foreground mt-1">
          Access candidates and opportunities authorized for your assigned
          placement drives.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        <Card className="border-[hsl(var(--border))] shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Active Drives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-heading">{activeDrivesCount}</div>
            <p className="text-sm text-muted-foreground mt-2">Drives with active candidate access</p>
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--border))] shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-heading">{expiringSoonCount}</div>
            <p className="text-sm text-muted-foreground mt-2">Access expires within 48 hours</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-bold mt-4">Your Recent Drives</h2>
      
      {activeDrivesCount === 0 ? (
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <AlertTriangle className="w-10 h-10 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium">No Active Drives</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-2">
              You haven't been granted access to any placement drives yet, or your previous access has expired.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {drives?.map(grant => (
            <Card key={grant.grantId}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{grant.drive.companyName}</CardTitle>
                <p className="text-sm font-medium text-navy-600">{grant.drive.roleTitle}</p>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-xs text-muted-foreground">
                  Expires: {new Date(grant.expiresAt).toLocaleDateString()}
                </div>
              </CardContent>
              <CardFooter>
                <Link href={`/recruiter/drives/${grant.drive.id}/candidates`} className="w-full">
                  <Button variant="outline" className="w-full">View Candidates</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
