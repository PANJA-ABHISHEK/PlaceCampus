"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, Download, FileSpreadsheet, Info, Loader2, RefreshCw, Search, XCircle } from "lucide-react";
import {
  type ImportJob,
  type MappingState,
  downloadFile,
  isBusy,
  useCreateLookup,
  useDecideMapping,
  useImportAction,
  useImportJob,
  useImportRows,
  useLookups,
} from "@/features/admin-imports/hooks/use-imports";
import { ACTION_META, DemoBadge, Stat, StatusBadge, adminCard } from "@/features/admin-imports/components/import-ui";
import { ApiError } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AdminPanelHeader } from "@/features/admin/components/admin-ui";

const field = "h-9 rounded-lg border border-[#E5E7EB] bg-white px-2.5 text-sm outline-none focus:border-[#FF6B1A]/50 focus:ring-2 focus:ring-[#FF6B1A]/15";
const btn = "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold disabled:opacity-50";
const errText = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong.");

export default function ImportBatchPage() {
  const { id } = useParams() as { id: string };
  const { data: job, isLoading, isError } = useImportJob(id);
  const action = useImportAction();

  if (isLoading) return <div className="mx-auto max-w-[1200px] space-y-4"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>;
  if (isError || !job) return <p className="text-center text-sm text-red-700">Import batch not found.</p>;

  const run = (name: string, body?: unknown, ok?: string) =>
    action.mutate({ id, action: name, body }, { onSuccess: () => ok && toast.success(ok), onError: (e) => toast.error(errText(e)) });

  const s = job.summary;
  const awaiting = job.status === "AWAITING_CONFIRMATION";
  const committed = ["COMMITTED", "PARTIALLY_COMMITTED"].includes(job.status);

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <Link href="/admin/imports" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0B1F44]/75 hover:text-[#FF6B1A]"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> All imports</Link>

      <section className={cn(adminCard, "overflow-hidden")}>
        <AdminPanelHeader icon={FileSpreadsheet} title={job.fileName}>
          <div className="flex flex-wrap gap-2">
            {s && (
              <button type="button" onClick={() => downloadFile(`/admin/imports/${id}/report`, `import-${id}-report.xlsx`).catch(() => toast.error("Download failed"))} className={cn(btn, "border border-[#E5E7EB] bg-white text-[#0B1F44]")}>
                <Download className="h-4 w-4" aria-hidden="true" /> Error report
              </button>
            )}
            {(awaiting || job.status === "VALIDATION_FAILED") && (
              <>
                <button type="button" onClick={() => run("revalidate", undefined, "Re-validating…")} className={cn(btn, "border border-[#E5E7EB] bg-white text-[#0B1F44]")}><RefreshCw className="h-4 w-4" aria-hidden="true" /> Re-validate</button>
                <button type="button" onClick={() => run("cancel", undefined, "Batch cancelled")} className={cn(btn, "border border-red-200 bg-white text-red-700")}><XCircle className="h-4 w-4" aria-hidden="true" /> Cancel</button>
              </>
            )}
          </div>
        </AdminPanelHeader>
        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
            <StatusBadge status={job.status} />
            {job.isDemoData && <DemoBadge />}
            <span>{job.kind === "STUDENTS" ? "Students" : "Faculty"} · {job.mode === "CREATE_ONLY" ? "Create only" : "Create + fill empty fields"}</span>
            {job.template && <span>· {job.template === "OFFICIAL" ? "Official template" : "Column-mapped workbook"}</span>}
            {job.sheetName && <span>· sheet “{job.sheetName}”</span>}
            <span>· uploaded {format(new Date(job.createdAt), "d MMM yyyy, h:mm a")}</span>
          </div>
          <p className="break-all font-mono text-[11px] text-[#64748B]">SHA-256 {job.fileSha256}</p>
        </div>
      </section>

      {isBusy(job.status) && <Progress job={job} />}
      {job.status === "VALIDATION_FAILED" && (
        <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><XCircle className="h-5 w-5 shrink-0" aria-hidden="true" /><span><b>Validation failed.</b> {job.failureReason}</span></div>
      )}

      {s && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          <Stat label="Rows" value={s.total} />
          <Stat label="Will create" value={s.create} tone="text-emerald-700" />
          <Stat label="Existing (matched)" value={s.skipExisting + s.unchanged + s.update} />
          <Stat label="Will update" value={s.update} tone="text-blue-700" />
          <Stat label="Invalid" value={s.invalid} tone={s.invalid ? "text-red-700" : undefined} />
          <Stat label="Duplicates" value={s.duplicate + s.skippedIdentical} tone={s.duplicate ? "text-red-700" : undefined} />
          <Stat label="Conflicts" value={s.conflict} tone={s.conflict ? "text-red-700" : undefined} />
          <Stat label="Rows with warnings" value={s.warnings} tone={s.warnings ? "text-amber-700" : undefined} />
        </section>
      )}

      {committed && job.progress && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          Committed {job.committedAt && format(new Date(job.committedAt), "d MMM yyyy, h:mm a")}: {job.progress.created} created, {job.progress.updated} updated, {job.progress.failed} failed, in {job.progress.chunks} chunk(s).
        </div>
      )}
      {job.revert && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
          {job.revert.purged ? "Demo batch purged" : "Reverted"}: {job.revert.deactivated} account(s) {job.revert.purged ? "removed" : "deactivated"}, {job.revert.kept} kept for review, {job.revert.restored} restored, {job.revert.conflicts} conflict(s). Reason: {job.revert.reason}
        </div>
      )}

      <SourceFacts job={job} />
      {job.mappings && (job.mappings.departments.length > 0 || job.mappings.programmes.length > 0) && <MappingReview job={job} />}
      {s && <Rows id={id} />}
      {awaiting && s && <ConfirmPanel job={job} />}
      {(committed || job.status === "COMMIT_FAILED" || job.status === "REVERTED" || job.status === "REVERT_PARTIAL") && <AfterCommit job={job} />}
    </div>
  );
}

