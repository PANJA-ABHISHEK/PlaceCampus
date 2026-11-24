import * as React from "react";
import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** White card shell shared by every Overview widget: subtle border, soft shadow, lift on hover. */
export const dashCardClassName =
  "relative flex flex-col overflow-hidden rounded-[20px] border border-[hsl(var(--border)/0.8)] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-18px_rgba(15,23,42,0.18)] transition-[box-shadow,transform] duration-200 hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_16px_32px_-20px_rgba(15,23,42,0.28)] sm:p-6";

export type Tone = "orange" | "navy" | "green" | "blue" | "red" | "amber";

export const TONE_TILE: Record<Tone, string> = {
  orange: "bg-[#FFF2E8] text-[hsl(var(--primary))]",
  navy: "bg-[hsl(var(--color-navy-50))] text-[#14213D]",
  green: "bg-emerald-50 text-emerald-600",
  blue: "bg-sky-50 text-sky-600",
  red: "bg-red-50 text-red-600",
  amber: "bg-amber-50 text-amber-600",
};

export function IconTile({ icon: Icon, tone = "orange", className }: { icon: LucideIcon; tone?: Tone; className?: string }) {
  return (
    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", TONE_TILE[tone], className)}>
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
  );
}

export function CardHeading({
  id,
  icon,
  tone,
  title,
  subtitle,
  action,
}: {
  id: string;
  icon: LucideIcon;
  tone?: Tone;
  title: string;
  subtitle?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <IconTile icon={icon} tone={tone} />
        <div className="min-w-0">
          <h2 id={id} className="text-base font-bold leading-tight text-[#14213D]">
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{subtitle}</p>}
        </div>
      </div>
      {action && <TextLink href={action.href} className="mt-1 shrink-0">{action.label}</TextLink>}
    </div>
  );
}

export function TextLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-1 rounded text-sm font-semibold text-[hsl(var(--primary))] transition-colors hover:text-[hsl(var(--color-primary-600))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.4)]",
        className,
      )}
    >
      {children}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}

const BADGE_TONES = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  neutral: "bg-slate-50 text-slate-600 ring-slate-200",
} as const;

export function StatusBadge({ tone, children, className }: { tone: keyof typeof BADGE_TONES; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1", BADGE_TONES[tone], className)}>
      {children}
    </span>
  );
}

export function EmptyNote({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div className={cn("flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[#F8FAFC] px-4 py-7 text-center", className)}>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[hsl(var(--muted-foreground))] shadow-[var(--shadow-xs)]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm font-semibold text-[#14213D]">{title}</p>
      <p className="mt-1 max-w-[18rem] text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">{description}</p>
      {action && <TextLink href={action.href} className="mt-3">{action.label}</TextLink>}
    </div>
  );
}

/** Inline error with a retry, used inside a card so one failed request never blanks the page. */
export function CardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl bg-red-50/60 px-4 py-6 text-center">
      <p className="text-sm text-red-700">{message}</p>
      <button type="button" onClick={onRetry} className="text-sm font-semibold text-red-700 underline-offset-2 hover:underline">
        Try again
      </button>
    </div>
  );
}

export function CardSkeleton({ lines = 4, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn(dashCardClassName, "gap-3")} aria-busy="true" aria-label="Loading">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-xl bg-[hsl(var(--muted))]" />
        <div className="h-4 w-32 animate-pulse rounded bg-[hsl(var(--muted))]" />
      </div>
      <div className={cn("mt-2 space-y-2.5", className)}>
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="h-3.5 animate-pulse rounded bg-[hsl(var(--muted))]" style={{ width: `${90 - i * 12}%` }} />
        ))}
      </div>
    </div>
  );
}

export const primaryButtonClassName =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_-10px_hsl(var(--primary)/0.9)] transition-[background-color,transform] hover:bg-[hsl(var(--color-primary-600))] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)] focus-visible:ring-offset-2";

export const secondaryButtonClassName =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-white px-4 py-2.5 text-sm font-semibold text-[#14213D] shadow-[var(--shadow-xs)] transition-colors hover:border-[hsl(var(--primary)/0.4)] hover:bg-[#FFF2E8] hover:text-[hsl(var(--color-primary-700))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)] focus-visible:ring-offset-2";

export function formatEventDate(iso: string, withTime: boolean) {
  const date = new Date(iso);
  const day = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return withTime ? `${day} · ${date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}` : day;
}

export function timeAgo(iso: string, now: number) {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
