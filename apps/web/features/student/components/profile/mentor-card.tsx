"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Mail, UserRoundCheck, UserRoundSearch } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileSectionCard } from "./profile-section-card";

export interface StudentMentor {
  facultyUserId: string;
  fullName: string;
  email: string;
  department: string | null;
  designation: string | null;
  since: string;
}

export function useMyMentor() {
  return useQuery({
    queryKey: ["student", "mentor"],
    queryFn: async () => {
      // The endpoint returns `{ mentor }` directly (no `{ success, data }` envelope).
      const res = await apiClient.get<{ mentor: StudentMentor | null }>("/students/me/mentor");
      return res.mentor;
    },
  });
}

/** The student's faculty mentor, assigned automatically or by the placement team. */
export function MentorCard({ id, className, style }: { id?: string; className?: string; style?: React.CSSProperties }) {
  const { data: mentor, isLoading, isError } = useMyMentor();

  return (
    <ProfileSectionCard
      id={id}
      className={className}
      style={style}
      icon={UserRoundCheck}
      title="Faculty Mentor"
      description="Your mentor guides your preparation and reviews your progress."
    >
      {isLoading ? (
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
      ) : isError ? (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Your mentor details could not be loaded right now.</p>
      ) : mentor ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary)/0.1)] text-sm font-bold text-[hsl(var(--primary))]">
            {mentor.fullName.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 space-y-1">
            <p className="font-semibold text-heading">{mentor.fullName}</p>
            {mentor.designation && <p className="text-sm text-[hsl(var(--muted-foreground))]">{mentor.designation}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[hsl(var(--foreground)/0.8)]">
              <a href={`mailto:${mentor.email}`} className="inline-flex items-center gap-1.5 hover:text-[hsl(var(--primary))] hover:underline">
                <Mail className="h-4 w-4" aria-hidden="true" /> {mentor.email}
              </a>
              {mentor.department && (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" aria-hidden="true" /> {mentor.department}
                </span>
              )}
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Mentor since {new Date(mentor.since).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl bg-[hsl(var(--muted)/0.35)] p-4">
          <UserRoundSearch className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            A mentor has not been assigned yet. Mentors are allocated automatically from your department&apos;s faculty;
            the placement team will follow up if your department record needs attention.
          </p>
        </div>
      )}
    </ProfileSectionCard>
  );
}
