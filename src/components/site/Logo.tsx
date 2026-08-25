import Link from "next/link";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";

/**
 * Wordmark logo: uppercase serif name with a scripted accent word beneath.
 * Name/accent default to the built-in config but can be overridden with the
 * DB-driven brand values.
 */
export function Logo({
  className,
  onBrand = false,
  name = siteConfig.name,
  accent = siteConfig.nameAccent,
}: {
  className?: string;
  onBrand?: boolean;
  name?: string;
  accent?: string;
}) {
  return (
    <Link href="/" className={cn("inline-flex flex-col leading-none", className)}>
      <span
        className={cn(
          "section-title text-lg font-bold tracking-wide sm:text-xl",
          onBrand ? "text-on-brand" : "text-brand",
        )}
      >
        {name}
      </span>
      <span
        className={cn(
          "-mt-1 self-center text-2xl sm:text-3xl",
          onBrand ? "text-on-brand" : "text-foreground",
        )}
        style={{ fontFamily: "var(--font-script), cursive" }}
      >
        {accent}
      </span>
    </Link>
  );
}
