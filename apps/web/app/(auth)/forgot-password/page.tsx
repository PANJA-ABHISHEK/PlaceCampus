import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Reset your PlaceCampus password.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
