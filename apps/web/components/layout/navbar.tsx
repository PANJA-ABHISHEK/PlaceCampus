"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { navigationLinks } from "@/config/marketing-data";
import { cn } from "@/lib/utils";

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

  if (isDashboardRoute) return null;

  return (
    <header
      className={cn(
        "fixed top-0 z-[var(--z-sticky)] w-full transition-all duration-[var(--duration-normal)]",
        isScrolled
          ? "bg-[hsl(var(--card)/0.95)] backdrop-blur-md border-b border-[hsl(var(--border))] shadow-sm py-3"
          : "bg-transparent py-5",
        className,
      )}
    >
      <div className="container-app flex items-center justify-between">
        <Link href="/" className="transition-opacity hover:opacity-80 z-50">
          <Logo size={isScrolled ? "sm" : "md"} />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
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
        <div className="hidden md:flex items-center gap-4">
          <Button variant="ghost" asChild className="font-medium">
            <Link href="/login">Log in</Link>
          </Button>
          <Button
            asChild
            className="font-medium shadow-md shadow-[hsl(var(--primary)/0.2)]"
          >
            <Link href="/register">Get Started</Link>
          </Button>
        </div>

        {/* Mobile Menu Trigger */}
        <button
          className="md:hidden z-50 p-2 text-[hsl(var(--foreground))]"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
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
          "fixed inset-0 z-40 bg-[hsl(var(--background))] transition-transform duration-[var(--duration-normal)] ease-in-out md:hidden flex flex-col pt-24 pb-8 px-6",
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <nav className="flex flex-col gap-6 flex-1">
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
            <Link href="/register">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
