import Image from "next/image";
import Link from "next/link";
import { Bike, MapPin } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { siteConfig } from "@/config/site";

const deliveryPoints = [
  "Pickup Available",
  "Delivery Available",
  "Delivery charges apply based on distance.",
];

export function InstagramDelivery() {
  return (
    <section className="py-16">
      <Container className="grid gap-6 lg:grid-cols-3">
        {/* Instagram feed */}
        <div className="lg:col-span-2">
          <h2 className="section-title text-xl uppercase text-brand">
            Follow the Sweetness
          </h2>
          <p className="mt-1 text-sm font-medium text-foreground">
            @LaJAYSIEDEL_Cakes
          </p>
          <p className="mt-1 text-sm text-muted">
            See our latest cakes, desserts and celebrations.
          </p>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Link
                key={i}
                href="#"
                className="relative aspect-square overflow-hidden rounded-md bg-surface-muted"
              >
                <Image
                  src="/images/placeholder-cake.svg"
                  alt="Instagram post"
                  fill
                  sizes="120px"
                  className="object-cover"
                />
              </Link>
            ))}
          </div>
          <ButtonLink href="#" variant="outline" size="sm" className="mt-4 uppercase">
            Follow Us
          </ButtonLink>
        </div>

        {/* Delivery info card */}
        <div className="flex flex-col justify-center rounded-card bg-brand-light p-6">
          <h3 className="section-title text-lg uppercase text-brand">
            Cakes Made in Dubai
          </h3>
          <Bike className="my-4 h-8 w-8 text-brand" />
          <ul className="space-y-2 text-sm text-foreground">
            {deliveryPoints.map((p) => (
              <li key={p} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                {p}
              </li>
            ))}
          </ul>
          <ButtonLink href="/delivery" size="sm" className="mt-5 self-start uppercase">
            Delivery Information
          </ButtonLink>
          <p className="mt-4 flex items-center gap-1 text-xs text-muted">
            <MapPin className="h-3.5 w-3.5 text-brand" />
            {siteConfig.location}
          </p>
        </div>
      </Container>
    </section>
  );
}
