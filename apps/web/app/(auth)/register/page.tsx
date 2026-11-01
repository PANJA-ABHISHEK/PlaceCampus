import { AuthLayout } from "@/features/auth/components/auth-layout";
import { RegisterForm } from "@/features/auth/components/register-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create a new PlaceCampus account.",
};

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Join the Unified Placement Platform."
      subtitle="Know where you stand. Know what to improve. Know where you fit."
    >
      <RegisterForm />
    </AuthLayout>
  );
}
