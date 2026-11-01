"use client";

import * as React from "react";
import {
  useAssessment,
  useStudentAssessmentHistory,
  useSubmitAssessment,
} from "@/features/assessments/hooks/use-assessments";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, CheckCircle2 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";

export default function AssessmentAttemptPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: assessment, isLoading: isAssessmentLoading } =
    useAssessment(id);
  const { data: history, isLoading: isHistoryLoading } =
    useStudentAssessmentHistory();
  const submitMutation = useSubmitAssessment();

  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});

  const attempt = React.useMemo(
    () =>
      history?.find((h) => h.assessmentId === id && h.status === "IN_PROGRESS"),
    [history, id],
  );

  React.useEffect(() => {
    if (attempt?.answers) {
      setAnswers(attempt.answers);
    }
  }, [attempt]);

  if (isAssessmentLoading || isHistoryLoading) {
    return <div className="p-12 text-center">Loading...</div>;
  }

  if (!assessment || !attempt) {
    return (
      <div className="p-12 text-center">
        Assessment or active attempt not found.
        <Button
          className="mt-4 block mx-auto"
          onClick={() => router.push("/student/assessments")}
        >
          Go Back
        </Button>
      </div>
    );
  }

  const questions = assessment.questions || [];
  const currentQuestion = questions[currentQuestionIndex];

  const handleOptionSelect = (questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleSubmit = () => {
    if (confirm("Are you sure you want to submit?")) {
      submitMutation.mutate(
        { attemptId: attempt.id, payload: { answers } },
        {
          onSuccess: () => {
            router.push("/student/assessments");
          },
        },
      );
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push("/student/assessments")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Exit
        </Button>
        <div className="font-bold text-heading text-lg">{assessment.title}</div>
        <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full text-sm font-medium">
          <Clock className="w-4 h-4" />
          Time limit: {assessment.durationMinutes}m
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[hsl(var(--border))] shadow-sm overflow-hidden">
        {/* Progress */}
        <div className="h-1 bg-[hsl(var(--muted))] w-full">
          <div
            className="h-full bg-[hsl(var(--primary))] transition-all duration-300"
            style={{
              width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
            }}
          />
        </div>

        <div className="p-8">
          <div className="text-sm font-medium text-[hsl(var(--muted-foreground))] mb-4">
            Question {currentQuestionIndex + 1} of {questions.length}
          </div>

          <h2 className="text-xl font-medium text-heading mb-8">
            {currentQuestion?.questionText}
          </h2>

          <div className="space-y-3">
            {currentQuestion?.options?.map((option, idx) => {
              const isSelected = answers[currentQuestion.id] === option;
              return (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(currentQuestion.id, option)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]"
                      : "border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.3)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-[hsl(var(--primary))]" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex((p) => Math.max(0, p - 1))}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>

          {currentQuestionIndex === questions.length - 1 ? (
            <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? "Submitting..." : "Submit Assessment"}
            </Button>
          ) : (
            <Button
              onClick={() =>
                setCurrentQuestionIndex((p) =>
                  Math.min(questions.length - 1, p + 1),
                )
              }
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
