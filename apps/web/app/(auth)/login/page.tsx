import { LoginForm } from "@/features/auth/components/login-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log In",
  description: "Log in to your PlaceCampus account.",
};

export default function LoginPage() {
  return <LoginForm />;
}