function Progress({ job }: { job: ImportJob }) {
  const applicable = (job.summary?.create ?? 0) + (job.summary?.update ?? 0);
  const done = job.progress?.processed ?? 0;
  const pct = job.status === "COMMITTING" && applicable ? Math.round((done / applicable) * 100) : null;
  return (
    <div className={cn(adminCard, "space-y-2 p-5")} role="status">
      <p className="flex items-center gap-2 text-sm font-semibold text-[#0B1F44]"><Loader2 className="h-4 w-4 animate-spin text-[#FF6B1A]" aria-hidden="true" />
        {job.status === "COMMITTING" ? `Committing in chunks of 200 — ${done} of ${applicable} rows` : job.status === "REVERTING" ? "Reverting…" : "Validating the workbook…"}
      </p>
      {pct !== null && <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#FF6B1A] transition-[width]" style={{ width: `${pct}%` }} /></div>}
    </div>
  );
}

function SourceFacts({ job }: { job: ImportJob }) {
  if (!job.fileWarnings.length && !job.sourceNotes.length && !job.columnMap.length) return null;
  return (
    <section className={cn(adminCard, "overflow-hidden")}>
      <AdminPanelHeader icon={Info} title="Source and column details" />
      <div className="grid gap-6 p-5 lg:grid-cols-2">
      <div className="space-y-3">
        <h2 className="font-bold text-[#0B1F44]">How this file is treated</h2>
        <ul className="space-y-2 text-sm">
          {job.fileWarnings.map((w, i) => (
            <li key={i} className="flex gap-2 text-[#0B1F44]/85"><Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />{w.message}</li>
          ))}
        </ul>
        {job.sourceNotes.length > 0 && (
          <details className="rounded-xl bg-slate-50 p-3 text-sm">
            <summary className="cursor-pointer font-semibold text-[#0B1F44]">What the source says ({job.sourceNotes.length} notes, kept in the audit trail)</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[#0B1F44]/80">{job.sourceNotes.map((n, i) => <li key={i}><span className="text-[#64748B]">[{n.sheet}]</span> {n.text}</li>)}</ul>
          </details>
        )}
      </div>
      <div className="space-y-3">
        <h2 className="font-bold text-[#0B1F44]">Column mapping</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-[#64748B]"><tr><th className="pb-1.5">Source column</th><th className="pb-1.5">PlaceCampus field</th></tr></thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {job.columnMap.map((c) => (
              <tr key={c.source}><td className="py-1.5 text-[#0B1F44]">{c.source}</td><td className="py-1.5 font-mono text-xs text-[#64748B]">{c.target}{["cgpa", "sr_no"].includes(c.target) && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 font-sans font-semibold">excluded</span>}{["graduation_batch", "current_semester"].includes(c.target) && <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 font-sans font-semibold text-amber-800">derived · pending</span>}</td></tr>
            ))}
            {job.ignoredColumns.map((c) => <tr key={c}><td className="py-1.5 text-[#64748B] line-through">{c}</td><td className="py-1.5 text-xs text-[#64748B]">not in template (ignored)</td></tr>)}
          </tbody>
        </table>
      </div>
      </div>
    </section>
  );
}

