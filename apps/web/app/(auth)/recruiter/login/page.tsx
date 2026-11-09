import { Metadata } from "next";
import { UserRole } from "@placecampus/shared-types";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Recruiter Log In",
  description: "Log in to PlaceCampus recruiter access.",
};

/** Old recruiter link: the common login page with Recruiter preselected. */
export default function RecruiterLoginPage() {
  return <LoginForm initialRole={UserRole.RECRUITER} />;
}
