import { AuthLayout } from "@/features/auth/components/auth-layout";
import { LoginForm } from "@/features/auth/components/login-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log In",
  description: "Log in to your PlaceCampus account.",
};

export default function LoginPage() {
  return (
    <AuthLayout
      title="Build Your Readiness. Build Your Future."
      subtitle="Log in to access your personalized placement and readiness platform."
    >
      <LoginForm />
    </AuthLayout>
  );
}
