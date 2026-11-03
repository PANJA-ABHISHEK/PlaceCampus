"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ArrowUp, ArrowUpRight, BadgeCheck, BarChart3, Sparkles } from "lucide-react";
import { navigationLinks } from "@/config/marketing-data";
import { cn } from "@/lib/utils";
import { AUTH_ROUTE_PATTERN } from "@/lib/routes";

interface FooterProps {
  className?: string;
}

const linkGroups = [
  { title: "Platform", links: navigationLinks.footer.platform },
  { title: "Portals", links: navigationLinks.footer.portals },
  { title: "Company", links: navigationLinks.footer.company },
];

const highlights = [
  { icon: BadgeCheck, label: "Faculty-verified skills" },
  { icon: BarChart3, label: "Explainable readiness" },
  { icon: Sparkles, label: "AI-assisted matching" },
];

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
        "relative overflow-hidden border-t border-[hsl(var(--border))] bg-[hsl(var(--card))]",
        className,
      )}
    >
      {/* Orange accent line and glow */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--primary))] to-transparent" />
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[60%] -translate-x-1/2 rounded-full bg-[hsl(var(--primary)/0.08)] blur-3xl" />

      <div className="container-app relative pt-14 md:pt-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 lg:grid-cols-[1.7fr_1fr_1fr_1fr] lg:gap-12">
          <div className="sm:col-span-3 lg:col-span-1">
            <Link href="/" aria-label="PlaceCampus home" className="inline-block transition-opacity hover:opacity-80">
              <Image
                src="/images/placecampus-logo-trimmed.png"
                alt="PlaceCampus"
                width={1200}
                height={269}
                className="h-12 w-auto"
              />
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
              One platform for universities, students and recruiters to verify
              skills, measure placement readiness and prepare for the right
              opportunities.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {highlights.map((item) => (
                <li
                  key={item.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--primary)/0.2)] bg-[hsl(var(--primary)/0.06)] px-3 py-1 text-xs font-medium text-[hsl(var(--color-primary-dark))]"
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>

          {linkGroups.map((group) => (
            <div key={group.title}>
              <h4 className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(var(--foreground))]">
                {group.title}
              </h4>
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={link.title}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))] focus-visible:text-[hsl(var(--primary))]"
                    >
                      {link.title}
                      <ArrowUpRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[hsl(var(--border))] py-6 text-center md:flex-row md:text-left">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            © {currentYear} PlaceCampus. Unified University Placement &amp; Student Readiness Platform.
          </p>
          <Link
            href="/#top"
            className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] px-4 py-2 text-sm font-medium text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--primary)/0.5)] hover:text-[hsl(var(--primary))]"
          >
            Back to top
            <ArrowUp className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
