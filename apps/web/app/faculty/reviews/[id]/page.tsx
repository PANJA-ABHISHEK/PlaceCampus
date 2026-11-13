"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Download,
  ExternalLink,
  FileQuestion,
  FileSearch,
  FileText,
  History,
  Info,
  Link2,
  Loader2,
  Scale,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
  Tag,
  UserRound,
  XCircle,
} from "lucide-react";
import { EvidenceStatus, type EvidenceItem, type VerificationRecord } from "@placecampus/shared-types";
import {
  useFacultyReview,
  useFacultyDocumentBlob,
  openFacultyDocument,
  useApproveEvidence,
  useRejectEvidence,
  useRequestResubmission,
  type ReviewDetailResponse,
} from "@/features/faculty/hooks/use-faculty-reviews";
import { getStatusConfig, getTypeLabel } from "@/features/evidence/components/evidence-card";
import { ExtractionPanel } from "@/features/evidence/components/extraction-panel";
import { AiAnalysisPanel } from "@/features/evidence/components/ai-analysis-panel";
import { ReviewLock } from "@/features/faculty/components/review-lock";
import { EscalateReview } from "@/features/faculty/components/escalate-review";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getObjectUrl } from "@/lib/object-url";
import { cn } from "@/lib/utils";

const card = "rounded-[18px] border border-[#E7EBF0] bg-white shadow-[0_6px_24px_-14px_rgba(16,38,74,0.14)]";

const TABS = [
  { id: "details", label: "Evidence Details", icon: FileText },
  { id: "ai", label: "AI Analysis", icon: Sparkles },
  { id: "history", label: "Review History", icon: History },
] as const;
type TabId = (typeof TABS)[number]["id"];

const ESCALATION_REASONS: Record<string, string> = {
  CONFLICT_OF_INTEREST: "Conflict of interest",
  NEEDS_SUBJECT_EXPERT: "Needs a subject expert",
  SUSPECTED_FRAUD: "Suspected fraud",
  POLICY_QUESTION: "Policy question",
};

const fmtDate = (value?: string | Date | null) => (value ? format(new Date(value), "MMM d, yyyy") : null);
const fmtTime = (value: string | Date) => format(new Date(value), "h:mm a");
const humanise = (value?: string | null) => (value ? value.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "");

/** Engine reasons that a reviewer should look at closely. */
function isWarningReason(reason: string) {
  const lower = reason.toLowerCase();
  return (
    lower.includes("duplicate") ||
    lower.includes("already been submitted") ||
    lower.includes("matches another") ||
    lower.includes("confidence") ||
    lower.includes("could not be") ||
    lower.includes("too little text")
  );
}

type Student = { fullName?: string; registrationNumber?: string; department?: string | null } | null;
type Escalation = { reasonCode: string; comment?: string; at: string } | undefined;

type TimelineEvent = { key: string; title: string; detail?: string; at?: string; tone: "green" | "orange" | "blue" | "red" | "slate"; pending?: boolean };

