"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const settingsCard =
  "rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white shadow-[var(--shadow-card)]";

export function SettingsSection({
  id,
  icon: Icon,
  title,
  description,
  children,
  delay = 0,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn(settingsCard, "pc-enter scroll-mt-24 p-5 sm:p-6")}
      style={{ "--pc-delay": `${delay}ms` } as React.CSSProperties}
    >
      <header className="flex items-start gap-3 border-b border-[hsl(var(--border)/0.8)] pb-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 id={`${id}-title`} className="text-base font-bold text-[hsl(var(--foreground))]">
            {title}
          </h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{description}</p>
        </div>
      </header>
      <div className="pt-2">{children}</div>
    </section>
  );
}

/** Accessible on/off switch (role="switch"). */
export function Switch({
  checked,
  onCheckedChange,
  disabled,
  labelledBy,
  describedBy,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  labelledBy: string;
  describedBy?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-[hsl(var(--primary))]" : "bg-[hsl(var(--muted-foreground)/0.35)]",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export function SwitchRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  note,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  note?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p id={`${id}-label`} className="text-sm font-semibold text-[hsl(var(--foreground))]">
          {label}
        </p>
        <p id={`${id}-desc`} className="text-sm text-[hsl(var(--muted-foreground))]">
          {description}
        </p>
        {note && (
          <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">{note}</p>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        labelledBy={`${id}-label`}
        describedBy={`${id}-desc`}
      />
    </div>
  );
}

export function DetailItem({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-[hsl(var(--muted-foreground))]">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-[hsl(var(--foreground))]">
        {value ?? <span className="font-normal text-[hsl(var(--muted-foreground))]">Not set</span>}
      </dd>
    </div>
  );
}
