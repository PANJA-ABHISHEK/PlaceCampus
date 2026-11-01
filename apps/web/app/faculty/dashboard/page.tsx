"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCheck, Video, Clock } from "lucide-react";

export default function FacultyDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-heading">
          Faculty Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Review student evidence, manage interviews, and support placement
          readiness.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-[hsl(var(--border))] shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              Pending Evidence Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-heading">No data yet</div>
            <p className="text-xs text-muted-foreground mt-1">
              Pending your approval
            </p>
            <Button asChild className="w-full mt-4" variant="outline">
              <Link href="/faculty/reviews">View Reviews</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--border))] shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Assigned Interviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-heading">Coming Soon</div>
            <p className="text-xs text-muted-foreground mt-1">
              Upcoming mock interviews
            </p>
            <Button asChild className="w-full mt-4" variant="outline" disabled>
              <Link href="/faculty/interviews">Manage Interviews</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--border))] shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Review Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col justify-center h-20">
              <span className="text-sm text-muted-foreground text-center">
                No recent activity
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
