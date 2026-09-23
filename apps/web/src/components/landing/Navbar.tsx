"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, GraduationCap, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const navLinks = [
  { href: "/student/drives", label: "PLACEMENT DRIVES" },
  { href: "/student", label: "STUDENTS" },
  { href: "/placement-cell", label: "PLACEMENT CELLS" },
  { href: "/resources", label: "RESOURCES" },
]

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const pathname = usePathname()

  // Close mobile menu on path change
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileMenuOpen(false)
  }, [pathname])

  return (
    <>
      {/* Top Announcement Bar */}
      <div className="h-10 md:h-12 w-full bg-gradient-to-r from-[#f58220] via-[#fcd34d] to-[#86efac] flex items-center justify-between px-4 text-black text-xs md:text-sm font-bold tracking-widest uppercase">
        <button className="p-1 hover:bg-black/10 rounded"><ChevronLeft className="h-4 w-4" /></button>
        <div className="text-center w-full truncate px-4">
          PLACECAMPUS 2026 • SMARTER PLACEMENT READINESS FOR EVERY STUDENT
        </div>
        <button className="p-1 hover:bg-black/10 rounded"><ChevronRight className="h-4 w-4" /></button>
      </div>

      {/* Main Navbar */}
      <header className="sticky top-0 z-50 w-full bg-white border-b border-border shadow-sm">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-1.5 bg-foreground rounded border border-border group-hover:bg-accent transition-colors">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground font-serif">
              PlaceCampus
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-bold tracking-widest transition-colors uppercase ${
                    isActive ? "text-accent" : "text-muted-foreground hover:text-accent"
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            <Link href="/login" className="text-sm font-bold text-foreground hover:text-accent transition-colors uppercase tracking-widest">
              Login
            </Link>
            <Button className="bg-accent hover:bg-accent-dark text-white rounded font-bold uppercase tracking-widest h-11 px-6 shadow-none" asChild>
              <Link href="/register">Get Started ↗</Link>
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden p-2 text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-border absolute w-full left-0 top-full shadow-lg">
            <div className="flex flex-col p-4 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-bold tracking-widest text-foreground hover:text-accent uppercase p-2"
                >
                  {link.label}
                </Link>
              ))}
              <div className="h-px bg-border w-full my-2" />
              <Link href="/login" className="text-sm font-bold tracking-widest text-foreground hover:text-accent uppercase p-2">
                Login
              </Link>
              <Button className="bg-accent text-white w-full rounded font-bold uppercase tracking-widest h-11" asChild>
                <Link href="/register">Get Started ↗</Link>
              </Button>
            </div>
          </div>
        )}
      </header>
    </>
  )
}
