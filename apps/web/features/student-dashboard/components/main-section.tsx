"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CalendarClock,
  CircleCheck,
  CircleDashed,
  GraduationCap,
  UserRound,
} from "lucide-react";
import type { PlacementDrive } from "@placecampus/shared-types";
import { cn } from "@/lib/utils";
import { CompanyMark } from "@/features/drives/components/drive-ui";
import type { CompletionSection, RecommendedDrive } from "../lib/dashboard-data";
import {
  CardHeading,
  dashCardClassName,
  primaryButtonClassName,
} from "./dashboard-ui";


/* ───────────── Profile completion ───────────── */

export function ProfileCompletionCard({ percentage, sections }: { percentage: number; sections: CompletionSection[] }) {
  return (
    <section aria-labelledby="profile-completion-heading" className={dashCardClassName}>
      <CardHeading id="profile-completion-heading" icon={UserRound} title="Profile Completion" subtitle="A complete profile improves drive matching" />

      <div className="mt-5">
        <div className="flex items-end justify-between">
          <p className="text-3xl font-extrabold leading-none text-[#14213D]">
            {percentage}
            <span className="text-base font-semibold text-[hsl(var(--muted-foreground))]">%</span>
          </p>
          <p className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
            {percentage === 100 ? "Profile complete" : "of profile details filled"}
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Profile completion"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#FFF2E8]"
        >
          <div className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--color-primary-light))] transition-[width] duration-700" style={{ width: `${percentage}%` }} />
        </div>
      </div>

      <ul className="mt-5 flex-1 space-y-1">
        {sections.map((section) => {
          const complete = section.done >= section.total;
          return (
            <li key={section.key}>
              <Link
                href={section.href}
                title={complete ? undefined : section.hint}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors",
                  complete ? "hover:bg-[#F8FAFC]" : "bg-[#FFF8F3] hover:bg-[#FFF2E8]",
                )}
              >
                {complete ? (
                  <CircleCheck className="h-[18px] w-[18px] shrink-0 text-emerald-500" aria-hidden="true" />
                ) : (
                  <CircleDashed className="h-[18px] w-[18px] shrink-0 text-[hsl(var(--primary))]" aria-hidden="true" />
                )}
                <span className={cn("min-w-0 flex-1 truncate text-sm", complete ? "text-[#14213D]" : "font-semibold text-[#14213D]")}>
                  {section.label}
                  <span className="sr-only">{complete ? ": complete" : `: ${section.done} of ${section.total} done`}</span>
                </span>
                <span className={cn("shrink-0 text-xs font-semibold tabular-nums", complete ? "text-emerald-600" : "text-[hsl(var(--color-primary-700))]")} aria-hidden="true">
                  {complete ? "Done" : `${section.done}/${section.total}`}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <Link href="/student/profile" className={cn(primaryButtonClassName, "mt-4 w-full")}>
        Complete Profile
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

/* ───────────── Recommended drives ───────────── */

function DriveLogo({ drive }: { drive: PlacementDrive }) {
  if (drive.companyLogo) {
    // eslint-disable-next-line @next/next/no-img-element -- logos are arbitrary external URLs
    return <img src={drive.companyLogo} alt="" className="h-11 w-11 shrink-0 rounded-xl border border-[hsl(var(--border))] bg-white object-contain p-1" />;
  }
  return <CompanyMark name={drive.companyName} />;
}

function deadlineLabel(closesAt: number | null, now: number) {
  if (closesAt === null) return { text: "No deadline", urgent: false };
  const days = Math.ceil((closesAt - now) / (24 * 60 * 60 * 1000));
  if (days <= 1) return { text: "Closes today", urgent: true };
  if (days <= 3) return { text: `Closes in ${days} days`, urgent: true };
  return { text: `Apply by ${new Date(closesAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`, urgent: false };
}

export function RecommendedDrivesCard({
  drives,
  loading,
  error,
  onRetry,
  now,
  totalDrives,
}: {
  drives: RecommendedDrive[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  now: number;
  totalDrives: number;
}) {
  return (
    <section
      aria-labelledby="recommended-drives-heading"
      className="relative flex h-full flex-col overflow-hidden rounded-[20px] bg-[#14213D] p-5 text-white shadow-[0_16px_36px_-22px_rgba(20,33,61,0.85)] sm:p-6"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[hsl(var(--primary)/0.18)] blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[hsl(var(--color-primary-light))] ring-1 ring-white/15">
            <Briefcase className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="recommended-drives-heading" className="text-base font-bold leading-tight">Recommended Drives</h2>
            <p className="mt-0.5 text-xs text-white/60">Open drives you&apos;re eligible for</p>
          </div>
        </div>
        <Link href="/student/drives" className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-[hsl(var(--color-primary-light))] hover:text-white">
          View all <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="relative mt-5 flex flex-1 flex-col gap-3">
        {loading ? (
          Array.from({ length: 3 }, (_, i) => <div key={i} className="h-[104px] animate-pulse rounded-2xl bg-white/10" />)
        ) : error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl bg-white/5 px-4 py-8 text-center">
            <p className="text-sm text-white/80">Couldn&apos;t load placement drives.</p>
            <button type="button" onClick={onRetry} className="text-sm font-semibold text-[hsl(var(--color-primary-light))] hover:underline">Try again</button>
          </div>
        ) : drives.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 px-5 py-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-[hsl(var(--color-primary-light))]">
              <GraduationCap className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-semibold">No eligible open drives right now</p>
            <p className="mt-1 max-w-[17rem] text-xs leading-relaxed text-white/60">
              {totalDrives > 0
                ? "Drives you qualify for will appear here. Completing your profile and verifying skills can unlock more."
                : "New drives appear here as soon as the placement cell publishes them."}
            </p>
            <Link href="/student/drives" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[hsl(var(--color-primary-light))] hover:text-white">
              Browse all drives <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          drives.map(({ drive, closesAt }) => {
            const deadline = deadlineLabel(closesAt, now);
            const depts = drive.requirements?.allowedDepartments ?? [];
            return (
              <article key={drive.id} className="rounded-2xl bg-white p-4 text-[#14213D] shadow-[0_8px_20px_-16px_rgba(0,0,0,0.6)] transition-transform duration-200 hover:-translate-y-0.5">
                <div className="flex items-start gap-3">
                  <DriveLogo drive={drive} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold">{drive.roleTitle}</h3>
                    <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">{drive.companyName}{drive.package ? ` · ${drive.package}` : ""}</p>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                  <div className="col-span-2 flex min-w-0 gap-1">
                    <dt className="shrink-0 text-[hsl(var(--muted-foreground))]">Branches:</dt>
                    <dd className="truncate font-medium" title={depts.join(", ")}>{depts.length ? depts.join(", ") : "All branches"}</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt className="text-[hsl(var(--muted-foreground))]">CGPA:</dt>
                    <dd className="font-medium">{drive.requirements?.minimumCGPA ? `${drive.requirements.minimumCGPA}+` : "No minimum"}</dd>
                  </div>
                  <div className={cn("flex items-center gap-1", deadline.urgent ? "text-red-600" : "text-[hsl(var(--muted-foreground))]")}>
                    <CalendarClock className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <dt className="sr-only">Deadline</dt>
                    <dd className="font-medium">{deadline.text}</dd>
                  </div>
                </dl>
                <Link
                  href={`/student/drives/${drive.id}`}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[hsl(var(--primary))] py-2 text-xs font-semibold text-white transition-colors hover:bg-[hsl(var(--color-primary-600))]"
                >
                  Apply Now <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
