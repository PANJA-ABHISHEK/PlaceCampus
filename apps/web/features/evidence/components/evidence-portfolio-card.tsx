"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  CalendarDays,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  MoreHorizontal,
  PanelRightOpen,
  Pencil,
  Trash2,
} from "lucide-react";
import { EvidenceItem } from "@placecampus/shared-types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  TYPE_META,
  canModifyEvidence,
  formatEvidenceDate,
  getStatusBadge,
  getStatusGroup,
} from "../lib/evidence-meta";

export function EvidenceStatusBadge({
  status,
  className,
}: {
  status: EvidenceItem["status"];
  className?: string;
}) {
  const badge = getStatusBadge(status);
  const Icon = badge.icon;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
        badge.className,
        className,
      )}
    >
      <Icon
        className={cn("h-3.5 w-3.5", badge.spin && "animate-spin")}
        aria-hidden="true"
      />
      {badge.label}
    </span>
  );
}

const actionClassName =
  "inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-[hsl(var(--border))] bg-white px-2 text-[13px] sm:gap-2 sm:px-3 sm:text-sm font-semibold text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--primary)/0.4)] hover:bg-[hsl(var(--primary)/0.05)] hover:text-[hsl(var(--primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-[hsl(var(--border))] disabled:hover:bg-white disabled:hover:text-[hsl(var(--foreground))]";

/** Disabled buttons swallow pointer events, so the tooltip wraps a span. */
function WithReason({
  reason,
  children,
}: {
  reason?: string;
  children: React.ReactElement;
}) {
  if (!reason) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="grid min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)]">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}

interface EvidencePortfolioCardProps {
  evidence: EvidenceItem;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenDocument: () => void;
  isOpeningDocument: boolean;
  style?: React.CSSProperties;
}

export function EvidencePortfolioCard({
  evidence,
  onView,
  onEdit,
  onDelete,
  onOpenDocument,
  isOpeningDocument,
  style,
}: EvidencePortfolioCardProps) {
  const type = TYPE_META[evidence.type] ?? TYPE_META.OTHER;
  const TypeIcon = type.icon;
  const editable = canModifyEvidence(evidence.status);
  const needsAction = getStatusGroup(evidence.status) === "NEEDS_ACTION";
  const date =
    formatEvidenceDate(evidence.issuedDate, "MMM yyyy") ??
    (formatEvidenceDate(evidence.createdAt, "d MMM yyyy") &&
      `Submitted ${formatEvidenceDate(evidence.createdAt, "d MMM yyyy")}`);
  const lockedReason = editable
    ? undefined
    : `${getStatusBadge(evidence.status).label} evidence can't be changed`;

  return (
    <article
      style={style}
      className="pc-enter group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/0.25)] hover:shadow-[var(--shadow-card-hover)] sm:p-6"
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--color-primary-light))] transition-transform duration-300 group-hover:scale-x-100"
      />

      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(var(--color-primary-50))] to-[hsl(var(--color-primary-100))] text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary)/0.12)] transition-transform duration-200 group-hover:scale-105">
          <TypeIcon className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          {/* Badge sits above the title on phones so long titles keep their width. */}
          <div className="flex flex-col-reverse items-start gap-2 sm:flex-row sm:justify-between sm:gap-3">
            <h3 className="line-clamp-2 text-lg font-bold leading-snug text-[hsl(var(--foreground))]">
              {evidence.title}
            </h3>
            <EvidenceStatusBadge status={evidence.status} />
          </div>
          <span className="mt-1.5 inline-block rounded-md bg-[hsl(var(--primary)/0.08)] px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-[hsl(var(--color-primary-700))]">
            {type.label}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-1 flex-col gap-2 sm:pl-[72px]">
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-[hsl(var(--foreground)/0.8)]">
          {evidence.issuer && (
            <span className="flex min-w-0 items-center gap-2">
              <Building2
                className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]"
                aria-hidden="true"
              />
              <span className="truncate">{evidence.issuer}</span>
            </span>
          )}
          {date && (
            <span className="flex items-center gap-2">
              <CalendarDays
                className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]"
                aria-hidden="true"
              />
              {date}
            </span>
          )}
        </div>
        {needsAction && evidence.rejectionReason ? (
          <p className="line-clamp-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            <span className="font-semibold">Feedback: </span>
            {evidence.rejectionReason}
          </p>
        ) : evidence.description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
            {evidence.description}
          </p>
        ) : (
          <p className="text-sm italic text-[hsl(var(--muted-foreground)/0.7)]">
            No description added.
          </p>
        )}
      </div>

      {/* "View Document" is the longest label, so give it the widest column. */}
      <div className="mt-5 grid grid-cols-[1fr_1.25fr_0.85fr_auto] gap-2">
        <button type="button" onClick={onView} className={actionClassName}>
          <Eye className="hidden h-4 w-4 shrink-0 sm:block" aria-hidden="true" />
          <span className="truncate">
            <span className="hidden sm:inline">View </span>Details
          </span>
        </button>
        <WithReason
          reason={evidence.document ? undefined : "No document attached"}
        >
          <button
            type="button"
            onClick={onOpenDocument}
            disabled={!evidence.document || isOpeningDocument}
            className={actionClassName}
          >
            {isOpeningDocument ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
            ) : (
              <FileText className="hidden h-4 w-4 shrink-0 sm:block" aria-hidden="true" />
            )}
            <span className="truncate">
              <span className="hidden sm:inline">View </span>Document
            </span>
          </button>
        </WithReason>
        <WithReason reason={lockedReason}>
          <button
            type="button"
            onClick={onEdit}
            disabled={!editable}
            className={actionClassName}
          >
            <Pencil className="hidden h-4 w-4 shrink-0 sm:block" aria-hidden="true" />
            Edit
          </button>
        </WithReason>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`More actions for ${evidence.title}`}
              className={cn(actionClassName, "w-10 px-0")}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={6}
            className="pc-menu-animate w-52 rounded-xl bg-white p-1.5 shadow-[var(--shadow-xl)]"
          >
            <DropdownMenuItem asChild className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2">
              <Link href={`/student/evidence/${evidence.id}`}>
                <PanelRightOpen />
                Open full page
              </Link>
            </DropdownMenuItem>
            {evidence.externalUrl && (
              <DropdownMenuItem asChild className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2">
                <a
                  href={evidence.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink />
                  Open external link
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={!editable}
              onSelect={onDelete}
              className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-red-600 focus:bg-red-50 focus:text-red-700"
            >
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
