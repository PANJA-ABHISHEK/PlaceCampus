import * as React from "react";
import { FileText, Upload } from "lucide-react";
import { ProfileSectionCard } from "./profile-section-card";

/** Resume upload is not implemented yet; this renders a clear coming-soon state only. */
export function ResumeCard({
  id,
  className,
  style,
}: {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <ProfileSectionCard
      id={id}
      className={className}
      style={style}
      icon={FileText}
      title="Resume"
      description="Upload your latest resume for placement opportunities."
    >
      <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-[hsl(var(--border))] bg-gradient-to-b from-[hsl(var(--muted)/0.35)] to-white px-6 py-8 text-center">
        <div className="relative mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[hsl(var(--secondary))] shadow-[var(--shadow-md)] ring-1 ring-[hsl(var(--border)/0.7)]">
            <FileText className="h-7 w-7" strokeWidth={1.5} aria-hidden="true" />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <h3 className="text-base font-bold text-[hsl(var(--foreground))]">
            Resume Upload
          </h3>
          <span className="rounded-full bg-[hsl(var(--primary)/0.12)] px-2.5 py-0.5 text-xs font-semibold text-[hsl(var(--color-primary-700))]">
            Coming soon
          </span>
        </div>
        <p className="mt-2 max-w-[24rem] text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
          Secure resume upload and AI parsing will be available in the next
          phase.
        </p>
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="mt-5 inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-white px-4 py-2.5 text-sm font-semibold text-[hsl(var(--muted-foreground))] opacity-70"
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          Upload Resume
        </button>
      </div>
    </ProfileSectionCard>
  );
}
