"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand";
import { navigationLinks } from "@/config/marketing-data";
import { cn } from "@/lib/utils";
import { AUTH_ROUTE_PATTERN } from "@/lib/routes";

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  const isDashboardRoute = pathname?.match(
    /^\/(student|placement|placement-head|faculty|recruiter|admin)/,
  );
  if (isDashboardRoute || AUTH_ROUTE_PATTERN.test(pathname ?? "")) return null;

  return (
    <footer
      className={cn(
        "border-t border-[hsl(var(--border))] bg-[hsl(var(--card))]",
        className,
      )}
    >
      <div className="container-app py-14 md:py-20">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4 md:gap-8">
          <div className="md:col-span-1">
            <Logo size="md" className="mb-4" />
            <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed max-w-xs">
              PlaceCampus is the unified platform for tracking student
              readiness, verifying skills, and connecting graduates with top
              recruiters.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-[hsl(var(--foreground))]">
              Platform
            </h4>
            <ul className="space-y-3">
              {navigationLinks.footer.platform.map((link) => (
                <li key={link.title}>
                  <Link
                    href={link.href}
                    className="text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))] hover:underline focus-visible:underline"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-[hsl(var(--foreground))]">
              Company
            </h4>
            <ul className="space-y-3">
              {navigationLinks.footer.company.map((link) => (
                <li key={link.title}>
                  <Link
                    href={link.href}
                    className="text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))] hover:underline focus-visible:underline"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-[hsl(var(--foreground))]">
              Quick access
            </h4>
            <ul className="space-y-3">
              {navigationLinks.footer.support.map((link) => (
                <li key={link.title}>
                  <Link
                    href={link.href}
                    className="text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))] hover:underline focus-visible:underline"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[hsl(var(--border))] pt-6 text-center md:mt-16 md:flex-row md:text-left">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            © {currentYear} PlaceCampus. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