function MappingReview({ job }: { job: ImportJob }) {
  return (
    <section className={cn(adminCard, "overflow-hidden")}>
      <AdminPanelHeader icon={Info} title="Department and programme mapping" />
      <div className="space-y-5 p-5">
      <div>
        <p className="mt-1 text-sm text-[#64748B]">
          Only approved mappings are used. Exact matches to an approved department map automatically; everything else needs your decision. Suggestions are hints only. Unmapped students are still imported but stay in the exception queue (no mentor) until approved.
        </p>
      </div>
      <MappingTable title="Departments (School)" type="DEPARTMENT" rows={job.mappings!.departments} jobStatus={job.status} jobId={job.id} />
      {job.kind === "STUDENTS" && <MappingTable title="Programmes" type="PROGRAMME" rows={job.mappings!.programmes} jobStatus={job.status} jobId={job.id} />}
      </div>
    </section>
  );
}

function MappingTable({ title, type, rows, jobStatus, jobId }: { title: string; type: "DEPARTMENT" | "PROGRAMME"; rows: MappingState[]; jobStatus: string; jobId: string }) {
  const lookups = useLookups();
  const options = (lookups.data ?? []).filter((l) => l.type === type && l.active);
  const pending = rows.filter((r) => r.status !== "APPROVED").length;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-[#0B1F44]">{title} <span className="font-medium text-[#64748B]">· {rows.length} values, {pending} not approved</span></h3>
      <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-[#64748B]"><tr><th className="px-3 py-2">Source value</th><th className="px-3 py-2">Rows</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Decision</th></tr></thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {rows.map((r) => <MappingRow key={r.sourceValue} row={r} type={type} options={options} jobStatus={jobStatus} jobId={jobId} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MappingRow({ row, type, options, jobStatus, jobId }: { row: MappingState; type: "DEPARTMENT" | "PROGRAMME"; options: { code: string; name: string }[]; jobStatus: string; jobId: string }) {
  const decide = useDecideMapping();
  const create = useCreateLookup();
  const action = useImportAction();
  const departments = useLookups().data?.filter((l) => l.type === "DEPARTMENT" && l.active) ?? [];
  const [code, setCode] = React.useState(row.code ?? row.suggestion?.code ?? "");
  const [mode, setMode] = React.useState<"idle" | "create" | "reject">("idle");
  const [draft, setDraft] = React.useState({ code: "", name: row.sourceValue, departmentCode: "", durationYears: "" });
  const [reason, setReason] = React.useState("");

  const afterDecision = (applied?: { students: number; faculty: number }) => {
    toast.success("Mapping saved", { description: applied ? `Applied to ${applied.students} student and ${applied.faculty} faculty record(s).` : undefined });
    if (jobStatus === "AWAITING_CONFIRMATION") action.mutate({ id: jobId, action: "revalidate" });
    setMode("idle");
  };
  const approve = (c: string) => { if (row.mappingId) decide.mutate({ id: row.mappingId, action: "APPROVE", code: c }, { onSuccess: (r) => afterDecision(r.applied), onError: (e) => toast.error(errText(e)) }); };

  const status =
    row.status === "APPROVED" ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />{row.code}</span>
    : row.status === "REJECTED" ? <span className="text-xs font-semibold text-red-700">Rejected</span>
    : <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />Pending</span>;

  return (
    <tr className="align-top">
      <td className="px-3 py-2.5 font-medium text-[#0B1F44]">
        {row.sourceValue}
        {row.suggestion && row.status !== "APPROVED" && <p className="mt-0.5 text-xs font-normal text-[#64748B]">Suggestion: {row.suggestion.code} — {row.suggestion.reason}</p>}
      </td>
      <td className="px-3 py-2.5 tabular-nums text-[#64748B]">{row.rows}</td>
      <td className="px-3 py-2.5">{status}</td>
      <td className="px-3 py-2.5">
        {mode === "idle" && (
          <div className="flex flex-wrap items-center gap-2">
            <select value={code} onChange={(e) => setCode(e.target.value)} className={cn(field, "max-w-[16rem]")} aria-label={`Map ${row.sourceValue}`}>
              <option value="">Choose approved {type === "DEPARTMENT" ? "department" : "programme"}…</option>
              {options.map((o) => <option key={o.code} value={o.code}>{o.code} — {o.name}</option>)}
            </select>
            <button type="button" disabled={!code || decide.isPending || code === row.code} onClick={() => approve(code)} className={cn(btn, "bg-[#FF6B1A] text-white")}>Approve</button>
            <button type="button" onClick={() => setMode("create")} className={cn(btn, "border border-[#E5E7EB] text-[#0B1F44]")}>New {type === "DEPARTMENT" ? "department" : "programme"}</button>
            {row.status !== "REJECTED" && <button type="button" onClick={() => setMode("reject")} className={cn(btn, "text-red-700")}>Reject</button>}
          </div>
        )}
        {mode === "create" && (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate(
                { type, code: draft.code, name: draft.name, ...(type === "PROGRAMME" ? { departmentCode: draft.departmentCode || undefined, durationYears: draft.durationYears ? Number(draft.durationYears) : undefined, lateralEntry: /lateral/i.test(row.sourceValue) } : {}) },
                { onSuccess: (l) => approve(l.code), onError: (err) => toast.error(errText(err)) },
              );
            }}
          >
            <input required value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} placeholder="CODE" className={cn(field, "w-28 font-mono")} />
            <input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={cn(field, "min-w-[14rem] flex-1")} />
            {type === "PROGRAMME" && (
              <>
                <select value={draft.departmentCode} onChange={(e) => setDraft({ ...draft, departmentCode: e.target.value })} className={field}><option value="">Department…</option>{departments.map((d) => <option key={d.code} value={d.code}>{d.code}</option>)}</select>
                <input type="number" min={1} max={7} value={draft.durationYears} onChange={(e) => setDraft({ ...draft, durationYears: e.target.value })} placeholder="Years" className={cn(field, "w-20")} />
              </>
            )}
            <button type="submit" disabled={create.isPending} className={cn(btn, "bg-[#FF6B1A] text-white")}>Create & approve</button>
            <button type="button" onClick={() => setMode("idle")} className={cn(btn, "text-[#64748B]")}>Cancel</button>
          </form>
        )}
        {mode === "reject" && (
          <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (row.mappingId) decide.mutate({ id: row.mappingId, action: "REJECT", reason }, { onSuccess: (r) => afterDecision(r.applied), onError: (err) => toast.error(errText(err)) }); }}>
            <input required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" className={cn(field, "min-w-[16rem] flex-1")} />
            <button type="submit" className={cn(btn, "bg-red-600 text-white")}>Reject</button>
            <button type="button" onClick={() => setMode("idle")} className={cn(btn, "text-[#64748B]")}>Cancel</button>
          </form>
        )}
      </td>
    </tr>
  );
}

