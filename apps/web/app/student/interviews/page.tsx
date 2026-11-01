"use client";

import * as React from "react";
import { useStudentInterviews } from "@/features/interviews/hooks/use-interviews";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

export default function StudentInterviewsPage() {
  const { data: interviews, isLoading } = useStudentInterviews();

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
  const past =
    interviews?.filter(
      (i) =>
        i.status === "COMPLETED" ||
        i.status === "CANCELLED" ||
        i.status === "NO_SHOW",
    ) || [];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-heading">
          Mock Interviews
        </h1>
        <p className="text-[hsl(var(--muted-foreground))] mt-2">
          Track your scheduled mock interviews and view detailed rubric feedback
          from faculty evaluators.
        </p>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-heading">
          Upcoming Interviews
        </h2>
        {upcoming.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-[hsl(var(--border))] text-center text-[hsl(var(--muted-foreground))]">
            No upcoming interviews scheduled.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map((interview) => (
              <div
                key={interview.id}
                className="bg-white rounded-xl border border-[hsl(var(--border))] p-5 shadow-sm"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-lg">
                    <Video className="w-5 h-5" />
                  </div>
                  <Badge
                    variant="outline"
                    className="text-blue-600 bg-blue-50 border-blue-200"
                  >
                    {interview.status}
                  </Badge>
                </div>
                <h3 className="font-bold text-heading text-lg mb-2">
                  {interview.type} Interview
                </h3>
                <div className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(interview.scheduledAt), "MMM d, yyyy")}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {format(new Date(interview.scheduledAt), "h:mm a")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6 pt-8 border-t border-[hsl(var(--border))]">
        <h2 className="text-xl font-semibold text-heading">
          Completed Interviews
        </h2>
        {past.length === 0 ? (
          <div className="text-[hsl(var(--muted-foreground))]">
            No past interviews.
          </div>
        ) : (
          <div className="space-y-4">
            {past.map((interview) => (
              <div
                key={interview.id}
                className="bg-white rounded-xl border border-[hsl(var(--border))] p-6 shadow-sm"
              >
                <div className="flex items-center justify-between mb-4 border-b border-[hsl(var(--border))] pb-4">
                  <div>
                    <h3 className="font-bold text-heading text-lg flex items-center gap-2">
                      {interview.type} Interview
                      {interview.status === "COMPLETED" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                    </h3>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      {format(
                        new Date(interview.scheduledAt),
                        "MMM d, yyyy h:mm a",
                      )}
                    </p>
                  </div>
                  <Badge variant="secondary">{interview.status}</Badge>
                </div>

                {interview.status === "COMPLETED" && interview.rubricScores && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm text-heading uppercase tracking-wider">
                      Evaluation Rubric
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(interview.rubricScores).map(
                        ([key, score]) => (
                          <div
                            key={key}
                            className="bg-[hsl(var(--muted)/0.3)] p-3 rounded-lg border border-[hsl(var(--border))]"
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm capitalize font-medium">
                                {key.replace(/([A-Z])/g, " $1").trim()}
                              </span>
                              <span className="font-bold text-[hsl(var(--primary))]">
                                {score}/10
                              </span>
                            </div>
                            <div className="h-1.5 bg-[hsl(var(--border))] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[hsl(var(--primary))]"
                                style={{ width: `${(score / 10) * 100}%` }}
                              />
                            </div>
                          </div>
                        ),
                      )}
                    </div>

                    {interview.feedback && (
                      <div className="mt-4 bg-orange-50 border border-orange-100 p-4 rounded-lg text-sm text-orange-900">
                        <span className="font-semibold block mb-1">
                          Feedback Notes:
                        </span>
                        {interview.feedback}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
