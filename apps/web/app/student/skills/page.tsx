"use client";

import * as React from "react";
import { useMySkills, useTaxonomy } from "@/features/skills/hooks/use-skills";
import { useAuth } from "@/features/auth/components/auth-provider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  BrainCircuit,
  ShieldCheck,
  HelpCircle,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";

export default function StudentSkillsPage() {
  const { user } = useAuth();
  const { data: profile, isLoading: isProfileLoading } = useMySkills();
  const { data: taxonomy, isLoading: isTaxonomyLoading } = useTaxonomy();

  const [searchTerm, setSearchTerm] = React.useState("");

  const isLoading = isProfileLoading || isTaxonomyLoading;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]"></div>
      </div>
    );
  }

  // Filter skills based on search
  const filteredSkills =
    profile?.skills?.filter((skill) =>
      skill.canonicalName.toLowerCase().includes(searchTerm.toLowerCase()),
    ) || [];

  // Group by cluster
  // Since we only have cluster ID in taxonomy, let's map it if we have clusters loaded.
  // For now, let's group by taxonomy matching or just a flat list if no cluster available.
  const groupedSkills = filteredSkills.reduce(
    (acc, skill) => {
      // Find taxonomy entry to get cluster name if possible.
      // Wait, the API returns cluster object populated if populated.
      const taxSkill = taxonomy?.find((t) => t.id === skill.skillId);
      const clusterName = taxSkill?.clusterId
        ? (taxSkill.clusterId as { name?: string }).name ||
          "Other / Uncategorized"
        : "Other / Uncategorized";

      if (!acc[clusterName]) {
        acc[clusterName] = [];
      }
      acc[clusterName].push(skill);
      return acc;
    },
    {} as Record<string, typeof filteredSkills>,
  );

  const hasSkills = profile && profile.skills && profile.skills.length > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-heading">
            My Skills
          </h1>
          <p className="text-[hsl(var(--muted-foreground))] mt-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[hsl(var(--primary))]" />
            Your verified skills are built from evidence reviewed by the
            PlaceCampus verification workflow.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-[hsl(var(--border))] shadow-sm flex items-center gap-4 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-5">
            <BrainCircuit className="w-32 h-32" />
          </div>
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-[hsl(var(--muted-foreground))] font-medium">
              Verified Skills
            </p>
            <p className="text-2xl font-bold text-heading">
              {profile?.skills?.filter(
                (s) => s.verificationStatus === "VERIFIED",
              ).length || 0}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[hsl(var(--border))] shadow-sm flex items-center gap-4 opacity-50">
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-[hsl(var(--muted-foreground))] font-medium">
              Needs Assessment
            </p>
            <p className="text-2xl font-bold text-heading">--</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[hsl(var(--border))] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-[hsl(var(--muted-foreground))] font-medium">
              Skill Categories
            </p>
            <p className="text-2xl font-bold text-heading">
              {Object.keys(groupedSkills).length}
            </p>
          </div>
        </div>
      </div>

      {!hasSkills ? (
        <div className="bg-white rounded-2xl border border-[hsl(var(--border))] shadow-sm p-12 text-center">
          <div className="w-20 h-20 bg-[hsl(var(--muted))] rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-10 h-10 text-[hsl(var(--muted-foreground))]" />
          </div>
          <h3 className="text-xl font-bold text-heading mb-2">
            Your verified skill profile is still being built.
          </h3>
          <p className="text-[hsl(var(--muted-foreground))] max-w-md mx-auto mb-8">
            Submit evidence → AI analysis → Faculty verification → Verified
            skills appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[hsl(var(--border))] shadow-sm overflow-hidden flex flex-col">
          {/* Filters */}
          <div className="p-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <Input
                placeholder="Search verified skills..."
                className="pl-9 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-10">
            {Object.keys(groupedSkills).length === 0 ? (
              <div className="text-center py-10 text-[hsl(var(--muted-foreground))]">
                No skills matched your search.
              </div>
            ) : (
              Object.entries(groupedSkills).map(([cluster, skills]) => (
                <div key={cluster} className="space-y-4">
                  <h3 className="text-lg font-bold text-heading border-b border-[hsl(var(--border))] pb-2">
                    {cluster}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {skills.map((skill) => (
                      <div
                        key={skill.skillId}
                        className="group border border-[hsl(var(--border))] rounded-xl p-4 hover:border-[hsl(var(--primary)/0.5)] transition-colors relative bg-white shadow-sm hover:shadow-md"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-semibold text-heading group-hover:text-[hsl(var(--primary))] transition-colors">
                            {skill.canonicalName}
                          </h4>
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                          >
                            L{skill.level}
                          </Badge>
                        </div>

                        <div className="space-y-2 mt-4 text-xs text-[hsl(var(--muted-foreground))]">
                          <div className="flex justify-between items-center">
                            <span className="flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                              {skill.verificationStatus}
                            </span>
                            <span>
                              {skill.sourceEvidenceIds.length} Source
                              {skill.sourceEvidenceIds.length > 1 ? "s" : ""}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-[hsl(var(--border))] flex justify-between items-center">
                            <span>Last verified</span>
                            <span className="font-medium text-heading">
                              {skill.lastVerifiedAt
                                ? format(
                                    new Date(skill.lastVerifiedAt),
                                    "MMM d, yyyy",
                                  )
                                : "Unknown"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
