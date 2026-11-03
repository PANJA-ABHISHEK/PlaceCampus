"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ClipboardCheck,
  FilePlus2,
  Layers,
  Loader2,
  Sparkles,
} from "lucide-react";
import type {
  PreparationItem,
  PreparationItemStatus,
} from "@placecampus/shared-types";
import { cn } from "@/lib/utils";
import { SkillIcon } from "@/features/skills/lib/skill-registry";
import {
  ITEM_STATUS_META,
  ITEM_STATUS_ORDER,
  PRIORITY_META,
} from "../lib/prep-meta";

export function TaskCard({
  item,
  readOnly,
  isUpdating,
  onStatusChange,
  showActions = true,
  id,
}: {
  item: PreparationItem;
  /** Archived plans can't be changed (enforced by the API too). */
  readOnly?: boolean;
  isUpdating: boolean;
  onStatusChange: (status: PreparationItemStatus) => void;
  showActions?: boolean;
  id?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const done = item.status === "COMPLETED";
  const statusMeta = ITEM_STATUS_META[item.status];
  const disabled = readOnly || isUpdating;

  return (
    <article
      id={id}
      className={cn(
        "scroll-mt-28 rounded-2xl border bg-white p-4 shadow-[var(--shadow-card)] transition-all duration-200 sm:p-5",
        done
          ? "border-emerald-200 bg-gradient-to-br from-white to-emerald-50/50"
          : "border-[hsl(var(--border)/0.8)] hover:border-[hsl(var(--primary)/0.3)] hover:shadow-[var(--shadow-card-hover)]",
      )}
    >
      <div className="flex items-start gap-3.5">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={done ? `Mark ${item.skillName} as pending` : `Mark ${item.skillName} as completed`}
          disabled={disabled}
          onClick={() => onStatusChange(done ? "TODO" : "COMPLETED")}
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)] disabled:cursor-not-allowed",
            done
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-[hsl(var(--border))] bg-white hover:border-[hsl(var(--primary))]",
            disabled && !done && "opacity-60",
          )}
        >
          {isUpdating ? (
            <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--primary))]" aria-hidden="true" />
          ) : done ? (
            <Check className="pc-pop h-4 w-4" strokeWidth={3} aria-hidden="true" />
          ) : null}
        </button>

        <SkillIcon name={item.skillName} size="sm" className="hidden sm:flex" />

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={cn("font-bold text-[hsl(var(--foreground))]", done && "text-[hsl(var(--foreground)/0.6)] line-through decoration-emerald-500/60")}>
              Improve {item.skillName}
            </h3>
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1", PRIORITY_META[item.priority].className)}>
              {item.isOptional ? "Optional" : PRIORITY_META[item.priority].label}
            </span>
            <span className="rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-[11px] font-semibold text-[hsl(var(--foreground)/0.7)]">
              Level {item.currentLevel} → {item.requiredLevel}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-[hsl(var(--foreground)/0.75)]">{item.explanation}</p>

          {/* Status control: the API's four statuses */}
          <div role="radiogroup" aria-label={`Status of ${item.skillName}`} className="flex flex-wrap gap-1.5 pt-1">
            {ITEM_STATUS_ORDER.map((status) => {
              const meta = ITEM_STATUS_META[status];
              const active = item.status === status;
              return (
                <button
                  key={status}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={disabled}
                  onClick={() => !active && onStatusChange(status)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold ring-1 transition-colors disabled:cursor-not-allowed",
                    active ? meta.className : "bg-white text-[hsl(var(--muted-foreground))] ring-[hsl(var(--border))] hover:text-[hsl(var(--foreground))] disabled:hover:text-[hsl(var(--muted-foreground))]",
                  )}
                >
                  {meta.label}
                </button>
              );
            })}
            <span className="sr-only" aria-live="polite">Current status: {statusMeta.label}</span>
          </div>

          {showActions && (
            <>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[hsl(var(--primary))] hover:underline"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {open ? "Hide" : "Show"} recommended actions ({item.recommendedActions.length})
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
              </button>
              {open && (
                <ul className="pc-step space-y-1.5 rounded-xl bg-[hsl(var(--primary)/0.06)] p-3.5">
                  {item.recommendedActions.map((action) => (
                    <li key={action} className="flex gap-2 text-sm text-[hsl(var(--foreground)/0.85)]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--primary))]" aria-hidden="true" />
                      {action}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <Link href="/student/evidence" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] px-3 text-xs font-semibold transition-colors hover:border-[hsl(var(--primary)/0.4)] hover:text-[hsl(var(--primary))]">
                  <FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" /> Add evidence
                </Link>
                <Link href="/student/skills" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] px-3 text-xs font-semibold transition-colors hover:border-[hsl(var(--primary)/0.4)] hover:text-[hsl(var(--primary))]">
                  <Layers className="h-3.5 w-3.5" aria-hidden="true" /> View skills
                </Link>
                {item.assessmentCheckpoint && (
                  <Link
                    href={`/student/assessments/${item.assessmentCheckpoint.assessmentId}/attempt`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[hsl(var(--primary)/0.1)] px-3 text-xs font-semibold text-[hsl(var(--color-primary-700))] transition-colors hover:bg-[hsl(var(--primary)/0.16)]"
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    Checkpoint: {item.assessmentCheckpoint.title}
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
