"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, FileText, ScanText, Upload } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentResume } from "@/features/resume-analyzer/hooks/use-resume-analyzer";
import { formatAnalysisDate, formatBytes } from "@/features/resume-analyzer/lib/resume-analyzer-meta";
import { ProfileSectionCard } from "./profile-section-card";

/** Shows the student's current resume. Upload and analysis live in the AI Resume Analyzer. */
export function ResumeCard({
  id,
  className,
  style,
}: {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { data: resume, isLoading } = useCurrentResume();

  return (
    <ProfileSectionCard
      id={id}
      className={className}
      style={style}
      icon={FileText}
      title="Resume"
      description="Upload your latest resume and check how it scores with ATS screening."
    >
      {isLoading ? (
        <Skeleton className="h-[120px] w-full rounded-xl" />
      ) : resume ? (
        <div className="flex flex-col gap-4 rounded-xl border border-[hsl(var(--primary)/0.25)] bg-[hsl(var(--primary)/0.04)] p-4 sm:flex-row sm:items-center">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[hsl(var(--primary))] shadow-[var(--shadow-xs)]">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[hsl(var(--foreground))]">{resume.fileName}</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {formatBytes(resume.size)} · Uploaded {formatAnalysisDate(resume.uploadedAt)}
            </p>
          </div>
          <Link
            href="/student/resume-analyzer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[hsl(var(--color-primary-600))]"
          >
            <ScanText className="h-4 w-4" aria-hidden="true" />
            Analyse or replace
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-[hsl(var(--border))] bg-gradient-to-b from-[hsl(var(--muted)/0.35)] to-white px-6 py-8 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[hsl(var(--primary))] shadow-[var(--shadow-md)] ring-1 ring-[hsl(var(--border)/0.7)]">
            <Upload className="h-7 w-7" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <h3 className="text-base font-bold text-[hsl(var(--foreground))]">No resume uploaded</h3>
          <p className="mt-2 max-w-[24rem] text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
            Upload a PDF or DOCX in the AI Resume Analyzer to get an estimated ATS score and specific feedback.
          </p>
          <Link
            href="/student/resume-analyzer"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[hsl(var(--color-primary-600))]"
          >
            Upload resume
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}
    </ProfileSectionCard>
  );
}
