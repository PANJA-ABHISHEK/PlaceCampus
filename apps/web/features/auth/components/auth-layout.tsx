import Link from "next/link";
import { Logo } from "@/components/brand";
import { cn } from "@/lib/utils";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  illustration?: React.ReactNode;
}

export function AuthLayout({
  children,
  title,
  subtitle,
  illustration,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Panel: Branding / Visual */}
      <div className="hidden lg:flex relative bg-[hsl(var(--navy-600))] overflow-hidden flex-col justify-between p-12">
        {/* Background gradient effects */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[hsl(var(--primary)/0.15)] to-transparent" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[800px] h-[800px] rounded-full bg-[hsl(var(--primary)/0.1)] blur-3xl" />

        <div className="relative z-10">
          <Link href="/">
            <Logo
              size="lg"
              className="mb-12 text-white [&_span]:text-white"
              showWordmark
            />
          </Link>
          <div className="max-w-md">
            <h1 className="text-display text-4xl text-white mb-6">{title}</h1>
            {subtitle && (
              <p className="text-body text-lg text-white/80">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="relative z-10 flex-1 flex items-end justify-center mt-12 pb-12">
          {/* Placeholder for student-with-laptop visual */}
          {illustration || (
            <div className="relative w-full max-w-sm aspect-square bg-[hsl(var(--card)/0.1)] backdrop-blur-sm rounded-2xl border border-[hsl(var(--border)/0.2)] flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-[hsl(var(--primary)/0.2)] to-transparent" />
              <p className="text-white/60 font-medium z-10">
                Illustration Placeholder
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Auth Form */}
      <div className="flex flex-col justify-center px-6 py-12 lg:px-16 xl:px-24 bg-[hsl(var(--background))]">
        <div className="w-full max-w-sm mx-auto flex flex-col gap-8">
          <div className="lg:hidden flex justify-center mb-8">
            <Link href="/">
              <Logo size="lg" />
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
