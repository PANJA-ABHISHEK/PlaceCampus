"use client";

import Link from "next/link";
import { Repeat } from "lucide-react";
import { useAuth } from "./auth-provider";
import { ROLE_LABELS, SELECT_ROLE_ROUTE } from "@/lib/routes";

/** Sidebar link to /select-role; renders only for users with several roles. */
export function SwitchRoleLink() {
  const { user } = useAuth();
  if (!user?.roles || user.roles.length < 2) return null;
  return (
    <Link
      href={SELECT_ROLE_ROUTE}
      className="mb-1 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-[hsl(var(--foreground)/0.8)] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
    >
      <Repeat className="h-4 w-4" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        Switch role
        <span className="block truncate text-xs font-normal text-[hsl(var(--muted-foreground))]">
          Now: {ROLE_LABELS[user.role] ?? user.role}
        </span>
      </span>
    </Link>
  );
}
