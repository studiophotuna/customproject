import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";

/**
 * Brand logo. If a logo image has been uploaded (logoUrl), it renders that;
 * otherwise it falls back to the wordmark (uppercase serif name + scripted
 * accent). Name/accent default to the built-in config.
 */
export function Logo({
  className,
  onBrand = false,
  name = siteConfig.name,
  accent = siteConfig.nameAccent,
  logoUrl = "",
}: {
  className?: string;
  onBrand?: boolean;
  name?: string;
  accent?: string;
  logoUrl?: string;
}) {
  if (logoUrl) {
    return (
      <Link href="/" className={cn("inline-flex items-center", className)}>
        <Image
          src={logoUrl}
          alt={`${name} ${accent}`}
          width={220}
          height={64}
          priority
          className="h-12 w-auto object-contain sm:h-14"
        />
      </Link>
    );
  }

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
