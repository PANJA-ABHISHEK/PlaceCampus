"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Tags, Settings, ShieldAlert } from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-heading">
          Administration
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage PlaceCampus users, taxonomy, configuration and system controls.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-[hsl(var(--border))] shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-heading">Coming Soon</div>
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--border))] shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Tags className="h-5 w-5 text-primary" />
              Skills Taxonomy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-heading">Coming Soon</div>
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--border))] shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              System Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-heading">Coming Soon</div>
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--border))] shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Audit Logs
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
