import Link from "next/link";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";

/** Wordmark logo: uppercase serif name with a scripted accent word beneath. */
export function Logo({
  className,
  onBrand = false,
}: {
  className?: string;
  onBrand?: boolean;
}) {
  return (
    <Link href="/" className={cn("inline-flex flex-col leading-none", className)}>
      <span
        className={cn(
          "section-title text-lg font-bold tracking-wide sm:text-xl",
          onBrand ? "text-on-brand" : "text-brand",
        )}
      >
        {siteConfig.name}
      </span>
      <span
        className={cn(
          "-mt-1 self-center text-2xl sm:text-3xl",
          onBrand ? "text-on-brand" : "text-foreground",
        )}
        style={{ fontFamily: "var(--font-script), cursive" }}
      >
        {siteConfig.nameAccent}
      </span>
    </Link>
  );
}
