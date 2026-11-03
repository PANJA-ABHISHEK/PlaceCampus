"use client";

import Link from "next/link";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowUpRight, CalendarCheck, FileText, Info, X } from "lucide-react";
import type { EvidenceItem, StudentSkillEntry } from "@placecampus/shared-types";
import { formatEvidenceDate } from "@/features/evidence/lib/evidence-meta";
import { cn } from "@/lib/utils";
import {
  CATEGORY_META,
  SkillIcon,
  getSkillCategory,
} from "../lib/skill-registry";
import { MAX_SKILL_LEVEL, SkillLevelBar, SkillStatusBadge } from "./skills-table";

export function SkillDetailsDialog({
  skill,
  evidence,
  onOpenChange,
}: {
  skill: StudentSkillEntry | null;
  evidence: EvidenceItem[];
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <DialogPrimitive.Root open={!!skill} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="pc-overlay fixed inset-0 z-[var(--z-overlay)] bg-[hsl(var(--color-navy-dark)/0.45)] backdrop-blur-[2px]" />
        <DialogPrimitive.Content className="pc-modal fixed left-1/2 top-1/2 z-[var(--z-modal)] max-h-[90vh] w-[calc(100vw-2rem)] max-w-[32rem] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white shadow-[var(--shadow-2xl)] focus:outline-none">
          {skill && <DetailsBody skill={skill} evidence={evidence} />}
          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function DetailsBody({
  skill,
  evidence,
}: {
  skill: StudentSkillEntry;
  evidence: EvidenceItem[];
}) {
  const category = CATEGORY_META[getSkillCategory(skill.canonicalName)];
  const sources = skill.sourceEvidenceIds.map((id) => ({
    id: String(id),
    item: evidence.find((e) => e.id === String(id)),
  }));

  return (
    <>
      <div className="flex items-start gap-4 border-b border-[hsl(var(--border)/0.7)] bg-gradient-to-br from-white to-[hsl(var(--color-primary-50))] px-6 pb-5 pt-6">
        <SkillIcon name={skill.canonicalName} size="lg" />
        <div className="min-w-0 pr-8">
          <DialogPrimitive.Title className="text-xl font-bold text-[hsl(var(--foreground))]">
            {skill.canonicalName}
          </DialogPrimitive.Title>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
                category.badge,
              )}
            >
              {category.label}
            </span>
            <SkillStatusBadge status={skill.verificationStatus} />
          </div>
        </div>
      </div>

      <div className="space-y-6 px-6 py-6">
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">
              Proficiency level
            </h3>
            <span className="text-sm font-semibold tabular-nums text-[hsl(var(--foreground))]">
              Level {skill.level} of {MAX_SKILL_LEVEL}
            </span>
          </div>
          <SkillLevelBar level={skill.level} showLabel={false} />
          <DialogPrimitive.Description className="flex items-start gap-2 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Levels run from 1 to {MAX_SKILL_LEVEL} and are set by verification.
            Placement drives can require a minimum level.
          </DialogPrimitive.Description>
        </section>

        {skill.lastVerifiedAt && (
          <div className="flex items-center gap-3 rounded-xl bg-[hsl(var(--muted)/0.5)] px-4 py-3 text-sm">
            <CalendarCheck
              className="h-4 w-4 shrink-0 text-emerald-600"
              aria-hidden="true"
            />
            <span className="text-[hsl(var(--muted-foreground))]">
              Last verified
            </span>
            <span className="ml-auto font-semibold text-[hsl(var(--foreground))]">
              {formatEvidenceDate(skill.lastVerifiedAt, "d MMM yyyy")}
            </span>
          </div>
        )}

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">
            Source evidence ({sources.length})
          </h3>
          {sources.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              No linked evidence.
            </p>
          ) : (
            <ul className="space-y-2">
              {sources.map(({ id, item }) => (
                <li key={id}>
                  <Link
                    href={`/student/evidence/${id}`}
                    className="group flex items-center gap-3 rounded-xl border border-[hsl(var(--border)/0.8)] px-3.5 py-3 transition-colors hover:border-[hsl(var(--primary)/0.4)] hover:bg-[hsl(var(--primary)/0.04)]"
                  >
                    <FileText
                      className="h-4 w-4 shrink-0 text-[hsl(var(--primary))]"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-[hsl(var(--foreground))]">
                      {item?.title ?? "Evidence item"}
                    </span>
                    <ArrowUpRight
                      className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))] transition-colors group-hover:text-[hsl(var(--primary))]"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