/** Review history, built only from what the record actually holds. */
function buildTimeline(evidence: EvidenceItem, record: VerificationRecord | null, student: Student): TimelineEvent[] {
  const events: TimelineEvent[] = [
    { key: "submitted", title: "Evidence submitted", detail: student?.fullName ? `by ${student.fullName}` : undefined, at: evidence.createdAt, tone: "green" },
  ];
  if (record?.createdAt) {
    events.push({
      key: "verification",
      title: "Automated verification",
      detail: record.finalDecision === EvidenceStatus.NEEDS_REVIEW ? "Routed to faculty review" : `Outcome: ${humanise(record.finalDecision)}`,
      at: record.createdAt,
      tone: "blue",
    });
  }
  if (evidence.reviewAssignedAt) {
    events.push({
      key: "assigned",
      title: "Assigned for review",
      detail: evidence.reviewDueAt ? `Due ${fmtDate(evidence.reviewDueAt)}` : undefined,
      at: evidence.reviewAssignedAt,
      tone: "orange",
    });
  }
  const escalation = (evidence as EvidenceItem & { reviewEscalation?: Escalation }).reviewEscalation;
  if (escalation?.at) {
    events.push({
      key: "escalated",
      title: "Escalated to coordinator",
      detail: [ESCALATION_REASONS[escalation.reasonCode] ?? humanise(escalation.reasonCode), escalation.comment].filter(Boolean).join(" · "),
      at: escalation.at,
      tone: "slate",
    });
  }
  if (evidence.status === EvidenceStatus.VERIFIED) {
    events.push({ key: "decision", title: "Approved as verified", detail: record?.reviewerComments || undefined, at: evidence.verifiedAt || record?.reviewedAt || evidence.updatedAt, tone: "green" });
  } else if (evidence.status === EvidenceStatus.REJECTED) {
    events.push({ key: "decision", title: "Rejected", detail: evidence.rejectionReason, at: record?.reviewedAt || evidence.updatedAt, tone: "red" });
  } else if (evidence.status === EvidenceStatus.RESUBMISSION_REQUESTED) {
    events.push({ key: "decision", title: "Resubmission requested", detail: evidence.rejectionReason, at: record?.reviewedAt || evidence.updatedAt, tone: "orange" });
  }
  events.sort((a, b) => new Date(a.at ?? 0).getTime() - new Date(b.at ?? 0).getTime());
  if (evidence.status === EvidenceStatus.NEEDS_REVIEW) {
    events.push({ key: "awaiting", title: "Awaiting review", detail: "Assigned to you", tone: "orange", pending: true });
  } else if (evidence.status === EvidenceStatus.UNVERIFIED || evidence.status === EvidenceStatus.PROCESSING) {
    events.push({ key: "awaiting", title: "Verification in progress", tone: "blue", pending: true });
  }
  return events;
}

