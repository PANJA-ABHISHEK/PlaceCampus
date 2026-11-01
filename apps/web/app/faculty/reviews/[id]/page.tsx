"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useFacultyReview,
  useApproveEvidence,
  useRejectEvidence,
  useRequestResubmission,
} from "@/features/faculty/hooks/use-faculty-reviews";
import { EvidenceStatus } from "@placecampus/shared-types";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  getStatusConfig,
  getTypeLabel,
} from "@/features/evidence/components/evidence-card";
import {
  ArrowLeft,
  Building,
  Calendar,
  ExternalLink,
  Download,
  FileText,
  FileImage,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileQuestion,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function ReviewDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { data, isLoading, isError } = useFacultyReview(params.id);
  const approveMutation = useApproveEvidence();
  const rejectMutation = useRejectEvidence();
  const resubmitMutation = useRequestResubmission();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [actionType, setActionType] = React.useState<
    "APPROVE" | "REJECT" | "RESUBMIT" | null
  >(null);
  const [reason, setReason] = React.useState("");

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]"></div>
      </div>
    );
  }

  if (isError || !data || !data.evidence) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-heading">Review not found</h2>
        <p className="text-[hsl(var(--muted-foreground))] mt-2 mb-6">
          The evidence you are looking for does not exist or you do not have
          permission to view it.
        </p>
        <Button asChild>
          <Link href="/faculty/reviews">Return to Queue</Link>
        </Button>
      </div>
    );
  }

  const { evidence, verificationRecord } = data;
  const statusConf = getStatusConfig(evidence.status);
  const StatusIcon = statusConf.icon;

  const handleAction = async () => {
    try {
      if (actionType === "APPROVE") {
        await approveMutation.mutateAsync({
          id: evidence.id,
          reason: reason || undefined,
        });
        toast.success("Evidence approved successfully.");
      } else if (actionType === "REJECT") {
        if (!reason.trim())
          return toast.error("A reason is required for rejection.");
        await rejectMutation.mutateAsync({ id: evidence.id, reason });
        toast.success("Evidence rejected.");
      } else if (actionType === "RESUBMIT") {
        if (!reason.trim())
          return toast.error("Instructions are required for resubmission.");
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

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/faculty/reviews"
            className="p-2 rounded-full bg-white border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors text-[hsl(var(--muted-foreground))]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-heading">Evidence Review</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs font-semibold text-[hsl(var(--primary))] tracking-wider uppercase bg-[hsl(var(--primary)/0.1)] px-2 py-0.5 rounded-full">
                {getTypeLabel(evidence.type)}
              </span>
              <Badge
                variant={statusConf.variant}
                className={statusConf.className}
              >
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConf.label}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Original Submission (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-[hsl(var(--border))] overflow-hidden shadow-sm">
            <div className="p-6 md:p-8 space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-heading leading-tight mb-4">
                  {evidence.title}
                </h2>
                <div className="flex flex-wrap gap-6 text-sm text-[hsl(var(--muted-foreground))]">
                  {evidence.issuer && (
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      <span className="font-medium text-heading">
                        {evidence.issuer}
                      </span>
                    </div>
                  )}
                  {evidence.issuedDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Issued:{" "}
                        {format(new Date(evidence.issuedDate), "MMM d, yyyy")}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>
                      Submitted:{" "}
                      {format(new Date(evidence.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              </div>

              {evidence.description && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-heading">Description</h3>
                  <p className="text-[hsl(var(--muted-foreground))] leading-relaxed whitespace-pre-wrap">
                    {evidence.description}
                  </p>
                </div>
              )}

              {evidence.externalUrl && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-heading">External Link</h3>
                  <a
                    href={evidence.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[hsl(var(--primary))] hover:underline font-medium"
                  >
                    {evidence.externalUrl}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Document Preview Panel */}
          {evidence.document && (
            <div className="bg-white rounded-2xl border border-[hsl(var(--border))] overflow-hidden shadow-sm flex flex-col h-[500px]">
              <div className="p-4 border-b border-[hsl(var(--border))] flex justify-between items-center bg-[hsl(var(--muted)/0.3)]">
                <h3 className="font-semibold text-heading flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[hsl(var(--primary))]" />
                  Document Inspection
                </h3>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`http://localhost:4000/api/v1/faculty/reviews/${evidence.id}/document/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="w-4 h-4 mr-2" /> Download Original
                  </a>
                </Button>
              </div>
              <div className="flex-1 bg-neutral-100 flex items-center justify-center p-4">
                {/* 
                   For real production, we'd embed an iframe for PDFs or an img tag for images.
                   Because auth tokens are needed, we either use an Object URL via fetch or just show a fallback if the browser can't securely render it.
                 */}
                {evidence.document.mimeType.includes("image") ? (
                  <img
                    src={`http://localhost:4000/api/v1/faculty/reviews/${evidence.id}/document/download`}
                    alt="Evidence"
                    className="max-h-full max-w-full object-contain rounded-md shadow-sm border border-neutral-200"
                  />
                ) : (
                  <div className="text-center max-w-md mx-auto space-y-4">
                    <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-neutral-200 mx-auto flex items-center justify-center">
                      <FileText className="w-10 h-10 text-[hsl(var(--primary))]" />
                    </div>
                    <p className="text-neutral-600 font-medium">PDF Document</p>
                    <p className="text-sm text-neutral-500">
                      For security reasons, please download the PDF to inspect
                      its contents using your native viewer.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: AI & Decisions (1/3 width) */}
        <div className="space-y-6 lg:sticky lg:top-24">
          {verificationRecord ? (
            <div className="bg-white rounded-2xl border border-[hsl(var(--border))] overflow-hidden shadow-sm">
              <div className="p-4 border-b border-[hsl(var(--border))] bg-blue-50/50">
                <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                  <Search className="w-5 h-5 text-blue-600" />
                  AI & Engine Findings
                </h3>
              </div>
              <div className="p-5 space-y-6">
                {/* Rule Engine Output */}
                <div>
                  <p className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-bold mb-3">
                    Deterministic Engine Rules
                  </p>
                  <ul className="space-y-2">
                    {verificationRecord.reasons?.map(
                      (reason: string, i: number) => {
                        const isWarning =
                          reason.toLowerCase().includes("possible duplicate") ||
                          reason.toLowerCase().includes("confidence");
                        return (
                          <li
                            key={i}
                            className={`flex items-start gap-2 text-sm ${isWarning ? "text-orange-700 font-medium bg-orange-50 p-2 rounded-md" : "text-heading"}`}
                          >
                            {isWarning ? (
                              <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-[hsl(var(--primary))] mt-0.5 shrink-0" />
                            )}
                            <span>{reason}</span>
                          </li>
                        );
                      },
                    )}
                  </ul>
                </div>

                {/* Raw AI Details */}
                {verificationRecord.aiResult && (
                  <div className="pt-5 border-t border-[hsl(var(--border))]">
                    <p className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-bold mb-3">
                      AI Raw Extracted Data
                    </p>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between border-b border-[hsl(var(--border))] pb-2">
                        <span className="text-[hsl(var(--muted-foreground))]">
                          Detected Type
                        </span>
                        <span className="font-medium text-right max-w-[150px] truncate">
                          {verificationRecord.aiResult.documentType ||
                            "Unknown"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-[hsl(var(--border))] pb-2">
                        <span className="text-[hsl(var(--muted-foreground))]">
                          Issuer Match
                        </span>
                        <span className="font-medium text-right max-w-[150px] truncate">
                          {verificationRecord.aiResult.issuer || "None"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-[hsl(var(--border))] pb-2">
                        <span className="text-[hsl(var(--muted-foreground))]">
                          AI Confidence
                        </span>
                        <span
                          className={`font-medium ${verificationRecord.aiResult.confidence < 0.7 ? "text-red-600" : "text-green-600"}`}
                        >
                          {Math.round(
                            verificationRecord.aiResult.confidence * 100,
                          )}
                          %
                        </span>
                      </div>
                      {verificationRecord.aiResult.claimedSkills &&
                        verificationRecord.aiResult.claimedSkills.length >
                          0 && (
                          <div>
                            <span className="text-[hsl(var(--muted-foreground))] block mb-1">
                              Detected Skills
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {verificationRecord.aiResult.claimedSkills.map(
                                (s: string, i: number) => (
                                  <span
                                    key={i}
                                    className="bg-[hsl(var(--muted))] px-2 py-0.5 rounded text-xs"
                                  >
                                    {s}
                                  </span>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl border border-[hsl(var(--border))] shadow-sm text-center">
              <FileQuestion className="w-8 h-8 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
              <p className="font-medium">No AI Record Found</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                This evidence bypassed or failed AI analysis entirely.
              </p>
            </div>
          )}

          {/* Action Controls */}
          {(evidence.status === EvidenceStatus.NEEDS_REVIEW ||
            evidence.status === EvidenceStatus.RESUBMISSION_REQUESTED) && (
            <div className="bg-white p-5 rounded-2xl border border-[hsl(var(--border))] shadow-sm space-y-3">
              <h3 className="font-bold text-heading text-lg mb-2">
                Faculty Decision
              </h3>
              <Button
                className="w-full justify-start bg-green-600 hover:bg-green-700 text-white"
                size="lg"
                onClick={() => openActionDialog("APPROVE")}
              >
                <CheckCircle2 className="w-5 h-5 mr-3" /> Approve as Verified
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-orange-600 border-orange-200 hover:bg-orange-50"
                size="lg"
                onClick={() => openActionDialog("RESUBMIT")}
              >
                <AlertTriangle className="w-5 h-5 mr-3" /> Request Resubmission
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
                size="lg"
                onClick={() => openActionDialog("REJECT")}
              >
                <XCircle className="w-5 h-5 mr-3" /> Reject Permanently
              </Button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "APPROVE" && "Approve Evidence"}
              {actionType === "REJECT" && "Reject Evidence"}
              {actionType === "RESUBMIT" && "Request Resubmission"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "APPROVE" &&
                "This will verify the evidence and make it eligible for skill taxonomy integration. You can optionally leave a comment."}
              {actionType === "REJECT" &&
                "This will permanently reject the evidence. Please provide a clear reason for the student."}
              {actionType === "RESUBMIT" &&
                "This will return the evidence to the student for corrections. Please provide clear instructions."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="block text-sm font-medium text-heading mb-1.5">
              {actionType === "APPROVE"
                ? "Comment (Optional)"
                : "Reason / Instructions (Required)"}
            </label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                actionType === "APPROVE"
                  ? "Looks good."
                  : "e.g., The certificate image is too blurry to read."
              }
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={
                (actionType === "REJECT" && !reason.trim()) ||
                (actionType === "RESUBMIT" && !reason.trim()) ||
                approveMutation.isPending ||
                rejectMutation.isPending ||
                resubmitMutation.isPending
              }
              className={
                actionType === "APPROVE"
                  ? "bg-green-600 hover:bg-green-700"
                  : actionType === "REJECT"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-orange-600 hover:bg-orange-700 text-white"
              }
            >
              Confirm{" "}
              {actionType === "APPROVE"
                ? "Approval"
                : actionType === "REJECT"
                  ? "Rejection"
                  : "Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
