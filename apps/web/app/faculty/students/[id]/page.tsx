"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, ArrowUpRight, BadgeCheck, CalendarDays, CircleAlert, FileCheck2, Lock, Mail, TrendingUp } from "lucide-react";
import { useFacultyStudent } from "@/features/faculty/hooks/use-faculty-portal";
import { ReadinessBar, StudentAvatar, facultyCard } from "@/features/faculty/components/faculty-ui";
import { getStatusBadge, TYPE_META } from "@/features/evidence/lib/evidence-meta";
import { STATUS_META } from "@/features/interviews/lib/interview-meta";
import { ApiError } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function FacultyStudentProfilePage() {
  const { id } = useParams() as { id: string };
  const { data, isLoading, isError, error } = useFacultyStudent(id);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1100px] space-y-5" aria-busy="true">
        <Skeleton className="h-8 w-40 rounded-xl" />
        <Skeleton className="h-[140px] rounded-2xl" />
        <div className="grid gap-5 lg:grid-cols-2"><Skeleton className="h-[220px] rounded-2xl" /><Skeleton className="h-[220px] rounded-2xl" /></div>
      </div>
    );
  }

  if (isError || !data) {
    const forbidden = error instanceof ApiError && error.status === 403;
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-6 py-12 text-center">
        {forbidden ? <Lock className="h-8 w-8 text-[#64748B]" aria-hidden="true" /> : <CircleAlert className="h-8 w-8 text-red-600" aria-hidden="true" />}
        <p className="font-semibold text-[#0B1F44]">{forbidden ? "This student isn't assigned to you" : "This profile is unavailable"}</p>
        <p className="text-sm text-[#64748B]">{forbidden ? "You can only view students in your assignment scope." : "Please try again."}</p>
        <Link href="/faculty/students" className="mt-1 text-sm font-semibold text-[#FF6B1A] hover:underline">Back to My Students</Link>
      </div>
    );
  }

  const { student, readiness, skills, evidence, interviews } = data;
  const facts = [
    ["Registration No.", student.registrationNumber],
    ["Department", student.department],
    ["Programme", student.program],
    ["Batch", student.batch],
    ["CGPA", student.cgpa?.toFixed(2)],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6">
      <Link href="/faculty/students" className="inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-[#0B1F44]/75 hover:bg-white">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> My Students
      </Link>

      <section className={cn(facultyCard, "flex flex-col gap-5 p-6 sm:flex-row sm:items-center")}>
        <StudentAvatar name={student.fullName} className="h-16 w-16 text-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-2xl font-extrabold text-[#0B1F44]">{student.fullName}</h2>
          {student.email && <p className="inline-flex items-center gap-1.5 text-sm text-[#64748B]"><Mail className="h-4 w-4" aria-hidden="true" />{student.email}</p>}
          {facts.length > 0 && (
            <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              {facts.map(([k, v]) => (
                <div key={k} className="flex gap-1.5"><dt className="text-[#64748B]">{k}:</dt><dd className="font-semibold text-[#0B1F44]">{v}</dd></div>
              ))}
            </dl>
          )}
        </div>
        <div className="w-full sm:w-64">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Readiness</p>
          <ReadinessBar score={student.readinessScore} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className={cn(facultyCard, "p-5")}>
          <h3 className="mb-3 flex items-center gap-2 font-bold text-[#0B1F44]"><TrendingUp className="h-5 w-5" aria-hidden="true" /> Readiness insights</h3>
          {readiness ? (
            <div className="space-y-3 text-sm">
              {readiness.calculatedAt && <p className="text-xs text-[#64748B]">Calculated {format(new Date(readiness.calculatedAt), "d MMM yyyy")}</p>}
              <InsightList title="Strengths" items={readiness.strengths} tone="text-emerald-700" />
              <InsightList title="Areas to improve" items={readiness.areasToImprove} tone="text-[#C2410C]" />
            </div>
          ) : (
            <p className="text-sm text-[#64748B]">Readiness hasn&apos;t been calculated for this student yet.</p>
          )}
        </section>

        <section className={cn(facultyCard, "p-5")}>
          <h3 className="mb-3 flex items-center gap-2 font-bold text-[#0B1F44]"><BadgeCheck className="h-5 w-5" aria-hidden="true" /> Verified skills <span className="text-sm font-semibold text-[#64748B]">({skills.length})</span></h3>
          {skills.length ? (
            <ul className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <li key={s.name} className="rounded-lg bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">{s.name} <span className="font-normal text-emerald-700">· L{s.level}</span></li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#64748B]">No verified skills yet.</p>
          )}
        </section>
      </div>

      <section className={cn(facultyCard, "overflow-hidden")}>
        <h3 className="flex items-center gap-2 border-b border-[#E5E7EB] px-5 py-4 font-bold text-[#0B1F44]"><FileCheck2 className="h-5 w-5" aria-hidden="true" /> Evidence</h3>
        {evidence.length ? (
          <ul className="divide-y divide-[#E5E7EB]">
            {evidence.map((e) => {
              const type = TYPE_META[e.type];
              const badge = getStatusBadge(e.status);
              const reviewable = e.reviewedByMe && e.status === "NEEDS_REVIEW";
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <type.icon className="h-4 w-4 shrink-0 text-[#FF6B1A]" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#0B1F44]">{e.title}</p>
                    <p className="text-xs text-[#64748B]">{type.label} · {format(new Date(e.createdAt), "d MMM yyyy")}</p>
                  </div>
                  <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", badge.className)}>{badge.label}</span>
                  {reviewable && (
                    <Link href={`/faculty/reviews/${e.id}`} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#FF6B1A] px-3 text-sm font-semibold text-[#FF6B1A] hover:bg-[#FF6B1A] hover:text-white">
                      Review <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-[#64748B]">This student hasn&apos;t submitted any evidence yet.</p>
        )}
      </section>

      <section className={cn(facultyCard, "overflow-hidden")}>
        <h3 className="flex items-center gap-2 border-b border-[#E5E7EB] px-5 py-4 font-bold text-[#0B1F44]"><CalendarDays className="h-5 w-5" aria-hidden="true" /> Interviews with you</h3>
        {interviews.length ? (
          <ul className="divide-y divide-[#E5E7EB]">
            {interviews.map((iv) => {
              const meta = STATUS_META[iv.status];
              return (
                <li key={iv.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#0B1F44]">{iv.type}</p>
                    <p className="text-xs text-[#64748B]">{format(new Date(iv.scheduledAt), "d MMM yyyy, h:mm a")}</p>
                  </div>
                  <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold ring-1", meta.className)}>{meta.label}</span>
                  <Link href={`/faculty/interviews/${iv.id}`} className="text-sm font-semibold text-[#FF6B1A] hover:underline">Open</Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-[#64748B]">No interviews with this student yet.</p>
        )}
      </section>
    </div>
  );
}

function InsightList({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  if (!items.length) return null;
  return (
    <div>
      <p className={cn("mb-1 text-xs font-bold uppercase tracking-wide", tone)}>{title}</p>
      <ul className="list-disc space-y-0.5 pl-5 text-[#0B1F44]/85">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}
