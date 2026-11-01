"use client";

import * as React from "react";
import {
  useStudentReadiness,
  useReadinessHistory,
} from "@/features/readiness/hooks/use-readiness";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  BrainCircuit,
  ClipboardList,
  GraduationCap,
  FolderDot,
  Video,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { format } from "date-fns";

export default function ReadinessDashboardPage() {
  const { data: readiness, isLoading } = useStudentReadiness();
  const { data: history } = useReadinessHistory();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]"></div>
      </div>
    );
  }

  if (!readiness) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 animate-in fade-in">
        <div className="w-20 h-20 bg-[hsl(var(--muted))] rounded-full flex items-center justify-center mx-auto mb-6 text-[hsl(var(--muted-foreground))]">
          <TrendingUp className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-heading">
          Your readiness profile is still being built.
        </h2>
        <p className="text-[hsl(var(--muted-foreground))] mt-2">
          Upload project evidence, add academic details, or complete an
          assessment to generate your baseline readiness score.
        </p>
      </div>
    );
  }

  const factorIcons = {
    verifiedSkills: BrainCircuit,
    assessments: ClipboardList,
    academics: GraduationCap,
    projects: FolderDot,
    interviews: Video,
  };

  const factorLabels = {
    verifiedSkills: "Verified Skills",
    assessments: "Assessments",
    academics: "Academics",
    projects: "Projects",
    interviews: "Mock Interviews",
  };

  const isReady = readiness.status === "READY";
  const isDeveloping = readiness.status === "DEVELOPING";

  const statusColor = isReady
    ? "text-green-600 bg-green-50 border-green-200"
    : isDeveloping
      ? "text-blue-600 bg-blue-50 border-blue-200"
      : "text-orange-600 bg-orange-50 border-orange-200";

  const formatNumber = (num: number) => (Math.round(num * 10) / 10).toFixed(1);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* HEADER & HERO */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-heading">
            Placement Readiness
          </h1>
          <p className="text-[hsl(var(--muted-foreground))] mt-2 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Explainable deterministic scoring engine. Updated{" "}
            {format(new Date(readiness.calculatedAt), "MMM d, h:mm a")}
          </p>
        </div>
        <div className="flex flex-col items-end">
          <Badge
            className={`px-4 py-1.5 text-sm font-bold uppercase tracking-widest rounded-full border ${statusColor}`}
          >
            {readiness.status.replace("_", " ")}
          </Badge>
          <p className="text-sm font-medium text-[hsl(var(--muted-foreground))] mt-2 text-right">
            Coverage: {readiness.coverageCount} / 5 factors measured
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: HERO SCORE & STRENGTHS */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white rounded-2xl border border-[hsl(var(--border))] shadow-sm p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[hsl(var(--primary))] to-blue-400"></div>

            <h2 className="text-lg font-bold text-heading mb-6">
              Overall Score
            </h2>

            <div className="relative inline-flex items-center justify-center">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  className="text-[hsl(var(--muted))]"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 88}`}
                  strokeDashoffset={`${2 * Math.PI * 88 * (1 - readiness.overallScore / 100)}`}
                  strokeLinecap="round"
                  className={
                    isReady
                      ? "text-green-500"
                      : isDeveloping
                        ? "text-blue-500"
                        : "text-orange-500"
                  }
                  style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-5xl font-black text-heading tracking-tighter">
                  {formatNumber(readiness.overallScore)}
                </span>
                <span className="text-sm text-[hsl(var(--muted-foreground))] font-bold uppercase tracking-widest mt-1">
                  / 100
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[hsl(var(--border))] shadow-sm p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-heading uppercase tracking-widest mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> Strengths
              </h3>
              {readiness.explanation.strengths.length > 0 ? (
                <ul className="space-y-3">
                  {readiness.explanation.strengths.map((strength, i) => (
                    <li
                      key={i}
                      className="text-sm font-medium text-heading flex items-start gap-2"
                    >
                      <span className="text-green-500 font-bold">✓</span>{" "}
                      {strength}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-[hsl(var(--muted-foreground))]">
                  More data needed to identify specific strengths.
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-[hsl(var(--border))]">
              <h3 className="text-sm font-bold text-heading uppercase tracking-widest mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" /> Areas to
                Improve
              </h3>
              {readiness.explanation.areasToImprove.length > 0 ? (
                <ul className="space-y-3">
                  {readiness.explanation.areasToImprove.map((area, i) => (
                    <li
                      key={i}
                      className="text-sm font-medium text-heading flex items-start gap-2"
                    >
                      <span className="text-orange-500 font-bold">⚠</span>{" "}
                      {area}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-[hsl(var(--muted-foreground))]">
                  No critical weak areas identified.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: FACTOR BREAKDOWN */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-[hsl(var(--border))] shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
              <h2 className="text-lg font-bold text-heading">
                How your score is calculated
              </h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                Each factor is normalized to 0–100 and combined using fixed
                authoritative weights.
              </p>
            </div>

            <div className="flex-1 p-6 space-y-6">
              {readiness.explanation.factors.map((factor) => {
                const Icon =
                  factorIcons[factor.key as keyof typeof factorIcons] || Info;
                const label =
                  factorLabels[factor.key as keyof typeof factorLabels] ||
                  factor.key;

                return (
                  <div key={factor.key} className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[hsl(var(--muted))] flex items-center justify-center text-[hsl(var(--muted-foreground))] shrink-0">
                      <Icon className="w-6 h-6" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-end mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-heading">
                            {label}
                          </span>
                          {!factor.coverage && (
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase bg-gray-50"
                            >
                              No Data
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm font-medium">
                          {formatNumber(factor.score)}{" "}
                          <span className="text-[hsl(var(--muted-foreground))] font-normal">
                            × {(factor.weight * 100).toFixed(0)}% =
                          </span>{" "}
                          <span className="text-[hsl(var(--primary))] font-bold text-base">
                            +{formatNumber(factor.contribution)}
                          </span>
                        </div>
                      </div>

                      <div className="h-2 w-full bg-[hsl(var(--muted))] rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-[hsl(var(--primary))] transition-all duration-1000"
                          style={{ width: `${factor.score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-6 border-t border-[hsl(var(--border))] bg-gray-50 flex justify-between items-center">
              <span className="font-bold text-heading uppercase tracking-widest text-sm">
                Total Overall Readiness
              </span>
              <span className="text-2xl font-black text-[hsl(var(--primary))]">
                {formatNumber(readiness.overallScore)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
