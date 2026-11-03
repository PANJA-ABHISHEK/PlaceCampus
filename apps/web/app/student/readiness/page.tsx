"use client";

import * as React from "react";
import Link from "next/link";
import { CircleAlert, RotateCcw, TrendingUp } from "lucide-react";
import {
  useReadinessHistory,
  useStudentReadiness,
} from "@/features/readiness/hooks/use-readiness";
import { ReadinessHero } from "@/features/readiness/components/readiness-hero";
import {
  FactorBreakdown,
  HowItWorks,
  Insights,
  Recommendations,
  ScoreCard,
} from "@/features/readiness/components/readiness-sections";
import { Skeleton } from "@/components/ui/skeleton";

function ReadinessSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only">Loading readiness…</span>
      <div className="grid gap-6 lg:grid-cols-12">
        <Skeleton className="h-[420px] rounded-2xl lg:col-span-5" />
        <Skeleton className="h-[420px] rounded-2xl lg:col-span-7" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-[160px] rounded-2xl" />
        <Skeleton className="h-[160px] rounded-2xl" />
      </div>
      <Skeleton className="h-[200px] rounded-2xl" />
    </div>
  );
}

export default function ReadinessDashboardPage() {
  const { data: readiness, isLoading, isError, error, refetch } =
    useStudentReadiness();
  const { data: history } = useReadinessHistory();

  // The most recent snapshot calculated before the current one, if any.
  const previousScore = React.useMemo(() => {
    if (!readiness || !history?.length) return null;
    const current = new Date(readiness.calculatedAt).getTime();
    const earlier = history
      .filter((s) => new Date(s.calculatedAt).getTime() < current)
      .sort(
        (a, b) =>
          new Date(b.calculatedAt).getTime() -
          new Date(a.calculatedAt).getTime(),
      );
    return earlier[0]?.overallScore ?? null;
  }, [readiness, history]);

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      <ReadinessHero
        status={readiness?.status}
        coverageCount={readiness?.coverageCount}
        calculatedAt={readiness?.calculatedAt}
      />

      {isLoading ? (
        <ReadinessSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50/60 px-6 py-12 text-center">
          <CircleAlert className="h-8 w-8 text-red-600" aria-hidden="true" />
          <div>
            <p className="font-semibold text-red-900">We couldn&apos;t load your readiness</p>
            <p className="mt-1 text-sm text-red-800/80">
              {error instanceof Error ? error.message : "Please try again."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : !readiness ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[hsl(var(--primary)/0.3)] bg-white px-6 py-14 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
            <TrendingUp className="h-8 w-8" aria-hidden="true" />
          </span>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Your readiness profile is still being built</h2>
          <p className="max-w-[30rem] text-sm text-[hsl(var(--muted-foreground))]">
            Add evidence, complete an assessment, or book a mock interview to generate your baseline score.
          </p>
          <Link href="/student/evidence" className="mt-2 inline-flex h-10 items-center rounded-xl bg-[hsl(var(--primary))] px-5 text-sm font-semibold text-white hover:bg-[hsl(var(--color-primary-600))]">
            Add Evidence
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <ScoreCard snapshot={readiness} previousScore={previousScore} />
            </div>
            <div className="lg:col-span-7">
              <FactorBreakdown snapshot={readiness} />
            </div>
          </div>
          <Insights snapshot={readiness} />
          <Recommendations snapshot={readiness} />
          <HowItWorks snapshot={readiness} />
        </>
      )}
    </div>
  );
}
