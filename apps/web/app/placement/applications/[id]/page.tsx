"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  usePlacementApplication,
  useReviewApplication,
} from "@/features/applications/hooks/use-applications";
import {
  ApplicationStatus,
  ReviewApplicationDto,
} from "@placecampus/shared-types";
import {
  ArrowLeft,
  User,
  Target,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PlacementApplicationReviewPage() {
  const { id } = useParams() as { id: string };
  const { data: application, isLoading } = usePlacementApplication(id);
  const reviewMutation = useReviewApplication();

  const [comment, setComment] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

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

  const handleReview = async (status: ReviewApplicationDto["status"]) => {
    if (status === "REJECTED" && !rejectionReason.trim()) {
      alert("Please provide a rejection reason.");
      return;
    }

    try {
      await reviewMutation.mutateAsync({
        id,
        data: {
          status,
          reviewerComment: comment.trim() || undefined,
          rejectionReason:
            status === "REJECTED" ? rejectionReason.trim() : undefined,
        },
      });
      alert(`Application marked as ${status.replace("_", " ")}`);
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to update status.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <Link
          href="/placement/applications"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-heading transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Applications
        </Link>
        <span
          className={`text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wider border ${
            application.status === ApplicationStatus.APPLIED
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : application.status === ApplicationStatus.UNDER_REVIEW
                ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                : application.status === ApplicationStatus.SHORTLISTED
                  ? "bg-green-50 text-green-700 border-green-200"
                  : application.status === ApplicationStatus.REJECTED
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-gray-100 text-gray-700 border-gray-200"
          }`}
        >
          {application.status.replace("_", " ")}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-heading mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-orange-500" /> Candidate Summary
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Student ID
                </p>
                <p className="font-mono text-sm font-medium">
                  {application.studentId}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Applied Date
                </p>
                <p className="text-sm font-medium">
                  {new Date(application.appliedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="space-y-6 border-t pt-6">
              <div>
                <h3 className="text-sm font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" /> Skill Match Snapshot
                </h3>
                <div className="flex items-center justify-between p-4 border rounded-xl bg-gray-50 mb-3">
                  <span className="font-medium text-heading">
                    Required Skill Coverage
                  </span>
                  <span className="text-xl font-bold text-blue-700">
                    {application.matchSnapshot.requiredSkillCoverage}%
                  </span>
                </div>

                {application.matchSnapshot.skills.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      Priority Gaps Identified
                    </p>
                    {application.matchSnapshot.skills
                      .filter((s) => s.status !== "SATISFIED")
                      .map((skill, idx) => (
                        <div
                          key={idx}
                          className="p-3 border border-red-100 bg-red-50 rounded-lg flex justify-between items-center text-sm"
                        >
                          <span className="font-medium text-red-800">
                            {skill.skillName}
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5 bg-red-200 text-red-900 rounded">
                            {skill.priority}
                          </span>
                        </div>
                      ))}
                    {application.matchSnapshot.skills.filter(
                      (s) => s.status !== "SATISFIED",
                    ).length === 0 && (
                      <div className="p-3 border border-green-100 bg-green-50 rounded-lg flex items-center gap-2 text-sm text-green-800">
                        <CheckCircle className="w-4 h-4" /> All required skills
                        satisfied at time of application
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t pt-6">
                <h3 className="text-sm font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Readiness Snapshot
                </h3>
                <div className="flex items-center justify-between p-4 border rounded-xl bg-orange-50/50">
                  <span className="font-medium text-heading">
                    Overall Score
                  </span>
                  <span className="text-xl font-bold text-orange-700">
                    {Math.round(
                      application.readinessSnapshot?.overallScore || 0,
                    )}
                    /100
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="font-bold text-heading mb-4">Review Controls</h2>

            <div className="space-y-4">
              {application.status === ApplicationStatus.APPLIED && (
                <Button
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                  onClick={() => handleReview("UNDER_REVIEW")}
                  disabled={reviewMutation.isPending}
                >
                  Mark Under Review
                </Button>
              )}

              {application.status === ApplicationStatus.UNDER_REVIEW && (
                <>
                  <div className="space-y-2 mb-4">
                    <label className="text-xs font-semibold text-heading uppercase">
                      Reviewer Comment (Optional)
                    </label>
                    <textarea
                      className="w-full border rounded-lg p-2 text-sm"
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add an internal note..."
                    />
                  </div>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleReview("SHORTLISTED")}
                    disabled={reviewMutation.isPending}
                  >
                    Shortlist Candidate
                  </Button>

                  <div className="border-t pt-4 mt-4">
                    <div className="space-y-2 mb-3">
                      <label className="text-xs font-semibold text-heading uppercase text-red-700">
                        Rejection Reason (Required)
                      </label>
                      <input
                        type="text"
                        className="w-full border-red-200 focus:border-red-500 rounded-lg p-2 text-sm border"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Why is this candidate rejected?"
                      />
                    </div>
                    <Button
                      variant="outline"
                      className="w-full text-red-600 hover:bg-red-50 border-red-200 hover:border-red-300"
                      onClick={() => handleReview("REJECTED")}
                      disabled={reviewMutation.isPending}
                    >
                      Reject Application
                    </Button>
                  </div>
                </>
              )}

              {["SHORTLISTED", "REJECTED", "WITHDRAWN"].includes(
                application.status,
              ) && (
                <div className="text-center p-4 bg-gray-50 border border-dashed rounded-xl">
                  <p className="text-sm font-medium text-muted-foreground">
                    Review completed.
                  </p>
                  {(application.reviewerComment ||
                    application.rejectionReason) && (
                    <div className="mt-3 text-left">
                      {application.rejectionReason && (
                        <p className="text-xs text-red-700">
                          <span className="font-bold">Reason:</span>{" "}
                          {application.rejectionReason}
                        </p>
                      )}
                      {application.reviewerComment && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="font-bold">Note:</span>{" "}
                          {application.reviewerComment}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
