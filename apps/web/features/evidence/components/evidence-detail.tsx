"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  useEvidence,
  useDeleteEvidence,
} from "@/features/evidence/hooks/use-evidence";
import {
  getStatusConfig,
  getTypeLabel,
} from "@/features/evidence/components/evidence-card";
import { EvidenceStatus } from "@placecampus/shared-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building,
  Calendar,
  ExternalLink,
  Download,
  Trash2,
  Edit,
  AlertTriangle,
  FileText,
  FileImage,
  Clock,
  CheckCircle2,
  Search,
} from "lucide-react";
import { useEvidenceVerification } from "@/features/evidence/hooks/use-evidence";

function VerificationRecordSection({ evidenceId }: { evidenceId: string }) {
  const { data: record, isLoading } = useEvidenceVerification(evidenceId);

  if (isLoading || !record) return null;

  return (
    <div className="space-y-3 pt-6 border-t border-[hsl(var(--border))]">
      <div className="flex items-center gap-2 mb-4">
        <Search className="w-5 h-5 text-[hsl(var(--primary))]" />
        <h3 className="font-semibold text-heading">AI Verification Analysis</h3>
      </div>

      <div className="bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-[hsl(var(--muted-foreground))] mb-1">
              Extraction
            </p>
            <p className="font-medium">{record.extractionMethod || "None"}</p>
          </div>
          <div>
            <p className="text-[hsl(var(--muted-foreground))] mb-1">
              Word Count
            </p>
            <p className="font-medium">
              {record.extractedTextMetadata?.wordCount || 0}
            </p>
          </div>
          <div>
            <p className="text-[hsl(var(--muted-foreground))] mb-1">Attempt</p>
            <p className="font-medium">#{record.attemptNumber}</p>
          </div>
          <div>
            <p className="text-[hsl(var(--muted-foreground))] mb-1">Duration</p>
            <p className="font-medium">
              {record.processingDurationMs
                ? `${(record.processingDurationMs / 1000).toFixed(1)}s`
                : "-"}
            </p>
          </div>
        </div>

        {record.reasons && record.reasons.length > 0 && (
          <div className="pt-3 border-t border-[hsl(var(--border))]">
            <p className="text-[hsl(var(--muted-foreground))] text-sm mb-2">
              Findings
            </p>
            <ul className="space-y-2">
              {record.reasons.map((r: string, i: number) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-heading"
                >
                  <CheckCircle2 className="w-4 h-4 text-[hsl(var(--primary))] mt-0.5 shrink-0" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {record.reviewerComments && (
          <div className="pt-3 border-t border-orange-200 mt-4">
            <p className="text-orange-800 text-sm font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Faculty Note
            </p>
            <p className="text-sm text-heading bg-white/50 p-3 rounded border border-orange-100 italic">
              &quot;{record.reviewerComments}&quot;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function EvidenceDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data: evidence, isLoading, isError } = useEvidence(id);
  const deleteMutation = useDeleteEvidence();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]"></div>
      </div>
    );
  }

  if (isError || !evidence) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-heading">Evidence not found</h2>
        <p className="text-[hsl(var(--muted-foreground))] mt-2 mb-6">
          The evidence you are looking for does not exist or you do not have
          permission to view it.
        </p>
        <Button asChild>
          <Link href="/student/evidence">Return to My Evidence</Link>
        </Button>
      </div>
    );
  }

  const statusConf = getStatusConfig(evidence.status);
  const StatusIcon = statusConf.icon;
  const canEditOrDelete =
    evidence.status !== EvidenceStatus.VERIFIED &&
    evidence.status !== EvidenceStatus.PROCESSING;

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this evidence? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Evidence has been successfully removed.");
      router.push("/student/evidence");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete evidence.",
      );
    }
  };

  const getStatusExplanation = (status: EvidenceStatus) => {
    switch (status) {
      case EvidenceStatus.UNVERIFIED:
        return "Submitted evidence awaiting verification.";
      case EvidenceStatus.PROCESSING:
        return "Your evidence is currently being verified by an officer.";
      case EvidenceStatus.VERIFIED:
        return "Evidence successfully verified and added to your skill profile.";
      case EvidenceStatus.REJECTED:
        return "Evidence was rejected. Please review the reason below.";
      case EvidenceStatus.NEEDS_REVIEW:
        return "Evidence requires additional review.";
      case EvidenceStatus.RESUBMISSION_REQUESTED:
        return "Please update or resubmit this evidence based on the feedback below.";
      default:
        return "";
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/student/evidence"
            className="p-2 rounded-full bg-white border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors text-[hsl(var(--muted-foreground))]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[hsl(var(--primary))] tracking-wider uppercase bg-[hsl(var(--primary)/0.1)] px-3 py-1 rounded-full">
              {getTypeLabel(evidence.type)}
            </span>
            <Badge
              variant={statusConf.variant}
              className={statusConf.className}
            >
              <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
              {statusConf.label}
            </Badge>
          </div>
        </div>

        {canEditOrDelete && (
          <div className="flex items-center gap-2">
            {/* Edit is not fully implemented in UI yet, but button exists for future/if needed */}
            <Button variant="outline" size="sm" className="hidden">
              <Edit className="w-4 h-4 mr-2" /> Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </div>
        )}
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-2xl border border-[hsl(var(--border))] overflow-hidden shadow-sm">
        {/* Status Banner for actionable states */}
        {(evidence.status === EvidenceStatus.REJECTED ||
          evidence.status === EvidenceStatus.RESUBMISSION_REQUESTED ||
          evidence.status === EvidenceStatus.NEEDS_REVIEW) && (
          <div
            className={`p-4 ${evidence.status === EvidenceStatus.REJECTED ? "bg-red-50 text-red-900 border-b border-red-100" : "bg-orange-50 text-orange-900 border-b border-orange-100"} flex gap-3`}
          >
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold">
                {getStatusExplanation(evidence.status)}
              </h4>
              {evidence.rejectionReason && (
                <p className="text-sm mt-1 opacity-90">
                  Reason: {evidence.rejectionReason}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="p-6 md:p-8 space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-heading leading-tight mb-4">
              {evidence.title}
            </h1>

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
                    {format(new Date(evidence.issuedDate), "MMMM d, yyyy")}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>
                  Submitted:{" "}
                  {format(new Date(evidence.createdAt), "MMM d, yyyy h:mm a")}
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

          {evidence.description && (
            <div className="space-y-3">
              <h3 className="font-semibold text-heading">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
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

          {evidence.document && (
            <div className="space-y-3 pt-6 border-t border-[hsl(var(--border))]">
              <h3 className="font-semibold text-heading">
                Supporting Document
              </h3>
              <div className="flex items-center justify-between p-4 bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] rounded-xl max-w-md">
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm border border-[hsl(var(--border))]">
                    {evidence.document.mimeType.includes("image") ? (
                      <FileImage className="w-5 h-5 text-[hsl(var(--primary))]" />
                    ) : (
                      <FileText className="w-5 h-5 text-[hsl(var(--primary))]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-heading text-sm truncate">
                      {evidence.document.originalName}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {(evidence.document.size / 1024 / 1024).toFixed(2)} MB •{" "}
                      {evidence.document.mimeType.split("/")[1].toUpperCase()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="shrink-0 ml-4"
                >
                  <a
                    href={`http://localhost:4000${evidence.document.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </div>
          )}

          <VerificationRecordSection evidenceId={evidence.id} />
        </div>

        {/* Footer info */}
        <div className="px-6 py-4 bg-[hsl(var(--muted)/0.3)] border-t border-[hsl(var(--border))] flex justify-between items-center text-xs text-[hsl(var(--muted-foreground))]">
          <span>ID: {evidence.id}</span>
          <span>
            Last updated: {format(new Date(evidence.updatedAt), "MMM d, yyyy")}
          </span>
        </div>
      </div>
    </div>
  );
}
