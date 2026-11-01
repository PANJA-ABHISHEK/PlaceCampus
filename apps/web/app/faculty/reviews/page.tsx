"use client";

import * as React from "react";
import Link from "next/link";
import { useFacultyReviews } from "@/features/faculty/hooks/use-faculty-reviews";
import { EvidenceStatus } from "@placecampus/shared-types";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  ChevronRight,
  FileText,
  Search,
} from "lucide-react";
import {
  getStatusConfig,
  getTypeLabel,
} from "@/features/evidence/components/evidence-card";

export default function FacultyReviewsPage() {
  const [statusFilter, setStatusFilter] = React.useState<string>(
    EvidenceStatus.NEEDS_REVIEW,
  );
  const {
    data: reviews,
    isLoading,
    isError,
  } = useFacultyReviews(statusFilter === "ALL" ? undefined : statusFilter);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-heading">
            Evidence Review Queue
          </h1>
          <p className="text-[hsl(var(--muted-foreground))] mt-2">
            Review evidence flagged by the verification engine and make the
            final verification decision.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-[hsl(var(--border))] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-[hsl(var(--muted-foreground))] font-medium">
              Needs Review
            </p>
            <p className="text-2xl font-bold text-heading">
              {reviews?.filter((r) => r.status === EvidenceStatus.NEEDS_REVIEW)
                .length || 0}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-[hsl(var(--border))] shadow-sm flex items-center gap-4 opacity-50">
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-[hsl(var(--muted-foreground))] font-medium">
              Recently Approved
            </p>
            <p className="text-2xl font-bold text-heading">--</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-[hsl(var(--border))] shadow-sm flex items-center gap-4 opacity-50">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-[hsl(var(--muted-foreground))] font-medium">
              Avg Review Time
            </p>
            <p className="text-2xl font-bold text-heading">--</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[hsl(var(--border))] shadow-sm overflow-hidden flex flex-col">
        {/* Filters */}
        <div className="p-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] flex items-center gap-4">
          <div className="flex bg-[hsl(var(--muted))] p-1 rounded-lg">
            <button
              onClick={() => setStatusFilter(EvidenceStatus.NEEDS_REVIEW)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${statusFilter === EvidenceStatus.NEEDS_REVIEW ? "bg-white text-heading shadow-sm" : "text-[hsl(var(--muted-foreground))] hover:text-heading"}`}
            >
              Needs Review
            </button>
            <button
              onClick={() =>
                setStatusFilter(EvidenceStatus.RESUBMISSION_REQUESTED)
              }
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${statusFilter === EvidenceStatus.RESUBMISSION_REQUESTED ? "bg-white text-heading shadow-sm" : "text-[hsl(var(--muted-foreground))] hover:text-heading"}`}
            >
              Resubmitted
            </button>
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${statusFilter === "ALL" ? "bg-white text-heading shadow-sm" : "text-[hsl(var(--muted-foreground))] hover:text-heading"}`}
            >
              All Pending
            </button>
          </div>
        </div>

        {/* List */}
        <div className="divide-y divide-[hsl(var(--border))]">
          {isLoading && (
            <div className="p-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]"></div>
            </div>
          )}

          {!isLoading && (!reviews || reviews.length === 0) && (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-[hsl(var(--muted))] rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
              </div>
              <h3 className="text-lg font-bold text-heading">All caught up!</h3>
              <p className="text-[hsl(var(--muted-foreground))] mt-2">
                There is no evidence pending your review at the moment.
              </p>
            </div>
          )}

          {!isLoading &&
            reviews &&
            reviews.map((item) => {
              const statusConf = getStatusConfig(item.status);
              const StatusIcon = statusConf.icon;

              return (
                <Link
                  key={item.id}
                  href={`/faculty/reviews/${item.id}`}
                  className="group flex flex-col md:flex-row md:items-center p-4 md:p-6 hover:bg-[hsl(var(--muted)/0.2)] transition-colors gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-[hsl(var(--muted))] flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-heading truncate group-hover:text-[hsl(var(--primary))] transition-colors">
                        {item.title}
                      </h4>
                      <Badge
                        variant={statusConf.variant}
                        className={`text-[10px] py-0 h-5 ${statusConf.className}`}
                      >
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConf.label}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                      <span className="font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] px-2 py-0.5 rounded-full">
                        {getTypeLabel(item.type)}
                      </span>
                      <span>•</span>
                      <span className="truncate max-w-[200px]">
                        Issuer: {item.issuer || "Unknown"}
                      </span>
                      <span>•</span>
                      <span>
                        Submitted{" "}
                        {format(new Date(item.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-4">
                    <div className="hidden md:block text-right">
                      <p className="text-sm font-medium text-heading">
                        Student Review
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        Needs Action
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))] transition-colors" />
                  </div>
                </Link>
              );
            })}
        </div>
      </div>
    </div>
  );
}
