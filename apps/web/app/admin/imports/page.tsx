"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { ChevronRight, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { downloadFile, useImportJobs, useUploadImport } from "@/features/admin-imports/hooks/use-imports";
import { DemoBadge, StatusBadge, adminCard } from "@/features/admin-imports/components/import-ui";
import { ApiError } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AdminPageHeader, AdminPanelHeader } from "@/features/admin/components/admin-ui";

const field = "h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm outline-none focus:border-[#FF6B1A]/50 focus:ring-2 focus:ring-[#FF6B1A]/15";

export default function AdminImportsPage() {
  const router = useRouter();
  const jobs = useImportJobs();
  const uploadMutation = useUploadImport();
  const [kind, setKind] = React.useState("STUDENTS");
  const [mode, setMode] = React.useState("CREATE_ONLY");
  const [isDemoData, setIsDemoData] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [reimport, setReimport] = React.useState<{ reason: string; needed: boolean }>({ reason: "", needed: false });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("Choose an .xlsx file first.");
    setProgress(0);
    uploadMutation.mutate(
      { file, kind, mode, isDemoData, reimportReason: reimport.needed ? reimport.reason : undefined, onProgress: setProgress },
      {
        onSuccess: (job) => {
          toast.success("Uploaded. Validating in the background…");
          router.push(`/admin/imports/${job.id}`);
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 409) {
            setReimport((r) => ({ ...r, needed: true }));
            toast.error(error.message);
          } else toast.error("Upload failed", { description: error instanceof ApiError ? error.message : undefined });
        },
      },
    );
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <AdminPageHeader title="Bulk Imports" description="Upload, validate, preview and confirm student and faculty workbooks. Nothing is written until you confirm, imported people are invited (not active), and every step is audited." action={<div className="flex flex-wrap gap-2">
          {(["students", "faculty"] as const).map((k) => (
            <button key={k} type="button" onClick={() => downloadFile(`/admin/imports/templates/${k}`, `placecampus-${k}-template.xlsx`).catch(() => toast.error("Download failed"))} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-[#0B1F44] hover:border-[#FF6B1A]/50">
              <Download className="h-4 w-4" aria-hidden="true" /> {k === "students" ? "Students" : "Faculty"} template
            </button>
          ))}
        </div>} />

      <form onSubmit={submit} className={cn(adminCard, "overflow-hidden")}>
        <AdminPanelHeader icon={Upload} title="Upload workbook" />
        <div className="grid gap-4 p-5 md:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-[#64748B]">Import type</span>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className={field}>
            <option value="STUDENTS">Students</option>
            <option value="FACULTY">Faculty</option>
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-[#64748B]">Mode</span>
          <select value={mode} onChange={(e) => setMode(e.target.value)} className={field}>
            <option value="CREATE_ONLY">Create only (default): existing records are skipped</option>
            <option value="CREATE_AND_UPDATE_PROFILE">Create and fill empty profile fields</option>
          </select>
        </label>
        <label className="space-y-1.5 lg:col-span-2">
          <span className="text-xs font-semibold text-[#64748B]">Workbook (.xlsx, up to 10 MB)</span>
          <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={cn(field, "py-1.5 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-50 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-[#FF6B1A]")} />
        </label>
        <label className="flex items-start gap-2.5 md:col-span-2">
          <input type="checkbox" checked={isDemoData} onChange={(e) => setIsDemoData(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#FF6B1A]" />
          <span className="text-sm text-[#0B1F44]">
            <span className="font-semibold">This is demo / sample data.</span>{" "}
            <span className="text-[#64748B]">Demo records are never invited and never paired with real records. Development only.</span>
          </span>
        </label>
        {reimport.needed && (
          <label className="space-y-1.5 md:col-span-2">
            <span className="text-xs font-semibold text-red-700">This file was imported in the last 30 days. Why import it again?</span>
            <input value={reimport.reason} onChange={(e) => setReimport({ needed: true, reason: e.target.value })} className={field} placeholder="e.g. reconciliation check against existing records" />
          </label>
        )}
        <div className="flex items-end md:col-span-2 lg:col-span-4 lg:justify-end">
          <button type="submit" disabled={uploadMutation.isPending || !file || (reimport.needed && !reimport.reason.trim())} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#FF6B1A] px-5 text-sm font-semibold text-white hover:bg-[#EA580C] disabled:opacity-50">
            {uploadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
            {uploadMutation.isPending ? `Uploading ${progress}%` : "Upload and validate"}
          </button>
        </div>
        </div>
      </form>

      <section className={cn(adminCard, "overflow-hidden")}>
        <AdminPanelHeader icon={FileSpreadsheet} title="Import history" />
        {jobs.isLoading ? (
          <div className="space-y-2 p-5">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
        ) : !jobs.data?.length ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <FileSpreadsheet className="h-8 w-8 text-[#64748B]" aria-hidden="true" />
            <p className="text-sm text-[#64748B]">No imports yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#E5E7EB]">
            {jobs.data.map((j) => (
              <li key={j.id}>
                <Link href={`/admin/imports/${j.id}`} className="grid grid-cols-1 items-center gap-2 px-5 py-3.5 hover:bg-slate-50/70 md:grid-cols-[minmax(0,1.4fr)_auto_minmax(0,1fr)_auto]">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#0B1F44]">{j.fileName}</p>
                    <p className="text-xs text-[#64748B]">{j.kind === "STUDENTS" ? "Students" : "Faculty"} · {j.mode === "CREATE_ONLY" ? "Create only" : "Create + fill"} · {format(new Date(j.createdAt), "d MMM yyyy, h:mm a")}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5"><StatusBadge status={j.status} />{j.isDemoData && <DemoBadge />}</div>
                  <p className="text-xs text-[#64748B]">
                    {j.summary ? `${j.summary.total} rows · ${j.summary.create} new · ${j.summary.skipExisting} existing · ${j.summary.invalid + j.summary.conflict + j.summary.duplicate} blocked` : j.failureReason ?? "—"}
                    {j.progress?.processed ? ` · ${j.progress.created} created` : ""}
                  </p>
                  <ChevronRight className="hidden h-5 w-5 text-[#64748B] md:block" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
