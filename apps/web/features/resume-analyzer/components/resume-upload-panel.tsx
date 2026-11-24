"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Briefcase,
  ChevronDown,
  CloudUpload,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { RESUME_ANALYZER_LIMITS, type ResumeAnalysis, type StoredResume } from "@placecampus/shared-types";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { fieldInputClassName } from "@/features/student/components/profile/profile-fields";
import { useAnalyzeResume, useRemoveResume, useUploadResume } from "../hooks/use-resume-analyzer";
import {
  EXTRACTION_LABELS,
  formatAnalysisDate,
  formatBytes,
  validateResumeFile,
  withResumeMime,
} from "../lib/resume-analyzer-meta";

const ANALYSIS_STAGES = [
  "Reading your resume…",
  "Checking contact details and sections…",
  "Scoring seven categories…",
  "Looking for missing skills and keywords…",
  "Reviewing bullet points and grammar…",
  "Writing personalised recommendations…",
];
const JOB_STAGES = ["Comparing your resume with the job description…", "Measuring keyword coverage…"];

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 413) return `This file is larger than ${formatBytes(RESUME_ANALYZER_LIMITS.maxFileBytes)}.`;
    return error.errors?.validation?.[0] ?? error.message ?? fallback;
  }
  return fallback;
}

export function ResumeUploadPanel({
  resume,
  isLoading,
  onAnalyzed,
}: {
  resume: StoredResume | null | undefined;
  isLoading: boolean;
  onAnalyzed: (analysis: ResumeAnalysis) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [analysisError, setAnalysisError] = React.useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = React.useState(false);
  const [targetRole, setTargetRole] = React.useState("");
  const [showJob, setShowJob] = React.useState(false);
  const [jobTitle, setJobTitle] = React.useState("");
  const [jobDescription, setJobDescription] = React.useState("");
  const [stage, setStage] = React.useState(0);

  const upload = useUploadResume();
  const remove = useRemoveResume();
  const analyze = useAnalyzeResume();

  const jobLength = jobDescription.trim().length;
  const jobInvalid =
    showJob && jobLength > 0 &&
    (jobLength < RESUME_ANALYZER_LIMITS.minJobDescriptionChars || jobLength > RESUME_ANALYZER_LIMITS.maxJobDescriptionChars);
  const stages = showJob && jobLength ? [...ANALYSIS_STAGES, ...JOB_STAGES] : ANALYSIS_STAGES;

  React.useEffect(() => {
    if (!analyze.isPending) return;
    const timer = setInterval(() => setStage((s) => Math.min(s + 1, stages.length - 1)), 3500);
    return () => clearInterval(timer);
  }, [analyze.isPending, stages.length]);

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    setFileError(null);
    setAnalysisError(null);
    const problem = validateResumeFile(file);
    if (problem) {
      setFileError(problem);
      return;
    }
    const prepared = withResumeMime(file);
    setPendingFile(prepared);
    setProgress(0);
    upload.mutate(
      { file: prepared, onProgress: setProgress },
      {
        onSuccess: (stored) => {
          toast.success(resume ? "Resume replaced" : "Resume uploaded", { description: stored.fileName });
          setPendingFile(null);
        },
        onError: (error) => {
          setFileError(errorMessage(error, "Upload failed. Please try again."));
          setPendingFile(null);
        },
      },
    );
    if (inputRef.current) inputRef.current.value = "";
  };

  const runAnalysis = () => {
    setAnalysisError(null);
    setStage(0);
    analyze.mutate(
      {
        targetRole: targetRole.trim() || undefined,
        jobDescription: showJob && jobLength ? jobDescription.trim() : undefined,
        jobTitle: showJob && jobTitle.trim() ? jobTitle.trim() : undefined,
      },
      {
        onSuccess: (analysis) => {
          toast.success("Analysis complete", { description: `Estimated ATS score: ${analysis.overallScore}/100` });
          onAnalyzed(analysis);
        },
        onError: (error) => setAnalysisError(errorMessage(error, "The analysis could not be completed. Please try again.")),
      },
    );
  };

  const removeResume = () => {
    remove.mutate(undefined, {
      onSuccess: () => {
        toast.success("Resume removed", { description: "Your saved analyses are kept." });
        setConfirmRemove(false);
      },
      onError: (error) => toast.error(errorMessage(error, "Could not remove the resume.")),
    });
  };

  const busy = upload.isPending || analyze.isPending || remove.isPending;

  return (
    <section
      aria-labelledby="resume-upload-title"
      className="rounded-[20px] border border-[hsl(var(--border))] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6"
    >
      <h2 id="resume-upload-title" className="text-lg font-bold text-[hsl(var(--foreground))]">
        Your resume
      </h2>
      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
        PDF or DOCX, up to {formatBytes(RESUME_ANALYZER_LIMITS.maxFileBytes)}. Stored privately; only you can see it.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => pickFile(event.target.files?.[0])}
      />

      <div className="mt-5">
        {isLoading ? (
          <Skeleton className="h-[76px] w-full rounded-2xl" />
        ) : upload.isPending && pendingFile ? (
          <div className="rounded-2xl border border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.04)] p-4" aria-live="polite">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[hsl(var(--primary))] shadow-[var(--shadow-xs)]">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[hsl(var(--foreground))]">{pendingFile.name}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {formatBytes(pendingFile.size)} · {progress < 100 ? `Uploading ${progress}%` : "Reading the document…"}
                </p>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[hsl(var(--primary)/0.15)]" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
              <div className="h-full rounded-full bg-[hsl(var(--primary))] transition-[width] duration-200" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : resume ? (
          <div className="rounded-2xl border border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.04)] p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[hsl(var(--primary))] shadow-[var(--shadow-xs)]">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[hsl(var(--foreground))]" title={resume.fileName}>
                  {resume.fileName}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {formatBytes(resume.size)} · {resume.wordCount} words
                  {resume.pageCount ? ` · ${resume.pageCount} page${resume.pageCount > 1 ? "s" : ""}` : ""} ·{" "}
                  {EXTRACTION_LABELS[resume.extractionMethod]}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Uploaded {formatAnalysisDate(resume.uploadedAt)}</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2 border-t border-[hsl(var(--primary)/0.15)] pt-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-white px-3 text-sm font-semibold text-[hsl(var(--foreground)/0.85)] transition-colors hover:bg-[hsl(var(--muted))] disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Replace
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmRemove(true)}
                aria-label="Remove resume"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-white px-3 text-sm font-semibold text-[hsl(var(--muted-foreground))] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Remove
              </button>
            </div>
            {confirmRemove && (
              <div role="alertdialog" aria-label="Remove resume" className="pc-pop mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 text-sm shadow-[var(--shadow-xs)]">
                <span className="text-[hsl(var(--foreground))]">Remove this resume? Saved analyses stay in your history.</span>
                <span className="flex gap-2">
                  <button type="button" onClick={() => setConfirmRemove(false)} disabled={remove.isPending} className="h-8 rounded-lg border border-[hsl(var(--border))] px-3 font-semibold hover:bg-[hsl(var(--muted))]">
                    Cancel
                  </button>
                  <button type="button" onClick={removeResume} disabled={remove.isPending} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-600 px-3 font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                    {remove.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                    Remove
                  </button>
                </span>
              </div>
            )}
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload your resume: drag and drop a PDF or DOCX file, or press Enter to browse"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              pickFile(event.dataTransfer.files?.[0]);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)]",
              isDragging
                ? "scale-[1.01] border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.06)]"
                : "border-[hsl(var(--border))] bg-gradient-to-b from-[hsl(var(--color-primary-50)/0.6)] to-white hover:border-[hsl(var(--primary)/0.5)]",
            )}
          >
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[hsl(var(--primary))] shadow-[var(--shadow-md)] ring-1 ring-[hsl(var(--border)/0.7)]">
              <CloudUpload className="h-7 w-7" aria-hidden="true" />
            </span>
            <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
              {isDragging ? "Drop your resume here" : "Drag and drop your resume here"}
            </p>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">PDF or DOCX · up to {formatBytes(RESUME_ANALYZER_LIMITS.maxFileBytes)}</p>
            <span className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-white px-4 py-2 text-sm font-semibold text-[hsl(var(--foreground))] shadow-[var(--shadow-xs)]">
              Browse files
            </span>
          </div>
        )}

        {fileError && (
          <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{fileError}</span>
            <button type="button" onClick={() => setFileError(null)} aria-label="Dismiss" className="text-red-700/70 hover:text-red-800">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </p>
        )}
      </div>

      {/* ── Analysis options ── */}
      <div className={cn("mt-6 space-y-4", !resume && "pointer-events-none opacity-50")} aria-disabled={!resume}>
        <div>
          <label htmlFor="target-role" className="text-sm font-semibold text-[hsl(var(--foreground))]">
            Target role <span className="font-normal text-[hsl(var(--muted-foreground))]">(optional)</span>
          </label>
          <input
            id="target-role"
            value={targetRole}
            onChange={(event) => setTargetRole(event.target.value)}
            maxLength={RESUME_ANALYZER_LIMITS.maxTargetRoleChars}
            placeholder="e.g. Frontend Developer, Data Analyst"
            disabled={!resume || analyze.isPending}
            className={cn(fieldInputClassName, "mt-1.5 h-11 px-3.5")}
          />
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Leave blank and we&apos;ll infer the role from your resume.</p>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border))]">
          <button
            type="button"
            onClick={() => setShowJob((v) => !v)}
            aria-expanded={showJob}
            aria-controls="job-match-fields"
            disabled={!resume || analyze.isPending}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2.5">
              <Briefcase className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden="true" />
              <span className="text-sm font-semibold text-[hsl(var(--foreground))]">Match against a job description</span>
              <span className="rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--muted-foreground))]">Optional</span>
            </span>
            <ChevronDown className={cn("h-4 w-4 text-[hsl(var(--muted-foreground))] transition-transform", showJob && "rotate-180")} aria-hidden="true" />
          </button>
          {showJob && (
            <div id="job-match-fields" className="pc-enter space-y-3 border-t border-[hsl(var(--border))] px-4 pb-4 pt-3">
              <div>
                <label htmlFor="job-title" className="text-xs font-semibold text-[hsl(var(--foreground))]">Job title</label>
                <input
                  id="job-title"
                  value={jobTitle}
                  onChange={(event) => setJobTitle(event.target.value)}
                  maxLength={RESUME_ANALYZER_LIMITS.maxJobTitleChars}
                  placeholder="e.g. Software Engineer Intern"
                  disabled={analyze.isPending}
                  className={cn(fieldInputClassName, "mt-1 h-10 px-3")}
                />
              </div>
              <div>
                <label htmlFor="job-description" className="text-xs font-semibold text-[hsl(var(--foreground))]">Job description</label>
                <textarea
                  id="job-description"
                  value={jobDescription}
                  onChange={(event) => setJobDescription(event.target.value)}
                  rows={7}
                  placeholder="Paste the full job description: responsibilities, required and preferred skills."
                  disabled={analyze.isPending}
                  aria-invalid={jobInvalid || undefined}
                  aria-describedby="job-description-help"
                  className={cn(fieldInputClassName, "mt-1 resize-y px-3 py-2.5 leading-relaxed")}
                />
                <p id="job-description-help" className={cn("mt-1 flex justify-between text-xs", jobInvalid ? "text-red-600" : "text-[hsl(var(--muted-foreground))]")}>
                  <span>
                    {jobLength > 0 && jobLength < RESUME_ANALYZER_LIMITS.minJobDescriptionChars
                      ? `Add at least ${RESUME_ANALYZER_LIMITS.minJobDescriptionChars - jobLength} more characters.`
                      : jobLength > RESUME_ANALYZER_LIMITS.maxJobDescriptionChars
                        ? "This is longer than the limit."
                        : "Scored separately from your general ATS score."}
                  </span>
                  <span className="tabular-nums">
                    {jobLength.toLocaleString("en-IN")}/{RESUME_ANALYZER_LIMITS.maxJobDescriptionChars.toLocaleString("en-IN")}
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>

        {analysisError && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {analysisError}
          </p>
        )}

        <button
          type="button"
          onClick={runAnalysis}
          disabled={!resume || busy || jobInvalid}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 text-[15px] font-semibold text-white shadow-[0_10px_24px_-12px_hsl(var(--primary)/0.8)] transition-[background-color,transform] hover:bg-[hsl(var(--color-primary-600))] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {analyze.isPending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Sparkles className="h-5 w-5" aria-hidden="true" />}
          {analyze.isPending ? "Analysing…" : "Analyse resume"}
        </button>
        {analyze.isPending && (
          <p className="text-center text-sm text-[hsl(var(--muted-foreground))]" aria-live="polite">
            {stages[stage]} <span className="text-xs">This usually takes 15-40 seconds.</span>
          </p>
        )}
      </div>
    </section>
  );
}
