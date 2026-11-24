"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  BookOpen,
  Briefcase,
  CalendarClock,
  CalendarDays,
  CircleAlert,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  FileX2,
  History,
  ScanText,
  Send,
  Target,
  UserCheck,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { NotificationItem, SkillGapItem, StudentSkillEntry } from "@placecampus/shared-types";
import { cn } from "@/lib/utils";
import { MAX_SKILL_LEVEL, SkillLevelBar } from "@/features/skills/components/skills-table";
import type { DashboardEvent, EventKind } from "../lib/dashboard-data";
import {
  CardError,
  CardHeading,
  CardSkeleton,
  EmptyNote,
  StatusBadge,
  TONE_TILE,
  dashCardClassName,
  formatEventDate,
  timeAgo,
  type Tone,
} from "./dashboard-ui";

/* ───────────── Verified skills ───────────── */

export function VerifiedSkillsCard({ skills, loading, error, onRetry }: { skills: StudentSkillEntry[]; loading: boolean; error: boolean; onRetry: () => void }) {
  if (loading) return <CardSkeleton lines={5} />;
  const levelCounts = Array.from({ length: MAX_SKILL_LEVEL }, (_, i) => skills.filter((s) => s.level === MAX_SKILL_LEVEL - i).length);
  const average = skills.length ? skills.reduce((sum, s) => sum + s.level, 0) / skills.length : 0;

  return (
    <section aria-labelledby="verified-skills-heading" className={dashCardClassName}>
      <CardHeading
        id="verified-skills-heading"
        icon={BadgeCheck}
        tone="green"
        title="Verified Skills"
        subtitle={skills.length ? `${skills.length} skills verified from your evidence` : "Verified by faculty from your evidence"}
        action={skills.length ? { label: "View all", href: "/student/skills" } : undefined}
      />
      {error ? (
        <div className="mt-5 flex flex-1"><CardError message="Couldn't load your skills." onRetry={onRetry} /></div>
      ) : skills.length === 0 ? (
        <EmptyNote
          className="mt-5"
          icon={BadgeCheck}
          title="No verified skills yet"
          description="Add certificates, projects or internships as evidence. Skills appear here once faculty verify them."
          action={{ label: "Add evidence", href: "/student/evidence" }}
        />
      ) : (
        <div className="mt-5 flex flex-1 flex-col gap-5">
          <div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold text-[#14213D]">Average proficiency</span>
              <span className="tabular-nums text-[hsl(var(--muted-foreground))]">Level {average.toFixed(1)} of {MAX_SKILL_LEVEL}</span>
            </div>
            {/* Distribution of verified skills by level, highest first. */}
            <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-[hsl(var(--muted))]" role="img" aria-label={levelCounts.map((n, i) => `${n} at level ${MAX_SKILL_LEVEL - i}`).join(", ")}>
              {levelCounts.map((count, i) =>
                count ? (
                  <span
                    key={i}
                    className="h-full border-r-2 border-white last:border-r-0"
                    style={{ width: `${(count / skills.length) * 100}%`, background: `hsl(var(--primary) / ${1 - i * 0.18})` }}
                  />
                ) : null,
              )}
            </div>
          </div>
          <ul className="space-y-3">
            {skills.slice(0, 5).map((skill) => (
              <li key={skill.skillId} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] items-center gap-3">
                <span className="truncate text-sm font-medium text-[#14213D]" title={skill.canonicalName}>{skill.canonicalName}</span>
                <SkillLevelBar level={skill.level} />
              </li>
            ))}
          </ul>
          {skills.length > 5 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="More verified skills">
              {skills.slice(5, 13).map((skill) => (
                <li key={skill.skillId} className="rounded-full border border-[hsl(var(--border))] bg-[#F8FAFC] px-2.5 py-1 text-xs font-medium text-[#14213D]">
                  {skill.canonicalName} <span className="font-semibold text-[hsl(var(--primary))]">L{skill.level}</span>
                </li>
              ))}
              {skills.length > 13 && <li className="px-1 py-1 text-xs text-[hsl(var(--muted-foreground))]">+{skills.length - 13} more</li>}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

/* ───────────── Skill gaps ───────────── */

const PRIORITY_BADGE = { HIGH: "danger", MEDIUM: "warning", LOW: "info" } as const;

export function SkillGapsCard({
  gaps,
  noVerifiedSkills,
  loading,
  error,
  onRetry,
}: {
  gaps: SkillGapItem[];
  noVerifiedSkills: boolean;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  if (loading) return <CardSkeleton lines={5} />;
  const shown = gaps;
  return (
    <section aria-labelledby="skill-gaps-heading" className={dashCardClassName}>
      <CardHeading
        id="skill-gaps-heading"
        icon={Target}
        tone="red"
        title="Top Skill Gaps"
        subtitle="Skills open drives ask for that you haven't verified yet"
        action={gaps.length ? { label: "All gaps", href: "/student/gaps" } : undefined}
      />
      {error ? (
        <div className="mt-5 flex flex-1"><CardError message="Couldn't load your skill gaps." onRetry={onRetry} /></div>
      ) : shown.length === 0 ? (
        <EmptyNote className="mt-5" icon={Target} title="No skill gaps found" description="You meet the skill requirements of the current drives, or none have been published yet." />
      ) : (
        <div className="mt-5 flex flex-1 flex-col">
          {noVerifiedSkills && (
            <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
              You have no verified skills yet, so every skill the drives require shows as a gap. Add evidence to get it verified.
            </p>
          )}
          <ul className="flex-1 divide-y divide-[hsl(var(--border)/0.7)]">
            {shown.map((gap) => {
              const current = gap.currentLevel ?? 0;
              return (
                <li key={gap.skillId} className="py-3 first:pt-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-semibold text-[#14213D]">{gap.skillName}</span>
                    <StatusBadge tone={PRIORITY_BADGE[gap.priority]}>
                      {gap.priority === "HIGH" ? "High" : gap.priority === "MEDIUM" ? "Medium" : "Low"}
                      <span className="sr-only"> priority</span>
                    </StatusBadge>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    {/* Current level (filled) against the required level (outlined). */}
                    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[hsl(var(--muted))]" aria-hidden="true">
                      <span className="absolute inset-y-0 left-0 rounded-full border-2 border-dashed border-red-300" style={{ width: `${(gap.requiredLevel / MAX_SKILL_LEVEL) * 100}%` }} />
                      <span className="absolute inset-y-0 left-0 rounded-full bg-[#14213D]" style={{ width: `${(current / MAX_SKILL_LEVEL) * 100}%` }} />
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-[hsl(var(--muted-foreground))]">
                      {gap.currentLevel ? `Level ${current}` : "Not verified"} → <span className="font-semibold text-[#14213D]">Level {gap.requiredLevel}</span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          <Link
            href="/student/preparation"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50/60 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Open Preparation Plan
          </Link>
        </div>
      )}
    </section>
  );
}

/* ───────────── Upcoming events ───────────── */

const EVENT_META: Record<EventKind, { icon: LucideIcon; tone: Tone; label: string }> = {
  INTERVIEW: { icon: Video, tone: "blue", label: "Interview" },
  DRIVE: { icon: Briefcase, tone: "navy", label: "Placement drive" },
  DEADLINE: { icon: CalendarClock, tone: "orange", label: "Deadline" },
  ASSESSMENT: { icon: ClipboardList, tone: "amber", label: "Assessment" },
};

export function UpcomingEventsCard({ events, loading }: { events: DashboardEvent[]; loading: boolean }) {
  if (loading) return <CardSkeleton lines={5} />;
  return (
    <section aria-labelledby="upcoming-events-heading" className={dashCardClassName}>
      <CardHeading id="upcoming-events-heading" icon={CalendarDays} tone="blue" title="Upcoming Events" subtitle="Interviews, drives, assessments and deadlines" />
      {events.length === 0 ? (
        <EmptyNote
          className="mt-5"
          icon={CalendarDays}
          title="Nothing scheduled"
          description="Book a mock interview or apply to a drive and your upcoming dates will show up here."
          action={{ label: "Book a mock interview", href: "/student/interviews" }}
        />
      ) : (
        <ul className="mt-5 flex-1 space-y-2.5">
          {events.map((event) => {
            const meta = EVENT_META[event.kind];
            const date = new Date(event.at);
            return (
              <li key={event.id}>
                <Link href={event.href} className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--border)/0.8)] p-3 transition-colors hover:border-[hsl(var(--primary)/0.3)] hover:bg-[#FFF8F3]">
                  <span className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-[#F8FAFC] py-1.5 ring-1 ring-[hsl(var(--border)/0.7)]">
                    <span className="text-[10px] font-semibold uppercase text-[hsl(var(--primary))]">{date.toLocaleDateString("en-IN", { month: "short" })}</span>
                    <span className="text-lg font-extrabold leading-none text-[#14213D]">{date.getDate()}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
                      <meta.icon className={cn("h-3.5 w-3.5", TONE_TILE[meta.tone].split(" ").find((c) => c.startsWith("text-")))} aria-hidden="true" />
                      {meta.label}
                    </span>
                    <span className="block truncate text-sm font-semibold text-[#14213D]">{event.title}</span>
                    <span className="block truncate text-xs text-[hsl(var(--muted-foreground))]">
                      {event.hasTime ? formatEventDate(event.at, true) : event.subtitle}
                      {event.hasTime && event.subtitle ? ` · ${event.subtitle}` : ""}
                    </span>
                  </span>
                  <StatusBadge tone={event.status.tone}>{event.status.label}</StatusBadge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ───────────── Recent activity ───────────── */

export interface ActivityEntry {
  id: string;
  kind: NotificationItem["type"] | "RESUME_ANALYZED";
  title: string;
  message: string;
  at: string;
  href: string;
  unread: boolean;
}

const ACTIVITY_META: Record<ActivityEntry["kind"], { icon: LucideIcon; tone: Tone; badge?: { label: string; tone: "success" | "warning" | "info" | "danger" | "neutral" } }> = {
  RESUME_ANALYZED: { icon: ScanText, tone: "orange", badge: { label: "Analysed", tone: "success" } },
  EVIDENCE_VERIFIED: { icon: FileCheck2, tone: "green", badge: { label: "Verified", tone: "success" } },
  EVIDENCE_REJECTED: { icon: FileX2, tone: "red", badge: { label: "Rejected", tone: "danger" } },
  EVIDENCE_RESUBMISSION_REQUESTED: { icon: CircleAlert, tone: "amber", badge: { label: "Action needed", tone: "warning" } },
  ASSESSMENT_EVALUATED: { icon: ClipboardCheck, tone: "blue", badge: { label: "Evaluated", tone: "info" } },
  INTERVIEW_FEEDBACK: { icon: Video, tone: "blue", badge: { label: "Feedback", tone: "info" } },
  INTERVIEW_SCHEDULED: { icon: Video, tone: "blue", badge: { label: "Scheduled", tone: "info" } },
  INTERVIEW_CANCELLED: { icon: Video, tone: "red", badge: { label: "Cancelled", tone: "danger" } },
  APPLICATION_SUBMITTED: { icon: Send, tone: "navy", badge: { label: "Submitted", tone: "neutral" } },
  APPLICATION_STATUS_CHANGED: { icon: Briefcase, tone: "navy", badge: { label: "Updated", tone: "info" } },
  PREPARATION_PLAN_CREATED: { icon: BookOpen, tone: "orange", badge: { label: "New plan", tone: "info" } },
  PREPARATION_PLAN_COMPLETED: { icon: BookOpen, tone: "green", badge: { label: "Completed", tone: "success" } },
  REVIEW_ASSIGNED: { icon: UserCheck, tone: "navy" },
  MENTOR_ASSIGNED: { icon: UserCheck, tone: "green", badge: { label: "Mentor", tone: "success" } },
  DRIVE_PUBLISHED: { icon: Briefcase, tone: "orange", badge: { label: "New drive", tone: "info" } },
};

export function RecentActivityCard({ entries, loading, error, onRetry, now }: { entries: ActivityEntry[]; loading: boolean; error: boolean; onRetry: () => void; now: number }) {
  if (loading) return <CardSkeleton lines={5} />;
  return (
    <section aria-labelledby="recent-activity-heading" className={dashCardClassName}>
      <CardHeading
        id="recent-activity-heading"
        icon={History}
        tone="navy"
        title="Recent Activity"
        subtitle="Updates on your evidence, applications and interviews"
        action={{ label: "View all", href: "/student/notifications" }}
      />
      {error ? (
        <div className="mt-5 flex flex-1"><CardError message="Couldn't load your recent activity." onRetry={onRetry} /></div>
      ) : entries.length === 0 ? (
        <EmptyNote className="mt-5" icon={Bell} title="No activity yet" description="Evidence reviews, application updates and interview news will appear here." />
      ) : (
        <ol className="relative mt-5 flex-1">
          {entries.map((entry, index) => {
            const meta = ACTIVITY_META[entry.kind] ?? { icon: Bell, tone: "navy" as Tone };
            return (
              <li key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
                {index < entries.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-[17px] top-9 w-px bg-[hsl(var(--border))]" />}
                <span className={cn("relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-4 ring-white", TONE_TILE[meta.tone])}>
                  <meta.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <Link href={entry.href} className="group min-w-0 flex-1 rounded-lg pt-0.5">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold text-[#14213D] group-hover:text-[hsl(var(--primary))]">{entry.title}</span>
                    {meta.badge && <StatusBadge tone={meta.badge.tone}>{meta.badge.label}</StatusBadge>}
                    {entry.unread && <span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" aria-label="Unread" />}
                  </span>
                  <span className="mt-0.5 block line-clamp-1 text-xs text-[hsl(var(--muted-foreground))]">{entry.message}</span>
                  <time dateTime={entry.at} className="mt-0.5 block text-[11px] text-[hsl(var(--muted-foreground)/0.85)]">{timeAgo(entry.at, now)}</time>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/* ───────────── Career banner ───────────── */

export function CareerBanner() {
  return (
    <section
      aria-labelledby="career-banner-heading"
      className="relative overflow-hidden rounded-[24px] border border-[hsl(var(--primary)/0.16)] bg-gradient-to-r from-[#FFE6D3] via-[#FFF2E8] to-white"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-white/50" />
      <div className="relative flex flex-col items-start gap-5 px-6 py-6 lg:flex-row lg:items-center sm:px-8">
        <span className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-[hsl(var(--primary))] shadow-[0_10px_24px_-14px_hsl(var(--primary)/0.7)] lg:flex">
          <Briefcase className="h-8 w-8" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="career-banner-heading" className="text-lg font-extrabold text-[#14213D] sm:text-xl">Take the next step towards your dream career!</h2>
          <p className="mt-1 text-sm leading-relaxed text-[#14213D]/70">Improve your skills, analyze your resume and apply to the best opportunities.</p>
        </div>
        <Link
          href="/student/drives"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#14213D] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_-12px_rgba(20,33,61,0.8)] transition-colors hover:bg-[hsl(var(--color-navy-dark))]"
        >
          Explore Placement Drives
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Image src="/images/hero/student-professional.png" alt="" width={1270} height={1239} sizes="120px" className="pointer-events-none absolute -bottom-6 right-[230px] hidden h-auto w-[110px] opacity-90 xl:block" />
      </div>
    </section>
  );
}

