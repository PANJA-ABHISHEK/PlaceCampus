import * as React from "react";
import Link from "next/link";
import {
  EvidenceItem,
  EvidenceStatus,
  EvidenceType,
} from "@placecampus/shared-types";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Building,
  ExternalLink,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

export function getStatusConfig(status: EvidenceStatus) {
  switch (status) {
    case EvidenceStatus.VERIFIED:
      return {
        label: "Verified",
        icon: CheckCircle2,
        variant: "default" as const,
        className:
          "bg-green-100 text-green-800 hover:bg-green-200 border-transparent",
      };
    case EvidenceStatus.PROCESSING:
      return {
        label: "Processing",
        icon: RefreshCw,
        variant: "secondary" as const,
        className:
          "bg-blue-100 text-blue-800 hover:bg-blue-200 border-transparent",
      };
    case EvidenceStatus.REJECTED:
      return {
        label: "Rejected",
        icon: XCircle,
        variant: "destructive" as const,
        className:
          "bg-red-100 text-red-800 hover:bg-red-200 border-transparent",
      };
    case EvidenceStatus.NEEDS_REVIEW:
      return {
        label: "Needs Review",
        icon: AlertCircle,
        variant: "outline" as const,
        className: "bg-yellow-100 text-yellow-800 border-yellow-300",
      };
    case EvidenceStatus.RESUBMISSION_REQUESTED:
      return {
        label: "Update Required",
        icon: AlertCircle,
        variant: "outline" as const,
        className: "bg-orange-100 text-orange-800 border-orange-300",
      };
    case EvidenceStatus.UNVERIFIED:
    default:
      return {
        label: "Pending",
        icon: Clock,
        variant: "secondary" as const,
        className:
          "bg-slate-100 text-slate-800 hover:bg-slate-200 border-transparent",
      };
  }
}

export function getTypeLabel(type: EvidenceType) {
  return type.replace(/_/g, " ");
}

export function EvidenceCard({ evidence }: { evidence: EvidenceItem }) {
  const statusConf = getStatusConfig(evidence.status);
  const StatusIcon = statusConf.icon;

  return (
    <Link href={`/student/evidence/${evidence.id}`} className="group block">
      <div className="bg-white border border-[hsl(var(--border))] rounded-xl p-5 hover:border-[hsl(var(--primary)/0.3)] hover:shadow-md transition-all duration-[var(--duration-normal)] h-full flex flex-col">
        <div className="flex items-start justify-between mb-3 gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="font-semibold text-heading leading-tight group-hover:text-[hsl(var(--primary))] transition-colors line-clamp-2">
              {evidence.title}
            </h3>
            <span className="text-xs font-medium text-[hsl(var(--primary))] tracking-wider uppercase">
              {getTypeLabel(evidence.type)}
            </span>
          </div>
          <Badge variant={statusConf.variant} className={statusConf.className}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusConf.label}
          </Badge>
        </div>

        {evidence.description && (
          <p className="text-sm text-[hsl(var(--muted-foreground))] line-clamp-2 mb-4 flex-1">
            {evidence.description}
          </p>
        )}

        <div className="mt-auto pt-4 flex flex-col gap-2 text-xs text-[hsl(var(--muted-foreground))]">
          {evidence.issuer && (
            <div className="flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{evidence.issuer}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>
                {evidence.issuedDate
                  ? format(new Date(evidence.issuedDate), "MMM yyyy")
                  : "No date"}
              </span>
            </div>

            <div className="text-[hsl(var(--primary))] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 flex items-center text-sm font-medium">
              View <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
