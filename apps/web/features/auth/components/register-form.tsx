"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AuthInput } from "./auth-input";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { apiClient, ApiError } from "@/lib/api-client";

const registerSchema = z
  .object({
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const passwordValue = watch("password");

  const calculateStrength = (pass: string) => {
    if (!pass) return 0;
    let strength = 0;
    if (pass.length > 7) strength += 25;
    if (pass.match(/[a-z]+/)) strength += 25;
    if (pass.match(/[A-Z]+/)) strength += 25;
    if (pass.match(/[0-9!@#$%^&*]+/)) strength += 25;
    return strength;
  };

  const strength = calculateStrength(passwordValue);

  const onSubmit = async (data: RegisterValues) => {
    setServerError(null);
    try {
      await apiClient.post("/auth/register", {
        fullName: data.fullName,
        email: data.email,
        password: data.password,
      });
      setIsSuccess(true);
    } catch (error) {
      if (error instanceof ApiError) {
        setServerError(error.message);
      } else {
        setServerError("An unexpected error occurred. Please try again.");
      }
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-center py-8">
        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-heading text-2xl font-bold">Account created</h2>
        <p className="text-body text-sm text-[hsl(var(--muted-foreground))]">
          Your account has been successfully created. You can now log in to the
          platform.
        </p>
        <Button asChild className="w-full mt-4">
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-heading text-3xl font-bold tracking-tight">
          Create account
        </h2>
        <p className="text-body text-sm text-[hsl(var(--muted-foreground))]">
          Join PlaceCampus to track readiness and opportunities.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {serverError && (
          <div className="p-3 text-sm rounded bg-red-500/10 text-red-500 border border-red-500/20">
            {serverError}
          </div>
        )}

        <AuthInput
          label="Full Name"
          type="text"
          placeholder="Jane Doe"
          error={errors.fullName?.message}
          {...register("fullName")}
        />
        <AuthInput
          label="Email address"
          type="email"
          placeholder="name@university.edu"
          error={errors.email?.message}
          {...register("email")}
        />

        <div className="space-y-2">
          <AuthInput
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register("password")}
          />
          {passwordValue && (
            <div className="flex flex-col gap-1 mt-1">
              <Progress value={strength} className="h-1" />
              <p className="text-[10px] text-muted-foreground text-right">
                {strength < 50 ? "Weak" : strength < 100 ? "Good" : "Strong"}
              </p>
            </div>
          )}
        </div>

        <AuthInput
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <Button type="submit" className="w-full mt-4" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Create Account
        </Button>
      </form>

      <div className="text-center text-sm text-[hsl(var(--muted-foreground))] mt-2">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-[hsl(var(--primary))] hover:underline"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
