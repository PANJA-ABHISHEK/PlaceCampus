"use client";

import * as React from "react";
import { toast } from "sonner";
import { FileSearch, ShieldCheck, Sparkles } from "lucide-react";
import type { ResumeAnalysis } from "@placecampus/shared-types";
import { HeroWaves, lightHeroClassName } from "@/components/brand/hero-waves";
import { ErrorState } from "@/components/ui/error-state";
import { ApiError } from "@/lib/api-client";
import {
  useAnalysisHistory,
  useAnalyzeResume,
  useCurrentResume,
  useDeleteAnalysis,
  useResumeAnalysis,
} from "@/features/resume-analyzer/hooks/use-resume-analyzer";
import { ResumeUploadPanel } from "@/features/resume-analyzer/components/resume-upload-panel";
import {
  AnalysisDetails,
  AnalysisSkeleton,
  EstimateDisclaimer,
  ScoreOverviewCard,
} from "@/features/resume-analyzer/components/analysis-results";
import { AnalysisHistory } from "@/features/resume-analyzer/components/analysis-history";

export default function ResumeAnalyzerPage() {
  const resumeQuery = useCurrentResume();
  const historyQuery = useAnalysisHistory();
  const reanalyze = useAnalyzeResume();
  const deleteAnalysis = useDeleteAnalysis();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const resultsRef = React.useRef<HTMLDivElement>(null);

  const rows = historyQuery.data;
  // Default to the latest analysis; fall back to it if the selected one is deleted.
  const activeId = selectedId && rows?.some((row) => row.id === selectedId) ? selectedId : (rows?.[0]?.id ?? null);
  const analysisQuery = useResumeAnalysis(activeId);
  const analysis = analysisQuery.data;
  const activeIndex = rows?.findIndex((row) => row.id === activeId) ?? -1;
  const previousScore = activeIndex >= 0 ? (rows?.[activeIndex + 1]?.overallScore ?? null) : null;

  const showAnalysis = (next: ResumeAnalysis | string) => {
    setSelectedId(typeof next === "string" ? next : next.id);
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const runReanalysis = () => {
    if (!analysis) return;
    reanalyze.mutate(
      { targetRole: analysis.targetRoleInferred ? undefined : analysis.targetRole },
      {
        onSuccess: (result) => {
          toast.success("Re-analysis complete", { description: `Estimated ATS score: ${result.overallScore}/100` });
          showAnalysis(result);
        },
        onError: (error) => toast.error(error instanceof ApiError ? error.message : "The analysis could not be completed."),
      },
    );
  };

  const removeAnalysis = async (id: string) => {
    try {
      await deleteAnalysis.mutateAsync(id);
      toast.success("Analysis deleted");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not delete the analysis.");
    }
  };

  const loadingFirst = historyQuery.isLoading || (activeId !== null && analysisQuery.isLoading);

  return (
    <div className="space-y-6">
      <section className={lightHeroClassName}>
        <HeroWaves />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="max-w-[40rem] space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[hsl(var(--primary))] shadow-[var(--shadow-xs)]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              AI-powered
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-[hsl(var(--foreground))] sm:text-4xl">AI Resume Analyzer</h1>
            <p className="text-[15px] leading-relaxed text-[hsl(var(--foreground)/0.75)]">
              Get an estimated ATS compatibility score, a category-by-category breakdown and specific fixes drawn from your
              own resume. Paste a job description to see how well you match a particular role.
            </p>
          </div>
          <ul className="grid shrink-0 gap-2 text-sm text-[hsl(var(--foreground)/0.8)]">
            <li className="flex items-center gap-2"><FileSearch className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden="true" />Seven scored categories</li>
            <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden="true" />Feedback grounded in your text</li>
            <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden="true" />Private to you</li>
          </ul>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        <div className="xl:sticky xl:top-[96px] xl:self-start">
          {resumeQuery.isError ? (
            <div className="rounded-[20px] border border-[hsl(var(--border))] bg-white shadow-[var(--shadow-card)]">
              <ErrorState title="Couldn't load your resume" description="Check your connection and try again." onRetry={() => resumeQuery.refetch()} className="py-10" />
            </div>
          ) : (
            <ResumeUploadPanel resume={resumeQuery.data} isLoading={resumeQuery.isLoading} onAnalyzed={showAnalysis} />
          )}
        </div>

        <div ref={resultsRef} className="min-w-0 scroll-mt-24 space-y-6">
          {reanalyze.isPending || loadingFirst ? (
            <AnalysisSkeleton />
          ) : analysisQuery.isError ? (
            <div className="rounded-[20px] border border-[hsl(var(--border))] bg-white shadow-[var(--shadow-card)]">
              <ErrorState title="Couldn't load this analysis" description="It may have been deleted, or the connection dropped." onRetry={() => analysisQuery.refetch()} />
            </div>
          ) : analysis ? (
            <>
              <ScoreOverviewCard
                analysis={analysis}
                previousScore={previousScore}
                onReanalyze={runReanalysis}
                reanalyzing={reanalyze.isPending}
                canReanalyze={!!resumeQuery.data}
              />
              <AnalysisDetails key={analysis.id} analysis={analysis} />
            </>
          ) : (
            <div className="rounded-[20px] border border-dashed border-[hsl(var(--border))] bg-white px-6 py-14 text-center shadow-[var(--shadow-card)]">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
                <FileSearch className="h-8 w-8" aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-lg font-bold text-[hsl(var(--foreground))]">Your ATS score will appear here</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-[hsl(var(--muted-foreground))]">
                {resumeQuery.data
                  ? "Your resume is ready. Choose a target role or add a job description, then press Analyse resume."
                  : "Upload your resume as a PDF or DOCX to get your estimated ATS compatibility score and personalised feedback."}
              </p>
              <EstimateDisclaimer className="mx-auto mt-6 max-w-md text-left" />
            </div>
          )}

          <AnalysisHistory
            rows={rows}
            isLoading={historyQuery.isLoading}
            isError={historyQuery.isError}
            onRetry={() => historyQuery.refetch()}
            selectedId={activeId}
            onView={showAnalysis}
            onDelete={removeAnalysis}
            deletingId={deleteAnalysis.isPending ? (deleteAnalysis.variables ?? null) : null}
          />
        </div>
      </div>
    </div>
  );
}
