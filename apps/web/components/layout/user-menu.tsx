"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, LogOut, Repeat, Settings, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  name: string;
  roleLabel: string;
  /** Omit when the role has no profile page; the item is then hidden. */
  profileHref?: string;
  /** Avatar and chevron only: the name is shown elsewhere (e.g. in the sidebar). */
  compact?: boolean;
  /** Omit while the settings page is not available; the item renders disabled. */
  settingsHref?: string;
  /** Shown only for users holding more than one role. */
  switchRoleHref?: string;
  onLogout: () => void | Promise<void>;
}

export function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2) || "?"
  );
}

const itemClassName =
  "cursor-pointer gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] focus:bg-[hsl(var(--muted))] focus:text-[hsl(var(--foreground))] [&_svg]:size-[18px] [&_svg]:text-[hsl(var(--muted-foreground))]";

export function UserMenu({
  name,
  roleLabel,
  profileHref,
  settingsHref,
  switchRoleHref,
  compact = false,
  onLogout,
}: UserMenuProps) {
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Account menu for ${name}`}
          className={cn(
            "group flex items-center gap-3 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-[hsl(var(--muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)] data-[state=open]:bg-[hsl(var(--muted))] sm:rounded-xl sm:pr-2.5",
            compact && "gap-1.5",
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary)/0.12)] text-sm font-bold text-[hsl(var(--primary))] ring-2 ring-white sm:h-10 sm:w-10">
            {getInitials(name)}
          </span>
          <span className={cn("hidden min-w-0 flex-col text-left", !compact && "sm:flex")}>
            <span className="max-w-[10rem] truncate text-sm font-semibold leading-tight text-[hsl(var(--foreground))]">
              {name}
            </span>
            <span className="text-xs leading-tight text-[hsl(var(--muted-foreground))]">
              {roleLabel}
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="hidden h-4 w-4 text-[hsl(var(--muted-foreground))] transition-transform duration-200 group-data-[state=open]:rotate-180 sm:block"
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="pc-menu-animate w-60 rounded-xl border-[hsl(var(--border)/0.8)] bg-white p-1.5 shadow-[var(--shadow-xl)]"
      >
        {/* Identity shown here on mobile, where the trigger is avatar-only */}
        <div className={cn("px-3 pb-2 pt-1.5", !compact && "sm:hidden")}>
          <p className="truncate text-sm font-semibold text-[hsl(var(--foreground))]">
            {name}
          </p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {roleLabel}
          </p>
        </div>
        <DropdownMenuSeparator className={cn(!compact && "sm:hidden")} />

        {profileHref && (
          <DropdownMenuItem asChild className={itemClassName}>
            <Link href={profileHref}>
              <UserRound />
              Profile
            </Link>
          </DropdownMenuItem>
        )}

        {settingsHref ? (
          <DropdownMenuItem asChild className={itemClassName}>
            <Link href={settingsHref}>
              <Settings />
              Settings
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled className={itemClassName}>
            <Settings />
            Settings
            <span className="ml-auto rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">
              Soon
            </span>
          </DropdownMenuItem>
        )}

        {switchRoleHref && (
          <DropdownMenuItem asChild className={itemClassName}>
            <Link href={switchRoleHref}>
              <Repeat />
              Switch role
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="my-1.5" />

        <DropdownMenuItem
          disabled={isLoggingOut}
          onSelect={(event) => {
            // Keep the menu mounted until logout resolves and the route changes.
            event.preventDefault();
            void handleLogout();
          }}
          className={cn(
            itemClassName,
            "text-red-600 focus:bg-red-50 focus:text-red-700 [&_svg]:text-red-600",
          )}
        >
          <LogOut />
          {isLoggingOut ? "Logging out…" : "Logout"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
