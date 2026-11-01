"use client";

import * as React from "react";
import {
  useFacultyInterview,
  useEvaluateInterview,
} from "@/features/interviews/hooks/use-interviews";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User as UserIcon } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { InterviewRubric } from "@placecampus/shared-types";

export default function FacultyInterviewEvaluationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: interview, isLoading } = useFacultyInterview(id);
  const evaluateMutation = useEvaluateInterview();

  const [rubricScores, setRubricScores] = React.useState<InterviewRubric>({
    technicalKnowledge: 0,
    problemSolving: 0,
    communication: 0,
    projectDepth: 0,
  });
  const [feedback, setFeedback] = React.useState("");

  React.useEffect(() => {
    if (interview?.rubricScores) {
      setRubricScores(interview.rubricScores);
    }
    if (interview?.feedback) {
      setFeedback(interview.feedback);
    }
  }, [interview]);

  if (isLoading) {
    return <div className="p-12 text-center">Loading...</div>;
  }

  if (!interview) {
    return (
      <div className="p-12 text-center">
        Interview not found.
        <Button
          className="mt-4 block mx-auto"
          onClick={() => router.push("/faculty/interviews")}
        >
          Go Back
        </Button>
      </div>
    );
  }

  const isCompleted = interview.status === "COMPLETED";

  const handleScoreChange = (
    dimension: keyof InterviewRubric,
    value: number,
  ) => {
    if (isCompleted) return;
    setRubricScores((prev) => ({ ...prev, [dimension]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCompleted) return;

    if (
      confirm(
        "Submit this evaluation? Once submitted, the student will be able to see the scores and feedback.",
      )
    ) {
      evaluateMutation.mutate(
        { id, payload: { rubricScores, feedback } },
        {
          onSuccess: () => {
            router.push("/faculty/interviews");
          },
        },
      );
    }
  };

  const dimensions: { key: keyof InterviewRubric; label: string }[] = [
    { key: "technicalKnowledge", label: "Technical Knowledge" },
    { key: "problemSolving", label: "Problem Solving" },
    { key: "communication", label: "Communication" },
    { key: "projectDepth", label: "Project Depth" },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push("/faculty/interviews")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div className="font-bold text-heading text-lg">
          Interview Evaluation
        </div>
        <div
          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isCompleted ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}
        >
          {interview.status}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[hsl(var(--border))] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[hsl(var(--border))] flex items-center gap-4 bg-[hsl(var(--muted)/0.2)]">
          <div className="w-12 h-12 rounded-full bg-white border border-[hsl(var(--border))] flex items-center justify-center shadow-sm">
            <UserIcon className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-heading">
              {(interview.studentId as any)?.userId || "Student Candidate"}
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {interview.type} Interview
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          <div>
            <h3 className="text-lg font-bold text-heading mb-6 border-b border-[hsl(var(--border))] pb-2">
              Rubric Evaluation
            </h3>
            <div className="space-y-6">
              {dimensions.map(({ key, label }) => (
                <div key={key}>
                  <div className="flex justify-between items-center mb-2">
                    <label className="font-medium text-sm text-heading">
                      {label}
                    </label>
                    <span className="font-bold text-[hsl(var(--primary))] w-8 text-right">
                      {rubricScores[key] || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[hsl(var(--muted-foreground))] w-4">
                      0
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="1"
                      value={rubricScores[key] || 0}
                      onChange={(e) =>
                        handleScoreChange(key, parseInt(e.target.value))
                      }
                      disabled={isCompleted || evaluateMutation.isPending}
                      className="flex-1 h-2 bg-[hsl(var(--muted))] rounded-lg appearance-none cursor-pointer accent-[hsl(var(--primary))]"
                    />
                    <span className="text-xs text-[hsl(var(--muted-foreground))] w-4">
                      10
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-heading mb-4 border-b border-[hsl(var(--border))] pb-2">
              Feedback Notes
            </h3>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={isCompleted || evaluateMutation.isPending}
              placeholder="Provide constructive feedback for the student..."
              className="w-full min-h-[150px] p-3 rounded-lg border border-[hsl(var(--border))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] outline-none transition-all resize-y"
              required
            />
          </div>

          {!isCompleted && (
            <div className="pt-4 border-t border-[hsl(var(--border))] flex justify-end">
              <Button
                type="submit"
                size="lg"
                disabled={evaluateMutation.isPending}
              >
                {evaluateMutation.isPending
                  ? "Submitting..."
                  : "Submit Evaluation"}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
