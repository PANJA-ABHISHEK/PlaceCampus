"use client";

import * as React from "react";
import { useFacultyInterviews } from "@/features/interviews/hooks/use-interviews";
import { Badge } from "@/components/ui/badge";
import { Video, Calendar, Clock, User as UserIcon } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function FacultyInterviewsPage() {
  const router = useRouter();
  const { data: interviews, isLoading } = useFacultyInterviews();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]"></div>
      </div>
    );
  }

  const upcoming =
    interviews?.filter(
      (i) => i.status === "SCHEDULED" || i.status === "IN_PROGRESS",
    ) || [];
  const completed = interviews?.filter((i) => i.status === "COMPLETED") || [];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-heading">
          Interview Evaluations
        </h1>
        <p className="text-[hsl(var(--muted-foreground))] mt-2">
          Manage your assigned mock interviews and submit rubric evaluations for
          students.
        </p>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-heading flex items-center gap-2">
          Action Required{" "}
          <Badge variant="destructive" className="rounded-full">
            {upcoming.length}
          </Badge>
        </h2>
        {upcoming.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-[hsl(var(--border))] text-center text-[hsl(var(--muted-foreground))]">
            No pending interviews to evaluate.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map((interview) => (
              <div
                key={interview.id}
                className="bg-white rounded-xl border border-[hsl(var(--border))] p-5 shadow-sm flex flex-col"
              >
                <div className="flex justify-between items-start mb-4">
                  <Badge
                    variant="outline"
                    className="text-blue-600 bg-blue-50 border-blue-200"
                  >
                    {interview.status}
                  </Badge>
                  <span className="text-xs text-[hsl(var(--muted-foreground))] font-medium uppercase tracking-wider">
                    {interview.type}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                  </div>
                  <div>
                    <div className="font-bold text-heading text-sm">
                      {(interview.studentId as any)?.userId || "Student"}
                    </div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">
                      Candidate
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-[hsl(var(--muted-foreground))] mb-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(interview.scheduledAt), "MMM d, yyyy")}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {format(new Date(interview.scheduledAt), "h:mm a")}
                  </div>
                </div>

                <Button
                  className="w-full mt-auto"
                  onClick={() =>
                    router.push(`/faculty/interviews/${interview.id}`)
                  }
                >
                  Evaluate Candidate
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6 pt-8 border-t border-[hsl(var(--border))]">
        <h2 className="text-xl font-semibold text-heading">
          Recently Evaluated
        </h2>
        {completed.length === 0 ? (
          <div className="text-[hsl(var(--muted-foreground))]">
            No completed evaluations.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[hsl(var(--border))] overflow-hidden">
            <div className="divide-y divide-[hsl(var(--border))]">
              {completed.slice(0, 5).map((interview) => (
                <div
                  key={interview.id}
                  className="p-4 flex items-center justify-between hover:bg-[hsl(var(--muted)/0.3)] transition-colors cursor-pointer"
                  onClick={() =>
                    router.push(`/faculty/interviews/${interview.id}`)
                  }
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-heading text-sm">
                        {(interview.studentId as any)?.userId || "Student"}
                      </h4>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {interview.type} •{" "}
                        {format(new Date(interview.scheduledAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">
                        Average Score
                      </div>
                      <div className="font-bold text-[hsl(var(--primary))] text-sm">
                        {interview.rubricScores
                          ? (
                              Object.values(interview.rubricScores).reduce(
                                (a, b) => a + b,
                                0,
                              ) / Object.values(interview.rubricScores).length
                            ).toFixed(1)
                          : "N/A"}
                        /10
                      </div>
                    </div>
                    <Badge variant="secondary">Evaluated</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
