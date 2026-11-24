"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  Briefcase,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  CircleCheckBig,
  Minus,
  ScanText,
  Send,
  UserRoundPen,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { IconTile, TextLink, primaryButtonClassName, secondaryButtonClassName, type Tone } from "./dashboard-ui";

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function WelcomeBanner({ firstName, now }: { firstName: string; now: Date }) {
  return (
    <section
      aria-labelledby="welcome-heading"
      className="pc-enter relative overflow-hidden rounded-[24px] border border-[hsl(var(--primary)/0.16)] bg-gradient-to-r from-white via-[#FFF7F0] to-[#FFE6D3] shadow-[0_10px_34px_-24px_hsl(var(--primary)/0.55)]"
    >
      {/* Decorative rings behind the illustration */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[hsl(var(--primary)/0.07)]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 right-40 h-72 w-72 rounded-full bg-[hsl(var(--primary)/0.05)]" />

      <div className="relative flex items-stretch">
        <div className="min-w-0 flex-1 px-5 py-5 sm:px-7 sm:py-6 lg:pr-[230px]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 id="welcome-heading" className="text-2xl font-extrabold leading-tight tracking-tight text-[#14213D] sm:text-[28px]">
              {greeting(now.getHours())}, {firstName}!{" "}
              <span aria-hidden="true" className="inline-block origin-[70%_70%] motion-safe:animate-[pc-wave_2.4s_ease-in-out_1]">
                👋
              </span>
            </h1>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-[hsl(var(--muted-foreground))] shadow-[var(--shadow-xs)]">
              <CalendarDays className="h-3.5 w-3.5 text-[hsl(var(--primary))]" aria-hidden="true" />
              {now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          <p className="mt-1.5 max-w-[40rem] text-sm leading-relaxed text-[#14213D]/70">
            Every verified skill, polished resume and application moves you closer to your offer. Here&apos;s where you stand today.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/student/resume-analyzer" className={cn(primaryButtonClassName, "py-2")}>
              <ScanText className="h-4 w-4" aria-hidden="true" />
              Analyze Resume
            </Link>
            <Link href="/student/drives" className={cn(secondaryButtonClassName, "py-2")}>
              <Briefcase className="h-4 w-4" aria-hidden="true" />
              Explore Placement Drives
            </Link>
            <Link href="/student/profile" className={cn(secondaryButtonClassName, "py-2")}>
              <UserRoundPen className="h-4 w-4" aria-hidden="true" />
              Complete Profile
            </Link>
          </div>
        </div>
        {/* Cropped to the upper body so the illustration never sets the banner height. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-6 hidden w-[200px] overflow-hidden lg:block">
          <Image
            src="/images/hero/student-professional.png"
            alt=""
            width={1270}
            height={1239}
            priority
            sizes="200px"
            className="absolute left-0 top-3 h-auto w-full drop-shadow-[0_14px_22px_rgba(20,33,61,0.18)]"
          />
        </div>
      </div>
    </section>
  );
}

/* ───────────── KPI cards ───────────── */

function KpiCard({
  icon,
  tone,
  label,
  value,
  suffix,
  footer,
  loading,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: number | null;
  suffix?: string;
  footer: React.ReactNode;
  loading: boolean;
}) {
  return (
    <div className="group relative flex min-h-[124px] flex-col justify-between gap-2 overflow-hidden rounded-[20px] border border-[hsl(var(--border)/0.8)] bg-white p-4 sm:min-h-[128px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-18px_rgba(15,23,42,0.18)] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_16px_32px_-20px_rgba(15,23,42,0.28)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-semibold leading-snug text-[hsl(var(--muted-foreground))] sm:text-sm">{label}</p>
        <IconTile icon={icon} tone={tone} className="transition-transform duration-200 group-hover:scale-105" />
      </div>
      {loading ? (
        <div className="h-9 w-20 animate-pulse rounded-lg bg-[hsl(var(--muted))]" aria-label={`Loading ${label}`} />
      ) : (
        <p className="text-[26px] font-extrabold leading-none tracking-tight text-[#14213D] sm:text-[30px]">
          {value ?? "—"}
          {suffix && value !== null && <span className="ml-1 text-base font-semibold text-[hsl(var(--muted-foreground))]">{suffix}</span>}
        </p>
      )}
      <div className="min-h-[20px] text-xs">{footer}</div>
    </div>
  );
}

function Trend({ delta }: { delta: number }) {
  const Icon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-semibold",
        delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-600" : "text-[hsl(var(--muted-foreground))]",
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {delta > 0 ? `+${delta}` : delta} <span className="font-normal text-[hsl(var(--muted-foreground))]">since last update</span>
    </span>
  );
}

export function KpiCards({
  loading,
  readiness,
  trend,
  verifiedSkills,
  activeApplications,
  shortlisted,
}: {
  loading: boolean;
  readiness: number | null;
  trend: number | null;
  verifiedSkills: number;
  activeApplications: number;
  shortlisted: number;
}) {
  return (
    <section aria-label="Key statistics" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <KpiCard
        icon={ChartNoAxesColumnIncreasing}
        tone="orange"
        label="Overall Readiness"
        value={readiness}
        suffix="/100"
        loading={loading}
        footer={
          trend !== null ? (
            <Trend delta={trend} />
          ) : (
            <TextLink href="/student/readiness" className="text-xs">{readiness === null ? "How readiness works" : "View analysis"}</TextLink>
          )
        }
      />
      <KpiCard
        icon={BadgeCheck}
        tone="green"
        label="Verified Skills"
        value={verifiedSkills}
        loading={loading}
        footer={<TextLink href="/student/skills" className="text-xs">View skills</TextLink>}
      />
      <KpiCard
        icon={Send}
        tone="blue"
        label="Active Applications"
        value={activeApplications}
        loading={loading}
        footer={<TextLink href="/student/applications" className="text-xs">View applications</TextLink>}
      />
      <KpiCard
        icon={CircleCheckBig}
        tone="navy"
        label="Shortlisted"
        value={shortlisted}
        loading={loading}
        footer={
          shortlisted > 0 ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
              {shortlisted === 1 ? "1 application moving forward" : `${shortlisted} applications moving forward`}
            </span>
          ) : (
            <span className="text-[hsl(var(--muted-foreground))]">Shortlists appear here as recruiters respond</span>
          )
        }
      />
    </section>
  );
}
