"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Loader2,
  Search,
  Upload,
  Users,
  GraduationCap,
  X,
} from "lucide-react";
import { downloadFile, useImportJobs, useUploadImport, type ImportJob, type ImportStatus } from "@/features/admin-imports/hooks/use-imports";
import { DemoBadge, adminCard } from "@/features/admin-imports/components/import-ui";
import { ApiError } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const inputClass = "h-10 w-full rounded-xl border border-[#DCE3EC] bg-white px-3 text-sm text-[#142B4D] outline-none transition focus:border-[#FF6B1A]/60 focus:ring-2 focus:ring-[#FF6B1A]/15";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function statusLabel(status: ImportStatus) {
  const labels: Partial<Record<ImportStatus, string>> = {
    UPLOADED: "Uploaded",
    VALIDATING: "Validating",
    VALIDATION_FAILED: "Validation failed",
    AWAITING_CONFIRMATION: "Ready to confirm",
    COMMITTING: "Importing",
    COMMITTED: "Completed",
    PARTIALLY_COMMITTED: "Partially completed",
    COMMIT_FAILED: "Import failed",
    CANCELLED: "Cancelled",
    EXPIRED: "Expired",
    REVERTING: "Reverting",
    REVERTED: "Reverted",
    REVERT_PARTIAL: "Partially reverted",
  };
  return labels[status] ?? status.replaceAll("_", " ").toLowerCase();
}

function statusTone(status: ImportStatus) {
  if (["COMMITTED"].includes(status)) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (["VALIDATION_FAILED", "COMMIT_FAILED"].includes(status)) return "bg-red-50 text-red-700 ring-red-200";
  if (["UPLOADED", "VALIDATING", "COMMITTING", "REVERTING"].includes(status)) return "bg-orange-50 text-[#C54C0B] ring-orange-200";
  if (["AWAITING_CONFIRMATION", "PARTIALLY_COMMITTED", "REVERT_PARTIAL"].includes(status)) return "bg-amber-50 text-amber-800 ring-amber-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function recordSummary(job: ImportJob) {
  const s = job.summary;
  if (!s) return job.failureReason || "Summary will appear after validation";
  const total = s.total ?? 0;
  const created = job.progress?.created ?? (job.status === "COMMITTED" ? s.create ?? 0 : undefined);
  const blocked = (s.invalid ?? 0) + (s.conflict ?? 0) + (s.duplicate ?? 0);
  return `${total} total · ${s.create ?? 0} new · ${s.skipExisting ?? 0} existing · ${blocked} blocked${created !== undefined ? ` · ${created} created` : ""}`;
}

function readableDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : format(date, "d MMM yyyy, h:mm a");
}

