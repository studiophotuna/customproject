import Image from "next/image";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/site/PageHero";
import { getBrand } from "@/lib/data";

export const metadata: Metadata = {
  title: "About Us",
  description: "Handcrafted cakes and desserts, made with care.",
};

export default async function AboutPage() {
  const brand = await getBrand();
  return (
    <>
      <PageHero title="About Us" subtitle={brand.tagline} />
      <Container className="py-12">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-card border border-line">
            <Image
              src="/images/placeholder-cake.svg"
              alt="Our cakes"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div>
            <h2 className="section-title text-2xl uppercase text-brand">
              {brand.name} {brand.nameAccent}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">{brand.description}</p>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Based in {brand.location}, we handcraft cakes and desserts for every
              celebration — from birthdays and weddings to corporate events and everyday
              sweet cravings. Every order is prepared with care and made to order.
            </p>
          </div>
        </div>
      </Container>
    </>
  );
}
