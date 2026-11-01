"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Building, Award, Target } from "lucide-react";

export default function PlacementHeadDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-heading">
          Placement Head Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Institution-level oversight of placement readiness and outcomes.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-[hsl(var(--border))] shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <BarChart className="h-5 w-5 text-primary" />
              Institution Readiness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-heading">Coming Soon</div>
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--border))] shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Department Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-heading">No data yet</div>
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--border))] shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Placement Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-heading">No data yet</div>
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--border))] shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Drive Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-heading">No data yet</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
