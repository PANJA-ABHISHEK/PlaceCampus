"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AuthInput } from "./auth-input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useAuth } from "./auth-provider";
import { apiClient, ApiError } from "@/lib/api-client";
import { getDashboardRoute } from "@/lib/routes";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { setAuth } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginValues) => {
    setServerError(null);
    try {
      const res = await apiClient.post<{ accessToken: string }>(
        "/auth/login",
        data,
      );
      setAuth(res.accessToken);

      try {
        const meRes = await apiClient.get<{ user: { role: string } }>(
          "/auth/me",
        );
        const route = getDashboardRoute(meRes.user.role);
        router.push(route);
      } catch (err) {
        router.push("/");
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setServerError(error.message);
      } else {
        setServerError("An unexpected error occurred. Please try again.");
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-heading text-3xl font-bold tracking-tight">
          Welcome back
        </h2>
        <p className="text-body text-sm text-[hsl(var(--muted-foreground))]">
          Enter your credentials to access your account.
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
        <AuthInput
          label="Password"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register("password")}
        />

        <div className="flex items-center justify-between mt-2">
          <label className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] cursor-pointer hover:text-[hsl(var(--foreground))]">
            <input
              type="checkbox"
              className="rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]"
            />
            Remember me
          </label>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-[hsl(var(--primary))] hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full mt-4" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Sign In
        </Button>
      </form>

      <div className="text-center text-sm text-[hsl(var(--muted-foreground))] mt-2">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-[hsl(var(--primary))] hover:underline"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}
