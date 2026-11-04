import { initials, readinessTone, shortName } from "../lib/faculty-meta";
import { cn } from "@/lib/utils";

/** White card used across the faculty portal. */
export const facultyCard =
  "rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-18px_rgba(15,23,42,0.18)]";

export function StudentAvatar({ name, className }: { name?: string; className?: string }) {
  return (
    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-sm font-bold text-[#FF6B1A]", className)}>
      {initials(name)}
    </span>
  );
}

export function StudentCell({
  student,
  full = false,
}: {
  student: { fullName: string; registrationNumber?: string } | null;
  /** Show the full name instead of "First L.". */
  full?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <StudentAvatar name={student?.fullName} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[#0B1F44]">
          {full ? (student?.fullName ?? "Unknown student") : shortName(student?.fullName)}
        </p>
        <p className="truncate text-xs text-[#64748B]">{student?.registrationNumber ?? "No reg. number"}</p>
      </div>
    </div>
  );
}

/** Green when strong, orange while developing, neutral when not calculated yet. */
export function ReadinessBar({ score }: { score: number | null }) {
  const tone = readinessTone(score);
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-2.5 w-full min-w-[7rem] overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score ?? undefined}
        aria-label={score === null ? "Readiness not calculated yet" : "Readiness"}
      >
        <div className={cn("h-full rounded-full transition-[width] duration-700", tone.bar)} style={{ width: `${score ?? 0}%` }} />
      </div>
      <span className={cn("w-12 shrink-0 text-right text-sm font-bold tabular-nums", tone.text)}>
        {score === null ? "—" : `${score}%`}
      </span>
    </div>
  );
}
