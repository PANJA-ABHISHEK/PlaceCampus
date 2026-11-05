import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        {eyebrow && <p className="text-sm font-semibold text-[#FF6B1A]">{eyebrow}</p>}
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0B1F44] sm:text-[28px]">{title}</h1>
        <p className="max-w-[52rem] text-[15px] leading-6 text-[#0B1F44]/75">{description}</p>
      </div>
      {action && <div className="flex flex-wrap gap-2 sm:justify-end">{action}</div>}
    </header>
  );
}

export function AdminPanelHeader({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-[68px] flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] px-5 py-4">
      <h2 className="flex items-center gap-2.5 text-lg font-bold text-[#0B1F44]">
        <Icon className="h-5 w-5 shrink-0 text-[#FF6B1A]" aria-hidden="true" />
        {title}
      </h2>
      {children && <div className="flex items-center gap-4">{children}</div>}
    </div>
  );
}

export function AdminViewAll({ href, label = "View All" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-[#FF6B1A] hover:underline">
      {label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}