function Rows({ id }: { id: string }) {
  const [q, setQ] = React.useState({ action: "", issue: "", search: "", page: 1 });
  const [search, setSearch] = React.useState("");
  const rows = useImportRows(id, q);
  const [open, setOpen] = React.useState<string | null>(null);
  React.useEffect(() => {
    const t = setTimeout(() => setQ((p) => (p.search === search ? p : { ...p, search, page: 1 })), 300);
    return () => clearTimeout(t);
  }, [search]);
  const pages = rows.data ? Math.max(1, Math.ceil(rows.data.total / rows.data.limit)) : 1;

  return (
    <section className={cn(adminCard, "overflow-hidden")}>
      <div className="flex flex-col gap-3 border-b border-[#E5E7EB] p-4 md:flex-row md:items-center md:justify-between">
        <h2 className="font-bold text-[#0B1F44]">Rows {rows.data && <span className="font-medium text-[#64748B]">· {rows.data.total}</span>}</h2>
        <div className="flex flex-wrap gap-2">
          <label className="relative">
            <span className="sr-only">Search rows</span>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" aria-hidden="true" />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Reg no, name or email" className={cn(field, "w-56 pl-8")} />
          </label>
          <select value={q.action} onChange={(e) => setQ({ ...q, action: e.target.value, page: 1 })} className={field} aria-label="Filter by action">
            <option value="">All actions</option>
            {Object.entries(ACTION_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={q.issue} onChange={(e) => setQ({ ...q, issue: e.target.value, page: 1 })} className={field} aria-label="Filter by issue">
            <option value="">All issues</option>
            <option value="errors">Any error</option>
            <option value="warnings">Any warning</option>
            {rows.data?.issueCodes.map((c) => <option key={c.code} value={c.code}>{c.code} ({c.rows})</option>)}
          </select>
        </div>
      </div>
      {!rows.data ? (
        <div className="space-y-2 p-4">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
      ) : (
        <>
          <ul className="divide-y divide-[#E5E7EB]">
            {rows.data.items.map((r) => {
              const meta = ACTION_META[r.action];
              const n = r.normalized as Record<string, string>;
              const expanded = open === r.id;
              return (
                <li key={r.id}>
                  <button type="button" onClick={() => setOpen(expanded ? null : r.id)} aria-expanded={expanded} className="grid w-full grid-cols-[3rem_minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-slate-50/70">
                    <span className="tabular-nums text-xs text-[#64748B]">#{r.rowNumber}</span>
                    <span className="min-w-0 truncate"><b className="text-[#0B1F44]">{r.naturalKey ?? "—"}</b> <span className="text-[#64748B]">{n.officialName ?? n.fullName} · {n.email}</span></span>
                    <span className="flex items-center gap-1.5">
                      <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold ring-1", meta.className)}>{meta.label}</span>
                      {r.rowErrors.length > 0 && <span className="rounded-full bg-red-50 px-1.5 text-xs font-bold text-red-700">{r.rowErrors.length}</span>}
                      {r.warnings.length > 0 && <span className="rounded-full bg-amber-50 px-1.5 text-xs font-bold text-amber-800">{r.warnings.length}</span>}
                    </span>
                    <ChevronDown className={cn("h-4 w-4 text-[#64748B] transition-transform", expanded && "rotate-180")} aria-hidden="true" />
                  </button>
                  {expanded && (
                    <div className="grid gap-4 bg-slate-50/60 px-4 py-3 text-sm md:grid-cols-2">
                      <div className="space-y-2">
                        {r.rowErrors.map((e, i) => <p key={`e${i}`} className="text-red-700"><b>{e.code}</b>{e.field ? ` (${e.field})` : ""}: {e.message}</p>)}
                        {r.warnings.map((w, i) => <p key={`w${i}`} className="text-amber-800"><b>{w.code}</b>: {w.message}</p>)}
                        {r.result?.status && r.result.status !== "PENDING" && <p className="text-[#0B1F44]">Commit result: <b>{r.result.status}</b>{r.result.error ? ` — ${r.result.error}` : ""}</p>}
                      </div>
                      <div className="space-y-2">
                        {r.diff.length > 0 && (
                          <table className="w-full text-xs">
                            <thead className="text-left text-[#64748B]"><tr><th>Field</th><th>Current</th><th>Proposed</th><th /></tr></thead>
                            <tbody>{r.diff.map((d) => <tr key={d.field}><td className="pr-2 font-mono">{d.field}</td><td className="pr-2">{String(d.current ?? "—")}</td><td className="pr-2">{String(d.proposed)}</td><td className={d.apply ? "font-semibold text-blue-700" : "text-[#64748B]"}>{d.apply ? "will apply" : d.note ?? "kept"}</td></tr>)}</tbody>
                          </table>
                        )}
                        <details><summary className="cursor-pointer text-xs font-semibold text-[#64748B]">Source cells</summary><pre className="mt-1 overflow-x-auto rounded bg-white p-2 text-[11px]">{JSON.stringify(r.raw, null, 2)}</pre></details>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
            {!rows.data.items.length && <li className="px-4 py-8 text-center text-sm text-[#64748B]">No rows match these filters.</li>}
          </ul>
          <div className="flex items-center justify-between border-t border-[#E5E7EB] px-4 py-2.5 text-sm">
            <span className="text-[#64748B]">Page {q.page} of {pages}</span>
            <div className="flex gap-2">
              <button type="button" disabled={q.page <= 1} onClick={() => setQ({ ...q, page: q.page - 1 })} className={cn(btn, "border border-[#E5E7EB]")}>Previous</button>
              <button type="button" disabled={q.page >= pages} onClick={() => setQ({ ...q, page: q.page + 1 })} className={cn(btn, "border border-[#E5E7EB]")}>Next</button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function ConfirmPanel({ job }: { job: ImportJob }) {
  const action = useImportAction();
  const [idempotencyKey] = React.useState(() => crypto.randomUUID());
  const [typed, setTyped] = React.useState("");
  const [ackColumns, setAckColumns] = React.useState(false);
  const [ackDiff, setAckDiff] = React.useState(false);
  const s = job.summary!;
  const applicable = s.create + s.update;
  const blocked = s.invalid + s.conflict + s.duplicate;
  const ready = Number(typed) === applicable && (job.template !== "MAPPED" || ackColumns) && (!s.update || ackDiff);

  return (
    <section className={cn(adminCard, "space-y-4 border-[#FF6B1A]/30 p-5")}>
      <h2 className="font-bold text-[#0B1F44]">Confirm and commit</h2>
      <p className="text-sm text-[#0B1F44]/85">
        {applicable ? <>This will apply <b>{applicable}</b> row(s): {s.create} new {job.kind === "STUDENTS" ? "student" : "faculty"} account(s){s.update ? ` and ${s.update} update(s)` : ""}. </> : "There is nothing to apply. "}
        {s.skipExisting + s.unchanged} existing record(s) stay as they are; {blocked} blocked row(s) are never applied. New accounts are created as <b>invited</b> (they cannot sign in until activated) and no invitation is sent now.
      </p>
      {applicable > 0 && (
        <div className="flex flex-col gap-3">
          {job.template === "MAPPED" && (
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={ackColumns} onChange={(e) => setAckColumns(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#FF6B1A]" />I reviewed the column mapping above: this workbook is not the official template.</label>
          )}
          {s.update > 0 && (
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={ackDiff} onChange={(e) => setAckDiff(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#FF6B1A]" />I reviewed the field-level changes to existing records.</label>
          )}
          <label className="flex flex-wrap items-center gap-2 text-sm">
            Type <b>{applicable}</b> to confirm:
            <input inputMode="numeric" value={typed} onChange={(e) => setTyped(e.target.value)} className={cn(field, "w-28")} aria-label="Number of rows to apply" />
          </label>
          <button
            type="button"
            disabled={!ready || action.isPending}
            onClick={() =>
              action.mutate(
                { id: job.id, action: "confirm", idempotencyKey, body: { confirmRowCount: applicable, acknowledgeColumnMapping: ackColumns, acknowledgeDiff: ackDiff } },
                { onSuccess: () => toast.success("Confirmed — committing in the background"), onError: (e) => toast.error(errText(e)) },
              )
            }
            className={cn(btn, "h-10 w-fit bg-[#FF6B1A] px-5 text-white")}
          >
            {action.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Confirm import
          </button>
        </div>
      )}
    </section>
  );
}

function ReasonButton({ label, danger, onConfirm, pending }: { label: string; danger?: boolean; onConfirm: (reason: string) => void; pending?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  if (!open) return <button type="button" onClick={() => setOpen(true)} className={cn(btn, danger ? "border border-red-200 bg-white text-red-700" : "border border-[#E5E7EB] bg-white text-[#0B1F44]")}>{label}</button>;
  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); onConfirm(reason); setOpen(false); setReason(""); }}>
      <input required autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" className={cn(field, "min-w-[16rem]")} />
      <button type="submit" disabled={pending} className={cn(btn, danger ? "bg-red-600 text-white" : "bg-[#FF6B1A] text-white")}>{label}</button>
      <button type="button" onClick={() => setOpen(false)} className={cn(btn, "text-[#64748B]")}>Cancel</button>
    </form>
  );
}

function AfterCommit({ job }: { job: ImportJob }) {
  const action = useImportAction();
  const run = (name: string, body: unknown, ok: string) => action.mutate({ id: job.id, action: name, body }, { onSuccess: () => toast.success(ok), onError: (e) => toast.error(errText(e)) });
  const committed = ["COMMITTED", "PARTIALLY_COMMITTED"].includes(job.status);
  return (
    <section className={cn(adminCard, "space-y-4 p-5")}>
      <h2 className="font-bold text-[#0B1F44]">After commit</h2>
      {job.kind === "STUDENTS" && committed && (
        <div className="space-y-2 rounded-xl bg-amber-50/60 p-4 text-sm">
          <p className="text-[#0B1F44]"><b>Derived batch and semester</b> are stored as pending. Approve them only after checking them against institutional academic records.{job.derivedReview && <> Last decision: <b>{job.derivedReview.status.toLowerCase()}</b> ({job.derivedReview.count} records).</>}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => run("derived", { action: "APPROVE" }, "Derived values approved")} className={cn(btn, "bg-[#FF6B1A] text-white")}>Approve derived values</button>
            <ReasonButton label="Reject derived values" danger onConfirm={(reason) => run("derived", { action: "REJECT", reason }, "Derived values rejected")} />
          </div>
        </div>
      )}
      {!job.isDemoData && committed && (
        <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
          <p className="text-[#0B1F44]"><b>Emails are unverified.</b> Confirm them only after verifying the addresses with the institution. (Invitations are released separately.)</p>
          <ReasonButton label="Confirm emails" onConfirm={(reason) => run("emails/confirm", { reason }, "Emails confirmed")} />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {["PARTIALLY_COMMITTED", "COMMIT_FAILED"].includes(job.status) && <button type="button" onClick={() => run("retry", {}, "Retrying failed rows")} className={cn(btn, "border border-[#E5E7EB] bg-white text-[#0B1F44]")}>Retry failed rows</button>}
        {committed && <ReasonButton label="Revert batch" danger onConfirm={(reason) => run("revert", { reason }, "Batch reverted")} />}
        {job.isDemoData && job.status !== "COMMITTING" && !job.revert?.purged && <ReasonButton label="Purge demo accounts" danger onConfirm={(reason) => run("purge-demo", { reason }, "Demo accounts purged")} />}
      </div>
      <p className="text-xs text-[#64748B]">Revert deactivates accounts this batch created that were never activated and ends their assignments; activated accounts are kept for manual review. Purge (demo batches only) deletes them.</p>
    </section>
  );
}
