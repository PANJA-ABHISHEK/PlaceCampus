"use client";

import * as React from "react";
import {
  ArrowDownUp,
  ChevronDown,
  CircleAlert,
  FilterX,
  LayoutGrid,
  Plus,
  RotateCcw,
  Search,
  SearchX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  EvidenceItem,
  EvidenceStatus,
  EvidenceType,
} from "@placecampus/shared-types";
import {
  openEvidenceDocument,
  useDeleteEvidence,
  useMyEvidence,
} from "@/features/evidence/hooks/use-evidence";
import {
  CATEGORY_TYPES,
  STATUS_GROUPS,
  TYPE_META,
  getPortfolioStrength,
  type StatusGroup,
} from "@/features/evidence/lib/evidence-meta";
import { EvidenceHero } from "@/features/evidence/components/evidence-hero";
import { EvidenceStats } from "@/features/evidence/components/evidence-stats";
import { EvidencePortfolioCard } from "@/features/evidence/components/evidence-portfolio-card";
import {
  EvidenceWizard,
  type WizardMode,
} from "@/features/evidence/components/evidence-wizard";
import { EvidenceDrawer } from "@/features/evidence/components/evidence-drawer";
import { DeleteEvidenceDialog } from "@/features/evidence/components/delete-evidence-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type SortOrder = "NEWEST" | "OLDEST" | "AZ";

const controlClassName =
  "h-11 w-full appearance-none rounded-xl border border-[hsl(var(--input))] bg-white pl-3.5 pr-9 text-sm font-medium text-[hsl(var(--foreground))] shadow-[var(--shadow-xs)] transition-[border-color,box-shadow] duration-200 hover:border-[hsl(var(--muted-foreground)/0.4)] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-4 focus:ring-[hsl(var(--primary)/0.12)]";

function SelectControl({
  label,
  value,
  onChange,
  icon: Icon,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      {Icon && (
        <Icon
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
        />
      )}
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(controlClassName, Icon && "pl-10")}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
      />
    </div>
  );
}

function EvidenceSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only">Loading evidence…</span>
      <Skeleton className="h-[180px] w-full rounded-[20px]" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.9fr)]">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[118px] rounded-2xl" />
        ))}
        <Skeleton className="col-span-2 h-[118px] rounded-2xl lg:col-span-4 xl:col-span-1" />
      </div>
      <Skeleton className="h-14 w-full rounded-2xl" />
      <Skeleton className="h-[76px] w-full rounded-2xl" />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[260px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function EvidenceDashboard() {
  const { data: evidence, isLoading, isError, error, refetch } =
    useMyEvidence();
  const deleteMutation = useDeleteEvidence();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusGroup, setStatusGroup] = React.useState<StatusGroup | "ALL">(
    "ALL",
  );
  const [typeFilter, setTypeFilter] = React.useState<EvidenceType | "ALL">(
    "ALL",
  );
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("NEWEST");

  const [wizardMode, setWizardMode] = React.useState<WizardMode | null>(null);
  const [drawerItem, setDrawerItem] = React.useState<EvidenceItem | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = React.useState<EvidenceItem | null>(
    null,
  );
  const [openingDocId, setOpeningDocId] = React.useState<string | null>(null);

  const items = React.useMemo(() => evidence ?? [], [evidence]);

  const filteredEvidence = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const groupStatuses: EvidenceStatus[] | null =
      statusGroup === "ALL" ? null : STATUS_GROUPS[statusGroup];
    const result = items.filter((item) => {
      const matchesSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        (item.issuer?.toLowerCase().includes(query) ?? false);
      const matchesStatus =
        !groupStatuses || groupStatuses.includes(item.status);
      const matchesType = typeFilter === "ALL" || item.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
    return [...result].sort((a, b) => {
      if (sortOrder === "AZ") return a.title.localeCompare(b.title);
      const diff =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortOrder === "OLDEST" ? diff : -diff;
    });
  }, [items, searchQuery, statusGroup, typeFilter, sortOrder]);

  const stats = React.useMemo(
    () => ({
      total: items.length,
      verified: items.filter((e) => STATUS_GROUPS.VERIFIED.includes(e.status))
        .length,
      pending: items.filter((e) => STATUS_GROUPS.PENDING.includes(e.status))
        .length,
      needsAction: items.filter((e) =>
        STATUS_GROUPS.NEEDS_ACTION.includes(e.status),
      ).length,
    }),
    [items],
  );

  const typeCounts = React.useMemo(() => {
    const counts = {} as Record<EvidenceType, number>;
    for (const item of items) counts[item.type] = (counts[item.type] ?? 0) + 1;
    return counts;
  }, [items]);

  const strength = React.useMemo(() => getPortfolioStrength(items), [items]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    statusGroup !== "ALL" ||
    typeFilter !== "ALL" ||
    sortOrder !== "NEWEST";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusGroup("ALL");
    setTypeFilter("ALL");
    setSortOrder("NEWEST");
  };

  const openDocument = async (item: EvidenceItem) => {
    setOpeningDocId(item.id);
    try {
      await openEvidenceDocument(item.id);
    } catch (err) {
      toast.error("Couldn't open the document", {
        description: err instanceof ApiError ? err.message : undefined,
      });
    } finally {
      setOpeningDocId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("Evidence deleted", { description: deleteTarget.title });
      if (drawerItem?.id === deleteTarget.id) setDrawerItem(null);
      setDeleteTarget(null);
    } catch (err) {
      toast.error("Couldn't delete evidence", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const openCreate = (initialType?: EvidenceType) =>
    setWizardMode({ kind: "create", initialType });

  if (isLoading) return <EvidenceSkeleton />;

  const categories: {
    value: EvidenceType | "ALL";
    label: string;
    icon: React.ElementType;
    count: number;
  }[] = [
    { value: "ALL", label: "All Evidence", icon: LayoutGrid, count: items.length },
    ...CATEGORY_TYPES.map((type) => ({
      value: type,
      label: TYPE_META[type].plural,
      icon: TYPE_META[type].icon,
      count: typeCounts[type] ?? 0,
    })),
  ];

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      <EvidenceHero onAdd={() => openCreate()} />

      {isError ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50/60 px-6 py-12 text-center">
          <CircleAlert className="h-8 w-8 text-red-600" aria-hidden="true" />
          <div>
            <p className="font-semibold text-red-900">
              We couldn&apos;t load your evidence
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
          <EvidenceStats
            stats={stats}
            strength={strength}
            activeGroup={statusGroup}
            onSelectGroup={(group) => {
              setStatusGroup(group);
              if (group === "ALL") setTypeFilter("ALL");
            }}
            onImprove={() => openCreate(strength.missing[0])}
          />

          {/* Category navigation */}
          <nav
            aria-label="Evidence categories"
            style={{ "--pc-delay": "220ms" } as React.CSSProperties}
            className="pc-enter rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white p-1.5 shadow-[var(--shadow-card)]"
          >
            <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
              {categories.map(({ value, label, icon: Icon, count }) => {
                const active = typeFilter === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTypeFilter(value)}
                    className={cn(
                      "relative flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)] xl:flex-1 xl:justify-center",
                      active
                        ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
                        : "text-[hsl(var(--foreground)/0.75)] hover:bg-[hsl(var(--muted)/0.6)] hover:text-[hsl(var(--foreground))]",
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    {label}
                    <span
                      className={cn(
                        "min-w-6 rounded-md px-1.5 py-0.5 text-center text-xs font-bold tabular-nums transition-colors",
                        active
                          ? "bg-[hsl(var(--primary))] text-white"
                          : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
                      )}
                    >
                      {count}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-x-3 -bottom-1.5 h-[3px] rounded-full bg-[hsl(var(--primary))] transition-transform duration-300",
                        active ? "scale-x-100" : "scale-x-0",
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Search & filters */}
          <div
            style={{ "--pc-delay": "260ms" } as React.CSSProperties}
            className="pc-enter grid grid-cols-1 gap-3 rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white p-3 shadow-[var(--shadow-card)] sm:grid-cols-2 sm:p-4 xl:grid-cols-[minmax(0,1fr)_170px_170px_160px_auto]"
          >
            <div className="relative sm:col-span-2 xl:col-span-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
              />
              <input
                type="search"
                aria-label="Search evidence"
                placeholder="Search by evidence title or issuer…"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className={cn(controlClassName, "pl-10 pr-10 font-normal")}
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <SelectControl
              label="Filter by status"
              value={statusGroup}
              onChange={(value) => setStatusGroup(value as StatusGroup | "ALL")}
            >
              <option value="ALL">All Statuses</option>
              <option value="VERIFIED">Verified</option>
              <option value="PENDING">Pending</option>
              <option value="NEEDS_ACTION">Needs Action</option>
            </SelectControl>
            <SelectControl
              label="Filter by type"
              value={typeFilter}
              onChange={(value) => setTypeFilter(value as EvidenceType | "ALL")}
            >
              <option value="ALL">All Types</option>
              {Object.values(EvidenceType).map((type) => (
                <option key={type} value={type}>
                  {TYPE_META[type].label}
                </option>
              ))}
            </SelectControl>
            <SelectControl
              label="Sort evidence"
              value={sortOrder}
              onChange={(value) => setSortOrder(value as SortOrder)}
              icon={ArrowDownUp}
            >
              <option value="NEWEST">Newest</option>
              <option value="OLDEST">Oldest</option>
              <option value="AZ">A–Z</option>
            </SelectControl>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[hsl(var(--primary)/0.45)] bg-white px-4 text-sm font-semibold text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(var(--primary)/0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)] disabled:cursor-not-allowed disabled:border-[hsl(var(--border))] disabled:text-[hsl(var(--muted-foreground))] disabled:hover:bg-white"
            >
              <FilterX className="h-4 w-4" aria-hidden="true" />
              Clear Filters
            </button>
          </div>

          {/* Results */}
          {items.length === 0 ? (
            <div className="pc-enter flex flex-col items-center rounded-2xl border border-dashed border-[hsl(var(--primary)/0.3)] bg-white px-6 py-16 text-center">
              <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
                <Plus className="h-8 w-8" aria-hidden="true" />
              </span>
              <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">
                Build your verified profile
              </h2>
              <p className="mt-2 max-w-[28rem] text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
                Upload your certifications, hackathon wins and key projects.
                Verified evidence builds trust with recruiters.
              </p>
              <button
                type="button"
                onClick={() => openCreate()}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_hsl(var(--primary)/0.8)] transition-all hover:bg-[hsl(var(--color-primary-600))] active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add your first evidence
              </button>
            </div>
          ) : filteredEvidence.length === 0 ? (
            <div className="pc-enter flex flex-col items-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-white px-6 py-14 text-center">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                <SearchX className="h-6 w-6" aria-hidden="true" />
              </span>
              <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">
                No matching evidence
              </h2>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                Try a different search, category or status.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-sm font-semibold transition-colors hover:bg-[hsl(var(--muted))]"
              >
                <FilterX className="h-4 w-4" aria-hidden="true" />
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <p
                aria-live="polite"
                className="text-sm text-[hsl(var(--muted-foreground))]"
              >
                Showing{" "}
                <span className="font-semibold text-[hsl(var(--foreground))]">
                  {filteredEvidence.length}
                </span>{" "}
                of {items.length} evidence {items.length === 1 ? "item" : "items"}
              </p>
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {filteredEvidence.map((item, index) => (
                  <EvidencePortfolioCard
                    key={item.id}
                    evidence={item}
                    style={
                      {
                        "--pc-delay": `${Math.min(index, 6) * 50}ms`,
                      } as React.CSSProperties
                    }
                    onView={() => setDrawerItem(item)}
                    onEdit={() =>
                      setWizardMode({ kind: "edit", evidence: item })
                    }
                    onDelete={() => setDeleteTarget(item)}
                    onOpenDocument={() => openDocument(item)}
                    isOpeningDocument={openingDocId === item.id}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      <EvidenceWizard
        mode={wizardMode}
        onOpenChange={(open) => !open && setWizardMode(null)}
      />
      <EvidenceDrawer
        evidence={drawerItem}
        onOpenChange={(open) => !open && setDrawerItem(null)}
        onEdit={(item) => {
          setDrawerItem(null);
          setWizardMode({ kind: "edit", evidence: item });
        }}
        onDelete={(item) => setDeleteTarget(item)}
      />
      <DeleteEvidenceDialog
        evidence={deleteTarget}
        isDeleting={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </div>
  );
}
