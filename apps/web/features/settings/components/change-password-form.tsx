"use client";

import * as React from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/components/auth-provider";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useChangePassword } from "../hooks/use-student-settings";

// Mirrors the API rules in AuthService.changePassword.
const schema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z
      .string()
      .min(12, "Use at least 12 characters.")
      .max(128, "Use at most 128 characters."),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "Choose a password different from your current one.",
  });

type Values = z.infer<typeof schema>;

const inputClass =
  "h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-white px-3.5 pr-11 text-sm text-[hsl(var(--foreground))] transition-colors placeholder:text-[hsl(var(--muted-foreground))] focus-visible:border-[hsl(var(--primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.25)]";

function PasswordField({
  id,
  label,
  error,
  autoComplete,
  registration,
}: {
  id: string;
  label: string;
  error?: string;
  autoComplete: string;
  registration: UseFormRegisterReturn;
}) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-[hsl(var(--foreground))]">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(inputClass, error && "border-red-400")}
          {...registration}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const { setAuth } = useAuth();
  const changePassword = useChangePassword();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), mode: "onTouched" });

  const onSubmit = (values: Values) =>
    changePassword.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onSuccess: async ({ accessToken }) => {
          // The API rotates this session and revokes all others.
          await setAuth(accessToken);
          toast.success("Password changed. You've been signed out on other devices.");
          onDone();
        },
        onError: (error) => {
          const message = error instanceof ApiError ? error.message : "Could not change your password.";
          if (/current password/i.test(message)) setError("currentPassword", { message });
          else if (/password/i.test(message)) setError("newPassword", { message });
          else toast.error(message);
        },
      },
    );

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-3 grid gap-4 rounded-xl border border-[hsl(var(--border))] p-4 sm:grid-cols-3">
      <PasswordField id="currentPassword" label="Current password" autoComplete="current-password" error={errors.currentPassword?.message} registration={register("currentPassword")} />
      <PasswordField id="newPassword" label="New password" autoComplete="new-password" error={errors.newPassword?.message} registration={register("newPassword")} />
      <PasswordField id="confirmPassword" label="Confirm new password" autoComplete="new-password" error={errors.confirmPassword?.message} registration={register("confirmPassword")} />
      <p className="text-xs text-[hsl(var(--muted-foreground))] sm:col-span-3">
        12–128 characters, and it must not contain the name part of your email address.
      </p>
      <div className="flex gap-2 sm:col-span-3">
        <button
          type="submit"
          disabled={changePassword.isPending}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 text-sm font-semibold text-white transition-colors hover:bg-[hsl(var(--color-primary-600))] disabled:opacity-60"
        >
          {changePassword.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Update password
        </button>
        <button
          type="button"
          onClick={onDone}
          className="h-10 rounded-xl px-4 text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
