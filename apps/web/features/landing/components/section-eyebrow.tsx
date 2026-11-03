import { cn } from "@/lib/utils";

/** Small orange pill shown above landing section headings. */
export function SectionEyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "mb-5 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--primary)/0.2)] bg-[hsl(var(--primary)/0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--color-primary-dark))]",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />
      {children}
    </span>
  );
}
