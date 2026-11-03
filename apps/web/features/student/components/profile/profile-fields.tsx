"use client";

import * as React from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { CircleAlert, ExternalLink } from "lucide-react";
import { cn, isHttpUrl } from "@/lib/utils";

export const fieldInputClassName =
  "w-full rounded-xl border border-[hsl(var(--input))] bg-white text-sm text-[hsl(var(--foreground))] shadow-[var(--shadow-xs)] transition-[border-color,box-shadow] duration-200 placeholder:text-[hsl(var(--muted-foreground)/0.8)] hover:border-[hsl(var(--muted-foreground)/0.4)] focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-4 focus:ring-[hsl(var(--primary)/0.12)] aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:ring-red-500/10";

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="flex items-center gap-1.5 text-xs font-medium text-red-600"
    >
      <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

interface IconInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  icon: React.ElementType;
  registration: UseFormRegisterReturn;
  error?: string;
  hint?: string;
}

export function IconInputField({
  id,
  label,
  icon: Icon,
  registration,
  error,
  hint,
  ...inputProps
}: IconInputProps) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="text-sm font-semibold text-[hsl(var(--foreground))]"
      >
        {label}
      </label>
      <div className="group relative">
        <Icon
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[hsl(var(--muted-foreground))] transition-colors group-focus-within:text-[hsl(var(--primary))]"
        />
        <input
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy || undefined}
          className={cn(fieldInputClassName, "h-12 pl-11 pr-4")}
          {...registration}
          {...inputProps}
        />
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-[hsl(var(--muted-foreground))]">
          {hint}
        </p>
      )}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

interface TextareaFieldProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label: string;
  icon: React.ElementType;
  registration: UseFormRegisterReturn;
  length: number;
  maxLength: number;
  error?: string;
}

export function IconTextareaField({
  id,
  label,
  icon: Icon,
  registration,
  length,
  maxLength,
  error,
  ...textareaProps
}: TextareaFieldProps) {
  const nearLimit = length > maxLength * 0.9;
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="text-sm font-semibold text-[hsl(var(--foreground))]"
      >
        {label}
      </label>
      <div className="group relative">
        <Icon
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-3.5 h-[18px] w-[18px] text-[hsl(var(--muted-foreground))] transition-colors group-focus-within:text-[hsl(var(--primary))]"
        />
        <textarea
          id={id}
          aria-invalid={!!error}
          aria-describedby={`${id}-count${error ? ` ${id}-error` : ""}`}
          className={cn(
            fieldInputClassName,
            "block min-h-[136px] resize-y pb-8 pl-11 pr-4 pt-3 leading-relaxed",
          )}
          {...registration}
          {...textareaProps}
        />
        <span
          id={`${id}-count`}
          aria-live="polite"
          className={cn(
            "pointer-events-none absolute bottom-2.5 right-3.5 text-xs font-medium tabular-nums",
            length > maxLength
              ? "text-red-600"
              : nearLimit
                ? "text-amber-600"
                : "text-[hsl(var(--muted-foreground))]",
          )}
        >
          {length} / {maxLength}
        </span>
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export { isHttpUrl };

interface SocialLinkFieldProps {
  id: string;
  label: string;
  icon: React.ElementType;
  iconClassName: string;
  placeholder: string;
  registration: UseFormRegisterReturn;
  value: string | undefined;
  error?: string;
}

export function SocialLinkField({
  id,
  label,
  icon: Icon,
  iconClassName,
  placeholder,
  registration,
  value,
  error,
}: SocialLinkFieldProps) {
  const trimmed = value?.trim();
  const isValid = !error && isHttpUrl(trimmed);
  const status = error ? "invalid" : isValid ? "linked" : trimmed ? "pending" : "empty";

  return (
    <div className="rounded-xl border border-[hsl(var(--border)/0.8)] bg-[hsl(var(--muted)/0.3)] p-3 transition-colors focus-within:border-[hsl(var(--primary)/0.4)] focus-within:bg-white hover:bg-white">
      <div className="mb-2 flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="flex items-center gap-2.5 text-sm font-semibold text-[hsl(var(--foreground))]"
        >
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              iconClassName,
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          {label}
        </label>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            status === "linked" && "bg-emerald-50 text-emerald-700",
            status === "invalid" && "bg-red-50 text-red-600",
            (status === "empty" || status === "pending") &&
              "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              status === "linked" && "bg-emerald-500",
              status === "invalid" && "bg-red-500",
              (status === "empty" || status === "pending") &&
                "bg-[hsl(var(--muted-foreground)/0.5)]",
            )}
          />
          {status === "linked"
            ? "Linked"
            : status === "invalid"
              ? "Invalid URL"
              : status === "pending"
                ? "Incomplete"
                : "Not added"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="url"
          inputMode="url"
          autoComplete="url"
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(fieldInputClassName, "h-11 min-w-0 flex-1 px-3.5")}
          {...registration}
        />
        {isValid ? (
          <a
            href={trimmed}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${label} in a new tab`}
            title="Open link"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-white text-[hsl(var(--foreground)/0.75)] transition-colors hover:border-[hsl(var(--primary)/0.4)] hover:text-[hsl(var(--primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)]"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        ) : (
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 cursor-not-allowed items-center justify-center rounded-xl border border-[hsl(var(--border)/0.6)] text-[hsl(var(--muted-foreground)/0.45)]"
          >
            <ExternalLink className="h-4 w-4" />
          </span>
        )}
      </div>
      {error && (
        <div className="mt-1.5">
          <FieldError id={`${id}-error`} message={error} />
        </div>
      )}
    </div>
  );
}
