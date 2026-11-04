"use client";

import * as React from "react";
import {
  Building2,
  CheckCircle2,
  CircleAlert,
  GraduationCap,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/features/auth/components/auth-provider";
import { ApiError, apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { facultyCard } from "@/features/faculty/components/faculty-ui";

type PasswordFields = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type Feedback = { kind: "success" | "error"; message: string } | null;

const initialPasswordFields: PasswordFields = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function FacultySettingsPage() {
  const { user, setAuth } = useAuth();
  const [passwords, setPasswords] = React.useState(initialPasswordFields);
  const [feedback, setFeedback] = React.useState<Feedback>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const updatePasswordField = (field: keyof PasswordFields, value: string) => {
    setPasswords((current) => ({ ...current, [field]: value }));
    setFeedback(null);
  };

  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (passwords.newPassword !== passwords.confirmPassword) {
      setFeedback({ kind: "error", message: "The new passwords do not match." });
      return;
    }
    if (passwords.newPassword.length < 12 || passwords.newPassword.length > 128) {
      setFeedback({ kind: "error", message: "Choose a password between 12 and 128 characters." });
      return;
    }

    setIsSaving(true);
    try {
      const result = await apiClient.post<{ accessToken: string }>(
        "/auth/change-password",
        {
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        },
      );
      const refreshedUser = await setAuth(result.accessToken);
      setPasswords(initialPasswordFields);
      setFeedback({
        kind: "success",
        message: refreshedUser
          ? "Your password has been updated."
          : "Your password has been updated. Please sign in again if your session expires.",
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        message:
          error instanceof ApiError
            ? error.message
            : "We couldn't update your password. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const profileDetails = [
    { label: "Full name", value: user?.fullName || "—", icon: UserRound },
    { label: "Email address", value: user?.email || "—", icon: Mail },
    { label: "Designation", value: user?.designation || "Not set", icon: GraduationCap },
    { label: "Department", value: user?.department || "Not set", icon: Building2 },
  ];

  return (
    <div className="mx-auto w-full max-w-[1000px] space-y-6">
      <section className={cn(facultyCard, "p-5 sm:p-7")} aria-labelledby="faculty-profile-heading">
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[#FF6B1A]">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="faculty-profile-heading" className="text-lg font-bold text-[#0B1F44]">Profile details</h2>
            <p className="mt-1 text-sm text-[#64748B]">Your faculty profile information.</p>
          </div>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          {profileDetails.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex min-w-0 items-start gap-3 rounded-xl border border-[#E5E7EB] bg-slate-50/70 p-4">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#64748B]" aria-hidden="true" />
              <div className="min-w-0">
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</dt>
                <dd className="mt-1 break-words text-sm font-semibold text-[#0B1F44]">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-[#64748B]">Name, designation, and department are managed by your institution.</p>
      </section>

      <section className={cn(facultyCard, "p-5 sm:p-7")} aria-labelledby="faculty-password-heading">
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[#FF6B1A]">
            <LockKeyhole className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="faculty-password-heading" className="text-lg font-bold text-[#0B1F44]">Change password</h2>
            <p className="mt-1 text-sm text-[#64748B]">Use your current password to set a new one for your account.</p>
          </div>
        </div>

        <form onSubmit={changePassword} className="max-w-xl space-y-4">
          <PasswordInput
            id="current-password"
            label="Current password"
            value={passwords.currentPassword}
            autoComplete="current-password"
            onChange={(value) => updatePasswordField("currentPassword", value)}
          />
          <PasswordInput
            id="new-password"
            label="New password"
            value={passwords.newPassword}
            autoComplete="new-password"
            onChange={(value) => updatePasswordField("newPassword", value)}
          />
          <PasswordInput
            id="confirm-password"
            label="Confirm new password"
            value={passwords.confirmPassword}
            autoComplete="new-password"
            onChange={(value) => updatePasswordField("confirmPassword", value)}
          />
          <p className="text-xs text-[#64748B]">Use 12–128 characters. The password must differ from your current password and must not include your email name.</p>

          {feedback && (
            <div
              role={feedback.kind === "error" ? "alert" : "status"}
              className={cn(
                "flex items-start gap-2 rounded-xl border px-3.5 py-3 text-sm",
                feedback.kind === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800",
              )}
            >
              {feedback.kind === "error" ? (
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving || !passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#FF6B1A] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#E85D12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B1A]/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Updating password…" : "Update password"}
          </button>
        </form>
      </section>
    </div>
  );
}

function PasswordInput({
  id,
  label,
  value,
  autoComplete,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  autoComplete: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-[#0B1F44]">{label}</label>
      <input
        id={id}
        type="password"
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        required
        className="h-11 w-full rounded-xl border border-[#D8DEE8] bg-white px-3.5 text-sm text-[#0B1F44] shadow-sm outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#FF6B1A] focus:ring-4 focus:ring-[#FF6B1A]/10"
      />
    </div>
  );
}