export default function ReviewDetailPage() {
  // Next 16 passes `params` as a Promise; read the id from the router instead.
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { data, isLoading, isError } = useFacultyReview(id);
  const mime = data?.evidence?.document?.mimeType ?? "";
  const previewable = mime.includes("image") || mime.includes("pdf");
  const documentBlob = useFacultyDocumentBlob(id, previewable);
  const documentUrl = getObjectUrl(documentBlob.data);
  const approveMutation = useApproveEvidence();
  const rejectMutation = useRejectEvidence();
  const resubmitMutation = useRequestResubmission();

  const [tab, setTab] = React.useState<TabId>("details");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [actionType, setActionType] = React.useState<"APPROVE" | "REJECT" | "RESUBMIT" | null>(null);
  const [reason, setReason] = React.useState("");
  // Fixed when the workspace opens, so render stays pure.
  const [reviewOpenedAt] = React.useState(() => Date.now());

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1320px] space-y-5 pb-10" aria-label="Loading review">
        <div className="h-5 w-56 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="h-36 animate-pulse rounded-[18px] bg-white" />
          <div className="h-36 animate-pulse rounded-[18px] bg-white" />
          <div className="h-[560px] animate-pulse rounded-[18px] bg-white" />
          <div className="h-[560px] animate-pulse rounded-[18px] bg-white" />
        </div>
      </div>
    );
  }

  if (isError || !data || !data.evidence) {
    return (
      <div className={cn(card, "mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-14 text-center")}>
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF1E8] text-[#FF6500]">
          <FileQuestion className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="text-lg font-bold text-[#10264A]">Review not found</h1>
        <p className="text-sm text-slate-500">The evidence you are looking for does not exist or you do not have permission to view it.</p>
        <Button asChild className="mt-1 rounded-xl bg-[#FF6500] hover:bg-[#E85C00]">
          <Link href="/faculty/reviews">Return to Queue</Link>
        </Button>
      </div>
    );
  }

  const { evidence, verificationRecord } = data;
  const student = (evidence as EvidenceItem & { student?: Student }).student ?? null;
  const statusConf = getStatusConfig(evidence.status);
  const StatusIcon = statusConf.icon;
  const canDecide = evidence.status === EvidenceStatus.NEEDS_REVIEW || evidence.status === EvidenceStatus.RESUBMISSION_REQUESTED;
  const timeline = buildTimeline(evidence, verificationRecord, student);

  const handleAction = async () => {
    try {
      if (actionType === "APPROVE") {
        await approveMutation.mutateAsync({ id: evidence.id, reason: reason || undefined });
        toast.success("Evidence approved successfully.");
      } else if (actionType === "REJECT") {
        if (!reason.trim()) return toast.error("A reason is required for rejection.");
        await rejectMutation.mutateAsync({ id: evidence.id, reason });
        toast.success("Evidence rejected.");
      } else if (actionType === "RESUBMIT") {
        if (!reason.trim()) return toast.error("Instructions are required for resubmission.");
        await resubmitMutation.mutateAsync({ id: evidence.id, reason });
        toast.success("Resubmission requested.");
      }
      setDialogOpen(false);
      router.push("/faculty/reviews");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Action failed.");
    }
  };

  const openActionDialog = (type: "APPROVE" | "REJECT" | "RESUBMIT") => {
    setActionType(type);
    setReason("");
    setDialogOpen(true);
  };

  const downloadOriginal = () => {
    if (!documentUrl || !evidence.document) {
      openFacultyDocument(evidence.id).catch(() => toast.error("Couldn't open the document."));
      return;
    }
    const a = document.createElement("a");
    a.href = documentUrl;
    a.download = evidence.document.originalName || "evidence";
    a.click();
  };

  const isPending = approveMutation.isPending || rejectMutation.isPending || resubmitMutation.isPending;

  return (
    <div className="mx-auto w-full max-w-[1320px] -mt-2 space-y-5 pb-10 sm:-mt-4 lg:-mt-6">
      <nav aria-label="Breadcrumb" className="-mb-1 flex items-center gap-2 text-sm">
        <Link href="/faculty/reviews" aria-label="Back to the review queue" className="flex h-8 w-8 items-center justify-center rounded-full text-[#10264A]/70 transition-colors hover:bg-white hover:text-[#FF6500]">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Link href="/faculty/reviews" className="text-slate-500 transition-colors hover:text-[#FF6500]">Evidence Review</Link>
        <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
        <span aria-current="page" className="font-semibold text-[#10264A]">Review Evidence</span>
      </nav>

      {/* Header row: evidence hero + student */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <header className="pc-enter relative overflow-hidden rounded-[18px] border border-[#FF6500]/15 bg-gradient-to-r from-[#FFF8F3] via-[#FFF1E6] to-[#FFE6D3] px-5 py-5 shadow-[0_10px_30px_-20px_rgba(255,101,0,0.45)] sm:px-6">
          <div className="relative flex items-center gap-4">
            <span className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-[#FF6500] shadow-[0_8px_18px_-10px_rgba(255,101,0,0.6)] sm:flex">
              <Award className="h-8 w-8" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#C24E00]">{getTypeLabel(evidence.type)} evidence</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-[#10264A] sm:text-[28px]">{evidence.title}</h1>
                <Badge variant={statusConf.variant} className={cn("rounded-full", statusConf.className)}>
                  <StatusIcon className="mr-1 h-3.5 w-3.5" />
                  {statusConf.label}
                </Badge>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-[#10264A]/70">
                {evidence.issuer && <span className="inline-flex items-center gap-1.5"><Building2 className="h-4 w-4" aria-hidden="true" />{evidence.issuer}</span>}
                {evidence.issuedDate && <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" aria-hidden="true" />Issued: {fmtDate(evidence.issuedDate)}</span>}
                <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" aria-hidden="true" />Submitted: {fmtDate(evidence.createdAt)}</span>
              </div>
            </div>
            <div className="pointer-events-none hidden h-[104px] w-[150px] shrink-0 xl:block">
              <CertificateIllustration />
            </div>
          </div>
        </header>

        <section aria-label="Student" className={cn(card, "flex items-center gap-4 p-5")}>
          <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#FFF1E8] text-xl font-extrabold text-[#FF6500]">
            {initials(student?.fullName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold text-[#10264A]">{student?.fullName || "Student"}</p>
            <p className="mt-0.5 truncate text-sm text-slate-500">
              {[student?.department, student?.registrationNumber].filter(Boolean).join(" · ") || "No institutional record"}
            </p>
            <Link href={`/faculty/students/${evidence.studentId}`} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#FF6500] hover:underline">
              <UserRound className="h-4 w-4" aria-hidden="true" />View student profile
            </Link>
          </div>
        </section>
      </div>

      {evidence.status === "NEEDS_REVIEW" && (
        <ReviewLock
          evidenceId={evidence.id}
          dueAt={evidence.reviewDueAt}
          overdue={!!evidence.reviewDueAt && new Date(evidence.reviewDueAt).getTime() < reviewOpenedAt}
        />
      )}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Main column */}
        <div className="min-w-0 space-y-5">
          <div role="tablist" aria-label="Review sections" className={cn(card, "flex gap-1 overflow-x-auto p-1.5")}>
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={active}
                  aria-controls={`panel-${t.id}`}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "relative inline-flex h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors sm:px-5",
                    active ? "bg-[#FFF1E8] text-[#FF6500]" : "text-[#10264A]/75 hover:bg-slate-50 hover:text-[#10264A]",
                  )}
                >
                  <t.icon className="h-4 w-4" aria-hidden="true" />
                  {t.label}
                  {active && <span aria-hidden="true" className="absolute inset-x-4 -bottom-1.5 h-[3px] rounded-t-full bg-[#FF6500]" />}
                </button>
              );
            })}
          </div>

          {/* Evidence details */}
          <div role="tabpanel" id="panel-details" aria-labelledby="tab-details" hidden={tab !== "details"} className="space-y-5">
            <section aria-labelledby="info-title" className={cn(card, "p-5 sm:p-6")}>
              <CardTitle id="info-title" icon={Info} title="Evidence Information" />
              <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
                <InfoRow icon={Tag} label="Category">
                  <span className="inline-flex rounded-full bg-[#FFF1E8] px-2.5 py-0.5 text-sm font-semibold capitalize text-[#C24E00]">{getTypeLabel(evidence.type).toLowerCase()}</span>
                </InfoRow>
                <InfoRow icon={FileText} label="Description">
                  {evidence.description ? <span className="whitespace-pre-wrap">{evidence.description}</span> : <Muted>No description</Muted>}
                </InfoRow>
                <InfoRow icon={Building2} label="Issuer">{evidence.issuer || <Muted>Not provided</Muted>}</InfoRow>
                <InfoRow icon={Link2} label="External link">
                  {evidence.externalUrl ? (
                    <a href={evidence.externalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1.5 break-all font-medium text-[#FF6500] hover:underline">
                      {evidence.externalUrl}
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    </a>
                  ) : <Muted>None</Muted>}
                </InfoRow>
                <InfoRow icon={CalendarDays} label="Issue date">{fmtDate(evidence.issuedDate) || <Muted>Not provided</Muted>}</InfoRow>
                <InfoRow icon={SendHorizontal} label="Submitted">{format(new Date(evidence.createdAt), "MMM d, yyyy, h:mm a")}</InfoRow>
              </dl>
            </section>

            <section aria-labelledby="doc-title" className={cn(card, "overflow-hidden")}>
              <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <CardTitle id="doc-title" icon={FileSearch} title="Document Inspection" description={evidence.document ? `${evidence.document.originalName} · ${(evidence.document.size / 1024 / 1024).toFixed(2)} MB` : undefined} />
                {evidence.document && (
                  <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
                    <Button variant="outline" onClick={downloadOriginal} className="h-10 rounded-xl border-slate-200 px-3 font-semibold text-[#10264A]">
                      <Download className="h-4 w-4" /><span className="sm:hidden">Download</span><span className="hidden sm:inline">Download Original</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => openFacultyDocument(evidence.id).catch(() => toast.error("Couldn't open the document."))}
                      className="h-10 rounded-xl border-slate-200 px-3 font-semibold text-[#10264A]"
                    >
                      <ExternalLink className="h-4 w-4" /><span className="sm:hidden">Open</span><span className="hidden sm:inline">Open in New Tab</span>
                    </Button>
                  </div>
                )}
              </div>
              {evidence.document ? (
                <div className="mx-5 mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-800 sm:mx-6 sm:mb-6">
                  {documentUrl && mime.includes("pdf") ? (
                    <iframe title={`Preview of ${evidence.document.originalName}`} src={documentUrl} className="h-[560px] w-full bg-slate-700 sm:h-[640px]" />
                  ) : documentUrl && mime.includes("image") ? (
                    <div className="flex max-h-[640px] min-h-[320px] items-center justify-center bg-slate-100 p-4">
                      {/* eslint-disable-next-line @next/next/no-img-element -- authenticated blob URL */}
                      <img src={documentUrl} alt={`Document for ${evidence.title}`} className="max-h-[600px] max-w-full rounded-md object-contain shadow-sm" />
                    </div>
                  ) : (
                    <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center">
                      {previewable && !documentBlob.isError ? (
                        <><Loader2 className="h-6 w-6 animate-spin text-[#FF6500]" aria-hidden="true" /><p className="text-sm text-slate-500">Loading preview…</p></>
                      ) : (
                        <>
                          <FileText className="h-10 w-10 text-[#FF6500]" aria-hidden="true" />
                          <p className="text-sm font-medium text-[#10264A]">{documentBlob.isError ? "Couldn't load the document preview." : "Preview isn't available for this file type."}</p>
                          <p className="text-xs text-slate-500">Use Download Original or Open in New Tab.</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mx-5 mb-5 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center sm:mx-6 sm:mb-6">
                  <FileQuestion className="h-8 w-8 text-slate-400" aria-hidden="true" />
                  <p className="text-sm font-semibold text-[#10264A]">No document attached</p>
                  <p className="text-xs text-slate-500">The student submitted this evidence without a supporting file.</p>
                </div>
              )}
            </section>
          </div>

          {/* AI analysis */}
          <div role="tabpanel" id="panel-ai" aria-labelledby="tab-ai" hidden={tab !== "ai"} className="space-y-5">
            <section aria-labelledby="engine-title" className={cn(card, "p-5 sm:p-6")}>
              <CardTitle id="engine-title" icon={ShieldCheck} title="Verification Engine Findings" description="Deterministic rules applied to the submission." />
              {verificationRecord?.reasons?.length ? (
                <ul className="mt-4 space-y-2">
                  {verificationRecord.reasons.map((r: string, i: number) => {
                    const warn = isWarningReason(r);
                    return (
                      <li key={i} className={cn("flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-sm", warn ? "bg-orange-50 font-medium text-orange-800" : "bg-slate-50 text-[#10264A]")}>
                        {warn ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" aria-hidden="true" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />}
                        <span>{r}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyBlock icon={FileQuestion} title="No engine findings" text="Automated verification has not produced a record for this evidence." />
              )}
            </section>

            <section aria-labelledby="ai-title" className={cn(card, "p-5 sm:p-6")}>
              <CardTitle id="ai-title" icon={Sparkles} title="AI Document Analysis" description="Advisory only. The decision is yours." />
              <div className="mt-4">
                {data.aiAnalysis ? (
                  <AiAnalysisPanel analysis={data.aiAnalysis} />
                ) : verificationRecord?.aiResult ? (
                  <LegacyAiResult result={verificationRecord.aiResult} />
                ) : (
                  <EmptyBlock icon={FileQuestion} title="No AI record found" text="This evidence bypassed or failed AI analysis entirely." />
                )}
              </div>
            </section>

            <ExtractionPanel extraction={data.extraction} duplicates={verificationRecord?.duplicateMatches} />
          </div>

          {/* Review history */}
          <div role="tabpanel" id="panel-history" aria-labelledby="tab-history" hidden={tab !== "history"}>
            <section aria-labelledby="history-title" className={cn(card, "p-5 sm:p-6")}>
              <CardTitle id="history-title" icon={History} title="Review History" description="Every recorded step for this evidence." />
              <Timeline events={timeline} className="mt-5" />
            </section>
          </div>
        </div>

        {/* Side column */}
        <aside className="min-w-0 space-y-5 lg:sticky lg:top-24">
          <AiValidationCard data={data} onOpen={() => setTab("ai")} />

          {(evidence.status === EvidenceStatus.UNVERIFIED || evidence.status === EvidenceStatus.PROCESSING) && (
            <div className="rounded-[18px] border border-blue-200 bg-blue-50 p-5 text-blue-950">
              <h3 className="flex items-center gap-2 font-bold"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Awaiting verification</h3>
              <p className="mt-1 text-sm text-blue-900/80">The submission is visible to faculty, but review actions become available after verification finishes.</p>
            </div>
          )}

          {canDecide && (
            <section aria-labelledby="decision-title" className={cn(card, "p-5")}>
              <CardTitle id="decision-title" icon={Scale} title="Faculty Decision" />
              <div className="mt-4 space-y-2.5">
                <button type="button" onClick={() => openActionDialog("APPROVE")} className="flex h-12 w-full items-center gap-3 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-[0_10px_20px_-12px_rgba(5,150,105,0.9)] transition-colors hover:bg-emerald-700">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />Approve as Verified
                </button>
                <button type="button" onClick={() => openActionDialog("RESUBMIT")} className="flex h-12 w-full items-center gap-3 rounded-xl border border-orange-200 bg-orange-50/60 px-4 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-50">
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />Request Resubmission
                </button>
                <button type="button" onClick={() => openActionDialog("REJECT")} className="flex h-12 w-full items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/60 px-4 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50">
                  <XCircle className="h-5 w-5" aria-hidden="true" />Reject Permanently
                </button>
                {evidence.status === "NEEDS_REVIEW" && <EscalateReview evidenceId={evidence.id} />}
              </div>
            </section>
          )}

          {!canDecide && (evidence.status === EvidenceStatus.VERIFIED || evidence.status === EvidenceStatus.REJECTED) && (
            <section aria-labelledby="decision-title" className={cn(card, "p-5")}>
              <CardTitle id="decision-title" icon={Scale} title="Faculty Decision" />
              <div className={cn("mt-4 rounded-xl px-4 py-3 text-sm", evidence.status === EvidenceStatus.VERIFIED ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800")}>
                <p className="font-semibold">{evidence.status === EvidenceStatus.VERIFIED ? "Approved as verified" : "Rejected"}</p>
                {evidence.rejectionReason && <p className="mt-1">{evidence.rejectionReason}</p>}
              </div>
            </section>
          )}

          <section aria-labelledby="activity-title" className={cn(card, "p-5")}>
            <CardTitle
              id="activity-title"
              icon={History}
              title="Review Activity"
              action={timeline.length > 3 ? <button type="button" onClick={() => setTab("history")} className="text-xs font-semibold text-[#FF6500] hover:underline">View all</button> : undefined}
            />
            <Timeline events={timeline.slice(-3)} className="mt-4" compact />
          </section>
        </aside>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#10264A]">
              {actionType === "APPROVE" && "Approve Evidence"}
              {actionType === "REJECT" && "Reject Evidence"}
              {actionType === "RESUBMIT" && "Request Resubmission"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "APPROVE" && "This will verify the evidence and make it eligible for skill taxonomy integration. You can optionally leave a comment."}
              {actionType === "REJECT" && "This will permanently reject the evidence. Please provide a clear reason for the student."}
              {actionType === "RESUBMIT" && "This will return the evidence to the student for corrections. Please provide clear instructions."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label htmlFor="decision-reason" className="mb-1.5 block text-sm font-medium text-[#10264A]">
              {actionType === "APPROVE" ? "Comment (Optional)" : "Reason / Instructions (Required)"}
            </label>
            <Input
              id="decision-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={actionType === "APPROVE" ? "Looks good." : "e.g., The certificate image is too blurry to read."}
              className="h-11 rounded-xl"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button
              onClick={handleAction}
              disabled={((actionType === "REJECT" || actionType === "RESUBMIT") && !reason.trim()) || isPending}
              className={cn(
                "rounded-xl text-white",
                actionType === "APPROVE" ? "bg-emerald-600 hover:bg-emerald-700" : actionType === "REJECT" ? "bg-rose-600 hover:bg-rose-700" : "bg-[#FF6500] hover:bg-[#E85C00]",
              )}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm {actionType === "APPROVE" ? "Approval" : actionType === "REJECT" ? "Rejection" : "Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function initials(name?: string) {
  if (!name) return "?";
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function CardTitle({ id, icon: Icon, title, description, action }: { id?: string; icon: React.ElementType; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF1E8] text-[#FF6500] ring-1 ring-[#FFE0CC]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <h2 id={id} className="text-base font-bold text-[#10264A] sm:text-lg">{title}</h2>
        {description && <p className="mt-0.5 truncate text-xs text-slate-500 sm:text-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function InfoRow({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,130px)_minmax(0,1fr)] items-start gap-3">
      <dt className="flex items-center gap-2 text-sm font-semibold text-[#10264A]">
        <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />{label}
      </dt>
      <dd className="min-w-0 text-sm text-slate-700">{children}</dd>
    </div>
  );
}

const Muted = ({ children }: { children: React.ReactNode }) => <span className="text-slate-400">{children}</span>;

function EmptyBlock({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) {
  return (
    <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-7 text-center">
      <Icon className="h-8 w-8 text-slate-400" aria-hidden="true" />
      <p className="text-sm font-semibold text-[#10264A]">{title}</p>
      <p className="text-xs text-slate-500">{text}</p>
    </div>
  );
}

function AiValidationCard({ data, onOpen }: { data: ReviewDetailResponse; onOpen: () => void }) {
  const analysis = data.aiAnalysis;
  const record = data.verificationRecord;
  // Engine warnings plus the AI's own consistency flags.
  const warnings = (record?.reasons?.filter(isWarningReason).length ?? 0) + (analysis?.result?.consistencyFlags?.length ?? 0);
  const confidence: number | undefined =
    typeof analysis?.result?.documentTypeConfidence === "number"
      ? analysis.result.documentTypeConfidence
      : typeof record?.aiResult?.confidence === "number"
        ? record.aiResult.confidence
        : undefined;
  const hasAi = Boolean(analysis || record?.aiResult);
  const label = !hasAi ? "No AI record" : analysis?.status ? humanise(analysis.status) : "Recorded";

  return (
    <section aria-labelledby="ai-validation-title" className={cn(card, "p-5")}>
      <CardTitle
        id="ai-validation-title"
        icon={Sparkles}
        title="AI Validation"
        action={<span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", hasAi ? "bg-blue-50 text-blue-700" : "bg-[#FFF1E8] text-[#C24E00]")}>{label}</span>}
      />
      {hasAi ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Document confidence</p>
              <p className={cn("text-lg font-bold tabular-nums", confidence == null ? "text-slate-400" : confidence < 0.7 ? "text-rose-600" : "text-emerald-600")}>
                {confidence == null ? "—" : `${Math.round(confidence * 100)}%`}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Warnings &amp; flags</p>
              <p className={cn("text-lg font-bold tabular-nums", warnings ? "text-orange-600" : "text-emerald-600")}>{warnings}</p>
            </div>
          </div>
          <button type="button" onClick={onOpen} className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-sm font-semibold text-[#10264A] transition-colors hover:border-[#FFC9A3] hover:bg-[#FFF6F0]">
            View full analysis<ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-6 text-center">
          <FileSearch className="h-9 w-9 text-slate-500" aria-hidden="true" />
          <p className="text-sm font-bold text-[#10264A]">No AI Record Found</p>
          <p className="text-xs text-slate-500">This evidence bypassed or failed AI analysis entirely.</p>
          {record?.reasons?.length ? (
            <button type="button" onClick={onOpen} className="mt-1 text-xs font-semibold text-[#FF6500] hover:underline">View engine findings</button>
          ) : null}
        </div>
      )}
    </section>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- legacy, untyped AI payload
function LegacyAiResult({ result }: { result: any }) {
  return (
    <div className="space-y-3 text-sm">
      <Row label="Detected type" value={result.documentType || "Unknown"} />
      <Row label="Issuer match" value={result.issuer || "None"} />
      {typeof result.confidence === "number" && (
        <Row label="AI confidence" value={`${Math.round(result.confidence * 100)}%`} className={result.confidence < 0.7 ? "text-rose-600" : "text-emerald-600"} />
      )}
      {Array.isArray(result.claimedSkills) && result.claimedSkills.length > 0 && (
        <div>
          <span className="mb-1 block text-slate-500">Detected skills</span>
          <div className="flex flex-wrap gap-1">
            {result.claimedSkills.map((s: string, i: number) => <span key={i} className="rounded bg-slate-100 px-2 py-0.5 text-xs">{s}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
      <span className="text-slate-500">{label}</span>
      <span className={cn("max-w-[60%] truncate text-right font-medium text-[#10264A]", className)}>{value}</span>
    </div>
  );
}

const DOT: Record<TimelineEvent["tone"], string> = {
  green: "bg-emerald-500 ring-emerald-100",
  orange: "bg-[#FF6500] ring-[#FFE0CC]",
  blue: "bg-blue-500 ring-blue-100",
  red: "bg-rose-500 ring-rose-100",
  slate: "bg-slate-500 ring-slate-200",
};

function Timeline({ events, className, compact }: { events: TimelineEvent[]; className?: string; compact?: boolean }) {
  if (!events.length) return <p className={cn("text-sm text-slate-500", className)}>No activity recorded yet.</p>;
  return (
    <ol className={cn("relative", className)}>
      {events.map((e, i) => (
        <li key={e.key} className={cn("relative flex gap-3", i < events.length - 1 && (compact ? "pb-4" : "pb-6"))}>
          {i < events.length - 1 && <span aria-hidden="true" className="absolute left-[5px] top-4 h-full w-px bg-slate-200" />}
          <span aria-hidden="true" className={cn("relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ring-4", DOT[e.tone], e.pending && "animate-pulse")} />
          <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#10264A]">{e.title}</p>
              {e.detail && <p className={cn("text-xs text-slate-500", compact ? "truncate" : "mt-0.5")}>{e.detail}</p>}
            </div>
            {e.at ? (
              <div className="shrink-0 text-right text-xs tabular-nums text-slate-500">
                <p>{fmtDate(e.at)}</p>
                <p>{fmtTime(e.at)}</p>
              </div>
            ) : e.pending ? (
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#C24E00]"><CircleDot className="h-3 w-3" aria-hidden="true" />Now</span>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function CertificateIllustration() {
  return (
    <svg viewBox="0 0 150 104" className="h-full w-full drop-shadow-[0_12px_18px_rgba(234,88,12,0.18)]" aria-hidden="true">
      <g fill="#F5B27A" opacity="0.85">
        {[0, 1, 2, 3, 4].map((i) => (
          <ellipse key={`l${i}`} cx={22 + i * 2} cy={78 - i * 13} rx="5" ry="9" transform={`rotate(${-30 + i * 6} ${22 + i * 2} ${78 - i * 13})`} />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <ellipse key={`r${i}`} cx={128 - i * 2} cy={78 - i * 13} rx="5" ry="9" transform={`rotate(${30 - i * 6} ${128 - i * 2} ${78 - i * 13})`} />
        ))}
      </g>
      <rect x="44" y="8" width="62" height="80" rx="6" fill="#FF6500" />
      <rect x="49" y="13" width="52" height="70" rx="3" fill="#fff" />
      <rect x="57" y="22" width="36" height="6" rx="3" fill="#FFB98A" />
      {[36, 44, 52].map((y) => <rect key={y} x="56" y={y} width="38" height="4" rx="2" fill="#E2E8F0" />)}
      <circle cx="90" cy="72" r="12" fill="#F59E0B" stroke="#fff" strokeWidth="3" />
      <path d="M90 65 l2.2 4.6 5 .7 -3.6 3.5 .9 5 -4.5 -2.4 -4.5 2.4 .9 -5 -3.6 -3.5 5 -.7 z" fill="#fff" />
      <path d="M83 82 l-4 16 6 -3 3 5 2 -14 M97 82 l4 16 -6 -3 -3 5 -2 -14" fill="#2563EB" />
    </svg>
  );
}
