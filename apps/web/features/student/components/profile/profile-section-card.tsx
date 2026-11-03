import * as React from "react";
import { cn } from "@/lib/utils";

interface ProfileSectionCardProps {
  id?: string;
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/** Shared shell for the profile page sections. */
export function ProfileSectionCard({
  id,
  icon: Icon,
  title,
  description,
  action,
  className,
  style,
  children,
}: ProfileSectionCardProps) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      style={style}
      className={cn(
        "pc-enter scroll-mt-28 rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white p-5 shadow-[var(--shadow-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)] sm:p-6",
        className,
      )}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2
              id={headingId}
              className="text-base font-bold text-[hsl(var(--foreground))] sm:text-lg"
            >
              {title}
            </h2>
            <p className="mt-0.5 text-sm text-[hsl(var(--muted-foreground))]">
              {description}
            </p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
