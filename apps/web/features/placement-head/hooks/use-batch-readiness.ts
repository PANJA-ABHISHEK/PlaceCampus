import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, ApiError } from "@/lib/api-client";
import { ANALYTICS_KEYS } from "@/features/analytics/hooks/use-analytics";

export type BatchRunStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "COMPLETED_WITH_ERRORS" | "FAILED";

export interface BatchRun {
  id: string;
  scope: { graduationYear?: number; department?: string };
  trigger: string;
  status: BatchRunStatus;
  executor?: "BULL" | "IN_PROCESS";
  total: number;
  totalChunks: number;
  chunksCompleted: number;
  processed: number;
  updated: number;
  unchanged: number;
  failed: number;
  failures?: { studentId: string; error: string }[];
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  elapsedMs: number;
  progress: number;
  error?: string;
  createdAt: string;
}

const RUNS_KEY = ["readiness", "batch-runs"] as const;
export const isActive = (run?: BatchRun) => !!run && (run.status === "QUEUED" || run.status === "RUNNING");

/** Recent runs; polls quickly while one is in progress and refreshes analytics when it finishes. */
export function useBatchRuns() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: RUNS_KEY,
    queryFn: () => apiClient.get<BatchRun[]>("/readiness/batch-runs", { params: { limit: "8" } }),
    refetchInterval: (q) => (isActive(q.state.data?.[0]) ? 1_500 : 30_000),
  });

  const latest = query.data?.[0];
  const previous = React.useRef<BatchRun | undefined>(undefined);
  React.useEffect(() => {
    const before = previous.current;
    previous.current = latest;
    if (before && latest && before.id === latest.id && isActive(before) && !isActive(latest)) {
      void queryClient.invalidateQueries({ queryKey: ANALYTICS_KEYS.all });
      const seconds = ((latest.durationMs ?? 0) / 1000).toFixed(1);
      if (latest.status === "COMPLETED") toast.success(`Batch readiness finished for ${latest.total.toLocaleString()} students in ${seconds}s`);
      else if (latest.status === "COMPLETED_WITH_ERRORS") toast.warning(`Batch readiness finished with ${latest.failed} failure(s)`);
      else toast.error("Batch readiness run failed", { description: latest.error });
    }
  }, [latest, queryClient]);

  return query;
}

export function useStartBatchRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scope: { graduationYear?: number; department?: string }) =>
      apiClient.post<BatchRun>("/readiness/batch-runs", scope),
    onSuccess: (run) => {
      toast.success(`Batch readiness started for ${run.total.toLocaleString()} students`);
      void queryClient.invalidateQueries({ queryKey: RUNS_KEY });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError && error.status === 409 ? "A batch run is already in progress." : "Could not start the batch run.");
      void queryClient.invalidateQueries({ queryKey: RUNS_KEY });
    },
  });
}
