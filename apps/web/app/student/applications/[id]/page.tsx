"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useMyApplication,
  useWithdrawApplication,
} from "@/features/applications/hooks/use-applications";
import {
  ApplicationStatus,
  EligibilityCheckStatus,
} from "@placecampus/shared-types";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StudentApplicationDetailPage() {
  const { id } = useParams() as { id: string };
  const { data: application, isLoading } = useMyApplication(id);
  const withdrawMutation = useWithdrawApplication();

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Loading application...
      </div>
    );
  }

  if (!application) {
    return (
      <div className="p-8 text-center text-red-500">Application not found.</div>
    );
  }

  const handleWithdraw = async () => {
    if (
      confirm(
        "Are you sure you want to withdraw this application? This cannot be undone.",
      )
    ) {
      try {
        await withdrawMutation.mutateAsync(id);
        alert("Application withdrawn.");
      } catch (e: unknown) {
        const error = e as { response?: { data?: { message?: string } } };
        alert(error.response?.data?.message || "Failed to withdraw.");
      }
    }
  };

  const getTimelineSteps = () => {
    const steps = [
      { label: "Applied", status: "completed" },
      {
        label: "Under Review",
        status: ["UNDER_REVIEW", "SHORTLISTED", "REJECTED"].includes(
          application.status,
        )
          ? "completed"
          : "pending",
      },
      {
        label:
          application.status === ApplicationStatus.REJECTED
            ? "Rejected"
            : "Shortlisted",
        status: ["SHORTLISTED", "REJECTED"].includes(application.status)
          ? application.status === ApplicationStatus.SHORTLISTED
            ? "success"
            : "error"
          : "pending",
      },
    ];

    if (application.status === ApplicationStatus.WITHDRAWN) {
      return [
        { label: "Applied", status: "completed" },
        { label: "Withdrawn", status: "error" },
      ];
    }
    return steps;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <Link
          href="/student/applications"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-heading transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Applications
        </Link>
        {application.status === ApplicationStatus.APPLIED && (
          <Button
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleWithdraw}
            disabled={withdrawMutation.isPending}
          >
            {withdrawMutation.isPending
              ? "Withdrawing..."
              : "Withdraw Application"}
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-navy-50 rounded-xl flex items-center justify-center border border-navy-100 text-navy-600">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-heading">
                Drive {application.driveId.slice(-6)}
              </h1>
              <p className="text-muted-foreground">
                Application #{application.id.slice(-6)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 mt-6">
            {getTimelineSteps().map((step, idx, arr) => (
              <React.Fragment key={step.label}>
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      step.status === "completed" || step.status === "success"
                        ? "bg-green-100 text-green-700"
                        : step.status === "error"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      step.status === "completed" || step.status === "success"
                        ? "text-green-700"
                        : step.status === "error"
                          ? "text-red-700"
                          : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <div
                    className={`h-1 w-16 rounded-full ${
                      step.status === "completed" || step.status === "success"
                        ? "bg-green-200"
                        : "bg-gray-100"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="p-8 bg-gray-50/50">
          <h2 className="text-sm font-bold text-heading uppercase tracking-wider mb-6 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Application Snapshot
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            This represents your profile state at the exact time you applied on{" "}
            {new Date(application.appliedAt).toLocaleString()}.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Eligibility Snapshot */}
            <div className="bg-white p-5 rounded-xl border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-heading flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" /> Eligibility
                </h3>
                <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-md">
                  ELIGIBLE
                </span>
              </div>
              <div className="space-y-3">
                {application.eligibilitySnapshot.checks.map((check, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{check.type}</span>
                    <span className="font-medium text-heading">
                      {check.result}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Match Snapshot */}
            <div className="bg-white p-5 rounded-xl border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-heading flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-500" /> Skill Match
                </h3>
                <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-md">
                  {application.matchSnapshot.requiredSkillCoverage}%
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    Satisfied Skills
                  </span>
                  <span className="font-medium text-heading">
                    {application.matchSnapshot.satisfiedCount}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Gaps</span>
                  <span className="font-medium text-red-600">
                    {application.matchSnapshot.gapCount}
                  </span>
                </div>
                {application.matchSnapshot.skills
                  .filter((s) => s.status !== "SATISFIED")
                  .slice(0, 3)
                  .map((gap, idx) => (
                    <div
                      key={idx}
                      className="mt-2 p-2 bg-red-50 text-red-700 text-xs rounded border border-red-100"
                    >
                      <strong>{gap.skillName}</strong> gap
                    </div>
                  ))}
              </div>
            </div>

            {/* Readiness Snapshot */}
            <div className="bg-white p-5 rounded-xl border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-heading flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-orange-500" /> Readiness
                </h3>
                <span className="text-xs font-bold px-2 py-1 bg-orange-100 text-orange-700 rounded-md">
                  {Math.round(application.readinessSnapshot?.overallScore || 0)}
                  /100
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                <p>Recorded at time of application.</p>
              </div>
            </div>
          </div>
        </div>

        {(application.reviewerComment || application.rejectionReason) && (
          <div className="p-8 border-t bg-white">
            <h2 className="text-sm font-bold text-heading uppercase tracking-wider mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Feedback
            </h2>
            {application.rejectionReason && (
              <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-100 mb-4">
                <p className="text-xs font-bold uppercase mb-1">
                  Rejection Reason
                </p>
                <p className="text-sm">{application.rejectionReason}</p>
              </div>
            )}
            {application.reviewerComment && (
              <div className="p-4 bg-blue-50 text-blue-800 rounded-lg border border-blue-100">
                <p className="text-xs font-bold uppercase mb-1">
                  Reviewer Note
                </p>
                <p className="text-sm">{application.reviewerComment}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
