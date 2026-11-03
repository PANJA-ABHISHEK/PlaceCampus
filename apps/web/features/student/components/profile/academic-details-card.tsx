"use client";

import * as React from "react";
import {
  BookOpen,
  CalendarCheck,
  CalendarRange,
  ChartColumn,
  GraduationCap,
  Landmark,
  Layers,
  Lock,
  TriangleAlert,
} from "lucide-react";
import { StudentProfile } from "@placecampus/shared-types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ProfileSectionCard } from "./profile-section-card";

export function AcademicDetailsCard({
  profile,
  id,
  className,
  style,
}: {
  profile: StudentProfile | undefined;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const items = [
    { label: "University / College", value: profile?.university, icon: Landmark },
    { label: "Department", value: profile?.department, icon: Layers },
    { label: "Program", value: profile?.program, icon: BookOpen },
    { label: "Batch", value: profile?.batch, icon: CalendarRange },
    { label: "Graduation Year", value: profile?.graduationYear, icon: CalendarCheck },
    { label: "CGPA (0–10)", value: profile?.cgpa, icon: ChartColumn },
    { label: "Active Backlogs", value: profile?.backlogs, icon: TriangleAlert },
  ];

  return (
    <ProfileSectionCard
      id={id}
      className={className}
      style={style}
      icon={GraduationCap}
      title="Academic Details"
      description="Your academic and program information."
      action={
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[hsl(var(--color-navy-50))] px-2.5 py-1 text-xs font-semibold text-[hsl(var(--secondary))] ring-1 ring-[hsl(var(--color-navy-100))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)]"
            >
              <Lock className="h-3 w-3" aria-hidden="true" />
              Managed by institution
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-64 leading-relaxed">
            These details come from your institution&apos;s records and
            can&apos;t be edited here. Contact your placement office to correct
            them.
          </TooltipContent>
        </Tooltip>
      }
    >
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map(({ label, value, icon: Icon }, index) => {
          // Explicit checks so legitimate zeros (e.g. 0 backlogs) still show.
          const missing = value === undefined || value === null || value === "";
          return (
            <div
              key={label}
              className={cn(
                "group flex items-center gap-3 rounded-xl border bg-[hsl(var(--muted)/0.45)] px-3.5 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[var(--shadow-card)]",
                missing
                  ? "border-dashed border-[hsl(var(--border))]"
                  : "border-[hsl(var(--border)/0.8)]",
                index === items.length - 1 && "sm:col-span-2",
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[hsl(var(--secondary))] shadow-[var(--shadow-xs)] ring-1 ring-[hsl(var(--border)/0.6)]">
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-[hsl(var(--muted-foreground))]">
                  {label}
                </dt>
                <dd
                  className={cn(
                    "mt-0.5 truncate text-sm",
                    missing
                      ? "flex items-center gap-1.5 font-medium text-[hsl(var(--muted-foreground))]"
                      : "font-semibold text-[hsl(var(--foreground))]",
                  )}
                >
                  {missing ? (
                    <>
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--muted-foreground)/0.5)]"
                      />
                      Not provided
                    </>
                  ) : (
                    value
                  )}
                </dd>
              </div>
            </div>
          );
        })}
      </dl>
    </ProfileSectionCard>
  );
}
