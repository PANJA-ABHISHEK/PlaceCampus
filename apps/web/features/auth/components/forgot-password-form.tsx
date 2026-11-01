"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AuthInput } from "./auth-input";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, MailCheck } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordValues) => {
    setServerError(null);
    try {
      await apiClient.post("/auth/forgot-password", data);
      setIsSubmitted(true);
    } catch (error) {
      if (error instanceof ApiError) {
        setServerError(error.message);
      } else {
        setServerError("An unexpected error occurred. Please try again.");
      }
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center text-center gap-4 py-8">
        <div className="h-16 w-16 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center mb-4">
          <MailCheck className="h-8 w-8 text-[hsl(var(--primary))]" />
        </div>
        <h2 className="text-heading text-2xl font-bold">Check your email</h2>
        <p className="text-body text-sm text-[hsl(var(--muted-foreground))] max-w-sm">
          If an account exists for this email, we&apos;ve sent reset
          instructions to your inbox.
        </p>
        <Button variant="outline" asChild className="w-full mt-6">
          <Link href="/login">Return to login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-heading text-3xl font-bold tracking-tight">
          Reset password
        </h2>
        <p className="text-body text-sm text-[hsl(var(--muted-foreground))]">
          Enter your email address and we&apos;ll send you a link to reset your
          password.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {serverError && (
          <div className="p-3 text-sm rounded bg-red-500/10 text-red-500 border border-red-500/20">
            {serverError}
          </div>
        )}

        <AuthInput
          label="Email address"
          type="email"
          placeholder="name@university.edu"
          error={errors.email?.message}
          {...register("email")}
        />

        <Button type="submit" className="w-full mt-4" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Send reset link
        </Button>
      </form>

      <div className="flex justify-center mt-4">
        <Link
          href="/login"
          className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to log in
        </Link>
      </div>
    </div>
  );
}
