"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CircleCheck,
  CircleX,
  GraduationCap,
  IndianRupee,
  Loader2,
  MapPin,
  Send,
  TriangleAlert,
} from "lucide-react";
import type { Application, PlacementDrive } from "@placecampus/shared-types";
import { HeroWaves, lightHeroClassName } from "@/components/brand/hero-waves";
import { cn } from "@/lib/utils";
import {
  ELIGIBILITY_META,
  companyInitials,
  companyTone,
  getApplicationWindow,
  type EligibilityState,
  type WindowState,
} from "../lib/drive-meta";

function RecruitmentIllustration() {
  return (
    <svg viewBox="0 0 250 160" className="h-full w-full drop-shadow-[0_18px_24px_rgba(234,88,12,0.14)]" aria-hidden="true">
      <g stroke="hsl(24 95% 53%)" strokeWidth="4" strokeLinecap="round">
        <path d="M22 54 l-10 -8" /><path d="M20 72 h-12" /><path d="M30 38 l-6 -10" />
      </g>
      <rect x="96" y="18" width="120" height="96" rx="12" fill="hsl(222 40% 28%)" />
      <rect x="104" y="26" width="104" height="80" rx="6" fill="#fff" />
      {[42, 62, 82].map((y) => (
        <g key={y}>
          <rect x="114" y={y - 7} width="14" height="14" rx="3" fill="none" stroke="hsl(24 95% 53%)" strokeWidth="2.5" />
          <path d={`M117 ${y} l3 3 6 -6`} stroke="#22C55E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <rect x="136" y={y - 3} width="58" height="6" rx="3" fill="#CBD5E1" />
        </g>
      ))}
      <path d="M86 116 h140 l-8 12 h-124 z" fill="#2A3555" />
      <g transform="translate(40 92)">
        <rect x="0" y="10" width="76" height="52" rx="9" fill="hsl(24 95% 53%)" />
        <rect x="24" y="0" width="28" height="14" rx="5" fill="none" stroke="hsl(20 90% 44%)" strokeWidth="5" />
        <rect x="0" y="28" width="76" height="6" fill="hsl(20 90% 44%)" />
        <rect x="32" y="24" width="12" height="14" rx="3" fill="hsl(28 100% 62%)" />
      </g>
      <g transform="translate(212 20) rotate(12)">
        <path d="M-30 0 L0 -14 L30 0 L0 14 Z" fill="hsl(222 47% 15%)" />
        <path d="M-18 6 v11 c8 7 28 7 36 0 v-11 l-18 8 z" fill="hsl(222 40% 28%)" />
        <path d="M20 4 v20" stroke="hsl(24 95% 53%)" strokeWidth="3" />
        <circle cx="20" cy="26" r="3.5" fill="hsl(24 95% 53%)" />
      </g>
    </svg>
  );
}

export function DrivesHero() {
  return (
    <section className={lightHeroClassName}>
      <HeroWaves />
      <div className="relative flex items-center justify-between gap-6">
        <div className="max-w-[40rem] space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            <span className="text-[hsl(var(--foreground))]">Placement </span>
            <span className="text-[hsl(var(--primary))]">Drives</span>
          </h1>
          <p className="text-[15px] leading-relaxed text-[hsl(var(--foreground)/0.8)] sm:text-base">
            Discover exciting career opportunities and check your eligibility for upcoming recruitment drives.
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <CircleCheck className="h-4 w-4" aria-hidden="true" />
              Recruitment Opportunities
            </span>
            <span aria-hidden="true" className="hidden h-4 w-px bg-[hsl(var(--border))] sm:block" />
            <span className="text-[hsl(var(--foreground)/0.75)]">Apply to eligible drives and track your application status.</span>
          </div>
        </div>
        <div className="pointer-events-none hidden h-[140px] w-[220px] shrink-0 lg:block xl:mr-16">
          <RecruitmentIllustration />
        </div>
      </div>
    </section>
  );
}

export function CompanyMark({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl font-extrabold ring-1",
        size === "lg" ? "h-14 w-14 text-xl" : "h-12 w-12 text-lg",
        companyTone(name),
      )}
    >
      {companyInitials(name)}
    </span>
  );
}

export function EligibilityBadge({ state }: { state: EligibilityState }) {
  const meta = ELIGIBILITY_META[state];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1", meta.badge)}>
      {state === "CHECKING" ? (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
      ) : (
        <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      )}
      {meta.label}
    </span>
  );
}

