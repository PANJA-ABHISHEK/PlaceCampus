"use client";

import * as React from "react";
import {
  ChevronDown,
  CircleAlert,
  CircleCheck,
  FilePlus2,
  Hourglass,
  Layers,
  RotateCcw,
  Search,
  SearchX,
  X,
  type LucideIcon,
} from "lucide-react";
import type { StudentSkillEntry } from "@placecampus/shared-types";
import { useMySkills } from "@/features/skills/hooks/use-skills";
import { useMyEvidence } from "@/features/evidence/hooks/use-evidence";
import { STATUS_GROUPS, TYPE_META } from "@/features/evidence/lib/evidence-meta";
import {
  EvidenceWizard,
  type WizardMode,
} from "@/features/evidence/components/evidence-wizard";
import {
  CATEGORY_META,
  MAIN_CATEGORIES,
  getSkillCategory,
  type SkillCategory,
} from "@/features/skills/lib/skill-registry";
import { SkillsHero } from "@/features/skills/components/skills-hero";
import { SkillsTable } from "@/features/skills/components/skills-table";
import { SkillDetailsDialog } from "@/features/skills/components/skill-details-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type StatusFilter = "ALL" | StudentSkillEntry["verificationStatus"];

const ADD_SKILL_NOTE =
  "Skills are added by submitting evidence. Once it's verified, the skills it demonstrates appear on your profile.";

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  iconClassName,
  delay,
}: {
  label: string;
  value: number;
  hint?: string;
  icon: LucideIcon;
  iconClassName: string;
  delay: number;
}) {
  return (
    <div
      style={{ "--pc-delay": `${delay}ms` } as React.CSSProperties}
      className="pc-enter flex items-center gap-5 rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] sm:p-6"
    >
      <span
        className={cn(
          "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
          iconClassName,
        )}
      >
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-[hsl(var(--foreground)/0.75)]">
          {label}
        </p>
        <p className="text-3xl font-bold tabular-nums text-[hsl(var(--foreground))]">
          {value}
        </p>
        {hint && (
          <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

function SkillsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only">Loading skills…</span>
      <Skeleton className="h-[170px] w-full rounded-[20px]" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[130px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-[320px] w-full rounded-2xl" />
    </div>
  );
}

export default function StudentSkillsPage() {
  const { data: profile, isLoading, isError, error, refetch } = useMySkills();
  const { data: evidence } = useMyEvidence();

  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("ALL");
  const [category, setCategory] = React.useState<SkillCategory | null>(null);
  const [selected, setSelected] = React.useState<StudentSkillEntry | null>(
    null,
  );
  const [wizardMode, setWizardMode] = React.useState<WizardMode | null>(null);

  const skills = React.useMemo(() => profile?.skills ?? [], [profile]);

  const categoryCounts = React.useMemo(() => {
    const counts: Record<SkillCategory, number> = {
      PROGRAMMING: 0,
      DATABASE: 0,
      WEB_DEVELOPMENT: 0,
      AI_ML: 0,
      OTHER: 0,
    };
    for (const skill of skills) counts[getSkillCategory(skill.canonicalName)]++;
    return counts;
  }, [skills]);

  const filtered = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return skills
      .filter(
        (skill) =>
          (!query || skill.canonicalName.toLowerCase().includes(query)) &&
          (statusFilter === "ALL" || skill.verificationStatus === statusFilter) &&
          (!category || getSkillCategory(skill.canonicalName) === category),
      )
      .sort((a, b) => b.level - a.level || a.canonicalName.localeCompare(b.canonicalName));
  }, [skills, searchTerm, statusFilter, category]);

  const verifiedCount = skills.filter(
    (s) => s.verificationStatus === "VERIFIED",
  ).length;
  // Skills only come from verified evidence, so evidence still in review is
  // what is pending for the student.
  const pendingEvidence = (evidence ?? []).filter((item) =>
    STATUS_GROUPS.PENDING.includes(item.status),
  ).length;
  // Matches the four category cards; tools like Docker sit under "Other".
  const categoriesUsed = MAIN_CATEGORIES.filter((key) => categoryCounts[key] > 0).length;

  const hasFilters = !!searchTerm.trim() || statusFilter !== "ALL" || !!category;
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setCategory(null);
  };
  const openAddSkill = () =>
    setWizardMode({ kind: "create", note: ADD_SKILL_NOTE });

  if (isLoading) return <SkillsSkeleton />;

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      <SkillsHero onAddSkill={openAddSkill} />

      {isError ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50/60 px-6 py-12 text-center">
          <CircleAlert className="h-8 w-8 text-red-600" aria-hidden="true" />
          <div>
            <p className="font-semibold text-red-900">
              We couldn&apos;t load your skills
            </p>
            <p className="mt-1 text-sm text-red-800/80">
              {error instanceof Error ? error.message : "Please try again."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-red-700 ring-1 ring-red-200 transition-colors hover:bg-red-50"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Statistics */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard
              label="Verified Skills"
              value={verifiedCount}
              icon={CircleCheck}
              iconClassName="bg-emerald-50 text-emerald-600"
              delay={40}
            />
            <StatCard
              label="Pending Review"
              value={pendingEvidence}
              hint="Evidence awaiting verification"
              icon={Hourglass}
              iconClassName="bg-amber-50 text-amber-600"
              delay={80}
            />
            <StatCard
              label="Skill Categories"
              value={categoriesUsed}
              icon={Layers}
              iconClassName="bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
              delay={120}
            />
          </div>

          {/* Which evidence types the verified skills come from */}
          {(profile?.evidenceTypes?.length ?? 0) > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[hsl(var(--border))] bg-white px-4 py-3 text-sm">
              <span className="font-semibold text-[hsl(var(--foreground))]">
                Built from {profile!.evidenceTypes!.length} evidence type{profile!.evidenceTypes!.length === 1 ? "" : "s"}:
              </span>
              {profile!.evidenceTypes!.map((type) => {
                const meta = TYPE_META[type as keyof typeof TYPE_META];
                const Icon = meta?.icon;
                return (
                  <span
                    key={type}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--primary)/0.08)] px-2.5 py-1 text-xs font-semibold text-[hsl(var(--color-primary-dark))]"
                  >
                    {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
                    {meta?.plural ?? type}
                  </span>
                );
              })}
            </div>
          )}

          {/* Categories */}
          <section aria-labelledby="skill-categories-heading" className="space-y-3">
            <h2
              id="skill-categories-heading"
              className="text-xl font-bold text-[hsl(var(--foreground))]"
            >
              Skill Categories
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {MAIN_CATEGORIES.map((key, index) => {
                const meta = CATEGORY_META[key];
                const Icon = meta.icon;
                const active = category === key;
                const count = categoryCounts[key];
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCategory(active ? null : key)}
                    style={{ "--pc-delay": `${140 + index * 40}ms` } as React.CSSProperties}
                    className={cn(
                      "pc-enter group flex flex-col items-center gap-2 rounded-2xl border p-5 text-center shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)]",
                      active
                        ? "border-[hsl(var(--primary)/0.45)] bg-gradient-to-br from-[hsl(var(--color-primary-50))] to-white ring-2 ring-[hsl(var(--primary)/0.2)]"
                        : "border-[hsl(var(--border)/0.8)] bg-white",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-9 w-9 transition-transform duration-200 group-hover:scale-110",
                        meta.iconClass,
                      )}
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                    <span className="text-base font-bold text-[hsl(var(--foreground))]">
                      {meta.label}
                    </span>
                    <span className="text-sm text-[hsl(var(--muted-foreground))]">
                      {count} {count === 1 ? "Skill" : "Skills"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Your skills */}
          <section aria-labelledby="your-skills-heading" className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2
                id="your-skills-heading"
                className="text-xl font-bold text-[hsl(var(--foreground))]"
              >
                Your Skills ({skills.length})
              </h2>
              <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center">
                <div className="relative sm:w-64">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
                  />
                  <input
                    type="search"
                    aria-label="Search skills"
                    placeholder="Search skills…"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="h-11 w-full rounded-xl border border-[hsl(var(--input))] bg-white pl-10 pr-9 text-sm shadow-[var(--shadow-xs)] transition-[border-color,box-shadow] placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-4 focus:ring-[hsl(var(--primary)/0.12)]"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="relative sm:w-44">
                  <select
                    aria-label="Filter by status"
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as StatusFilter)
                    }
                    className="h-11 w-full appearance-none rounded-xl border border-[hsl(var(--input))] bg-white pl-3.5 pr-9 text-sm font-medium shadow-[var(--shadow-xs)] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-4 focus:ring-[hsl(var(--primary)/0.12)]"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="VERIFIED">Verified</option>
                    <option value="UNVERIFIED">Pending</option>
                  </select>
                  <ChevronDown
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
                  />
                </div>
              </div>
            </div>

            {category && (
              <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                Showing
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--primary)/0.1)] py-0.5 pl-2.5 pr-1 font-semibold text-[hsl(var(--color-primary-700))]">
                  {CATEGORY_META[category].label}
                  <button
                    type="button"
                    aria-label="Remove category filter"
                    onClick={() => setCategory(null)}
                    className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-[hsl(var(--primary)/0.15)]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              </div>
            )}

            {skills.length === 0 ? (
              <div className="pc-enter flex flex-col items-center rounded-2xl border border-dashed border-[hsl(var(--primary)/0.3)] bg-white px-6 py-14 text-center">
                <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
                  <Layers className="h-8 w-8" aria-hidden="true" />
                </span>
                <h3 className="text-xl font-bold text-[hsl(var(--foreground))]">
                  Your verified skill profile is still being built
                </h3>
                <p className="mt-2 max-w-[30rem] text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
                  Submit evidence, it gets analysed and verified, and the
                  skills it demonstrates appear here with their level.
                </p>
                <button
                  type="button"
                  onClick={openAddSkill}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_hsl(var(--primary)/0.8)] transition-all hover:bg-[hsl(var(--color-primary-600))] active:scale-[0.98]"
                >
                  <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                  Add evidence
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-white px-6 py-12 text-center">
                <SearchX
                  className="mb-3 h-8 w-8 text-[hsl(var(--muted-foreground))]"
                  aria-hidden="true"
                />
                <p className="font-semibold text-[hsl(var(--foreground))]">
                  No skills match your filters
                </p>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-sm font-semibold transition-colors hover:bg-[hsl(var(--muted))]"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <SkillsTable skills={filtered} onView={setSelected} />
            )}
          </section>
        </>
      )}

      <SkillDetailsDialog
        skill={selected}
        evidence={evidence ?? []}
        onOpenChange={(open) => !open && setSelected(null)}
      />
      <EvidenceWizard
        mode={wizardMode}
        onOpenChange={(open) => !open && setWizardMode(null)}
      />
    </div>
  );
}
