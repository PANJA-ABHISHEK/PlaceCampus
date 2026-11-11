"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { navigationLinks } from "@/config/marketing-data";
import { cn } from "@/lib/utils";
import { AUTH_ROUTE_PATTERN } from "@/lib/routes";

interface NavbarProps {
  className?: string;
}

export function Navbar({ className }: NavbarProps) {
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const pathname = usePathname();

  // Hide on dashboard routes
  const isDashboardRoute = pathname?.match(
    /^\/(student|placement|placement-head|faculty|recruiter|admin)/,
  );

  // Handle scroll effect
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (isDashboardRoute || AUTH_ROUTE_PATTERN.test(pathname ?? "")) return null;

  return (
    <header
      className={cn(
        "fixed top-0 z-[var(--z-sticky)] w-full transition-all duration-[var(--duration-normal)]",
        isScrolled
          ? "bg-[hsl(var(--card)/0.96)] backdrop-blur-md border-b border-[hsl(var(--border))] shadow-[0_8px_30px_-12px_rgb(0_0_0/0.12)]"
          : "bg-[hsl(var(--card))] border-b border-[hsl(var(--border))]",
        className,
      )}
    >
      {/* Fixed bar height: the logo grows without making the navbar taller. */}
      <div className="container-app flex h-16 items-center justify-between lg:h-[72px]">
        <Link
          href="/"
          aria-label="PlaceCampus home"
          className="z-50 flex shrink-0 items-center transition-opacity hover:opacity-80"
        >
          <Image
            src="/images/placecampus-logo-trimmed.png"
            alt="PlaceCampus"
            width={1200}
            height={269}
            priority
            className="h-10 w-auto object-contain sm:h-11 lg:h-10 xl:h-12"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav aria-label="Primary navigation" className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 lg:flex xl:gap-8">
          {navigationLinks.main.map((link) => (
            <Link
              key={link.title}
              href={link.href}
              className="text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"
            >
              {link.title}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 lg:flex xl:gap-4">
          <Button
            variant="outline"
            asChild
            className="border-[hsl(var(--primary)/0.7)] bg-transparent font-medium text-[hsl(var(--foreground))] hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.06)] hover:text-[hsl(var(--primary))]"
          >
            <Link href="/login">Log in</Link>
          </Button>
          <Button
            asChild
            className="font-medium shadow-md shadow-[hsl(var(--primary)/0.2)]"
          >
            <Link href="/login">Get Started</Link>
          </Button>
        </div>

        {/* Mobile Menu Trigger */}
        <button
          className="z-50 p-2 text-[hsl(var(--foreground))] lg:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
          aria-controls="site-mobile-navigation"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 flex flex-col bg-[hsl(var(--background))] px-6 pt-24 pb-8 transition-transform duration-[var(--duration-normal)] ease-in-out lg:hidden",
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <nav id="site-mobile-navigation" aria-label="Mobile navigation" className="flex flex-1 flex-col gap-6">
          {navigationLinks.main.map((link) => (
            <Link
              key={link.title}
              href={link.href}
              className="text-2xl font-semibold text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.title}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-4 mt-auto">
          <Button
            variant="outline"
            size="lg"
            asChild
            className="w-full justify-center"
          >
            <Link href="/login">Log in</Link>
          </Button>
          <Button size="lg" asChild className="w-full justify-center shadow-md">
            <Link href="/login">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
