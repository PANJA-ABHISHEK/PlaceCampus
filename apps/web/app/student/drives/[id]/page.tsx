"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useDrive,
  useDriveEligibility,
  useDriveMatch,
} from "@/features/drives/hooks/use-drives";
import { useStudentReadiness } from "@/features/readiness/hooks/use-readiness";
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  Calendar,
  Coins,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Target,
  Search,
  Clock,
  FileText,
  BookOpen,
} from "lucide-react";
import {
  EligibilityCheckStatus,
  SkillMatchStatus,
  GapPriority,
  ApplicationStatus,
  DriveStatus,
} from "@placecampus/shared-types";
import {
  useApplyToDrive,
  useMyApplications,
} from "@/features/applications/hooks/use-applications";
import { Button } from "@/components/ui/button";
import {
  useCreatePreparationPlan,
  usePreparationPlans,
} from "@/features/preparation/hooks/use-preparation";

export default function StudentDriveDetailPage() {
  const { id } = useParams() as { id: string };
  const { data: drive, isLoading: isDriveLoading } = useDrive(id);
  const { data: eligibility, isLoading: isEligLoading } =
    useDriveEligibility(id);
  const { data: matchResult, isLoading: isMatchLoading } = useDriveMatch(id);
  const { data: readinessSnapshot } = useStudentReadiness();

  const { data: myApps, isLoading: isAppsLoading } = useMyApplications();
  const { data: preparationPlans, isLoading: isPreparationLoading } =
    usePreparationPlans();
  const createPreparationPlan = useCreatePreparationPlan();
  const applyMutation = useApplyToDrive();

  const application = myApps?.find((a) => a.driveId === id);
  const preparationPlan = preparationPlans?.find(
    (plan) => plan.driveId === id && plan.status !== "ARCHIVED",
  );

  const [skillSearch, setSkillSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState<"ALL" | "SATISFIED" | "GAPS">(
    "ALL",
  );

  if (
    isDriveLoading ||
    isEligLoading ||
    isMatchLoading ||
    isAppsLoading ||
    isPreparationLoading
  ) {
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Loading drive details...
      </div>
    );
  }

  if (!drive) {
    return (
      <div className="p-8 text-center text-red-500">
        Drive not found or unavailable.
      </div>
    );
  }

  // Filter skills for the main view
  const displaySkills =
    matchResult?.skills.filter((s) => {
      if (
        skillSearch &&
        !s.skillName.toLowerCase().includes(skillSearch.toLowerCase())
      ) {
        return false;
      }
      if (
        skillFilter === "SATISFIED" &&
        s.status !== SkillMatchStatus.SATISFIED
      )
        return false;
      if (
        skillFilter === "GAPS" &&
        (s.status === SkillMatchStatus.SATISFIED ||
          s.status === SkillMatchStatus.OPTIONAL_MISSING)
      )
        return false;
      return true;
    }) || [];

  const highImpactGaps =
    matchResult?.skills.filter((s) => s.priority === GapPriority.HIGH) || [];
  const mediumImpactGaps =
    matchResult?.skills.filter((s) => s.priority === GapPriority.MEDIUM) || [];
  // const lowImpactGaps = matchResult?.skills.filter(s => s.priority === GapPriority.LOW) || [];

  const handleApply = async () => {
    if (!eligibility?.eligible) {
      alert("You are not eligible to apply.");
      return;
    }
    if (confirm("Are you sure you want to apply to this drive?")) {
      try {
        await applyMutation.mutateAsync(id);
        alert("Application submitted successfully!");
      } catch (e: unknown) {
        const error = e as { response?: { data?: { message?: string } } };
        alert(error.response?.data?.message || "Failed to apply.");
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Link
        href="/student/drives"
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-heading mb-2 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Drives
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
        {/* Banner */}
        <div className="bg-navy-900 px-8 py-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="relative z-10">
            <h1 className="text-4xl font-bold mb-2">{drive.companyName}</h1>
            <p className="text-xl text-navy-100 font-light">
              {drive.roleTitle}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* THREE-CARD STRUCTURE (Eligibility, Match, Readiness) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* ELIGIBILITY */}
            <div
              className={`p-6 rounded-2xl border-2 text-center shadow-sm ${
                eligibility?.eligible
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 bg-white shadow-sm">
                {eligibility?.eligible ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
              </div>
              <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase mb-1">
                Eligibility
              </h3>
              <p className="text-xs text-muted-foreground mb-3 font-medium">
                &quot;Can I apply?&quot;
              </p>

              <p
                className={`text-2xl font-bold ${eligibility?.eligible ? "text-green-700" : "text-red-700"}`}
              >
                {eligibility?.eligible ? "Eligible" : "Not Eligible"}
              </p>
            </div>

            {/* SKILL MATCH */}
            <div
              className={`p-6 rounded-2xl border-2 text-center shadow-sm ${
                (matchResult?.requiredSkillCoverage || 0) >= 80
                  ? "bg-blue-50 border-blue-200"
                  : (matchResult?.requiredSkillCoverage || 0) >= 50
                    ? "bg-yellow-50 border-yellow-200"
                    : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 bg-white shadow-sm">
                <Target
                  className={`w-6 h-6 ${(matchResult?.requiredSkillCoverage || 0) >= 80 ? "text-blue-600" : "text-gray-600"}`}
                />
              </div>
              <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase mb-1">
                Skill Match
              </h3>
              <p className="text-xs text-muted-foreground mb-3 font-medium">
                &quot;How closely do I match?&quot;
              </p>

              <p className="text-3xl font-bold text-heading">
                {matchResult?.requiredSkillCoverage}%
              </p>
              <p className="text-xs font-medium text-muted-foreground mt-1">
                {matchResult?.satisfiedCount} of{" "}
                {drive.requirements.skills?.filter((s) => !s.isOptional)
                  .length || 0}{" "}
                required skills
              </p>
            </div>

            {/* READINESS */}
            <div className="bg-white p-6 rounded-2xl border-2 border-orange-100 shadow-sm text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full transform translate-x-1/2 -translate-y-1/2"></div>
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 bg-orange-100 text-orange-600 shadow-sm">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase mb-1">
                  Overall Readiness
                </h3>
                <p className="text-xs text-muted-foreground mb-3 font-medium">
                  &quot;How prepared am I overall?&quot;
                </p>

                <p className="text-3xl font-bold text-navy-900">
                  {readinessSnapshot
                    ? Math.round(readinessSnapshot.overallScore)
                    : "--"}
                  <span className="text-lg text-muted-foreground font-medium">
                    /100
                  </span>
                </p>
                <p className="text-xs font-semibold text-orange-600 mt-1">
                  {readinessSnapshot?.status || "Unknown"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">
              <section>
                <h2 className="text-xl font-bold text-heading mb-4">
                  Your Skill Match
                </h2>

                {matchResult ? (
                  <>
                    {(highImpactGaps.length > 0 ||
                      mediumImpactGaps.length > 0) && (
                      <div className="mb-6 p-5 bg-red-50 border border-red-100 rounded-xl">
                        <h4 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" /> Priority Gaps
                          Discovered
                        </h4>
                        <ul className="space-y-2 text-sm">
                          {highImpactGaps.map((gap) => (
                            <li
                              key={gap.skillId}
                              className="flex items-start gap-2 text-red-700"
                            >
                              <span className="px-1.5 py-0.5 rounded bg-red-200 font-bold text-[10px] mt-0.5">
                                HIGH
                              </span>
                              <span>
                                <strong>{gap.skillName}</strong>:{" "}
                                {gap.explanation}
                              </span>
                            </li>
                          ))}
                          {mediumImpactGaps.map((gap) => (
                            <li
                              key={gap.skillId}
                              className="flex items-start gap-2 text-yellow-700"
                            >
                              <span className="px-1.5 py-0.5 rounded bg-yellow-200 font-bold text-[10px] mt-0.5">
                                MEDIUM
                              </span>
                              <span>
                                <strong>{gap.skillName}</strong>:{" "}
                                {gap.explanation}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search skills..."
                          value={skillSearch}
                          onChange={(e) => setSkillSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 text-sm border rounded-md"
                        />
                      </div>
                      <div className="flex gap-2">
                        {(["ALL", "SATISFIED", "GAPS"] as const).map((f) => (
                          <button
                            key={f}
                            onClick={() => setSkillFilter(f)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                              skillFilter === f
                                ? "bg-navy-900 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {displaySkills.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8 border rounded-xl border-dashed">
                          No skills match the current filter.
                        </p>
                      ) : (
                        displaySkills.map((skill) => {
                          const isSatisfied =
                            skill.status === SkillMatchStatus.SATISFIED;
                          const isGap =
                            skill.status === SkillMatchStatus.GAP ||
                            skill.status === SkillMatchStatus.MISSING;

                          return (
                            <div
                              key={skill.skillId}
                              className={`p-4 border rounded-xl flex items-start gap-4 ${
                                isSatisfied
                                  ? "bg-white border-green-100"
                                  : isGap
                                    ? "bg-white border-red-100"
                                    : "bg-gray-50 border-gray-200"
                              }`}
                            >
                              <div className="mt-1">
                                {isSatisfied ? (
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : isGap ? (
                                  <XCircle className="w-5 h-5 text-red-500" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                                )}
                              </div>
                              <div className="flex-grow">
                                <div className="flex justify-between items-start mb-1">
                                  <div>
                                    <h4 className="font-semibold text-heading flex items-center gap-2">
                                      {skill.skillName}
                                      {skill.isOptional && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">
                                          OPTIONAL
                                        </span>
                                      )}
                                    </h4>
                                  </div>

                                  {skill.priority && (
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                        skill.priority === GapPriority.HIGH
                                          ? "bg-red-100 text-red-700"
                                          : skill.priority ===
                                              GapPriority.MEDIUM
                                            ? "bg-yellow-100 text-yellow-700"
                                            : "bg-gray-100 text-gray-700"
                                      }`}
                                    >
                                      {skill.priority} IMPACT
                                    </span>
                                  )}
                                </div>

                                <div className="text-xs text-muted-foreground flex gap-4 mb-2">
                                  <span>
                                    Required Level:{" "}
                                    <strong>{skill.requiredLevel}</strong>
                                  </span>
                                  <span>
                                    Verified Level:{" "}
                                    <strong>
                                      {skill.studentLevel || "None"}
                                    </strong>
                                  </span>
                                </div>

                                <p
                                  className={`text-sm ${isGap ? "text-red-700 font-medium" : "text-muted-foreground"}`}
                                >
                                  {skill.explanation}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    Unable to calculate skill match.
                  </p>
                )}
              </section>

              <section>
                <h2 className="text-xl font-bold text-heading mb-4 border-t pt-8">
                  Eligibility Breakdown
                </h2>

                {eligibility ? (
                  <div className="space-y-4">
                    {eligibility.checks.map((check, idx) => {
                      const isPass =
                        check.result === EligibilityCheckStatus.PASS;
                      const isMissing =
                        check.result === EligibilityCheckStatus.MISSING_DATA;
                      const isFail =
                        check.result === EligibilityCheckStatus.FAIL;

                      return (
                        <div
                          key={idx}
                          className={`p-4 border rounded-xl flex items-start gap-4 ${
                            isPass
                              ? "bg-green-50 border-green-100"
                              : isMissing
                                ? "bg-yellow-50 border-yellow-100"
                                : "bg-red-50 border-red-100"
                          }`}
                        >
                          <div className="mt-0.5">
                            {isPass && (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            )}
                            {isMissing && (
                              <AlertCircle className="w-5 h-5 text-yellow-600" />
                            )}
                            {isFail && (
                              <XCircle className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                          <div className="flex-grow">
                            <div className="flex justify-between items-center mb-1">
                              <h4 className="font-semibold text-heading">
                                {check.type === "SKILL"
                                  ? `Skill: ${check.skill}`
                                  : check.type.replace("_", " ")}
                              </h4>
                              <span
                                className={`text-xs font-bold px-2 py-0.5 rounded ${
                                  isPass
                                    ? "text-green-700 bg-green-100/50"
                                    : isMissing
                                      ? "text-yellow-700 bg-yellow-100/50"
                                      : "text-red-700 bg-red-100/50"
                                }`}
                              >
                                {check.result}
                              </span>
                            </div>

                            <div className="text-sm text-muted-foreground flex flex-col md:flex-row md:gap-4">
                              <span>
                                <strong className="font-medium text-heading">
                                  Required:
                                </strong>{" "}
                                {check.type === "SKILL"
                                  ? `Level ${check.requiredLevel}`
                                  : check.requirement?.toString() || "Any"}
                              </span>
                              <span>
                                <strong className="font-medium text-heading">
                                  Actual:
                                </strong>{" "}
                                {check.type === "SKILL"
                                  ? check.actualLevel
                                    ? `Level ${check.actualLevel}`
                                    : "None"
                                  : check.actual?.toString() || "None"}
                              </span>
                            </div>

                            {check.reason && (
                              <p
                                className={`text-sm mt-2 font-medium ${isFail ? "text-red-600" : "text-yellow-600"}`}
                              >
                                {check.reason}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Unable to calculate eligibility.
                  </p>
                )}
              </section>
            </div>

            {/* Right Column: Meta Info */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-orange-100 bg-orange-50 p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-heading">Preparation plan</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Turn this drive&apos;s real skill gaps into an actionable plan.
                    </p>
                  </div>
                  <BookOpen className="h-5 w-5 text-orange-600" />
                </div>
                {preparationPlan ? (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm font-semibold text-orange-900">
                      {preparationPlan.completionPercentage}% complete · {preparationPlan.status}
                    </p>
                    <Link href={`/student/preparation/${preparationPlan.id}`} className="block">
                      <Button variant="outline" className="w-full border-orange-300">
                        Open preparation plan
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {!eligibility?.eligible && (
                      <p className="text-xs text-orange-900">
                        Preparation can improve your profile, but it cannot bypass hard eligibility requirements.
                      </p>
                    )}
                    <Button
                      className="w-full bg-orange-600 text-white hover:bg-orange-700"
                      disabled={createPreparationPlan.isPending}
                      onClick={() => createPreparationPlan.mutate(id)}
                    >
                      {createPreparationPlan.isPending ? "Creating..." : "Create preparation plan"}
                    </Button>
                  </div>
                )}
              </div>
              {/* Application Status Area */}
              <div className="bg-white p-6 rounded-2xl border shadow-sm border-gray-200">
                <h3 className="font-bold text-heading mb-4">
                  Application Status
                </h3>

                {application ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      {application.status === ApplicationStatus.APPLIED ? (
                        <Clock className="w-5 h-5 text-blue-500" />
                      ) : application.status ===
                        ApplicationStatus.UNDER_REVIEW ? (
                        <Search className="w-5 h-5 text-yellow-500" />
                      ) : application.status ===
                        ApplicationStatus.SHORTLISTED ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : application.status === ApplicationStatus.REJECTED ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <FileText className="w-5 h-5 text-gray-500" />
                      )}
                      <div>
                        <p className="text-sm font-bold text-heading">
                          {application.status.replace("_", " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Applied on{" "}
                          {new Date(application.appliedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/student/applications/${application.id}`}
                      className="block w-full"
                    >
                      <Button variant="outline" className="w-full">
                        View Application
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {!eligibility?.eligible ? (
                      <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                        You do not meet the eligibility requirements to apply
                        for this drive.
                      </div>
                    ) : drive.status !== DriveStatus.PUBLISHED ? (
                      <div className="p-4 bg-yellow-50 text-yellow-700 text-sm rounded-lg border border-yellow-100">
                        This drive is currently not accepting applications.
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">
                          You are eligible to apply for this position.
                        </p>
                        <Button
                          className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                          onClick={handleApply}
                          disabled={applyMutation.isPending}
                        >
                          {applyMutation.isPending
                            ? "Applying..."
                            : "Apply Now"}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 p-6 rounded-2xl border">
                <h3 className="font-bold text-heading mb-4">Drive Details</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-orange-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">
                        Location
                      </p>
                      <p className="text-sm font-medium text-heading">
                        {drive.location || "--"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Briefcase className="w-4 h-4 text-orange-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">
                        Work Mode
                      </p>
                      <p className="text-sm font-medium text-heading">
                        {drive.workMode || "--"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Coins className="w-4 h-4 text-orange-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">
                        Package
                      </p>
                      <p className="text-sm font-medium text-heading">
                        {drive.package || "--"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-orange-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">
                        Deadline
                      </p>
                      <p className="text-sm font-medium text-heading">
                        {drive.applicationDeadline
                          ? new Date(
                              drive.applicationDeadline,
                            ).toLocaleDateString()
                          : "--"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-orange-100 shadow-sm">
                <h2 className="text-xl font-bold text-heading mb-4">
                  Role Description
                </h2>
                <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                  {drive.description}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
