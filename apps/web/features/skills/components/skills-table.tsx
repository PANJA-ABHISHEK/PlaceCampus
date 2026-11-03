"use client";

import * as React from "react";
import Link from "next/link";
import { CircleCheck, Clock, Eye, FileText, MoreVertical } from "lucide-react";
import type { StudentSkillEntry } from "@placecampus/shared-types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  CATEGORY_META,
  SkillIcon,
  getSkillCategory,
} from "../lib/skill-registry";

/** Skill levels are 1–5 (see drive requirement validation in the API). */
export const MAX_SKILL_LEVEL = 5;

export function SkillStatusBadge({
  status,
}: {
  status: StudentSkillEntry["verificationStatus"];
}) {
  const verified = status === "VERIFIED";
  const Icon = verified ? CircleCheck : Clock;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
        verified
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-amber-50 text-amber-700 ring-amber-200",
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {verified ? "Verified" : "Pending"}
    </span>
  );
}

export function SkillLevelBar({
  level,
  showLabel = true,
}: {
  level: number;
  showLabel?: boolean;
}) {
  const clamped = Math.min(Math.max(level, 0), MAX_SKILL_LEVEL);
  return (
    <div className="flex items-center gap-3">
      <div
        role="meter"
        aria-label="Proficiency level"
        aria-valuemin={0}
        aria-valuemax={MAX_SKILL_LEVEL}
        aria-valuenow={clamped}
        className="h-2 w-full min-w-[96px] overflow-hidden rounded-full bg-[hsl(var(--muted))]"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--color-primary-light))] transition-[width] duration-700 ease-out"
          style={{ width: `${(clamped / MAX_SKILL_LEVEL) * 100}%` }}
        />
      </div>
      {showLabel && (
        <span className="shrink-0 text-sm font-semibold tabular-nums text-[hsl(var(--foreground))]">
          Lv {clamped}/{MAX_SKILL_LEVEL}
        </span>
      )}
    </div>
  );
}

function CategoryBadge({ name }: { name: string }) {
  const meta = CATEGORY_META[getSkillCategory(name)];
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
        meta.badge,
      )}
    >
      {meta.label}
    </span>
  );
}

function RowActions({
  skill,
  onView,
}: {
  skill: StudentSkillEntry;
  onView: () => void;
}) {
  const firstSource = skill.sourceEvidenceIds[0];
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${skill.canonicalName}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)] data-[state=open]:bg-[hsl(var(--muted))]"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="pc-menu-animate w-52 rounded-xl bg-white p-1.5 shadow-[var(--shadow-xl)]"
      >
        <DropdownMenuItem
          onSelect={onView}
          className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2"
        >
          <Eye />
          View details
        </DropdownMenuItem>
        {firstSource && (
          <DropdownMenuItem
            asChild
            className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2"
          >
            <Link href={`/student/evidence/${firstSource}`}>
              <FileText />
              Open source evidence
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SkillsTable({
  skills,
  onView,
}: {
  skills: StudentSkillEntry[];
  onView: (skill: StudentSkillEntry) => void;
}) {
  return (
    <div className="pc-enter overflow-hidden rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white shadow-[var(--shadow-card)]">
      {/* Table: tablet and up */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="border-b border-[hsl(var(--border)/0.8)] text-sm text-[hsl(var(--muted-foreground))]">
              <th scope="col" className="px-6 py-3.5 font-medium">Skill</th>
              <th scope="col" className="px-4 py-3.5 font-medium">Category</th>
              <th scope="col" className="w-[30%] px-4 py-3.5 font-medium">Proficiency</th>
              <th scope="col" className="px-4 py-3.5 font-medium">Status</th>
              <th scope="col" className="w-14 px-4 py-3.5">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--border)/0.6)]">
            {skills.map((skill) => (
              <tr
                key={skill.skillId}
                className="group cursor-pointer transition-colors hover:bg-[hsl(var(--primary)/0.03)]"
                onClick={(event) => {
                  // Ignore clicks that came from the actions menu.
                  if ((event.target as Element).closest("button,a,[role=menu]")) return;
                  onView(skill);
                }}
              >
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <SkillIcon name={skill.canonicalName} size="sm" />
                    <span className="font-semibold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))]">
                      {skill.canonicalName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <CategoryBadge name={skill.canonicalName} />
                </td>
                <td className="px-4 py-3.5">
                  <SkillLevelBar level={skill.level} />
                </td>
                <td className="px-4 py-3.5">
                  <SkillStatusBadge status={skill.verificationStatus} />
                </td>
                <td className="px-4 py-3.5 text-right">
                  <RowActions skill={skill} onView={() => onView(skill)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Compact list: phones */}
      <ul className="divide-y divide-[hsl(var(--border)/0.6)] md:hidden">
        {skills.map((skill) => (
          <li key={skill.skillId} className="flex items-start gap-3 p-4">
            <SkillIcon name={skill.canonicalName} size="md" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onView(skill)}
                  className="truncate text-left font-semibold text-[hsl(var(--foreground))]"
                >
                  {skill.canonicalName}
                </button>
                <SkillStatusBadge status={skill.verificationStatus} />
              </div>
              <CategoryBadge name={skill.canonicalName} />
              <SkillLevelBar level={skill.level} />
            </div>
            <RowActions skill={skill} onView={() => onView(skill)} />
          </li>
        ))}
      </ul>
    </div>
  );
}
