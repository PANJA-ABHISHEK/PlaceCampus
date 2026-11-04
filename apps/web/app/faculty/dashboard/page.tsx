"use client";

import * as React from "react";
import Link from "next/link";
import { format, isToday, isTomorrow } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckCheck,
  CircleAlert,
  Clock,
  FileCheck2,
  GraduationCap,
  RotateCcw,
  UserRound,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import type {
  FacultyDashboard,
  FacultyReviewQueueItem,
  FacultyStudentSummary,
  FacultyUpcomingInterview,
} from "@placecampus/shared-types";
import { useFacultyDashboard } from "@/features/faculty/hooks/use-faculty-portal";
import { REVIEW_STATE_BADGE, interviewTypeBadge } from "@/features/faculty/lib/faculty-meta";
import { ReadinessBar, StudentCell, facultyCard } from "@/features/faculty/components/faculty-ui";
import { TYPE_META } from "@/features/evidence/lib/evidence-meta";
import { canFacultyStartOrEvaluate, canJoin } from "@/features/interviews/lib/interview-meta";
import { useNow } from "@/features/interviews/hooks/use-now";
import { HeroWaves, lightHeroClassName } from "@/components/brand/hero-waves";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const card = facultyCard;

export default function FacultyDashboardPage() {
  const { data, isLoading, isError, refetch } = useFacultyDashboard();

  if (isLoading) return <DashboardSkeleton />;
  if (isError || !data) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50/60 px-6 py-12 text-center">
        <CircleAlert className="h-8 w-8 text-red-600" aria-hidden="true" />
        <p className="font-semibold text-red-900">Couldn&apos;t load your dashboard</p>
        <button type="button" onClick={() => refetch()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-red-700 ring-1 ring-red-200">
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6">
      <WelcomeBanner faculty={data.faculty} />
      <KpiRow stats={data.stats} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ReviewQueuePanel items={data.reviewQueue} pending={data.stats.pendingReviews} />
        <InterviewsPanel items={data.upcomingInterviews} />
      </div>
      <StudentsPanel students={data.students} total={data.stats.assignedStudents} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Welcome banner                                                      */
/* ------------------------------------------------------------------ */

function WelcomeBanner({ faculty }: { faculty: FacultyDashboard["faculty"] }) {
  return (
    <section className={cn(lightHeroClassName, "py-6 sm:py-6")}>
      <HeroWaves />
      <div className="relative flex items-center gap-5">
        <span className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-[#0B1F44] shadow-[0_8px_20px_-12px_rgba(255,107,26,0.6)] ring-1 ring-orange-100 sm:flex">
          <UserRound className="h-8 w-8" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0B1F44] sm:text-[28px]">
            Welcome back, <span className="text-[#FF6B1A]">{faculty.fullName}!</span>
          </h1>
          <p className="text-[15px] text-[#0B1F44]/75">
            Review student evidence, conduct mock interviews, and guide your assigned students.
          </p>
          {(faculty.designation || faculty.department) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-0.5 text-sm font-medium text-[#0B1F44]">
              {faculty.designation && (
                <span className="inline-flex items-center gap-2"><GraduationCap className="h-4 w-4 text-[#64748B]" aria-hidden="true" />{faculty.designation}</span>
              )}
              {faculty.designation && faculty.department && <span aria-hidden="true" className="h-4 w-px bg-[#E5E7EB]" />}
              {faculty.department && (
                <span className="inline-flex items-center gap-2"><Building2 className="h-4 w-4 text-[#64748B]" aria-hidden="true" />{faculty.department} Department</span>
              )}
            </div>
          )}
        </div>
        <div className="pointer-events-none hidden h-[104px] w-[170px] shrink-0 lg:block xl:mr-6" aria-hidden="true">
          <AcademicIllustration />
        </div>
      </div>
    </section>
  );
}

function AcademicIllustration() {
  return (
    <svg viewBox="0 0 170 104" className="h-full w-full">
      <ellipse cx="88" cy="98" rx="72" ry="5" fill="#FF6B1A" opacity="0.12" />
      {/* Books */}
      <rect x="20" y="74" width="120" height="14" rx="3" fill="#FF6B1A" />
      <rect x="20" y="74" width="120" height="4" rx="2" fill="#FFFFFF" opacity="0.35" />
      <rect x="30" y="60" width="104" height="14" rx="3" fill="#0B1F44" />
      <rect x="34" y="63" width="96" height="2.5" rx="1" fill="#FFFFFF" opacity="0.25" />
      <rect x="26" y="88" width="112" height="6" rx="2" fill="#E2E8F0" />
      {/* Laptop */}
      <g transform="rotate(-14 48 42)">
        <rect x="22" y="26" width="52" height="34" rx="4" fill="#475569" />
        <rect x="26" y="30" width="44" height="26" rx="2" fill="#94A3B8" />
        <circle cx="48" cy="43" r="4" fill="#FFFFFF" opacity="0.9" />
      </g>
      {/* Graduation cap */}
      <path d="M118 12 L156 26 L118 40 L80 26 Z" fill="#0B1F44" />
      <path d="M96 33 v13 c0 6 44 6 44 0 v-13 l-22 8 z" fill="#1E3A6B" />
      <line x1="152" y1="27" x2="152" y2="48" stroke="#FF6B1A" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="152" cy="50" r="3.5" fill="#FF6B1A" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* KPI cards                                                           */
/* ------------------------------------------------------------------ */

function KpiRow({ stats }: { stats: FacultyDashboard["stats"] }) {
  const cards: { label: string; value: number; href: string; icon: LucideIcon; tile: string }[] = [
    { label: "Assigned Students", value: stats.assignedStudents, href: "/faculty/students", icon: Users, tile: "bg-blue-50 text-blue-600" },
    { label: "Pending Reviews", value: stats.pendingReviews, href: "/faculty/reviews", icon: FileCheck2, tile: "bg-orange-50 text-[#FF6B1A]" },
    { label: "Upcoming Interviews", value: stats.upcomingInterviews, href: "/faculty/interviews", icon: CalendarDays, tile: "bg-orange-50 text-[#FF6B1A]" },
    { label: "Overdue Reviews", value: stats.overdueReviews, href: "/faculty/reviews?filter=overdue", icon: AlertTriangle, tile: "bg-red-50 text-red-600" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {cards.map((c, i) => (
        <Link
          key={c.label}
          href={c.href}
          style={{ "--pc-delay": `${i * 60}ms` } as React.CSSProperties}
          className={cn(card, "pc-enter group flex flex-col items-start gap-3 p-4 transition-all sm:flex-row sm:items-center sm:gap-4 sm:p-5 duration-200 hover:-translate-y-0.5 hover:border-[#FF6B1A]/30 hover:shadow-[0_14px_30px_-18px_rgba(255,107,26,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B1A]/50")}
        >
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full sm:h-14 sm:w-14", c.tile)}>
            <c.icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-2xl font-extrabold tabular-nums leading-none text-[#0B1F44] sm:text-3xl">{c.value}</span>
            <span className="mt-1.5 block text-sm font-medium text-[#64748B] group-hover:text-[#0B1F44]">{c.label}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Panels                                                              */
/* ------------------------------------------------------------------ */

function PanelHeader({ icon: Icon, title, badge, children }: { icon: LucideIcon; title: string; badge?: number; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] px-5 py-4">
      <h3 className="flex items-center gap-2.5 text-lg font-bold text-[#0B1F44]">
        <Icon className="h-5 w-5" aria-hidden="true" />
        {title}
        {badge !== undefined && badge > 0 && (
          <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-bold text-[#FF6B1A] ring-1 ring-orange-200">{badge}</span>
        )}
      </h3>
      <div className="flex items-center gap-4">{children}</div>
    </div>
  );
}

function ViewAll({ href, label = "View All" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-[#FF6B1A] hover:underline">
      {label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

function EmptyRow({ icon: Icon, text, action }: { icon: LucideIcon; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="max-w-[22rem] text-sm text-[#64748B]">{text}</p>
      {action}
    </div>
  );
}

function ReviewQueuePanel({ items, pending }: { items: FacultyReviewQueueItem[]; pending: number }) {
  return (
    <section className={cn(card, "pc-enter min-w-0 overflow-hidden")} aria-label="My review queue">
      <PanelHeader icon={FileCheck2} title="My Review Queue" badge={pending}>
        <ViewAll href="/faculty/reviews" />
      </PanelHeader>
      {items.length === 0 ? (
        <EmptyRow icon={CheckCheck} text="You're all caught up! No evidence reviews require your attention." />
      ) : (
        <ul className="divide-y divide-[#E5E7EB]">
          {items.map((item) => {
            const type = TYPE_META[item.type];
            const state = REVIEW_STATE_BADGE[item.reviewState];
            return (
              <li key={item.id} className="grid grid-cols-1 items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50/70 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-4">
                <StudentCell student={item.student} />
                <div className="flex min-w-0 items-center gap-2 text-sm">
                  <type.icon className="h-4 w-4 shrink-0 text-[#FF6B1A]" aria-hidden="true" />
                  <span className="whitespace-nowrap font-semibold text-[#0B1F44]" title={item.title}>{type.label}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className={cn("text-xs", item.overdue ? "font-semibold text-red-600" : "text-[#64748B]")}>
                    {item.reviewDueAt ? `${item.overdue ? "Overdue" : "Due"}: ${format(new Date(item.reviewDueAt), "MMM d, yyyy")}` : "No due date"}
                  </span>
                  <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold ring-1", state.className)}>{state.label}</span>
                  <Link href={`/faculty/reviews/${item.id}`} className="inline-flex h-8 items-center rounded-lg border border-[#FF6B1A] px-3.5 text-sm font-semibold text-[#FF6B1A] transition-colors hover:bg-[#FF6B1A] hover:text-white">
                    Review
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function scheduleLabel(date: Date) {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "MMM d, yyyy");
}

function InterviewsPanel({ items }: { items: FacultyUpcomingInterview[] }) {
  const now = useNow();
  return (
    <section className={cn(card, "pc-enter min-w-0 overflow-hidden")} aria-label="Upcoming interviews">
      <PanelHeader icon={CalendarDays} title="Upcoming Interviews">
        <Link href="/faculty/interviews#fac-slots" className="text-sm font-semibold text-[#0B1F44]/80 hover:text-[#FF6B1A]">Manage Slots</Link>
        <ViewAll href="/faculty/interviews" />
      </PanelHeader>
      {items.length === 0 ? (
        <EmptyRow
          icon={CalendarClock}
          text="No interviews scheduled. Manage your availability to receive interview bookings."
          action={<Link href="/faculty/interviews#fac-slots" className="mt-1 text-sm font-semibold text-[#FF6B1A] hover:underline">Manage availability</Link>}
        />
      ) : (
        <ul className="divide-y divide-[#E5E7EB]">
          {items.map((iv) => {
            const when = new Date(iv.scheduledAt);
            const asInterview = { ...iv, studentId: "", interviewerId: "" } as never;
            const live = canFacultyStartOrEvaluate(asInterview, now);
            const joinable = canJoin(asInterview, now);
            return (
              <li key={iv.id} className="grid grid-cols-1 items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50/70 sm:grid-cols-[minmax(0,1.2fr)_auto_minmax(0,1.2fr)_auto]">
                <StudentCell student={iv.student} />
                <span className={cn("w-fit rounded-md px-2 py-0.5 text-xs font-semibold ring-1", interviewTypeBadge(iv.type))}>{iv.type}</span>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#0B1F44]/80">
                  <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-[#64748B]" aria-hidden="true" />{scheduleLabel(when)}</span>
                  <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-[#64748B]" aria-hidden="true" />{format(when, "h:mm a")}</span>
                  {iv.meetingUrl && <span className="inline-flex items-center gap-1.5 text-xs text-[#64748B]"><Video className="h-3.5 w-3.5" aria-hidden="true" />Online</span>}
                </div>
                <div className="flex gap-2 sm:justify-end">
                  {joinable && iv.meetingUrl && (
                    <a href={iv.meetingUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-lg bg-[#FF6B1A] px-3 text-sm font-semibold text-white hover:bg-[#EA580C]">Join</a>
                  )}
                  <Link href={`/faculty/interviews/${iv.id}`} className="inline-flex h-8 items-center rounded-lg border border-[#E5E7EB] px-3 text-sm font-semibold text-[#0B1F44] hover:border-[#FF6B1A]/50 hover:text-[#FF6B1A]">
                    {live ? "Evaluate" : "Details"}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function StudentsPanel({ students, total }: { students: FacultyStudentSummary[]; total: number }) {
  return (
    <section className={cn(card, "pc-enter min-w-0 overflow-hidden")} aria-label="My assigned students">
      <PanelHeader icon={Users} title="My Assigned Students" badge={total}>
        <ViewAll href="/faculty/students" label="View All Students" />
      </PanelHeader>
      {students.length === 0 ? (
        <EmptyRow icon={Users} text="No students are currently assigned to your account." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-[#64748B]">
              <tr>
                <th scope="col" className="px-5 py-3">Student</th>
                <th scope="col" className="px-5 py-3">Readiness</th>
                <th scope="col" className="px-5 py-3 text-center">Verified Skills</th>
                <th scope="col" className="px-5 py-3 text-center">Pending Reviews</th>
                <th scope="col" className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {students.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-slate-50/70">
                  <td className="px-5 py-3.5"><StudentCell student={s} /></td>
                  <td className="w-[34%] px-5 py-3.5"><ReadinessBar score={s.readinessScore} /></td>
                  <td className="px-5 py-3.5 text-center font-semibold tabular-nums text-[#0B1F44]">{s.verifiedSkills}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={cn("inline-flex min-w-7 justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums", s.pendingReviews ? "bg-orange-50 text-[#FF6B1A]" : "bg-slate-100 text-[#64748B]")}>{s.pendingReviews}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link href={`/faculty/students/${s.id}`} className="inline-flex h-9 items-center rounded-lg border border-[#E5E7EB] px-4 text-sm font-semibold text-[#0B1F44] transition-colors hover:border-[#FF6B1A]/50 hover:text-[#FF6B1A]">
                      View Profile
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6" aria-busy="true">
      <Skeleton className="h-[150px] rounded-[20px]" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[100px] rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Skeleton className="h-[260px] rounded-2xl" />
        <Skeleton className="h-[260px] rounded-2xl" />
      </div>
      <Skeleton className="h-[240px] rounded-2xl" />
    </div>
  );
}
