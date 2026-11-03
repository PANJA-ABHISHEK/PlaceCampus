import { Metadata } from "next";
import { SelectRoleForm } from "@/features/auth/components/select-role-form";

export const metadata: Metadata = {
  title: "Choose Your Role",
  description: "Choose which PlaceCampus role to use for this session.",
};

export default function SelectRolePage() {
  return <SelectRoleForm />;
}
