import { RegisterForm } from "@/features/auth/components/register-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create a new PlaceCampus account.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
