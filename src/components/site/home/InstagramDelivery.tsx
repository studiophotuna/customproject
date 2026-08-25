import Image from "next/image";
import Link from "next/link";
import { Bike, CheckCircle2, MapPin } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { InstagramIcon } from "@/components/ui/SocialIcons";
import { getBrand, getDelivery, getInstagramFeed, getSocials } from "@/lib/data";

/** Derive a display handle from an Instagram URL, else a sensible fallback. */
function handleFromUrl(url: string, brandName: string): string {
  const m = url.match(/instagram\.com\/([^/?#]+)/i);
  if (m?.[1]) return `@${m[1]}`;
  return `@${brandName.replace(/\s+/g, "").toLowerCase()}`;
}

export async function InstagramDelivery() {
  const [delivery, socials, brand, feed] = await Promise.all([
    getDelivery(),
    getSocials(),
    getBrand(),
    getInstagramFeed(),
  ]);

  const igUrl = socials.instagram || "#";
  // Use real posts when the feed has been synced; otherwise show placeholders.
  const tiles = feed.length > 0 ? feed.slice(0, 8) : null;
  const handle = handleFromUrl(socials.instagram, `${brand.name}${brand.nameAccent}`);
  const city = (delivery.location || brand.location).split(",")[0].trim();

  return (
    <section className="py-20">
      <Container className="grid items-stretch gap-8 lg:grid-cols-5">
        {/* Instagram feed */}
        <div className="lg:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
            Instagram
          </p>
          <h2 className="section-title mt-2 text-3xl text-foreground">
            Follow the{" "}
            <span style={{ fontFamily: "var(--font-script), cursive" }} className="text-brand">
              Sweetness
            </span>
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link href={igUrl} className="text-sm font-medium text-brand hover:underline">
              {handle}
            </Link>
            <span className="text-sm text-muted">
              See our latest cakes, desserts and celebrations.
            </span>
          </div>

          <div className="mt-6 grid grid-cols-4 gap-3">
            {(tiles ?? Array.from({ length: 8 }).map(() => null)).map((item, i) => {
              const href = item?.permalink ?? igUrl;
              return (
                <Link
                  key={item?.id ?? i}
                  href={href}
                  target={href === "#" ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  className="group relative aspect-square overflow-hidden rounded-xl bg-surface-muted"
                >
                  <Image
                    src={item?.mediaUrl ?? "/images/placeholder-cake.svg"}
                    alt={item?.caption?.slice(0, 80) || "Instagram post"}
                    fill
                    sizes="(max-width: 640px) 25vw, 140px"
                    className="object-cover transition duration-300 group-hover:scale-110"
                    unoptimized={Boolean(item)}
                  />
                  <span className="absolute inset-0 grid place-items-center bg-brand/0 opacity-0 transition group-hover:bg-brand/40 group-hover:opacity-100">
                    <InstagramIcon className="h-6 w-6 text-white" />
                  </span>
                </Link>
              );
            })}
          </div>

          <ButtonLink href={igUrl} variant="outline" size="md" className="mt-6 uppercase">
            <InstagramIcon className="h-4 w-4" />
            Follow Us
          </ButtonLink>
        </div>

        {/* Delivery info card */}
        <div className="relative flex flex-col justify-center overflow-hidden rounded-card bg-gradient-to-br from-brand to-brand-dark p-8 text-on-brand shadow-lg lg:col-span-2">
          {/* decorative circles */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-white/5" />

          <div className="relative">
            <span className="inline-grid h-14 w-14 place-items-center rounded-full bg-white/15">
              <Bike className="h-7 w-7" />
            </span>
            <h3 className="section-title mt-5 text-2xl uppercase">Cakes Made in {city}</h3>

            <ul className="mt-5 space-y-3 text-sm">
              {delivery.points.map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-on-brand/90" />
                  <span className="text-on-brand/95">{p}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/delivery"
              className="mt-7 inline-flex items-center justify-center rounded-card bg-white px-5 py-2.5 text-sm font-medium uppercase tracking-wide text-brand transition hover:bg-white/90"
            >
              Delivery Information
            </Link>

            <p className="mt-6 flex items-center gap-1.5 border-t border-white/20 pt-4 text-sm text-on-brand/90">
              <MapPin className="h-4 w-4" />
              {delivery.location}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