const PANEL_ICON: Record<EligibilityState, React.ElementType> = {
  ELIGIBLE: CircleCheck,
  NOT_ELIGIBLE: CircleX,
  MISSING_INFO: TriangleAlert,
  CHECKING: Loader2,
  UNAVAILABLE: TriangleAlert,
};

const PANEL_TITLE: Record<EligibilityState, string> = {
  ELIGIBLE: "You are eligible",
  NOT_ELIGIBLE: "Not eligible",
  MISSING_INFO: "Information missing",
  CHECKING: "Checking eligibility",
  UNAVAILABLE: "Eligibility unavailable",
};

const WINDOW_CHIP: Partial<Record<WindowState, { label: string; className: string }>> = {
  CLOSING_SOON: { label: "Closing soon", className: "bg-amber-50 text-amber-800 ring-amber-200" },
  CLOSED: { label: "Closed", className: "bg-slate-100 text-slate-600 ring-slate-200" },
  NOT_OPEN: { label: "Not open yet", className: "bg-blue-50 text-blue-700 ring-blue-200" },
};

function Detail({ icon: Icon, children, muted }: { icon: React.ElementType; children: React.ReactNode; muted?: boolean }) {
  return (
    <li className={cn("flex min-w-0 items-center gap-2.5 text-sm", muted ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--foreground)/0.85)]")}>
      <Icon className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
      <span className="truncate">{children}</span>
    </li>
  );
}

export function DriveCard({
  drive,
  eligibility,
  summary,
  windowState,
  application,
  onCheck,
  style,
}: {
  drive: PlacementDrive;
  eligibility: EligibilityState;
  summary: string;
  windowState: WindowState;
  application?: Application;
  onCheck: () => void;
  style?: React.CSSProperties;
}) {
  const PanelIcon = PANEL_ICON[eligibility];
  const chip = WINDOW_CHIP[windowState];
  const { opensAt } = getApplicationWindow(drive);
  const minCgpa = drive.requirements?.minimumCGPA;

  return (
    <article
      style={style}
      className="pc-enter group flex h-full min-w-0 flex-col rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/0.35)] hover:shadow-[var(--shadow-card-hover)]"
    >
      <div className="flex items-start gap-3.5">
        <CompanyMark name={drive.companyName} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-lg font-bold text-[hsl(var(--foreground))]">{drive.companyName}</h3>
            <EligibilityBadge state={eligibility} />
          </div>
          <p className="truncate text-sm text-[hsl(var(--muted-foreground))]">{drive.roleTitle}</p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        <Detail icon={MapPin} muted={!drive.location}>
          {drive.location || "Location not specified"}
          {drive.workMode && <span className="text-[hsl(var(--muted-foreground))]"> ({drive.workMode})</span>}
        </Detail>
        <Detail icon={IndianRupee} muted={!drive.package}>{drive.package || "Package not specified"}</Detail>
        <Detail icon={CalendarDays} muted={!drive.applicationDeadline}>
          {drive.applicationDeadline
            ? `Deadline: ${format(new Date(drive.applicationDeadline), "d MMM yyyy")}`
            : "No deadline specified"}
          {chip && (
            <span className={cn("ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1", chip.className)}>
              {windowState === "NOT_OPEN" && opensAt ? `Opens ${format(new Date(opensAt), "d MMM")}` : chip.label}
            </span>
          )}
        </Detail>
        <Detail icon={GraduationCap} muted={minCgpa == null}>
          {minCgpa != null ? `Minimum CGPA: ${minCgpa}` : "No CGPA requirement"}
        </Detail>
      </ul>

      <div className={cn("mt-4 flex items-start gap-3 rounded-xl px-3.5 py-3 ring-1", ELIGIBILITY_META[eligibility].panel)}>
        <PanelIcon className={cn("mt-0.5 h-5 w-5 shrink-0", eligibility === "CHECKING" && "animate-spin")} aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-bold">{PANEL_TITLE[eligibility]}</p>
          <p className="text-xs leading-relaxed opacity-90">{summary}</p>
        </div>
      </div>

      {application && (
        <p className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
          Applied · {application.status.replace(/_/g, " ").toLowerCase()}
        </p>
      )}

      <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
        <Link
          href={`/student/drives/${drive.id}`}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[hsl(var(--border))] text-sm font-semibold text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--primary)/0.4)] hover:text-[hsl(var(--primary))]"
        >
          <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
          View Details
        </Link>
        <button
          type="button"
          onClick={onCheck}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] text-sm font-semibold text-white shadow-[0_6px_16px_-8px_hsl(var(--primary)/0.8)] transition-all hover:bg-[hsl(var(--color-primary-600))] active:scale-[0.98]"
        >
          Check Eligibility
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
