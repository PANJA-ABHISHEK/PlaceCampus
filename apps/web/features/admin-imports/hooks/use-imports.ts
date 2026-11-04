import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type ImportStatus =
  | "UPLOADED" | "VALIDATING" | "VALIDATION_FAILED" | "AWAITING_CONFIRMATION" | "COMMITTING" | "COMMITTED"
  | "PARTIALLY_COMMITTED" | "COMMIT_FAILED" | "CANCELLED" | "EXPIRED" | "REVERTING" | "REVERTED" | "REVERT_PARTIAL";
export type RowAction = "CREATE" | "UPDATE" | "UNCHANGED" | "SKIP_EXISTING" | "INVALID" | "DUPLICATE_IN_FILE" | "SKIPPED_IDENTICAL" | "CONFLICT";

export interface MappingState {
  sourceValue: string;
  rows: number;
  mappingId: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  code: string | null;
  suggestion: { code: string; reason: string } | null;
}

export interface ImportJob {
  id: string;
  kind: "STUDENTS" | "FACULTY";
  mode: "CREATE_ONLY" | "CREATE_AND_UPDATE_PROFILE";
  status: ImportStatus;
  fileName: string;
  fileSha256: string;
  fileSize?: number;
  sheetName?: string;
  template?: "OFFICIAL" | "MAPPED";
  columnMap: { source: string; target: string }[];
  ignoredColumns: string[];
  sourceNotes: { sheet: string; text: string }[];
  fileWarnings: { code: string; message: string }[];
  failureReason?: string;
  isDemoData: boolean;
  summary?: Record<string, number>;
  progress?: { processed: number; created: number; updated: number; failed: number; chunks: number };
  confirmedAt?: string;
  committedAt?: string;
  expiresAt?: string;
  revert?: { reason: string; deactivated: number; kept: number; restored: number; conflicts: number; purged?: boolean };
  derivedReview?: { status: "APPROVED" | "REJECTED"; count: number };
  createdAt: string;
  mappings?: { departments: MappingState[]; programmes: MappingState[] };
}

export interface ImportRowItem {
  id: string;
  rowNumber: number;
  raw: Record<string, unknown>;
  normalized: Record<string, unknown>;
  action: RowAction;
  naturalKey?: string;
  matchedBy?: string;
  diff: { field: string; current: unknown; proposed: unknown; apply: boolean; note?: string }[];
  rowErrors: { field?: string; code: string; message: string }[];
  warnings: { field?: string; code: string; message: string }[];
  result?: { status: string; error?: string };
}

export interface OrgLookup {
  _id: string;
  type: "DEPARTMENT" | "PROGRAMME";
  code: string;
  name: string;
  departmentCode?: string;
  durationYears?: number;
  active: boolean;
}

const KEYS = {
  all: ["admin", "imports"] as const,
  list: () => [...KEYS.all, "list"] as const,
  job: (id: string) => [...KEYS.all, "job", id] as const,
  rows: (id: string, q: string) => [...KEYS.all, "rows", id, q] as const,
  lookups: () => ["admin", "org", "lookups"] as const,
};

const BUSY: ImportStatus[] = ["UPLOADED", "VALIDATING", "COMMITTING", "REVERTING"];
export const isBusy = (s?: ImportStatus) => !!s && BUSY.includes(s);

export function useImportJobs() {
  return useQuery({
    queryKey: KEYS.list(),
    queryFn: () => apiClient.get<ImportJob[]>("/admin/imports"),
    refetchInterval: (q) => ((q.state.data ?? []).some((j) => isBusy(j.status)) ? 2000 : false),
  });
}

export function useImportJob(id: string) {
  return useQuery({
    queryKey: KEYS.job(id),
    queryFn: () => apiClient.get<ImportJob>(`/admin/imports/${id}`),
    enabled: !!id,
    refetchInterval: (q) => (isBusy(q.state.data?.status) ? 1500 : false),
  });
}

export function useImportRows(id: string, q: { action?: string; issue?: string; search?: string; page: number }) {
  const params: Record<string, string> = { page: String(q.page), limit: "25" };
  if (q.action) params.action = q.action;
  if (q.issue) params.issue = q.issue;
  if (q.search) params.search = q.search;
  return useQuery({
    queryKey: KEYS.rows(id, JSON.stringify(params)),
    queryFn: () =>
      apiClient.get<{ items: ImportRowItem[]; total: number; page: number; limit: number; issueCodes: { code: string; rows: number }[] }>(`/admin/imports/${id}/rows`, { params }),
    enabled: !!id,
    placeholderData: (prev) => prev,
  });
}

export function useLookups() {
  return useQuery({ queryKey: KEYS.lookups(), queryFn: () => apiClient.get<OrgLookup[]>("/admin/org/lookups") });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: KEYS.all });
    qc.invalidateQueries({ queryKey: ["admin", "org"] });
    qc.invalidateQueries({ queryKey: ["admin", "assignments"] });
  };
}

export function useUploadImport() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { file: File; kind: string; mode: string; isDemoData: boolean; reimportReason?: string; onProgress?: (p: number) => void }) => {
      const fd = new FormData();
      fd.append("file", v.file);
      fd.append("kind", v.kind);
      fd.append("mode", v.mode);
      fd.append("isDemoData", String(v.isDemoData));
      if (v.reimportReason) fd.append("reimportReason", v.reimportReason);
      return apiClient.upload<ImportJob>("/admin/imports", fd, v.onProgress);
    },
    onSuccess: invalidate,
  });
}

/** Generic POST action on a batch (confirm, cancel, revert, purge, derived, emails, revalidate, retry). */
export function useImportAction() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { id: string; action: string; body?: unknown; idempotencyKey?: string }) =>
      apiClient.post<unknown>(`/admin/imports/${v.id}/${v.action}`, v.body ?? {}, v.idempotencyKey ? { headers: { "Idempotency-Key": v.idempotencyKey } } : undefined),
    onSuccess: invalidate,
  });
}

export function useCreateLookup() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { type: "DEPARTMENT" | "PROGRAMME"; code: string; name: string; departmentCode?: string; durationYears?: number; lateralEntry?: boolean }) =>
      apiClient.post<OrgLookup>("/admin/org/lookups", v),
    onSuccess: invalidate,
  });
}

export function useDecideMapping() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { id: string; action: "APPROVE" | "REJECT" | "RESET"; code?: string; reason?: string }) =>
      apiClient.patch<{ applied: { students: number; faculty: number } }>(`/admin/org/mappings/${v.id}`, { action: v.action, code: v.code, reason: v.reason }),
    onSuccess: invalidate,
  });
}

/** Authenticated file download (report / template). */
export async function downloadFile(path: string, filename: string) {
  const blob = await apiClient.get<Blob>(path, { responseType: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
