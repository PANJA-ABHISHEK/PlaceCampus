import { AuthLayout } from "@/features/auth/components/auth-layout";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Reset your PlaceCampus password.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Secure Your Account."
      subtitle="Follow the instructions to regain access to your PlaceCampus profile."
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
