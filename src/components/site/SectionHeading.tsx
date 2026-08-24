import { cn } from "@/lib/utils";

/** Centered serif section heading with the decorative rule and optional subtitle. */
export function SectionHeading({
  title,
  subtitle,
  className,
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn("text-center", className)}>
      <h2 className="section-title text-2xl uppercase text-foreground sm:text-3xl">
        {title}
      </h2>
      <div className="mt-2 flex justify-center">
        <span className="rule" aria-hidden />
      </div>
      {subtitle && <p className="mt-3 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}