export default function AdminImportsPage() {
  const router = useRouter();
  const jobs = useImportJobs();
  const uploadMutation = useUploadImport();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [kind, setKind] = React.useState<"STUDENTS" | "FACULTY">("STUDENTS");
  const [mode, setMode] = React.useState("CREATE_ONLY");
  const [isDemoData, setIsDemoData] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [reimport, setReimport] = React.useState<{ reason: string; needed: boolean }>({ reason: "", needed: false });
  const [search, setSearch] = React.useState("");
  const [kindFilter, setKindFilter] = React.useState("ALL");
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  const selectFile = (candidate?: File) => {
    if (!candidate) return setFile(null);
    if (!candidate.name.toLowerCase().endsWith(".xlsx")) {
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.error("Choose an Excel workbook", { description: "The supported format is .xlsx." });
      return;
    }
    if (candidate.size > MAX_FILE_SIZE) {
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.error("This file is too large", { description: "Choose a workbook smaller than 10 MB." });
      return;
    }
    setFile(candidate);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("Choose an .xlsx file first.");
    setProgress(0);
    uploadMutation.mutate(
      { file, kind, mode, isDemoData, reimportReason: reimport.needed ? reimport.reason : undefined, onProgress: setProgress },
      {
        onSuccess: (job) => {
          toast.success("Workbook uploaded", { description: "Validation is running. Opening the import review." });
          router.push(`/admin/imports/${job.id}`);
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 409) {
            setReimport((r) => ({ ...r, needed: true }));
            toast.error(error.message);
          } else toast.error("Upload failed", { description: error instanceof ApiError ? error.message : "Please try again." });
        },
      },
    );
  };

  const visibleJobs = (jobs.data ?? []).filter((job) => {
    const matchesSearch = `${job.fileName} ${job.kind}`.toLowerCase().includes(search.trim().toLowerCase());
    return matchesSearch && (kindFilter === "ALL" || job.kind === kindFilter) && (statusFilter === "ALL" || job.status === statusFilter);
  });
  const availableStatuses = Array.from(new Set((jobs.data ?? []).map((job) => job.status)));
  const busy = uploadMutation.isPending;

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FF6B1A]">Admin / Bulk Imports</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#142B4D] sm:text-3xl">Bulk Imports</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Upload student or faculty Excel files, review the data, and import records securely.</p>
        </div>
        <div className="flex flex-col gap-2 xs:flex-row sm:shrink-0">
          {(["students", "faculty"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => downloadFile(`/admin/imports/templates/${type}`, `placecampus-${type}-template.xlsx`).catch(() => toast.error("Template download failed", { description: "Please try again." }))}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#DCE3EC] bg-white px-3.5 text-sm font-semibold text-[#142B4D] transition hover:border-[#FF6B1A]/50 hover:bg-orange-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B1A]/30"
            >
              <Download className="h-4 w-4 text-[#FF6B1A]" aria-hidden="true" />
              Download {type === "students" ? "Student" : "Faculty"} Template
            </button>
          ))}
        </div>
      </header>

      <form onSubmit={submit} className={cn(adminCard, "p-5 sm:p-6")}>
        <div className="mb-6 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6B1A]"><Upload className="h-5 w-5" aria-hidden="true" /></span>
          <div>
            <h2 className="text-lg font-bold text-[#142B4D]">Upload Workbook</h2>
            <p className="mt-0.5 text-sm text-slate-600">Select the type of records and upload your Excel workbook.</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.85fr_0.9fr_1.35fr]">
          <section aria-labelledby="import-type-heading">
            <StepHeading number="1" title="Select import type" id="import-type-heading" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" aria-pressed={kind === "STUDENTS"} onClick={() => setKind("STUDENTS")} className={cn("flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition", kind === "STUDENTS" ? "border-[#FF6B1A] bg-orange-50 text-[#E9540A]" : "border-[#DCE3EC] bg-white text-[#142B4D] hover:border-orange-200 hover:bg-orange-50/40")}>
                <Users className="h-4 w-4" aria-hidden="true" /> Students {kind === "STUDENTS" && <Check className="ml-auto h-4 w-4" aria-hidden="true" />}
              </button>
              <button type="button" aria-pressed={kind === "FACULTY"} onClick={() => setKind("FACULTY")} className={cn("flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition", kind === "FACULTY" ? "border-[#FF6B1A] bg-orange-50 text-[#E9540A]" : "border-[#DCE3EC] bg-white text-[#142B4D] hover:border-orange-200 hover:bg-orange-50/40")}>
                <GraduationCap className="h-4 w-4" aria-hidden="true" /> Faculty {kind === "FACULTY" && <Check className="ml-auto h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          </section>

          <section aria-labelledby="import-mode-heading">
            <StepHeading number="2" title="Choose import mode" id="import-mode-heading" />
            <div className="relative mt-3">
              <select aria-label="Import mode" value={mode} onChange={(e) => setMode(e.target.value)} className={cn(inputClass, "appearance-none pr-9")}>
                <option value="CREATE_ONLY">Create only (default)</option>
                <option value="CREATE_AND_UPDATE_PROFILE">Create and fill empty profile fields</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-500" aria-hidden="true" />
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">Choose whether existing profiles can have empty fields filled.</p>
          </section>

          <section aria-labelledby="upload-file-heading">
            <StepHeading number="3" title="Upload Excel file" id="upload-file-heading" />
            <input ref={fileInputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(e) => selectFile(e.target.files?.[0])} />
            {file ? (
              <div className="mt-3 flex min-h-[112px] items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700"><FileSpreadsheet className="h-5 w-5" aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#142B4D]">{file.name}</p>
                  <p className="text-xs text-slate-600">{(file.size / (1024 * 1024)).toFixed(2)} MB · Ready to upload</p>
                </div>
                <button type="button" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-600 hover:bg-white hover:text-[#142B4D]" aria-label="Remove selected file"><X className="h-4 w-4" /> Remove</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); selectFile(e.dataTransfer.files[0]); }}
                className={cn("mt-3 flex min-h-[112px] w-full flex-col items-center justify-center rounded-xl border border-dashed px-4 py-4 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B1A]/30", dragging ? "border-[#FF6B1A] bg-orange-50" : "border-slate-300 bg-slate-50/70 hover:border-orange-300 hover:bg-orange-50/40")}
              >
                <Upload className="mb-2 h-6 w-6 text-[#FF6B1A]" aria-hidden="true" />
                <span className="text-sm font-semibold text-[#142B4D]">Drag your Excel file here or <span className="text-[#FF6B1A]">Browse files</span></span>
                <span className="mt-1 text-xs text-slate-500">Supported format: .xlsx · Maximum size: 10 MB</span>
              </button>
            )}
          </section>
        </div>

        {reimport.needed && (
          <label className="mt-5 block max-w-2xl space-y-1.5">
            <span className="text-sm font-semibold text-red-700">This file was imported recently. Add a reason to continue.</span>
            <input value={reimport.reason} onChange={(e) => setReimport({ needed: true, reason: e.target.value })} className={inputClass} placeholder="Reason for importing this file again" />
          </label>
        )}

        <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 px-3.5 py-3 sm:max-w-[700px]">
            <input type="checkbox" checked={isDemoData} onChange={(e) => setIsDemoData(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF6B1A]" />
            <span className="text-sm leading-5 text-[#142B4D]">
              <span className="font-semibold">Demo / sample data.</span> <span className="text-slate-600">These records will not be invited or paired with real accounts.</span>
            </span>
          </label>
          <button type="submit" disabled={busy || !file || (reimport.needed && !reimport.reason.trim())} className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FF6B1A] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#EA580C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B1A]/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
            {busy ? `Uploading${progress > 0 ? ` ${progress}%` : "…"}` : "Upload & Validate"}
          </button>
        </div>
      </form>

      <section className={cn(adminCard, "overflow-hidden")}>
        <div className="flex flex-col gap-4 border-b border-[#E8EDF3] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-[#142B4D]">Import History</h2>
            <p className="mt-0.5 text-sm text-slate-500">Review validation results and completed imports.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(180px,260px)_145px_160px]">
            <label className="relative">
              <span className="sr-only">Search imports</span>
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} className={cn(inputClass, "pl-9")} placeholder="Search by file name…" />
            </label>
            <label className="relative">
              <span className="sr-only">Filter by import type</span>
              <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} className={cn(inputClass, "appearance-none pr-8")}>
                <option value="ALL">All types</option><option value="STUDENTS">Students</option><option value="FACULTY">Faculty</option>
              </select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" />
            </label>
            <label className="relative">
              <span className="sr-only">Filter by status</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={cn(inputClass, "appearance-none pr-8")}>
                <option value="ALL">All statuses</option>{availableStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" />
            </label>
          </div>
        </div>

        {jobs.isLoading ? (
          <div className="space-y-2 p-5">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : jobs.isError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <AlertCircle className="h-8 w-8 text-red-500" aria-hidden="true" />
            <div><p className="font-semibold text-[#142B4D]">Couldn’t load import history</p><p className="mt-1 text-sm text-slate-500">Check your connection and try again.</p></div>
            <button type="button" onClick={() => jobs.refetch()} className="rounded-lg border border-[#DCE3EC] px-3 py-2 text-sm font-semibold text-[#142B4D] hover:bg-slate-50">Try again</button>
          </div>
        ) : !visibleJobs.length ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            {jobs.data?.length ? <Search className="h-8 w-8 text-slate-400" aria-hidden="true" /> : <FileSpreadsheet className="h-8 w-8 text-slate-400" aria-hidden="true" />}
            <p className="font-semibold text-[#142B4D]">{jobs.data?.length ? "No matching imports" : "No imports yet"}</p>
            <p className="text-sm text-slate-500">{jobs.data?.length ? "Try another search or filter." : "Validated and completed imports will appear here."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr><th className="px-5 py-3">File name</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Records</th><th className="px-5 py-3 text-right">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleJobs.map((job) => (
                  <tr key={job.id} className="transition hover:bg-slate-50/70">
                    <td className="max-w-[250px] px-5 py-3.5">
                      <div className="flex min-w-0 items-center gap-2.5"><FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" /><span className="truncate text-sm font-semibold text-[#142B4D]">{job.fileName}</span></div>
                      {job.isDemoData && <div className="mt-1 pl-7"><DemoBadge /></div>}
                    </td>
                    <td className="px-4 py-3.5"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{job.kind === "STUDENTS" ? "Students" : "Faculty"}</span></td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-sm text-slate-600">{readableDate(job.createdAt)}</td>
                    <td className="px-4 py-3.5"><span className={cn("inline-flex whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold ring-1", statusTone(job.status))}>{statusLabel(job.status)}</span></td>
                    <td className="max-w-[340px] px-4 py-3.5 text-xs leading-5 text-slate-600">{recordSummary(job)}</td>
                    <td className="px-5 py-3.5 text-right"><Link href={`/admin/imports/${job.id}`} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-sm font-semibold text-[#E9540A] hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B1A]/30">View details <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StepHeading({ number, title, id }: { number: string; title: string; id: string }) {
  return <h3 id={id} className="flex items-center gap-2.5 text-sm font-semibold text-[#142B4D]"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FF6B1A] text-xs font-bold text-white">{number}</span>{title}</h3>;
}
