import { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Recruiter Log In",
  description: "Log in to PlaceCampus recruiter access.",
};

export default function RecruiterLoginPage() {
  return <LoginForm portal="recruiter" />;
}
