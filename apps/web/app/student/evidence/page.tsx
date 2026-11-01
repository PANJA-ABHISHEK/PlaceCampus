"use client";

import * as React from "react";
import Link from "next/link";
import { useMyEvidence } from "@/features/evidence/hooks/use-evidence";
import { EvidenceCard } from "@/features/evidence/components/evidence-card";
import { EvidenceStatus, EvidenceType } from "@placecampus/shared-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  FileCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function EvidenceDashboard() {
  const { data: evidence, isLoading } = useMyEvidence();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<
    EvidenceStatus | "ALL"
  >("ALL");
  const [typeFilter, setTypeFilter] = React.useState<EvidenceType | "ALL">(
    "ALL",
  );

  const filteredEvidence = React.useMemo(() => {
    if (!evidence) return [];
    return evidence.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.issuer &&
          item.issuer.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus =
        statusFilter === "ALL" || item.status === statusFilter;
      const matchesType = typeFilter === "ALL" || item.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [evidence, searchQuery, statusFilter, typeFilter]);

  const stats = React.useMemo(() => {
    if (!evidence) return { total: 0, verified: 0, pending: 0, needsAction: 0 };
    return {
      total: evidence.length,
      verified: evidence.filter((e) => e.status === EvidenceStatus.VERIFIED)
        .length,
      pending: evidence.filter(
        (e) =>
          e.status === EvidenceStatus.UNVERIFIED ||
          e.status === EvidenceStatus.PROCESSING,
      ).length,
      needsAction: evidence.filter(
        (e) =>
          e.status === EvidenceStatus.REJECTED ||
          e.status === EvidenceStatus.RESUBMISSION_REQUESTED ||
          e.status === EvidenceStatus.NEEDS_REVIEW,
      ).length,
    };
  }, [evidence]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-heading">
            My Evidence
          </h1>
          <p className="text-[hsl(var(--muted-foreground))] mt-1">
            Build your verified skill profile by uploading certifications,
            projects, and achievements.
          </p>
        </div>
        <Button
          asChild
          className="shrink-0 shadow-md shadow-[hsl(var(--primary)/0.2)]"
        >
          <Link href="/student/evidence/new">
            <Plus className="mr-2 h-4 w-4" /> Add Evidence
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-[hsl(var(--border))] shadow-sm">
          <div className="flex items-center gap-3 text-[hsl(var(--muted-foreground))] mb-2">
            <FileCheck className="w-5 h-5 text-blue-500" />
            <h3 className="font-medium text-sm">Total Evidence</h3>
          </div>
          <p className="text-3xl font-bold text-heading">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[hsl(var(--border))] shadow-sm">
          <div className="flex items-center gap-3 text-[hsl(var(--muted-foreground))] mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <h3 className="font-medium text-sm">Verified</h3>
          </div>
          <p className="text-3xl font-bold text-heading">{stats.verified}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[hsl(var(--border))] shadow-sm">
          <div className="flex items-center gap-3 text-[hsl(var(--muted-foreground))] mb-2">
            <Clock className="w-5 h-5 text-slate-500" />
            <h3 className="font-medium text-sm">Pending</h3>
          </div>
          <p className="text-3xl font-bold text-heading">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[hsl(var(--border))] shadow-sm">
          <div className="flex items-center gap-3 text-[hsl(var(--muted-foreground))] mb-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <h3 className="font-medium text-sm">Needs Action</h3>
          </div>
          <p className="text-3xl font-bold text-heading">{stats.needsAction}</p>
        </div>
      </div>

      {evidence && evidence.length > 0 ? (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-[hsl(var(--border))] shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              <Input
                placeholder="Search by title or issuer..."
                className="pl-9 bg-[hsl(var(--background))]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
              <select
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-[hsl(var(--background))] px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-w-[140px]"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as EvidenceStatus | "ALL")
                }
              >
                <option value="ALL">All Statuses</option>
                <option value={EvidenceStatus.VERIFIED}>Verified</option>
                <option value={EvidenceStatus.UNVERIFIED}>Pending</option>
                <option value={EvidenceStatus.PROCESSING}>Processing</option>
                <option value={EvidenceStatus.REJECTED}>Rejected</option>
                <option value={EvidenceStatus.NEEDS_REVIEW}>
                  Needs Review
                </option>
              </select>
              <select
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-[hsl(var(--background))] px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-w-[140px]"
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(e.target.value as EvidenceType | "ALL")
                }
              >
                <option value="ALL">All Types</option>
                {Object.values(EvidenceType).map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid */}
          {filteredEvidence.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvidence.map((item) => (
                <EvidenceCard key={item.id} evidence={item} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-[hsl(var(--border))]">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[hsl(var(--muted))] mb-4">
                <Search className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
              </div>
              <h3 className="text-lg font-medium text-heading">
                No matching evidence
              </h3>
              <p className="text-[hsl(var(--muted-foreground))] mt-1">
                Try adjusting your filters or search query.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-[hsl(var(--primary)/0.3)] shadow-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[hsl(var(--primary)/0.1)] mb-6">
            <FileCheck className="w-8 h-8 text-[hsl(var(--primary))]" />
          </div>
          <h2 className="text-2xl font-bold text-heading mb-2">
            Build Your Verified Profile
          </h2>
          <p className="text-[hsl(var(--muted-foreground))] max-w-md mx-auto mb-8">
            Upload your certifications, hackathon wins, and key projects. We
            will verify them to build trust with top recruiters.
          </p>
          <Button
            asChild
            size="lg"
            className="shadow-md shadow-[hsl(var(--primary)/0.2)]"
          >
            <Link href="/student/evidence/new">
              <Plus className="mr-2 h-5 w-5" /> Add Your First Evidence
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
