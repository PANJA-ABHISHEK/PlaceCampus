"use client";

import * as React from "react";
import {
  useAssessments,
  useStudentAssessmentHistory,
  useStartAssessment,
} from "@/features/assessments/hooks/use-assessments";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  Clock,
  ArrowRight,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

export default function AssessmentsPage() {
  const router = useRouter();
  const { data: assessments, isLoading: isAssessmentsLoading } =
    useAssessments();
  const { data: history, isLoading: isHistoryLoading } =
    useStudentAssessmentHistory();
  const startMutation = useStartAssessment();

  const handleStart = (id: string) => {
    startMutation.mutate(id, {
      onSuccess: (data) => {
        router.push(`/student/assessments/${id}/attempt`);
      },
    });
  };

  if (isAssessmentsLoading || isHistoryLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-heading">
          Assessments
        </h1>
        <p className="text-[hsl(var(--muted-foreground))] mt-2">
          Assessments provide measurable evidence of your practical knowledge
          and contribute to your future readiness profile.
        </p>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-heading">
          Available Assessments
        </h2>

        {!assessments || assessments.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-[hsl(var(--border))] text-center text-[hsl(var(--muted-foreground))]">
            No active assessments available right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assessments.map((assessment) => {
              const attempt = history?.find(
                (h) => h.assessmentId === assessment.id,
              );

              return (
                <div
                  key={assessment.id}
                  className="bg-white rounded-xl border border-[hsl(var(--border))] p-5 shadow-sm hover:shadow-md transition-all flex flex-col h-full"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-lg">
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    {attempt?.status === "IN_PROGRESS" && (
                      <Badge
                        variant="outline"
                        className="text-orange-600 bg-orange-50 border-orange-200"
                      >
                        In Progress
                      </Badge>
                    )}
                    {attempt?.status === "EVALUATED" && (
                      <Badge
                        variant="outline"
                        className={
                          attempt.passed
                            ? "text-green-600 bg-green-50"
                            : "text-red-600 bg-red-50"
                        }
                      >
                        {attempt.percentage}%
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-bold text-heading text-lg mb-1">
                    {assessment.title}
                  </h3>
                  {assessment.description && (
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4 line-clamp-2">
                      {assessment.description}
                    </p>
                  )}

                  <div className="mt-auto space-y-3">
                    <div className="flex items-center gap-4 text-xs font-medium text-[hsl(var(--muted-foreground))]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {assessment.durationMinutes} mins
                      </span>
                      <span>Difficulty: L{assessment.difficulty}</span>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => handleStart(assessment.id)}
                      disabled={startMutation.isPending}
                    >
                      {attempt?.status === "IN_PROGRESS"
                        ? "Resume Assessment"
                        : attempt?.status === "EVALUATED"
                          ? "Retake Assessment"
                          : "Start Assessment"}
                      <PlayCircle className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {history && history.length > 0 && (
        <div className="space-y-6 pt-8 border-t border-[hsl(var(--border))]">
          <h2 className="text-xl font-semibold text-heading">
            Assessment History
          </h2>
          <div className="space-y-3">
            {history.map((attempt) => (
              <div
                key={attempt.id}
                className="bg-white rounded-lg border border-[hsl(var(--border))] p-4 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-medium text-heading">
                    {(attempt.assessmentId as any)?.title ||
                      "Unknown Assessment"}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    <span>
                      {attempt.startedAt
                        ? format(new Date(attempt.startedAt), "MMM d, yyyy")
                        : "Unknown Date"}
                    </span>
                    {attempt.durationSeconds && (
                      <span>
                        Duration: {Math.floor(attempt.durationSeconds / 60)}m{" "}
                        {attempt.durationSeconds % 60}s
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {attempt.status === "EVALUATED" ? (
                    <div className="text-right">
                      <div className="font-bold text-heading text-lg">
                        {attempt.percentage}%
                      </div>
                      <div
                        className={
                          attempt.passed
                            ? "text-green-600 text-xs font-medium"
                            : "text-red-600 text-xs font-medium"
                        }
                      >
                        {attempt.passed ? "Passed" : "Failed"}
                      </div>
                    </div>
                  ) : (
                    <Badge variant="secondary">
                      {attempt.status.replace("_", " ")}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
